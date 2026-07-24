// app/agents/[id]/voice/actions.ts
//
// The Voice tab's server actions: voice-rule CRUD (Part C), the extraction retry (Part D),
// and the T5 navigation-surviving progress poll. Mirrors ../actions.ts's style —
// "use server", RLS/cookie client for ownership proof — but reaches for the admin client
// wherever the underlying lib/voice/* module is service-role-only by design (voice_rules and
// voice_extraction_claims both carry deny-all/select-only RLS with no write policy of their
// own).
//
// D14's verify/attest gate (lib/verify/handle.ts, verify-gate.tsx) is gone — T6 stamps
// `reporter_verified_at` at desk creation via linked X OAuth, so identity is proven before a
// desk exists rather than gated afterward here.
//
// lib/voice/rules.ts's CRUD functions do NO ownership check (per their own doc comment) —
// every rule-mutating action below proves the caller owns the desk (and, for update/delete,
// that the target rule actually belongs to THAT desk's reporter_handle — a ruleId alone
// doesn't prove that) via the RLS client before ever calling into the service-role write.
"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { attemptVoiceExtraction } from "@/lib/voice/create-desk-extraction";
import { createVoiceRule, deleteVoiceRule, updateVoiceRule } from "@/lib/voice/rules";
import { utcDay } from "@/lib/voice/spend-gate";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Proves deskId ownership via the RLS client and returns the desk's OWN reporter_handle —
 *  the shared ownership-proof step every rule-mutating action below runs before delegating
 *  to lib/voice/rules.ts. Never trusts a client-supplied reporterHandle for the write itself
 *  (only this server-resolved value is ever passed on) — a desk owner could otherwise name
 *  an unrelated reporter's handle and mutate rules they have no claim to. */
async function ownedReporterHandle(deskId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("experiments")
    .select("reporter_handle")
    .eq("id", deskId)
    .maybeSingle();
  return data?.reporter_handle ?? null;
}

export async function saveVoiceRule(deskId: string, rule: string): Promise<ActionResult> {
  const trimmed = rule.trim();
  if (!trimmed) return { ok: false, error: "Enter a rule before adding it." };

  const reporterHandle = await ownedReporterHandle(deskId);
  if (!reporterHandle) return { ok: false, error: "Could not load this agent." };

  try {
    await createVoiceRule({ reporterHandle, rule: trimmed });
  } catch {
    return { ok: false, error: "Could not save that rule. Please try again." };
  }
  revalidatePath(`/agents/${deskId}`, "layout");
  return { ok: true };
}

/** Proves ruleId belongs to deskId's own reporter_handle before returning it as "owned" —
 *  the ruleId alone doesn't carry that proof (voice_rules has no owner_id, per its own
 *  design: a rule is shared per-reporter, not per-desk). Reads through the admin client
 *  since voice_rules is select-only for the RLS client too. */
async function assertOwnsRule(deskId: string, ruleId: string): Promise<boolean> {
  const reporterHandle = await ownedReporterHandle(deskId);
  if (!reporterHandle) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("voice_rules")
    .select("id")
    .eq("id", ruleId)
    .eq("reporter_handle", reporterHandle)
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
 * Polling read for T5's navigation-surviving extraction: proves deskId ownership via the
 * RLS/cookie client (same `ownedReporterHandle` step every other action in this file runs),
 * then reads today's `voice_extraction_claims` row for that desk's OWN reporter_handle
 * through the admin client — same "deny-all table, admin client only" pattern every write
 * action in this file already uses. Never trusts a client-supplied handle: the handle comes
 * from the owner-scoped `experiments` read, not from the caller.
 *
 * Generic over any owned deskId — a client component on `/agents/[id]/voice` OR the
 * create-desk form (polling the just-created desk before ever navigating to its Voice tab)
 * can both call this same action; nothing about it is voice-page-specific.
 *
 * Pure read: no revalidate, no side effect — safe to call on a `setInterval` poll.
 * `{ ok: true, stage: null, ... }` (with `status: "none"`) means no claim row exists for today
 * — nothing in flight — distinguishable from a real in-progress/terminal claim's own `status`
 * ("reserved" | "completed" | "failed").
 */
export async function getExtractionProgress(deskId: string): Promise<
  | {
      ok: true;
      stage: string | null;
      progressNote: string | null;
      reasoningPartial: string | null;
      status: string;
    }
  | { ok: false; error: string }
> {
  const reporterHandle = await ownedReporterHandle(deskId);
  if (!reporterHandle) return { ok: false, error: "Could not load this agent." };

  const admin = createAdminClient();
  const { data } = await admin
    .from("voice_extraction_claims")
    .select("stage, progress_note, reasoning_partial, status")
    .eq("reporter_handle", reporterHandle)
    .eq("utc_day", utcDay())
    .maybeSingle();

  if (!data) {
    return { ok: true, stage: null, progressNote: null, reasoningPartial: null, status: "none" };
  }
  return {
    ok: true,
    stage: data.stage,
    progressNote: data.progress_note,
    reasoningPartial: data.reasoning_partial,
    status: data.status,
  };
}

/**
 * Manual retry for a desk whose extraction hasn't produced a guide yet. `attemptVoiceExtraction`
 * now returns a real `ExtractionOutcome` (T4) instead of `void` — this action just translates
 * that outcome into an `ActionResult`-shaped response for `RetryExtractionButton`, revalidating
 * on any outcome that means a guide now exists.
 *
 * reporterHandle is accepted for the UI's convenience but never trusted on its own: the
 * action re-derives the desk's real reporter_handle from the RLS-scoped ownership read and
 * requires it to match before spending anything — otherwise any signed-in owner of ANY desk
 * could trigger billable extraction (and burn another reporter's daily cap) for a handle
 * their own desk has nothing to do with.
 */
export async function capReprobe(
  deskId: string,
  reporterHandle: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: desk } = await supabase
    .from("experiments")
    .select("reporter_handle")
    .eq("id", deskId)
    .maybeSingle();
  if (!desk || desk.reporter_handle !== reporterHandle) {
    return { ok: false, error: "Could not load this agent." };
  }

  const outcome = await attemptVoiceExtraction(desk.reporter_handle, user.id);

  switch (outcome.status) {
    case "completed":
    case "already_extracted":
      revalidatePath(`/agents/${deskId}`, "layout");
      return { ok: true };
    case "capped":
      return { ok: false, error: "Extraction is capped for today — try again tomorrow." };
    case "malformed_handle":
      return { ok: false, error: "That handle isn't valid for extraction." };
    case "preflight_rejected":
      return { ok: false, error: "Couldn't find an active X profile for that handle." };
    case "corpus_failed":
      return { ok: false, error: "Couldn't fetch posts for that handle. Please try again." };
    default:
      return { ok: false, error: "Extraction didn't produce a guide. Please try again later." };
  }
}
