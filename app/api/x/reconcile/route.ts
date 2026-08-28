// app/api/x/reconcile/route.ts
//
// The 15-minute XAA reconcile cron (vercel.json crons invoke GET). Keeps X's watch list
// matched to what the desks track, keeps the webhook registered and valid, sweeps the event
// receipt ledger, finalizes stale DM-send reservations, and polls DM lookups as the fallback
// consent channel. Guarded with the timingSafeEqual Bearer pattern against CRON_SECRET.

import { timingSafeEqual } from "node:crypto";
import { reportServerException, reportServerMessage } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleInboundDm } from "@/lib/x/dm-intake";
import { resolveXUserIds } from "@/lib/x/handle-check";
import { claimLedgerRow, processClaimedEvent } from "@/lib/x/webhook-events";
import {
  appBearerToken,
  createSubscription,
  createWebhook,
  deleteSubscription,
  listSubscriptions,
  listWebhooks,
  replayWebhook,
  revalidateWebhook,
  type XaaWebhook,
} from "@/lib/x/xaa";

export const maxDuration = 300;

const WEBHOOK_URL = process.env.X_WEBHOOK_URL ?? "https://oparax.ai/api/x/webhook";
/** Past the 800s claim fence at the pipeline's stale cutoff, plus margin. */
const LEDGER_STALE_MS = 900_000;
/** Longer than any send path can run; a reservation still 'reserved' after this MAY have
 *  delivered, so it is finalized failed but its row keeps counting against the caps. */
const RESERVATION_STALE_MS = 15 * 60_000;
/** "Zero post.create events across all subscriptions for an implausible interval." */
const QUIET_REPLAY_WINDOW_MS = 2 * 60 * 60_000;

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

type Admin = ReturnType<typeof createAdminClient>;

/** Bootstrap, idempotent: the webhook exists for the prod URL and is valid. Returns the
 *  webhook plus whether it had to be (re)created or revalidated — a replay trigger. */
async function ensureWebhook(): Promise<{ webhook: XaaWebhook | null; recovered: boolean }> {
  const webhooks = await listWebhooks();
  const existing = webhooks.find((hook) => hook.url === WEBHOOK_URL);
  if (existing?.valid) return { webhook: existing, recovered: false };
  if (existing) {
    await revalidateWebhook(existing.id);
    return { webhook: { ...existing, valid: true }, recovered: true };
  }
  const created = await createWebhook(WEBHOOK_URL);
  return { webhook: created, recovered: created !== null };
}

/**
 * Build-time check 2's ordered registration path: the bot's chat.received subscription.
 * (a) bot token; (b) on 401/403 the app bearer; (c) both refused — flag it, and the DM-lookup
 * fallback poll below carries consent instead. Decision rule locked in advance.
 */
async function ensureDmSubscription(botUserId: string, hasChatSubscription: boolean) {
  if (hasChatSubscription) return;
  const botToken = process.env.X_BOT_TOKEN;
  const attempts: { label: string; bearer: string }[] = [
    ...(botToken ? [{ label: "bot_token", bearer: botToken }] : []),
    { label: "app_bearer", bearer: appBearerToken() },
  ];
  for (const attempt of attempts) {
    try {
      await createSubscription({
        eventType: "chat.received",
        userId: botUserId,
        conversationType: "direct",
        bearer: attempt.bearer,
      });
      console.log(`x/reconcile: chat.received subscription registered via ${attempt.label}`);
      return;
    } catch (error) {
      console.warn(`x/reconcile: chat.received registration via ${attempt.label} refused`, error);
    }
  }
  reportServerMessage("XAA_DM_SUBSCRIPTION=unavailable", {
    tags: { area: "x_reconcile", outcome: "dm_subscription_unavailable" },
  });
}

