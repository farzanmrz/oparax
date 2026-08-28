// app/api/cron/daily/route.ts
//
// The daily cron (vercel.json crons invoke GET at 06:00 UTC). Two independent sweeps, each
// try/catch'd on its own so one failure never stops the rest:
//   1. Trial expiry: active DM connections whose desk has no plan and whose trial started
//      more than 7 days ago get ONE payment DM (the fixed ledger idempotency key is the
//      once-guarantee) and the connection moves to state "trial_expired".
//   2. Ledger prune: dm_send_ledger rows past every cap window are deleted.
// Guarded with the timingSafeEqual Bearer pattern against CRON_SECRET.

import { timingSafeEqual } from "node:crypto";
import { captureServerEvent, reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BotSendError, botConfigured, sendBotDm } from "@/lib/x/bot";

export const maxDuration = 300;

const TRIAL_DAYS = 7;
/** Past every dm_send_ledger cap window (24h app/user windows) plus a day of margin. */
const LEDGER_PRUNE_MS = 48 * 3_600_000;

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

type Admin = ReturnType<typeof createAdminClient>;

type TrialAgent = {
  id: string;
  name: string | null;
  public_handle: string | null;
  trial_started_at: string | null;
  plan: string | null;
};

type TrialSummary = {
  activeConnections: number;
  newlyExpired: number;
  dmSent: number;
  dmAlreadySent: number;
  dmFailed: number;
  transitioned: number;
  deferredBotUnconfigured: number;
};

/** No plan bought AND the free week is actually over. A missing/garbled start date never
 *  expires anyone: without a known start there is no honest 7-day clock. */
function trialExpired(agent: TrialAgent): boolean {
  if (agent.plan) return false;
  if (!agent.trial_started_at) return false;
  const startedMs = Date.parse(agent.trial_started_at);
  if (Number.isNaN(startedMs)) return false;
  return Date.now() - startedMs >= TRIAL_DAYS * 24 * 3_600_000;
}

/** One newly-expired connection: send the payment DM once through the ledger, then move the
 *  connection to "trial_expired" regardless of how the send went. */
async function expireTrial(
  admin: Admin,
  connection: { id: string; agent_id: string; x_user_id: string; handle: string },
  agent: TrialAgent,
  summary: TrialSummary,
): Promise<void> {
  const handle = agent.public_handle ?? connection.handle;
  const distinctId = `x:${handle.toLowerCase()}`;
  const set = { handle: connection.handle, cohort: "pilot" };
  const eventProps = { agent_id: agent.id, pilot_handle: handle };

  // ONE payment DM ever per desk: the fixed idempotency key is the once-guarantee. On a
  // second run the reserve returns null, so the send is skipped but the state transition
  // below still happens if a prior run died before reaching it.
  const { data: reservationId, error: reserveError } = await admin.rpc("reserve_dm_send", {
    p_purpose: "payment",
    p_recipient: connection.x_user_id,
    p_agent_id: agent.id,
    p_idempotency_key: `payment:${agent.id}`,
  });
  if (reserveError) throw reserveError;

  if (reservationId) {
    try {
      await sendBotDm({
        participantId: connection.x_user_id,
        text: `Your free week is over. Keep alerts coming: oparax.ai/pay/${handle}`,
      });
      const { error: finalizeError } = await admin
        .from("dm_send_ledger")
        .update({ state: "sent", sent_at: new Date().toISOString() })
        .eq("id", reservationId);
      if (finalizeError) {
        reportServerException(finalizeError, {
          tags: { area: "alert_sender", stage: "daily_cron" },
        });
      }
      summary.dmSent++;
      captureServerEvent("payment_dm_sent", { distinctId, properties: eventProps, set });
    } catch (error) {
      summary.dmFailed++;
      if (error instanceof BotSendError) {
        // A definite refusal from X: release the reservation (delete = release) so the slot
        // returns. An ambiguous failure keeps the reservation reserved; the reconcile cron
        // finalizes it, and the idempotency key still blocks a duplicate send.
        const { error: releaseError } = await admin
          .from("dm_send_ledger")
          .delete()
          .eq("id", reservationId)
          .eq("state", "reserved");
        if (releaseError) {
          reportServerException(releaseError, {
            tags: { area: "alert_sender", stage: "daily_cron" },
          });
        }
      }
      reportServerException(error, {
        tags: { area: "alert_sender", stage: "daily_cron" },
        extra: { agentId: agent.id },
      });
    }
  } else {
    summary.dmAlreadySent++;
  }

  // Regardless of the send outcome the trial IS over: transition, guarded on the current
  // state so a concurrent transition never double-fires the event.
  const { data: transitioned, error: updateError } = await admin
    .from("dm_connections")
    .update({ state: "trial_expired" })
    .eq("id", connection.id)
    .eq("state", "active")
    .select("id");
  if (updateError) throw updateError;
  if (transitioned && transitioned.length > 0) {
    summary.transitioned++;
    captureServerEvent("trial_expired", { distinctId, properties: eventProps, set });
  }
}

