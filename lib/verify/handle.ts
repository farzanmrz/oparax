// D14's reporter-handle verification backend: linked-X-OAuth-handle match (via
// `x_accounts.handle`, resolved through `getXLinkState()`) sets `experiments.reporter_verified_at`,
// with an owner-attest fallback for a reporter who won't link X but whose handle the desk owner
// (Farzan) vouches for. Cap enforcement and verification are independent — this module only
// ever touches `reporter_verified_at`.
//
// Server-only. No "use server" here — the Wave 3 server-action wrapper owns that; this module
// exposes plain async functions for it to call.

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeHandle } from "@/lib/x/handle";
import { getXLinkState } from "@/lib/x/link-state";

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "handle_mismatch" | "not_linked" | "not_found" };

/** Verifies experimentId's reporter_handle against the signed-in user's linked X account
 *  (getXLinkState() — the same cookie/RLS trust boundary every other server action in this
 *  repo uses to resolve "who is calling"). Compares normalizeHandle() of both sides so
 *  casing/@ don't cause a false mismatch. On a match, stamps
 *  experiments.reporter_verified_at = now() via the admin client — used for consistency with
 *  every other verification/spend-adjacent write in this slice, even though the RLS client
 *  could also do this write (experiments_update_own exists). */
export async function verifyReporterHandle(experimentId: string): Promise<VerifyResult> {
  const supabase = await createClient();

  const { data: experiment } = await supabase
    .from("experiments")
    .select("reporter_handle")
    .eq("id", experimentId)
    .maybeSingle();
  if (!experiment) return { ok: false, reason: "not_found" };

  const { linked, handle } = await getXLinkState();
  if (!linked || !handle) return { ok: false, reason: "not_linked" };

  if (normalizeHandle(handle) !== normalizeHandle(experiment.reporter_handle)) {
    return { ok: false, reason: "handle_mismatch" };
  }

  const admin = createAdminClient();
  await admin
    .from("experiments")
    .update({ reporter_verified_at: new Date().toISOString() })
    .eq("id", experimentId);

  return { ok: true };
}

/** The owner-attest fallback: sets reporter_verified_at = now() unconditionally for a desk
 *  the caller owns. Ownership is proven by reading the desk through the RLS/cookie client
 *  first (experiments_select_own) — the same ownership-then-write pattern as postDraftToX in
 *  lib/x/actions.ts — before writing with the admin client. This is a trust escape hatch for a
 *  reporter who doesn't want to link X but the owner vouches for the handle being real. */
export async function attestReporterHandle(
  experimentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: experiment } = await supabase
    .from("experiments")
    .select("id")
    .eq("id", experimentId)
    .maybeSingle();
  if (!experiment) return { ok: false, error: "That desk could not be found." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("experiments")
    .update({ reporter_verified_at: new Date().toISOString() })
    .eq("id", experimentId);
  if (error) return { ok: false, error: "Could not verify the reporter handle. Please try again." };

  return { ok: true };
}
