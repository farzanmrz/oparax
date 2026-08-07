// app/agents/[id]/voice/actions.ts
//
// The Voice tab's extraction start/retry actions and navigation-surviving progress poll.
// Ownership is always proven with the RLS/cookie client before service-role-only extraction
// helpers read or write the deny-all voice_extraction_runs table.
//
// Everything here is keyed by the desk; there is no cross-desk sharing by reporter handle.
"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { PROGRESS_POLL_KIND, TRANSACTION_KIND_TAG } from "@/lib/observability/sentry-shared";
import { createClient } from "@/lib/supabase/server";
import {
  checkHandleShape,
  type ExtractionOutcome,
  type GateReport,
  type PreflightResult,
  runExtractionSpendPhase,
} from "@/lib/voice/create-desk-extraction";
import { startRun } from "@/lib/voice/extraction-run";
import {
  type ExtractionProgressResult,
  getOwnedExtractionProgress,
} from "./get-extraction-progress";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Proves the signed-in caller owns this desk, via the RLS client — the `agents` SELECT
 *  policy is owner-scoped, so a row coming back at all IS the proof. Returns the desk's own
 *  reporter_handle, never one supplied by the caller. */
async function ownedDesk(
  deskId: string,
): Promise<{ handle: string; userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const { data } = await supabase
    .from("agents")
    .select("reporter_handle")
    .eq("id", deskId)
    .maybeSingle();
  if (!data) return { error: "Could not load this agent." };
  return { handle: data.reporter_handle, userId: user.id };
}

/**
 * Polling read for the navigation-surviving extraction: proves desk ownership via the RLS/cookie
 * client, then reads this desk's `voice_extraction_runs` row through the admin client (deny-all
 * table, admin client only — the same pattern every write action here uses).
 *
 * Generic over any owned deskId — a client component on `/agents/[id]/voice` OR the create-desk
 * form (polling the just-created desk before ever navigating to its Voice tab) can both call it.
 *
 * Pure read: no revalidate, no side effect — safe on a `setInterval`. `status: "none"` means no
 * run row exists yet (nothing has started), distinguishable from a real run's own status
 * ("running" | "completed" | "failed").
 */
export async function getExtractionProgress(deskId: string): Promise<ExtractionProgressResult> {
  // Marks THIS transaction as the progress poll so `dropProgressPollTransactions` can discard it
  // on the way out. It has to be a tag set from inside the request rather than a sampling rule:
  // this action and the extraction it reports on are both server actions on the same routes, so
  // no rate or transaction-name rule can keep one and drop the other. Tracing runs at 100%
  // precisely so extractions are never sampled away; this is what keeps that affordable.
  Sentry.setTag(TRANSACTION_KIND_TAG, PROGRESS_POLL_KIND);

  return getOwnedExtractionProgress(deskId);
}

/** `proceed` means "keep going to the next step". Gates are returned so the caller can render
 *  each one as a settled step rather than showing an undifferentiated spinner. */
export type PreflightStepResult =
  | { ok: true; gates: GateReport[]; proceed: true }
  | { ok: false; gates: GateReport[]; message: string };

function toStepResult(preflight: PreflightResult): PreflightStepResult {
  return preflight.proceed
    ? { ok: true, gates: preflight.gates, proceed: true }
    : { ok: false, gates: preflight.gates, message: preflight.message };
}

/** Copy for a start/retry that lost the run claim — another extraction for this desk is already
 *  in flight, so a second paid run would bill the same intent twice. */
const ALREADY_RUNNING = "An extraction is already running for this agent.";

/**
 * Starts extraction for a desk the caller owns: gate, claim the run and start the billable phase.
 *
 * There is no profile pre-flight any more. It was deleted after a live probe showed it could
 * never pass for a real account: Bright Data's X-profile dataset answers the sync
 * `/datasets/v3/scrape` endpoint with `202 + snapshot_id` for a live profile (i.e. "queued, go
 * poll"), which the gate classified as a rejection — @FabrizioRomano failed it exactly like a
 * dead handle. It cost a cent per attempt to block every extraction in the product.
 *
 * The corpus pull is the reality check instead, which is what it always was: a handle with no
 * timeline fails there, with a real reason, and the create screen now shows that step in flight
 * rather than a spinner. One less step, one less billable call, one less thing to be wrong.
 *
 * The handle-shape gate stays and runs here even though the create screen already called
 * `checkExtractionReadiness`: a server action is reachable by action id whatever component
 * imports it, and `agents` has an owner-scoped INSERT policy with no value constraint, so a
 * desk can carry any `reporter_handle` its owner chose to write. Skipping it would send that raw
 * string into the corpus pull — an injection guard, not a UX nicety.
 *
 * `startRun` is awaited SYNCHRONOUSLY, before scheduling: its boolean is the desk's
 * one-run-at-a-time claim, and inside `after()` a rejection would arrive after the response has
 * already flushed, far too late to stop the spend.
 */
export async function startExtraction(deskId: string): Promise<PreflightStepResult> {
  const owned = await ownedDesk(deskId);
  if ("error" in owned) return { ok: false, gates: [], message: owned.error };

  const shape = checkHandleShape(owned.handle);
  if (!shape.proceed) return toStepResult(shape);

  if (!(await startRun(deskId))) {
    return { ok: false, gates: shape.gates, message: ALREADY_RUNNING };
  }

  after(() => runExtractionSpendPhase(deskId, owned.handle, owned.userId));
  return { ok: true, gates: shape.gates, proceed: true };
}

/** Reporter-facing sentence for a terminal outcome. Shared by the retry button and anything else
 *  that needs to explain a stopped extraction. */
function outcomeMessage(outcome: ExtractionOutcome): string {
  switch (outcome.status) {
    case "malformed_handle":
      return "That handle isn't valid for extraction.";
    case "corpus_failed":
      return "Couldn't fetch posts for that handle. Please try again.";
    default:
      return "Extraction didn't produce a guide. Please try again later.";
  }
}

/**
 * Manual retry from the Voice tab. Runs the handle-shape gate inline (so a bad handle comes back
 * as a message immediately) and hands the billable phase to `after()`, exactly like
 * `startExtraction` — the retry button then polls `getExtractionProgress` the same way the
 * create screen does, instead of blocking on a multi-minute request.
 *
 * `startRun` is awaited BEFORE scheduling, for two reasons. It is the desk's one-run-at-a-time
 * claim, so a double-click cannot buy two corpus pulls and two extraction calls for one intent.
 * And it is what makes the revalidate below truthful: opened inside `after()`, the run row did
 * not exist yet when the Voice tab re-rendered, so the tab read status "none", drew the empty
 * state and this very button again — with no poller — and invited a second paid run. Claiming
 * first means the re-render sees a "running" row and renders the live progress view instead.
 */
export async function retryExtraction(deskId: string): Promise<ActionResult> {
  const owned = await ownedDesk(deskId);
  if ("error" in owned) return { ok: false, error: owned.error };

  const shape = checkHandleShape(owned.handle);
  if (!shape.proceed) return { ok: false, error: outcomeMessage(shape.outcome) };

  if (!(await startRun(deskId))) return { ok: false, error: ALREADY_RUNNING };

  after(() => runExtractionSpendPhase(deskId, owned.handle, owned.userId));
  revalidatePath(`/agents/${deskId}`, "layout");
  return { ok: true };
}