/** Find active DM connections whose desk's free week ran out unpaid, and expire each. */
async function sweepTrialExpiry(admin: Admin): Promise<TrialSummary> {
  const summary: TrialSummary = {
    activeConnections: 0,
    newlyExpired: 0,
    dmSent: 0,
    dmAlreadySent: 0,
    dmFailed: 0,
    transitioned: 0,
    deferredBotUnconfigured: 0,
  };

  const { data: connections, error: connectionsError } = await admin
    .from("dm_connections")
    .select("id, agent_id, x_user_id, handle")
    .eq("state", "active");
  if (connectionsError) throw connectionsError;
  summary.activeConnections = connections?.length ?? 0;
  if (!connections || connections.length === 0) return summary;

  const agentIds = [...new Set(connections.map((connection) => connection.agent_id))];
  const { data: agents, error: agentsError } = await admin
    .from("agents")
    .select("id, name, public_handle, trial_started_at, plan")
    .in("id", agentIds);
  if (agentsError) throw agentsError;
  const agentById = new Map((agents ?? []).map((agent) => [agent.id, agent]));

  for (const connection of connections) {
    const agent = agentById.get(connection.agent_id);
    if (!agent || !trialExpired(agent)) continue;
    summary.newlyExpired++;
    if (!botConfigured()) {
      // Without the bot the payment DM cannot go out, and without the DM the person was
      // never told their trial ended. Leave the connection active and make the gap visible.
      summary.deferredBotUnconfigured++;
      console.warn("cron/daily: bot unconfigured, trial expiry deferred", {
        agentId: agent.id,
      });
      continue;
    }
    // Per-connection isolation: one desk's failure never blocks the others' expiry.
    try {
      await expireTrial(admin, connection, agent, summary);
    } catch (error) {
      reportServerException(error, {
        tags: { area: "alert_sender", stage: "daily_cron" },
        extra: { agentId: agent.id, connectionId: connection.id },
      });
    }
  }
  return summary;
}

/** Every cap the ledger enforces looks back at most 24h; rows older than 48h can never
 *  change another send's outcome again, so they are dead weight. */
async function pruneLedger(admin: Admin): Promise<number> {
  const cutoff = new Date(Date.now() - LEDGER_PRUNE_MS).toISOString();
  const { data, error } = await admin
    .from("dm_send_ledger")
    .delete()
    .lt("reserved_at", cutoff)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isAuthorized(req.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const summary: Record<string, unknown> = {};

  try {
    summary.trialExpiry = await sweepTrialExpiry(admin);
  } catch (error) {
    summary.trialExpiry = "error";
    reportServerException(error, { tags: { area: "alert_sender", stage: "daily_cron" } });
  }

  try {
    summary.ledgerPruned = await pruneLedger(admin);
  } catch (error) {
    summary.ledgerPruned = "error";
    reportServerException(error, { tags: { area: "alert_sender", stage: "daily_cron" } });
  }

  return Response.json(summary);
}
