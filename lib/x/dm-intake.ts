import "server-only";

// lib/x/dm-intake.ts
//
// The bot's inbound-message brain: a "yes" from a pending connection switches alerts on and
// starts the trial clock; a "stop" from any live connection switches alerts off; anything else
// is ignored but counted. Called from the XAA webhook's chat.received path and from the
// reconcile route's DM-lookup fallback poll, so transitions here MUST be idempotent — the same
// message can arrive through both doors.

import { captureServerEvent, reportServerException } from "@/lib/observability/posthog-server";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type DmIntakeOutcome = "consented" | "stopped" | "ignored" | "no_connection";

function pilotDistinctId(publicHandle: string | null, connectionHandle: string): string {
  return `x:${(publicHandle ?? connectionHandle).toLowerCase()}`;
}

export async function handleInboundDm(
  admin: AdminClient,
  input: { senderXUserId: string; text: string },
): Promise<DmIntakeOutcome> {
  const normalized = input.text.trim().toLowerCase();

  const { data: connection, error } = await admin
    .from("dm_connections")
    .select("id, agent_id, handle, state, agents(public_handle, trial_started_at)")
    .eq("x_user_id", input.senderXUserId)
    .in("state", ["pending", "active", "trial_expired"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    reportServerException(error, { tags: { area: "dm_intake" } });
    return "no_connection";
  }
  if (!connection) return "no_connection";

  const agent = connection.agents as unknown as { public_handle: string | null } | null;
  const distinctId = pilotDistinctId(agent?.public_handle ?? null, connection.handle);
  const set = { handle: connection.handle, cohort: "pilot" };

  if (normalized === "stop") {
    const { error: stopError } = await admin
      .from("dm_connections")
      .update({ state: "stopped" })
      .eq("id", connection.id)
      .neq("state", "stopped");
    if (stopError) {
      reportServerException(stopError, { tags: { area: "dm_intake" } });
      return "ignored";
    }
    captureServerEvent("dm_stopped", {
      distinctId,
      properties: { agent_id: connection.agent_id },
      set,
    });
    return "stopped";
  }

  if (normalized === "yes") {
    if (connection.state !== "pending") return "ignored"; // an idempotent re-yes
    const { data: updated, error: yesError } = await admin
      .from("dm_connections")
      .update({ state: "active", consent_at: new Date().toISOString() })
      .eq("id", connection.id)
      .eq("state", "pending")
      .select("id");
    if (yesError || !updated?.length) {
      if (yesError) reportServerException(yesError, { tags: { area: "dm_intake" } });
      return "ignored";
    }
    // The trial clock starts at the yes reply — and only once per desk: a re-authorize after a
    // stop must never hand out a second free week.
    const { error: trialError } = await admin
      .from("agents")
      .update({ trial_started_at: new Date().toISOString() })
      .eq("id", connection.agent_id)
      .is("trial_started_at", null);
    if (trialError) reportServerException(trialError, { tags: { area: "dm_intake" } });
    captureServerEvent("dm_consented", {
      distinctId,
      properties: { agent_id: connection.agent_id },
      set,
    });
    return "consented";
  }

  captureServerEvent("dm_message_ignored", {
    distinctId,
    properties: { agent_id: connection.agent_id, length: normalized.length },
  });
  return "ignored";
}
