// The ONLY code that touches `x_accounts` — tokens never leave `lib/x`. `x_accounts` has RLS
// enabled with ZERO policies (the token columns are credentials and must never be readable by
// the browser/publishable key), so every function here runs on the admin (service-role) client
// and always scopes by `user_id`. This module does not itself resolve the current user — callers
// pass `userId` (see `lib/x/link-state.ts` for the cookie-client-then-store trust pattern).

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export type XAccount = Database["public"]["Tables"]["x_accounts"]["Row"];

/** Full linked-account row for one user, or null if not linked. Admin client. */
export async function getXAccount(userId: string): Promise<XAccount | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("x_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Insert-or-replace the whole link for a user (called at OAuth callback). */
export async function upsertXAccount(
  userId: string,
  data: {
    xUserId: string;
    handle: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: string; // ISO timestamptz
    scopes: string;
  },
): Promise<void> {
  const admin = createAdminClient();
  const { data: existing, error: selectError } = await admin
    .from("x_accounts")
    .select("x_user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (selectError) throw selectError;

  // A different X account must never inherit the old account's stored tier. Null it so the
  // stale value can't be mistaken for the new account's. Same account relinking or no prior
  // row: leave `tier` untouched, as before.
  const isDifferentAccount = existing !== null && existing.x_user_id !== data.xUserId;

  const { error } = await admin.from("x_accounts").upsert({
    user_id: userId,
    x_user_id: data.xUserId,
    handle: data.handle,
    access_token: data.accessToken,
    refresh_token: data.refreshToken,
    token_expires_at: data.tokenExpiresAt,
    scopes: data.scopes,
    updated_at: new Date().toISOString(),
    ...(isDifferentAccount ? { tier: null } : {}),
  });
  if (error) throw error;
}

export async function deleteXAccount(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("x_accounts").delete().eq("user_id", userId);
  if (error) throw error;
}