/** Diff agents.tracked_handles (THE X source of truth) against X's subscription list. */
async function reconcileSubscriptions(admin: Admin): Promise<{
  desired: number;
  created: number;
  deleted: number;
  failures: number;
  hasChatSubscription: boolean;
  postCreateCount: number;
}> {
  const { data: agents, error } = await admin
    .from("agents")
    .select("id, owner_id, tracked_handles, status")
    .eq("status", "active");
  if (error) throw error;

  // Resolve handles per owning desk so the lookup metering lands on a real owner.
  const handleOwners = new Map<string, string>(); // lower handle -> owner_id
  for (const agent of agents ?? []) {
    for (const handle of agent.tracked_handles ?? []) {
      const lower = handle.toLowerCase();
      if (!handleOwners.has(lower)) handleOwners.set(lower, agent.owner_id);
    }
  }
  const byOwner = new Map<string, string[]>();
  for (const [handle, ownerId] of handleOwners) {
    byOwner.set(ownerId, [...(byOwner.get(ownerId) ?? []), handle]);
  }
  const desiredUserIds = new Set<string>();
  for (const [ownerId, handles] of byOwner) {
    const resolved = await resolveXUserIds(handles, ownerId);
    for (const id of resolved.values()) desiredUserIds.add(id);
  }

  const subscriptions = await listSubscriptions();
  const postCreateSubs = subscriptions.filter((sub) => sub.eventType === "post.create");
  const hasChatSubscription = subscriptions.some((sub) => sub.eventType === "chat.received");
  const subscribedUserIds = new Set(
    postCreateSubs.map((sub) => sub.userId).filter((id): id is string => id !== null),
  );

  let created = 0;
  let deleted = 0;
  let failures = 0;
  for (const userId of desiredUserIds) {
    if (subscribedUserIds.has(userId)) continue;
    try {
      await createSubscription({ eventType: "post.create", userId });
      created++;
    } catch (error) {
      failures++;
      console.error("x/reconcile: subscription create failed", { userId, error });
    }
  }
  const botUserId = process.env.X_BOT_USER_ID ?? null;
  for (const sub of postCreateSubs) {
    if (sub.userId === null || desiredUserIds.has(sub.userId)) continue;
    if (botUserId && sub.userId === botUserId) continue;
    try {
      await deleteSubscription(sub.id);
      deleted++;
    } catch (error) {
      failures++;
      console.error("x/reconcile: subscription delete failed", { id: sub.id, error });
    }
  }
  return {
    desired: desiredUserIds.size,
    created,
    deleted,
    failures,
    hasChatSubscription,
    postCreateCount: postCreateSubs.length,
  };
}

/** Recovery sweep: pending/processing ledger rows older than the claim fence + margin. */
async function sweepLedger(admin: Admin): Promise<number> {
  const cutoff = new Date(Date.now() - LEDGER_STALE_MS).toISOString();
  const { data: stale, error } = await admin
    .from("x_webhook_events")
    .select("id, event_type, payload")
    .in("state", ["pending", "processing"])
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  let reprocessed = 0;
  for (const row of stale ?? []) {
    const claimed = await claimLedgerRow(admin, row.id, ["pending", "processing"]);
    if (!claimed) continue;
    await processClaimedEvent(admin, row, { verifySettledOnAlreadyDrafted: true });
    reprocessed++;
  }
  return reprocessed;
}

