// app/agents/[id]/voice/actions.ts
//
// The Voice tab's server actions: voice-rule CRUD, the extraction start/retry, and the
// navigation-surviving progress poll. Mirrors ../actions.ts's style — "use server", RLS/cookie
// client for ownership proof — but reaches for the admin client wherever the underlying
// lib/voice/* module is service-role-only by design (`voice_rules` is select-only and
// `voice_extraction_runs` is deny-all, neither has a write policy).
//
// Everything here is keyed by the DESK. A voice guide, its rules, and its extraction run all
// belong to one `experiments` row — there is no cross-desk sharing by reporter handle any more,
// so an ownership proof on the desk id is a complete ownership proof over all three.
//
// lib/voice/rules.ts's CRUD functions do NO ownership check (per their own doc comment) —
// every rule-mutating action below proves the caller owns the desk (and, for update/delete,
// that the target rule actually belongs to THAT desk — a ruleId alone doesn't prove that) via
// the RLS client before ever calling into the service-role write.
"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  checkHandleShape,
  type ExtractionOutcome,
  type GateReport,
  type PreflightResult,
  runExtractionSpendPhase,
  runProfilePreflightGate,
} from "@/lib/voice/create-desk-extraction";
import { createVoiceRule, deleteVoiceRule, updateVoiceRule } from "@/lib/voice/rules";
import { X_PROFILE_FAILURE_COPY } from "@/lib/web/brightdata";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Proves the signed-in caller owns this desk, via the RLS client — the `experiments` SELECT
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
    .from("experiments")
    .select("reporter_handle")
    .eq("id", deskId)
    .maybeSingle();
  if (!data) return { error: "Could not load this agent." };
  return { handle: data.reporter_handle, userId: user.id };
}

export async function saveVoiceRule(deskId: string, rule: string): Promise<ActionResult> {
  const trimmed = rule.trim();
  if (!trimmed) return { ok: false, error: "Enter a rule before adding it." };

  const owned = await ownedDesk(deskId);
  if ("error" in owned) return { ok: false, error: owned.error };

  try {
    await createVoiceRule({ experimentId: deskId, rule: trimmed });
  } catch {
    return { ok: false, error: "Could not save that rule. Please try again." };
  }
  revalidatePath(`/agents/${deskId}`, "layout");
  return { ok: true };
}

/** Proves ruleId belongs to THIS desk before returning it as "owned" — the ruleId alone doesn't
 *  carry that proof (voice_rules has no owner_id; ownership runs through experiment_id). Reads
 *  through the admin client since voice_rules is select-only for the RLS client too. */
async function assertOwnsRule(deskId: string, ruleId: string): Promise<boolean> {
  const owned = await ownedDesk(deskId);
  if ("error" in owned) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("voice_rules")
    .select("id")
    .eq("id", ruleId)
    .eq("experiment_id", deskId)
    .maybeSingle();
  return data !== null;
}

export async function updateVoiceRuleAction(
  deskId: string,
  ruleId: string,
  patch: Partial<{ rule: string; enabled: boolean }>,
): Promise<ActionResult> {
  if (!(await assertOwnsRule(deskId, ruleId))) {
    return { ok: false, error: "Could not load that rule." };
  }
  try {
    await updateVoiceRule(ruleId, patch);
  } catch {
    return { ok: false, error: "Could not update that rule. Please try again." };
  }
  revalidatePath(`/agents/${deskId}`, "layout");
  return { ok: true };
}

