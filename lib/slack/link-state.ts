// lib/slack/link-state.ts
//
// The frozen accessor, mirroring `lib/x/link-state.ts`'s `getXLinkState()` contract exactly.
// Server-only — call from a Server Component or Server Action. Takes `experimentId` as a
// param (not the signed-in user — a desk's Slack link is desk-scoped, not user-scoped), and
// verifies the caller owns that desk via the cookie (RLS) client — `experiments` is
// owner-scoped, so a SELECT that returns no row means either "not signed in" or "not this
// reporter's desk" and both are treated as unlinked — before delegating to
// `lib/slack/store.ts` (the admin client). Never touches `slack_accounts` directly, and
// returns NO token material, ever.

import { createClient } from "@/lib/supabase/server";
import { getSlackAccount } from "./store";

export async function getSlackLinkState(
  experimentId: string,
): Promise<{ linked: boolean; teamName: string | null; channelName: string | null }> {
  const supabase = await createClient();
  const { data: experiment, error } = await supabase
    .from("experiments")
    .select("id")
    .eq("id", experimentId)
    .maybeSingle();
  if (error || !experiment) return { linked: false, teamName: null, channelName: null };

  const account = await getSlackAccount(experimentId);
  return {
    linked: account !== null,
    teamName: account?.team_name ?? null,
    channelName: account?.channel_name ?? null,
  };
}