/** Timed-out sends MAY have delivered: finalize failed, keep the row consuming its cap slot. */
async function finalizeStaleReservations(admin: Admin): Promise<number> {
  const cutoff = new Date(Date.now() - RESERVATION_STALE_MS).toISOString();
  const { data, error } = await admin
    .from("dm_send_ledger")
    .update({ state: "failed" })
    .eq("state", "reserved")
    .lt("reserved_at", cutoff)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

/** Fallback consent channel: while any connection is pending, read the bot's recent DM events
 *  once per tick (within the per-user 15/15min lookup cap) and run them through the same
 *  intake logic the webhook uses. Carries the flow when chat.received registration is refused
 *  or an event was missed. */
async function pollDmFallback(admin: Admin): Promise<void> {
  const botToken = process.env.X_BOT_TOKEN;
  if (!botToken) return;
  const { data: pending, error } = await admin
    .from("dm_connections")
    .select("id")
    .eq("state", "pending")
    .limit(1);
  if (error || !pending?.length) return;
  try {
    const res = await fetch(
      "https://api.x.com/2/dm_events?dm_event.fields=sender_id,text,event_type&max_results=50",
      {
        headers: { authorization: `Bearer ${botToken}` },
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok) {
      console.warn(`x/reconcile: DM fallback lookup failed (${res.status})`);
      return;
    }
    const body = (await res.json()) as {
      data?: { sender_id?: string; text?: string; event_type?: string }[];
    };
    const botUserId = process.env.X_BOT_USER_ID;
    for (const event of body.data ?? []) {
      if (!event.sender_id || typeof event.text !== "string") continue;
      if (botUserId && event.sender_id === botUserId) continue;
      await handleInboundDm(admin, { senderXUserId: event.sender_id, text: event.text });
    }
  } catch (error) {
    console.warn("x/reconcile: DM fallback poll failed", error);
  }
}

/** A receipt ledger cannot "see gaps" on its own — replay only on the two named triggers:
 *  the webhook was found invalid/unregistered, or zero post.create events arrived across all
 *  subscriptions for an implausible interval. */
async function maybeReplay(
  admin: Admin,
  webhook: XaaWebhook | null,
  webhookRecovered: boolean,
  postCreateCount: number,
): Promise<void> {
  if (!webhook) return;
  let trigger = webhookRecovered ? "webhook_recovered" : null;
  if (!trigger && postCreateCount > 0) {
    const since = new Date(Date.now() - QUIET_REPLAY_WINDOW_MS).toISOString();
    const { count, error } = await admin
      .from("x_webhook_events")
      .select("id", { count: "exact", head: true })
      .ilike("event_type", "%post%")
      .gt("created_at", since);
    if (!error && (count ?? 0) === 0) trigger = "quiet_pipeline";
  }
  if (!trigger) return;
  try {
    await replayWebhook(webhook.id, new Date(Date.now() - QUIET_REPLAY_WINDOW_MS), new Date());
    console.log(`x/reconcile: replay requested (${trigger})`);
  } catch (error) {
    console.error("x/reconcile: replay request failed", error);
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isAuthorized(req.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const summary: Record<string, unknown> = {};

  let webhook: XaaWebhook | null = null;
  let webhookRecovered = false;
  try {
    const ensured = await ensureWebhook();
    webhook = ensured.webhook;
    webhookRecovered = ensured.recovered;
    summary.webhook = webhook ? { id: webhook.id, recovered: webhookRecovered } : "unregistered";
  } catch (error) {
    summary.webhook = "error";
    reportServerException(error, { tags: { area: "x_reconcile", stage: "webhook_bootstrap" } });
  }

  try {
    const diff = await reconcileSubscriptions(admin);
    summary.subscriptions = diff;
    if (diff.failures > 0) {
      reportServerMessage("x/reconcile: subscription diff left a residual mismatch", {
        tags: { area: "x_reconcile", outcome: "residual_mismatch" },
        extra: diff,
      });
    }
    const botUserId = process.env.X_BOT_USER_ID;
    if (botUserId) {
      await ensureDmSubscription(botUserId, diff.hasChatSubscription);
    }
    await maybeReplay(admin, webhook, webhookRecovered, diff.postCreateCount);
  } catch (error) {
    summary.subscriptions = "error";
    reportServerException(error, { tags: { area: "x_reconcile", stage: "subscription_diff" } });
  }

  try {
    summary.ledgerReprocessed = await sweepLedger(admin);
  } catch (error) {
    summary.ledgerReprocessed = "error";
    reportServerException(error, { tags: { area: "x_reconcile", stage: "ledger_sweep" } });
  }

  try {
    summary.staleReservationsFinalized = await finalizeStaleReservations(admin);
  } catch (error) {
    summary.staleReservationsFinalized = "error";
    reportServerException(error, { tags: { area: "x_reconcile", stage: "dm_ledger" } });
  }

  await pollDmFallback(admin);

  return Response.json(summary);
}