export async function deleteVoiceRuleAction(deskId: string, ruleId: string): Promise<ActionResult> {
  if (!(await assertOwnsRule(deskId, ruleId))) {
    return { ok: false, error: "Could not load that rule." };
  }
  try {
    await deleteVoiceRule(ruleId);
  } catch {
    return { ok: false, error: "Could not remove that rule. Please try again." };
  }
  revalidatePath(`/agents/${deskId}`, "layout");
  return { ok: true };
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
export async function getExtractionProgress(deskId: string): Promise<
  | {
      ok: true;
      stage: string | null;
      progressNote: string | null;
      reasoningPartial: string | null;
      status: string;
      errorCode: string | null;
    }
  | { ok: false; error: string }
> {
  const owned = await ownedDesk(deskId);
  if ("error" in owned) return { ok: false, error: owned.error };

  const admin = createAdminClient();
  const { data } = await admin
    .from("voice_extraction_runs")
    .select("stage, progress_note, reasoning_partial, status, error_code")
    .eq("experiment_id", deskId)
    .maybeSingle();

  if (!data) {
    return {
      ok: true,
      stage: null,
      progressNote: null,
      reasoningPartial: null,
      status: "none",
      errorCode: null,
    };
  }
  return {
    ok: true,
    stage: data.stage,
    progressNote: data.progress_note,
    reasoningPartial: data.reasoning_partial,
    status: data.status,
    errorCode: data.error_code,
  };
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

/**
 * STEP 1 — the free handle-shape gate. Returns in microseconds, so the create screen can settle
 * it on screen immediately rather than holding it behind the slow profile call. Spends nothing,
 * so it is safe to call on mount.
 */
export async function checkExtractionReadiness(deskId: string): Promise<PreflightStepResult> {
  const owned = await ownedDesk(deskId);
  if ("error" in owned) return { ok: false, gates: [], message: owned.error };
  return toStepResult(checkHandleShape(owned.handle));
}

/**
 * STEP 2 — the billable profile lookup, then (on success) the extraction itself.
 *
 * Unlike the `after()` fire-and-forget this replaces, the pre-flight result is RETURNED. The
 * gates run before a `voice_extraction_runs` row exists, so awaiting them here is the only way
 * their outcome can reach a screen; the old version discarded them entirely, which is why a real
 * rejection surfaced as a spinner that never resolved. The billable phase is then handed to
 * `after()`, preserving the survives-navigation property for the half where it matters — its
 * progress lands on the run row that `getExtractionProgress` polls.
 *
 * Exactly one profile lookup is spent per call: `runExtractionSpendPhase` does not re-run the
 * pre-flight, and this action does not re-run step 1.
 */
export async function startExtraction(deskId: string): Promise<PreflightStepResult> {
  const owned = await ownedDesk(deskId);
  if ("error" in owned) return { ok: false, gates: [], message: owned.error };

  const preflight = await runProfilePreflightGate(owned.handle, owned.userId);
  if (!preflight.proceed) return toStepResult(preflight);

  after(() => runExtractionSpendPhase(deskId, owned.handle, owned.userId));
  return { ok: true, gates: preflight.gates, proceed: true };
}

/** Reporter-facing sentence for a terminal outcome. Shared by the retry button and anything else
 *  that needs to explain a stopped extraction; `preflight_rejected` resolves to the specific
 *  Bright Data failure rather than one catch-all sentence. */
function outcomeMessage(outcome: ExtractionOutcome): string {
  switch (outcome.status) {
    case "malformed_handle":
      return "That handle isn't valid for extraction.";
    case "preflight_rejected":
      return X_PROFILE_FAILURE_COPY[outcome.failure];
    case "corpus_failed":
      return "Couldn't fetch posts for that handle. Please try again.";
    default:
      return "Extraction didn't produce a guide. Please try again later.";
  }
}

/**
 * Manual retry from the Voice tab. Runs both gates inline (so a bad handle or a dead profile
 * comes back as a message immediately) and hands the billable phase to `after()`, exactly like
 * `startExtraction` — the retry button then polls `getExtractionProgress` the same way the
 * create screen does, instead of blocking on a multi-minute request.
 */
export async function retryExtraction(deskId: string): Promise<ActionResult> {
  const owned = await ownedDesk(deskId);
  if ("error" in owned) return { ok: false, error: owned.error };

  const shape = checkHandleShape(owned.handle);
  if (!shape.proceed) return { ok: false, error: outcomeMessage(shape.outcome) };

  const profile = await runProfilePreflightGate(owned.handle, owned.userId);
  if (!profile.proceed) return { ok: false, error: outcomeMessage(profile.outcome) };

  after(() => runExtractionSpendPhase(deskId, owned.handle, owned.userId));
  revalidatePath(`/agents/${deskId}`, "layout");
  return { ok: true };
}
