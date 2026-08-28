// app/api/x/webhook/route.ts
//
// The XAA door: X pushes every subscribed event here. GET answers the CRC handshake (HMAC over
// the app CONSUMER secret — not X_CLIENT_SECRET); POST verifies the delivery signature with the
// same secret, records every event in the x_webhook_events receipt ledger BEFORE answering 200
// (the unique event_id makes duplicate deliveries a no-op), then processes in `after()` so X's
// delivery timeout is never hostage to the pipeline. This route owns HTTP concerns and the
// ledger handshake ONLY — persistence, metering, and story logic live in processDelivery via
// lib/x/webhook-events.ts.

import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { reconcileMissingCosts } from "@/lib/agent/gateway-cost";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { claimLedgerRow, extractWebhookEvents, processClaimedEvent } from "@/lib/x/webhook-events";

export const maxDuration = 800;
const DRAFTING_DEADLINE_MARGIN_MS = 60_000;

function consumerSecret(): string | null {
  return process.env.X_CONSUMER_SECRET?.trim() || null;
}

function signBody(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("base64")}`;
}

/** CRC handshake — must answer within 10s, so it does no DB work at all. */
export async function GET(req: Request) {
  const secret = consumerSecret();
  if (!secret) return new Response("X_CONSUMER_SECRET is not configured", { status: 503 });
  const crcToken = new URL(req.url).searchParams.get("crc_token");
  if (!crcToken) return new Response("missing crc_token", { status: 400 });
  return Response.json({ response_token: signBody(secret, crcToken) });
}

export async function POST(req: Request) {
  const requestStartedAt = Date.now();
  const secret = consumerSecret();
  if (!secret) return new Response("X_CONSUMER_SECRET is not configured", { status: 503 });

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-twitter-webhooks-signature");
  if (!signatureHeader) return new Response("Unauthorized", { status: 401 });
  const expected = Buffer.from(signBody(secret, rawBody));
  const actual = Buffer.from(signatureHeader);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("invalid JSON body", { status: 400 });
  }

  const admin = createAdminClient();
  const events = extractWebhookEvents(body);

  // Ledger BEFORE ack. ignoreDuplicates makes a redelivered event a no-op (no row returned),
  // so only rows this request actually inserted are processed below.
  const insertedIds: { id: string; event_type: string; payload: Json }[] = [];
  for (const event of events) {
    const { data, error } = await admin
      .from("x_webhook_events")
      .upsert(
        {
          event_id: event.eventId,
          event_type: event.eventType,
          payload: event.payload,
          x_post_id: event.xPostId,
          sender_x_user_id: event.senderXUserId,
          state: "pending",
        },
        { onConflict: "event_id", ignoreDuplicates: true },
      )
      .select("id, event_type, payload");
    if (error) {
      // A ledger write failure must NOT return 200 — X retries, and the retry is our recovery.
      reportServerException(error, { tags: { area: "x_webhook" } });
      return new Response("ledger write failed", { status: 500 });
    }
    if (data && data.length > 0) insertedIds.push(data[0]);
  }

  after(async () => {
    const deadlineAt = requestStartedAt + (maxDuration * 1000 - DRAFTING_DEADLINE_MARGIN_MS);
    for (const row of insertedIds) {
      const claimed = await claimLedgerRow(admin, row.id);
      if (!claimed) continue;
      await processClaimedEvent(
        admin,
        { id: row.id, event_type: row.event_type, payload: row.payload },
        { deadlineAt },
      );
    }

    // Same adaptive cost-repair sweep the ingest route runs: without it, X-originated gateway
    // costs stay null and the per-person cost scoreboard is empty. The sleep shrinks to fit
    // whatever budget processing left, and skips loudly when even the margin can't fit.
    const RECONCILE_LAG_MS = 25_000;
    const RECONCILE_SAFETY_MARGIN_MS = 5_000;
    const elapsedMs = Date.now() - requestStartedAt;
    const remainingMs = maxDuration * 1000 - elapsedMs;
    if (remainingMs <= RECONCILE_SAFETY_MARGIN_MS) {
      console.log(
        `api/x/webhook: skipping cost reconciliation — only ${remainingMs}ms left of the ${maxDuration}s budget (${elapsedMs}ms elapsed)`,
      );
      return;
    }
    const sleepMs = Math.min(RECONCILE_LAG_MS, remainingMs - RECONCILE_SAFETY_MARGIN_MS);
    try {
      await new Promise((resolve) => setTimeout(resolve, sleepMs));
      const { repaired, totalUsd } = await reconcileMissingCosts(admin);
      if (repaired > 0) {
        console.log(`api/x/webhook: reconciled ${repaired} model_calls costs ($${totalUsd})`);
      }
    } catch (e) {
      // Pricing repair must never look like a delivery failure.
      console.error("api/x/webhook: reconcileMissingCosts failed", e);
    }
  });

  return Response.json({ received: events.length, recorded: insertedIds.length });
}
