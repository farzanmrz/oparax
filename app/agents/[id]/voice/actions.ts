// app/agents/[id]/voice/actions.ts
//
// The Voice tab's server actions: verify/attest the reporter handle (Part B), voice-rule
// CRUD (Part C), and the extraction retry (Part D). Mirrors ../actions.ts's style —
// "use server", RLS/cookie client for ownership proof — but reaches for the admin client
// wherever the underlying lib/voice/*/lib/verify/* module is service-role-only by design
// (voice_rules and voice_extraction_claims both carry deny-all/select-only RLS with no
// write policy of their own).
//
// lib/voice/rules.ts's CRUD functions do NO ownership check (per their own doc comment) —
// every rule-mutating action below proves the caller owns the desk (and, for update/delete,
// that the target rule actually belongs to THAT desk's reporter_handle — a ruleId alone
// doesn't prove that) via the RLS client before ever calling into the service-role write.
"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { VerifyResult } from "@/lib/verify/handle";
import { attestReporterHandle, verifyReporterHandle } from "@/lib/verify/handle";
import { attemptVoiceExtraction } from "@/lib/voice/create-desk-extraction";
import { createVoiceRule, deleteVoiceRule, updateVoiceRule } from "@/lib/voice/rules";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type { VerifyResult };

/** Verify experimentId's reporter handle against the signed-in user's linked X account
 *  (verifyReporterHandle already does the RLS-scoped ownership read). Revalidates the
 *  desk's layout on success so Part A's server-fetched `reporter_verified_at` resolves
 *  fresh — the desk page then renders state 2 or 3 instead of the verify gate. */
export async function verifyHandle(experimentId: string): Promise<VerifyResult> {
  const result = await verifyReporterHandle(experimentId);
  if (result.ok) revalidatePath(`/agents/${experimentId}`, "layout");
  return result;
}

/** The owner-attest fallback — same revalidate shape as verifyHandle. */
export async function attestHandle(experimentId: string): Promise<ActionResult> {
  const result = await attestReporterHandle(experimentId);
  if (result.ok) revalidatePath(`/agents/${experimentId}`, "layout");
  return result;
}

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
  if (!reporterHandle) return { ok: false, error: "Could not load this desk." };

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

/** Today's UTC-day claim row for reporterHandle, or null if none exists yet — deny-all
 *  table, admin client only. */
async function todaysClaim(reporterHandle: string): Promise<{ status: string } | null> {
  const admin = createAdminClient();
  const utcDay = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("voice_extraction_claims")
    .select("status")
    .eq("reporter_handle", reporterHandle)
    .eq("utc_day", utcDay)
    .maybeSingle();
  return data ?? null;
}

/**
 * Manual retry for a verified desk whose extraction hasn't produced a guide yet.
 * `attemptVoiceExtraction` is void-returning and never throws (best-effort by design) — this
 * action infers the outcome itself by re-checking state after calling in:
 *   1. a `voice_guides` row now exists → extraction worked, revalidate.
 *   2. still absent, but a `voice_extraction_claims` row exists for today (reserved by this
 *      very call if it ran the extraction attempt, or by an earlier attempt today if this
 *      call's own claim was denied) → today's budget slot for this reporter is spent either
 *      way, so a further retry today would fail identically. Reported as "capped".
 *   3. no claim row at all (e.g. a malformed handle no-op) → a generic failure.
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
    return { ok: false, error: "Could not load this desk." };
  }

  await attemptVoiceExtraction(desk.reporter_handle, user.id);

  const admin = createAdminClient();
  const { data: guide } = await admin
    .from("voice_guides")
    .select("id")
    .eq("reporter_handle", desk.reporter_handle)
    .maybeSingle();
  if (guide) {
    revalidatePath(`/agents/${deskId}`, "layout");
    return { ok: true };
  }

  const claim = await todaysClaim(desk.reporter_handle);
  if (claim) {
    return { ok: false, error: "Extraction is capped for today — try again tomorrow." };
  }
  return { ok: false, error: "Extraction didn't produce a guide. Please try again later." };
}
