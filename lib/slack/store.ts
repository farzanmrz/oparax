// lib/slack/store.ts
//
// The ONLY code that touches `slack_accounts`/`slack_delivery_receipts`. Both tables have
// RLS enabled with ZERO policies (deny-all — confirmed live via `get_advisors`), so every
// function here runs on the admin (service-role) client, scoped by `agent_id`. Mirrors
// `lib/x/store.ts`'s shape, but `slack_accounts.agent_id` is UNIQUE — a Slack workspace
// is connected to one desk, not one login, so every lookup here is desk-scoped rather than
// user-scoped. This module does not itself resolve the caller's identity or desk ownership —
// callers pass `agentId` (see `lib/slack/link-state.ts` for the cookie-client-proves-
// ownership-then-store trust pattern).

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export type SlackAccount = Database["public"]["Tables"]["slack_accounts"]["Row"];

/** Full linked-account row for one desk, or null if not linked. Admin client. */
export async function getSlackAccount(agentId: string): Promise<SlackAccount | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("slack_accounts")
    .select("*")
    .eq("agent_id", agentId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Insert-or-replace the whole link for a desk (called at the OAuth callback, Wave 3).
 *  `agent_id` is the UNIQUE conflict target — a desk reconnecting Slack replaces its
 *  prior link rather than erroring on the unique constraint. */
export async function upsertSlackAccount(
  agentId: string,
  data: {
    teamId: string;
    teamName: string;
    channelId: string;
    channelName: string;
    accessToken: string;
    botUserId: string;
    scopes: string;
  },
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("slack_accounts").upsert(
    {
      agent_id: agentId,
      team_id: data.teamId,
      team_name: data.teamName,
      channel_id: data.channelId,
      channel_name: data.channelName,
      access_token: data.accessToken,
      bot_user_id: data.botUserId,
      scopes: data.scopes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "agent_id" },
  );
  if (error) throw error;
}

/** Atomic idempotency claim for one Slack interactive-button callback (used by the
 *  interactions route, a later task) — mirrors `draft-pipeline.ts`'s `draft_claims`
 *  insert-then-branch-on-23505 atomic-claim shape (`draftForAgent`). INSERTs and
 *  returns `true` on success, `false` on a `23505` unique violation (Slack redelivered the
 *  same interaction, e.g. after a slow ack), any other error propagates. */
export async function claimDeliveryReceipt(
  interactionId: string,
  agentId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("slack_delivery_receipts")
    .insert({ interaction_id: interactionId, agent_id: agentId })
    .select("id");
  if (error) {
    if (error.code === "23505") return false;
    throw error;
  }
  return true;
}
