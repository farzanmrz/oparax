// lib/slack/link-state.ts
//
// Server-only ownership proof shared by the Slack OAuth routes. It never reads or returns token
// material.

import { createClient } from "@/lib/supabase/server";

/** The desk-ownership proof every Slack surface needs before touching that desk's
 *  `slack_accounts` row — a cookie-client (RLS) SELECT against `agents`, which is
 *  owner-scoped, so no row back means either "not signed in" or "not this reporter's desk"
 *  and both are treated identically. */
export async function ownsDesk(agentId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .maybeSingle();
  return !error && data !== null;
}
