import "server-only";

// lib/alerts/send.ts
//
// The alert path (Part D of #131), invoked from processDelivery after a story lands (new
// winner or grouped attachment) for desks with a live DM connection. Ordered gates:
//   1. DM-worthiness (qwen) — junk never even records a row; the feed page shows it anyway.
//   2. 30-minute window — a duplicate echo of an already-alerted story is suppressed (recorded).
//   3. Trial gate — expired and unpaid pauses sends (recorded).
//   4. Reservation — every send goes through reserve_dm_send; a refusal is a recorded skip.
//   5. Send — plain news text + short oparax.ai link, at most one image (fetched as bytes and
//      uploaded through the bot's media.write; upload failure degrades to text-only).
// Alert failure must NEVER fail the delivery that triggered it: this module reports and
// swallows everything.

import { randomBytes } from "node:crypto";
import type { NewsPoint } from "@/lib/agent/draft-council-run";
import { insertModelCalls, stampUsageEvent } from "@/lib/agent/ledger";
import { judgeAlertWorthiness, judgeDuplicateEcho } from "@/lib/alerts/judge";
import { captureServerEvent, reportServerException } from "@/lib/observability/posthog-server";
import type { createAdminClient } from "@/lib/supabase/admin";
import { BotSendError, botConfigured, sendBotDm, uploadBotDmImage } from "@/lib/x/bot";

type AdminClient = ReturnType<typeof createAdminClient>;

const ALERT_WINDOW_MS = 30 * 60_000;
const TRIAL_DAYS = 7;
const MAX_ALERT_TEXT_CHARS = 1_800;

export type AlertAgent = {
  id: string;
  ownerId: string;
  beat: string;
  publicHandle: string | null;
  trialStartedAt: string | null;
  plan: string | null;
};

export type AlertInput = {
  agent: AlertAgent;
  storyId: string;
  sourcePostId: string;
  draftId: string | null;
  newsTitle: string;
  newsPoints: NewsPoint[];
  /** First delivered photo URL (never a video variant) — the alert's single optional image. */
  firstPhotoUrl: string | null;
  deadlineAt?: number;
};

function trialActive(agent: AlertAgent): boolean {
  if (agent.plan) return true;
  if (!agent.trialStartedAt) return true;
  const startedMs = Date.parse(agent.trialStartedAt);
  if (Number.isNaN(startedMs)) return true;
  return Date.now() - startedMs < TRIAL_DAYS * 24 * 3_600_000;
}

function alertText(title: string, points: NewsPoint[], token: string): string {
  const link = `https://oparax.ai/l/${token}`;
  let body = title.trim();
  for (const point of points) {
    const next = `${body}\n\n${point.point.trim()}`;
    if (next.length > MAX_ALERT_TEXT_CHARS) break;
    body = next;
  }
  return `${body}\n\n${link}`;
}

