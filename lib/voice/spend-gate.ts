// lib/voice/spend-gate.ts
//
// The pre-flight spend gate for voice extraction (D16 rail). SERVER-ONLY, admin-client-only
// throughout — `voice_extraction_claims` carries deny-all RLS (service role only).
//
// This is an ATOMIC CLAIM, not a sum-then-insert: `UNIQUE(reporter_handle, utc_day)` makes
// concurrent attempts race-safe. Two requests for the same reporter on the same UTC day both
// try to insert; the database — not application logic — decides the winner. The loser's
// insert violates the unique constraint (Postgres error code 23505) and is rejected BEFORE any
// billable Bright Data or LLM call ever fires. A "SELECT count, then INSERT if under cap"
// approach has a race window between the two statements; this collapses that window to zero.
import { createAdminClient } from "@/lib/supabase/admin";

/** Reserved per (reporter, UTC day) — Bright Data timeline pull (a few cents on the Web
 *  Scraper API) + one Fable-5 extraction call at L2's measured $0.855/reporter
 *  (docs/decisions.md L2), rounded up to the hard ceiling this pipeline already documents
 *  elsewhere ("$2 one-time extraction", .claude/rules/voice.md / decisions.md §11.9) so this
 *  constant matches the number the rest of the pipeline was designed against rather than
 *  introducing a second, competing estimate. */
export const EXTRACTION_WORST_CASE_USD = 2.0;

/** Exported so every reader of voice_extraction_claims (this module's own insert/update, and
 *  app/agents/[id]/voice/actions.ts's capReprobe cap-status check) shares one definition of
 *  "today" for the utc_day key — a day-boundary change (e.g. reporter-local timezone) would
 *  otherwise have to be made in two places that could silently drift apart. */
export function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * PRE-FLIGHT: reserve worst-case acquisition + extraction spend for reporter/UTC-day. Call
 * before any billable Bright Data or LLM call. `allowed: false` means today's claim for this
 * reporter already exists (either in flight or already terminal) — the caller must not spend.
 */
export async function claimExtractionBudget(
  handle: string,
): Promise<{ allowed: true } | { allowed: false; reason: "cap" }> {
  const admin = createAdminClient();
  const { error } = await admin.from("voice_extraction_claims").insert({
    reporter_handle: handle,
    utc_day: utcDay(),
    reserved_usd: EXTRACTION_WORST_CASE_USD,
    status: "reserved",
  });
  if (error?.code === "23505") return { allowed: false as const, reason: "cap" };
  if (error) throw error;
  return { allowed: true as const };
}

/**
 * Called after the extraction attempt finishes, success OR failure — completed paid work stays
 * metered. Updates the SAME claim row (matched by reporter_handle + utc_day) with the real
 * spend and a terminal status. Never throws out to the caller for a DB error here — log and
 * swallow (best-effort, matching attemptVoiceExtraction's own best-effort discipline in
 * create-desk-extraction.ts — a finalize failure must not crash an extraction that already
 * succeeded or already failed on its own terms).
 */
export async function finalizeExtractionBudget(
  handle: string,
  result: { status: "completed" | "failed"; actualUsd: number | null },
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("voice_extraction_claims")
      .update({ status: result.status, actual_usd: result.actualUsd })
      .eq("reporter_handle", handle)
      .eq("utc_day", utcDay());
    if (error) throw error;
  } catch (e) {
    console.error(`finalizeExtractionBudget: failed for @${handle}`, e);
  }
}
