// lib/slack/link-state.ts
//
// The frozen accessor, mirroring `lib/x/link-state.ts`'s `getXLinkState()` contract exactly.
// Server-only — call from a Server Component or Server Action. Takes `agentId` as a
// param (not the signed-in user — a desk's Slack link is desk-scoped, not user-scoped), and
// verifies the caller owns that desk via the cookie (RLS) client — `agents` is
// owner-scoped, so a SELECT that returns no row means either "not signed in" or "not this
// reporter's desk" and both are treated as unlinked — before delegating to
// `lib/slack/store.ts` (the admin client). Never touches `slack_accounts` directly, and
// returns NO token material, ever.

import { createClient } from "@/lib/supabase/server";
import { getSlackAccount } from "./store";

/** The desk-ownership proof every Slack surface needs before touching that desk's
 *  `slack_accounts` row — a cookie-client (RLS) SELECT against `agents`, which is
 *  owner-scoped, so no row back means either "not signed in" or "not this reporter's desk"
 *  and both are treated identically. Shared by getSlackLinkState below, lib/slack/actions.ts's
 *  unlinkSlack/sendTestSlack, and both app/auth/slack/* OAuth routes — previously
 *  reimplemented at each of those four call sites. */
export async function ownsDesk(agentId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .maybeSingle();
  return !error && data !== null;
}

export async function getSlackLinkState(
  agentId: string,
): Promise<{ linked: boolean; teamName: string | null; channelName: string | null }> {
  if (!(await ownsDesk(agentId))) {
    return { linked: false, teamName: null, channelName: null };
  }

  const account = await getSlackAccount(agentId);
  return {
    linked: account !== null,
    teamName: account?.team_name ?? null,
    channelName: account?.channel_name ?? null,
  };
}