async function recordAlert(
  admin: AdminClient,
  input: AlertInput,
  row: {
    status: "sent" | "suppressed_duplicate" | "skipped_cap" | "paused_trial" | "failed";
    suppressReason?: string | null;
    linkToken?: string | null;
    dmMessageId?: string | null;
    sentAt?: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("alerts").insert({
    agent_id: input.agent.id,
    story_id: input.storyId,
    source_post_id: input.sourcePostId,
    draft_id: input.draftId,
    status: row.status,
    suppress_reason: row.suppressReason ?? null,
    link_token: row.linkToken ?? null,
    dm_message_id: row.dmMessageId ?? null,
    sent_at: row.sentAt ?? null,
  });
  // The attempt-level unique means a concurrent retry already recorded this exact attempt —
  // that duplicate is fine; everything else is worth seeing.
  if (error && error.code !== "23505") {
    reportServerException(error, { tags: { area: "alert_sender" }, extra: { row } });
  }
}

/** Fire the alert gates for one landed story. Never throws. */
export async function maybeSendAlert(admin: AdminClient, input: AlertInput): Promise<void> {
  try {
    await runAlertFlow(admin, input);
  } catch (error) {
    reportServerException(error, {
      tags: { area: "alert_sender" },
      extra: {
        agentId: input.agent.id,
        storyId: input.storyId,
        sourcePostId: input.sourcePostId,
        pilot_handle: input.agent.publicHandle,
      },
    });
  }
}

async function runAlertFlow(admin: AdminClient, input: AlertInput): Promise<void> {
  if (!botConfigured()) return;
  const { agent } = input;

  const { data: connection, error: connectionError } = await admin
    .from("dm_connections")
    .select("id, x_user_id, handle, state")
    .eq("agent_id", agent.id)
    .in("state", ["active", "trial_expired"])
    .maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection) return;

  const distinctId = `x:${(agent.publicHandle ?? connection.handle).toLowerCase()}`;
  const set = { handle: connection.handle, cohort: "pilot" };
  const eventProps = {
    agent_id: agent.id,
    story_id: input.storyId,
    pilot_handle: agent.publicHandle ?? connection.handle,
  };

  if (connection.state === "trial_expired" || !trialActive(agent)) {
    await recordAlert(admin, input, { status: "paused_trial" });
    return;
  }

  const attribution = { distinctId, pilotHandle: agent.publicHandle ?? connection.handle };

  // Gate 1: worth an interruption at all? (Ledger-first, like every model stage.)
  const worthiness = await judgeAlertWorthiness({
    beat: agent.beat,
    candidateTitle: input.newsTitle,
    candidatePoints: input.newsPoints,
    deadlineAt: input.deadlineAt,
  });
  await insertModelCalls(
    admin,
    agent.ownerId,
    agent.id,
    [worthiness.call],
    input.sourcePostId,
    attribution,
  );
  await stampUsageEvent(admin, {
    owner_id: agent.ownerId,
    kind: "alert_judge",
    units: 1,
    cost_usd: worthiness.call.costUsd,
    ref_id: input.sourcePostId,
  });
  if (!worthiness.worthAlert) return;

  // Gate 2: the 30-minute window. A recent sent alert triggers the echo judgment.
  const windowStart = new Date(Date.now() - ALERT_WINDOW_MS).toISOString();
  const { data: recentAlerts, error: recentError } = await admin
    .from("alerts")
    .select("story_id")
    .eq("agent_id", agent.id)
    .eq("status", "sent")
    .gt("sent_at", windowStart);
  if (recentError) throw recentError;
  if (recentAlerts && recentAlerts.length > 0) {
    const storyIds = [...new Set(recentAlerts.map((row) => row.story_id))];
    const { data: winners, error: winnersError } = await admin
      .from("drafts")
      .select("story_id, news_title, news_points")
      .eq("agent_id", agent.id)
      .eq("is_winner", true)
      .in("story_id", storyIds);
    if (winnersError) throw winnersError;
    const alerted = (winners ?? []).map((row) => ({
      title: row.news_title ?? "",
      points: Array.isArray(row.news_points)
        ? row.news_points.flatMap((entry) => {
            const point =
              entry !== null && typeof entry === "object"
                ? (entry as Record<string, unknown>).point
                : null;
            return typeof point === "string" ? [point] : [];
          })
        : [],
    }));
    const echo = await judgeDuplicateEcho({
      candidateTitle: input.newsTitle,
      candidatePoints: input.newsPoints,
      recentlyAlerted: alerted,
      deadlineAt: input.deadlineAt,
    });
    await insertModelCalls(
      admin,
      agent.ownerId,
      agent.id,
      [echo.call],
      input.sourcePostId,
      attribution,
    );
    await stampUsageEvent(admin, {
      owner_id: agent.ownerId,
      kind: "alert_judge",
      units: 1,
      cost_usd: echo.call.costUsd,
      ref_id: input.sourcePostId,
    });
    if (echo.duplicate) {
      await recordAlert(admin, input, {
        status: "suppressed_duplicate",
        suppressReason: echo.reason,
      });
      captureServerEvent("alert_suppressed", { distinctId, properties: eventProps, set });
      return;
    }
  }

  // Gate 3 already covered trial state above (connection state + date math agree by then).

  // Gate 4: reserve.
  const idempotencyKey = `alert:${agent.id}:${input.storyId}:${input.sourcePostId}`;
  const { data: reservationId, error: reserveError } = await admin.rpc("reserve_dm_send", {
    p_purpose: "alert",
    p_recipient: connection.x_user_id,
    p_agent_id: agent.id,
    p_idempotency_key: idempotencyKey,
  });
  if (reserveError) throw reserveError;
  if (!reservationId) {
    await recordAlert(admin, input, { status: "skipped_cap" });
    captureServerEvent("alert_skipped_cap", { distinctId, properties: eventProps, set });
    return;
  }

  // Gate 5: send.
  const linkToken = randomBytes(16).toString("hex");
  const mediaId = input.firstPhotoUrl ? await uploadBotDmImage(input.firstPhotoUrl) : null;
  const text = alertText(input.newsTitle, input.newsPoints, linkToken);
  try {
    const sent = await sendBotDm({
      participantId: connection.x_user_id,
      text,
      ...(mediaId ? { mediaId } : {}),
    });
    const sentAt = new Date().toISOString();
    const { error: finalizeError } = await admin
      .from("dm_send_ledger")
      .update({ state: "sent", sent_at: sentAt })
      .eq("id", reservationId);
    if (finalizeError) {
      reportServerException(finalizeError, { tags: { area: "alert_sender" } });
    }
    await recordAlert(admin, input, {
      status: "sent",
      linkToken,
      dmMessageId: sent.dmEventId,
      sentAt,
    });
    captureServerEvent("alert_sent", {
      distinctId,
      properties: { ...eventProps, has_image: mediaId !== null },
      set,
    });
  } catch (error) {
    if (error instanceof BotSendError) {
      // A definite refusal from X: release the reservation (delete = release) so the slot
      // returns; a timed-out/ambiguous failure below keeps it consumed for the reconcile.
      const { error: releaseError } = await admin
        .from("dm_send_ledger")
        .delete()
        .eq("id", reservationId)
        .eq("state", "reserved");
      if (releaseError) {
        reportServerException(releaseError, { tags: { area: "alert_sender" } });
      }
    }
    await recordAlert(admin, input, { status: "failed" });
    captureServerEvent("alert_send_failed", { distinctId, properties: eventProps, set });
    reportServerException(error, {
      tags: { area: "alert_sender" },
      extra: { agentId: agent.id, storyId: input.storyId },
    });
  }
}
