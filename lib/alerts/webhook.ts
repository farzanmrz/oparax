import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { processCommand } from "@/lib/alerts/commands";
import { track } from "@/lib/analytics/events";
import { claimRun } from "@/lib/guards/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

const xId = z.string().regex(/^\d+$/);
// https://docs.x.com/x-api/activity/event-payloads, checked September 28, 2026.
const receivedSchema = z.object({
  data: z.object({
    event_uuid: z.string().min(1),
    event_type: z.literal("dm.received"),
    filter: z.object({ user_id: xId }),
    payload: z.object({
      direct_message_events: z
        .array(
          z.object({
            type: z.literal("message_create"),
            id: xId,
            created_timestamp: z.string().regex(/^\d+$/),
            message_create: z.object({
              target: z.object({ recipient_id: xId }),
              sender_id: xId,
              message_data: z.object({ text: z.string() }),
            }),
          }),
        )
        .min(1),
    }),
  }),
});

export function responseToken(text: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(text).digest("base64")}`;
}

export function validSignature(raw: string, signature: string | null, secret: string): boolean {
  if (!signature || !/^sha256=[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const expected = Buffer.from(responseToken(raw, secret));
  const supplied = Buffer.from(signature);
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}

export async function receiveWebhook(raw: string): Promise<boolean> {
  const db = createAdminClient();
  let payload: Json;
  try {
    payload = z.json().parse(JSON.parse(raw));
  } catch {
    payload = { raw };
  }
  const parsed = receivedSchema.safeParse(payload);
  if (!parsed.success) {
    const eventId = `unreadable:${createHash("sha256").update(raw).digest("hex")}`;
    const { error: insertError } = await db.from("dm_events").insert({
      event_id: eventId,
      payload,
      handled: null,
    });
    if (insertError && insertError.code !== "23505") throw insertError;
    const { error } = await db
      .from("dm_events")
      .update({ handled: "logged" })
      .eq("event_id", eventId)
      .is("handled", null);
    if (error) throw error;
    return true;
  }

  for (const event of parsed.data.data.payload.direct_message_events) {
    const message = event.message_create;
    const { error: insertError } = await db.from("dm_events").insert({
      event_id: event.id,
      sender_x_user_id: message.sender_id,
      text: message.message_data.text,
      payload,
      handled: null,
    });
    if (insertError && insertError.code !== "23505") throw insertError;
    const { data: saved, error: readError } = await db
      .from("dm_events")
      .select("handled,received_at")
      .eq("event_id", event.id)
      .single();
    if (readError) throw readError;
    if (saved.handled !== null) continue;

    // The first receipt's day keeps a replay after midnight from billing twice.
    const { error: costError } = await db.from("cost_ledger").insert({
      service: "x",
      kind: "dm_received",
      usd: 0.01,
      settled: true,
      external_id: `dm_received:${event.id}`,
      day: saved.received_at.slice(0, 10),
    });
    if (costError && costError.code !== "23505") throw costError;
    if (!costError)
      track("spend_recorded", { service: "x", kind: "dm_received", usd: 0.01 }, "server");

    // Serialize commands from the same person, including concurrent webhook retries.
    const claim = await claimRun(`dm:${message.sender_id}`, 360);
    if (!claim) return false;
    try {
      const { data: current, error: currentError } = await db
        .from("dm_events")
        .select("handled")
        .eq("event_id", event.id)
        .single();
      if (currentError) throw currentError;
      if (current.handled !== null) continue;
      const result =
        message.target.recipient_id === parsed.data.data.filter.user_id
          ? await processCommand({
              senderXUserId: message.sender_id,
              recipientXUserId: message.target.recipient_id,
              text: message.message_data.text,
            })
          : { handled: "ignored", monitorId: null };
      const { error } = await db
        .from("dm_events")
        .update({
          handled: result.handled,
          monitor_id: result.monitorId,
        })
        .eq("event_id", event.id)
        .is("handled", null);
      if (error) throw error;
    } finally {
      await claim.release();
    }
  }
  return true;
}
