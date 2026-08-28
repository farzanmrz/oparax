import "server-only";

// lib/x/webhook-events.ts
//
// XAA event plumbing shared by the webhook route (live deliveries) and the reconcile route
// (recovery sweep): payload -> individual ledger events, ledger row -> pipeline run. The
// x_webhook_events receipt ledger is the durability story — a row is inserted BEFORE the
// webhook answers 200, and every row ends in a terminal state (processed / excluded / failed)
// or gets swept back up by the reconcile cron. Unrecognized shapes are excluded with a reason,
// never dropped silently, so QC and the owner see live evidence of whatever X actually sends.

import { createHash } from "node:crypto";
import { type IngestDelivery, processDelivery } from "@/lib/agent/draft-pipeline";
import { reportServerException } from "@/lib/observability/posthog-server";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { handleInboundDm } from "@/lib/x/dm-intake";

type AdminClient = ReturnType<typeof createAdminClient>;
type XDelivery = Extract<IngestDelivery, { source: "x" }>;

const MAX_PAYLOAD_BYTES = 64 * 1024;

export type ExtractedEvent = {
  eventId: string;
  eventType: string;
  payload: Json;
  raw: unknown;
  xPostId: string | null;
  senderXUserId: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** The post object, wherever this payload shape put it. */
function postOf(raw: unknown): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record) return null;
  for (const key of ["data", "post", "tweet"]) {
    const nested = asRecord(record[key]);
    if (nested && (str(nested.id) || str(nested.id_str)) && nested.text !== undefined) {
      return nested;
    }
  }
  if ((str(record.id) || str(record.id_str)) && record.text !== undefined) return record;
  return null;
}

function includesOf(raw: unknown): Record<string, unknown> | null {
  const record = asRecord(raw);
  return asRecord(record?.includes) ?? asRecord(asRecord(record?.data)?.includes) ?? null;
}

function postIdOf(raw: unknown): string | null {
  const post = postOf(raw);
  return post ? (str(post.id) ?? str(post.id_str)) : null;
}

function dmOf(raw: unknown): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record) return null;
  const candidates = [record, asRecord(record.data), asRecord(record.message_create)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (str(candidate.sender_id) && (str(candidate.text) || asRecord(candidate.message_data))) {
      return candidate;
    }
    const nested = asRecord(candidate.message_create);
    if (nested && str(nested.sender_id)) return { ...candidate, ...nested };
  }
  return null;
}

function dmSenderOf(raw: unknown): string | null {
  const dm = dmOf(raw);
  return dm ? str(dm.sender_id) : null;
}

function boundedPayload(raw: unknown): Json {
  const serialized = JSON.stringify(raw ?? null);
  if (Buffer.byteLength(serialized, "utf8") <= MAX_PAYLOAD_BYTES) {
    return (raw ?? null) as Json;
  }
  return {
    _truncated: true,
    original_bytes: Buffer.byteLength(serialized, "utf8"),
  } as unknown as Json;
}

function contentHash(raw: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(raw ?? null))
    .digest("hex");
}

function eventOf(eventType: string, raw: unknown): ExtractedEvent {
  const record = asRecord(raw);
  const xPostId = postIdOf(raw);
  const senderXUserId = dmSenderOf(raw);
  const nativeId =
    str(record?.event_id) ??
    str(record?.id) ??
    (eventType.startsWith("chat") ? (str(dmOf(raw)?.id) ?? null) : null) ??
    xPostId;
  return {
    eventId: `${eventType}:${nativeId ?? contentHash(raw)}`,
    eventType,
    payload: boundedPayload(raw),
    raw,
    xPostId,
    senderXUserId,
  };
}

/**
 * Split one webhook body into individual events. Handles the shapes X plausibly delivers:
 * a single typed event ({event_type: "post.create", ...}), a batch ({events: [...]}), and the
 * classic Account Activity envelope (tweet_create_events / direct_message_events arrays under
 * for_user_id). Anything else comes back as one "unknown" event so the ledger still records it.
 */
export function extractWebhookEvents(body: unknown): ExtractedEvent[] {
  const record = asRecord(body);
  if (!record) return [eventOf("unknown", body)];

  const typed = str(record.event_type) ?? str(record.type);
  if (typed) return [eventOf(typed, body)];

  if (Array.isArray(record.events)) {
    return record.events.map((entry) => {
      const entryType = str(asRecord(entry)?.event_type) ?? str(asRecord(entry)?.type) ?? "unknown";
      return eventOf(entryType, entry);
    });
  }

  const events: ExtractedEvent[] = [];
  if (Array.isArray(record.tweet_create_events)) {
    for (const tweet of record.tweet_create_events) events.push(eventOf("post.create", tweet));
  }
  if (Array.isArray(record.direct_message_events)) {
    for (const dm of record.direct_message_events) events.push(eventOf("chat.received", dm));
  }
  if (events.length > 0) return events;

  // CRC-style or housekeeping bodies with no event content still get one ledger row.
  return [eventOf("unknown", body)];
}

/** Build-time check 1's locked rule: a subscribed handle's own replies and reposts are
 *  defensively excluded, whichever marker shape the payload carries; the exclusion stays
 *  regardless of what live traffic shows — only this marker list may grow. */
function isOwnReplyOrRepost(post: Record<string, unknown>): boolean {
  if (
    str(post.in_reply_to_user_id) ||
    str(post.in_reply_to_user_id_str) ||
    str(post.in_reply_to_status_id) ||
    str(post.in_reply_to_status_id_str)
  ) {
    return true;
  }
  if (asRecord(post.retweeted_status)) return true;
  if (Array.isArray(post.referenced_tweets)) {
    for (const ref of post.referenced_tweets) {
      const type = str(asRecord(ref)?.type);
      if (type === "retweeted" || type === "quoted" || type === "replied_to") return true;
    }
  }
  return false;
}

function mediaOf(
  post: Record<string, unknown>,
  includes: Record<string, unknown> | null,
): { kind: string; imageUrl: string }[] {
  const media: { kind: string; imageUrl: string }[] = [];

  // v2 shape: attachments.media_keys referencing includes.media.
  const mediaKeys = asRecord(post.attachments)?.media_keys;
  const includedMedia = Array.isArray(includes?.media) ? includes.media : [];
  if (Array.isArray(mediaKeys) && includedMedia.length > 0) {
    const byKey = new Map(
      includedMedia.flatMap((m) => {
        const rec = asRecord(m);
        const key = str(rec?.media_key);
        return key && rec ? [[key, rec] as const] : [];
      }),
    );
    for (const key of mediaKeys) {
      const m = typeof key === "string" ? byKey.get(key) : undefined;
      if (!m) continue;
      // Photo carries `url`; video/GIF carry only the poster frame — NEVER a video.twimg.com
      // variant, which the media validator would silently drop.
      const imageUrl = str(m.url) ?? str(m.preview_image_url);
      const kind = str(m.type);
      if (kind && imageUrl) media.push({ kind, imageUrl });
    }
  }

  // v1.1 shape: extended_entities.media with media_url_https as photo/poster frame.
  if (media.length === 0) {
    const extended = asRecord(post.extended_entities) ?? asRecord(post.entities);
    const legacyMedia = Array.isArray(extended?.media) ? extended.media : [];
    for (const m of legacyMedia) {
      const rec = asRecord(m);
      const imageUrl = str(rec?.media_url_https) ?? str(rec?.media_url);
      const kind = str(rec?.type);
      if (kind && imageUrl) media.push({ kind, imageUrl });
    }
  }
  return media;
}

function authorHandleOf(
  post: Record<string, unknown>,
  includes: Record<string, unknown> | null,
): string | null {
  const legacyUser = asRecord(post.user);
  const direct = str(legacyUser?.screen_name) ?? str(asRecord(post.author)?.username);
  if (direct) return direct;
  const authorId = str(post.author_id);
  const users = Array.isArray(includes?.users) ? includes.users : [];
  if (authorId) {
    for (const user of users) {
      const rec = asRecord(user);
      if (str(rec?.id) === authorId) return str(rec?.username) ?? str(rec?.screen_name);
    }
  }
  if (users.length === 1) {
    const rec = asRecord(users[0]);
    return str(rec?.username) ?? str(rec?.screen_name);
  }
  return null;
}

export type MappedWebhookEvent =
  | { kind: "post_create"; delivery: XDelivery }
  | { kind: "chat_received"; senderXUserId: string; text: string }
  | { kind: "excluded"; reason: string }
  | { kind: "unrecognized" };

export function mapWebhookEvent(eventType: string, raw: unknown): MappedWebhookEvent {
  const type = eventType.toLowerCase();

  if (type.includes("post") || type.includes("tweet")) {
    const post = postOf(raw);
    if (!post) return { kind: "unrecognized" };
    if (isOwnReplyOrRepost(post)) return { kind: "excluded", reason: "own_reply_or_repost" };
    const includes = includesOf(raw);
    const id = str(post.id) ?? str(post.id_str);
    const noteTweet = str(asRecord(post.note_tweet)?.text);
    const extendedText = str(asRecord(post.extended_tweet)?.full_text);
    const text = noteTweet ?? extendedText ?? str(post.full_text) ?? str(post.text);
    const authorHandle = authorHandleOf(post, includes);
    if (!id || !text || !authorHandle) return { kind: "unrecognized" };
    const createdAtRaw = str(post.created_at);
    const createdAtMs = createdAtRaw ? Date.parse(createdAtRaw) : Number.NaN;
    const media = mediaOf(post, includes);
    return {
      kind: "post_create",
      delivery: {
        source: "x",
        x_post_id: id,
        author_handle: authorHandle,
        text,
        posted_at: Number.isNaN(createdAtMs)
          ? new Date().toISOString()
          : new Date(createdAtMs).toISOString(),
        lang: str(post.lang),
        ...(media.length > 0 ? { media } : {}),
        raw,
      },
    };
  }

  if (type.includes("chat") || type.includes("message") || type.includes("dm")) {
    const dm = dmOf(raw);
    const senderXUserId = dm ? str(dm.sender_id) : null;
    if (!dm || !senderXUserId) return { kind: "unrecognized" };
    const botUserId = process.env.X_BOT_USER_ID;
    if (botUserId && senderXUserId === botUserId) {
      return { kind: "excluded", reason: "own_message" };
    }
    const text = str(dm.text) ?? str(asRecord(dm.message_data)?.text) ?? "";
    return { kind: "chat_received", senderXUserId, text };
  }

  return { kind: "unrecognized" };
}

async function setLedgerState(
  admin: AdminClient,
  id: string,
  state: "processed" | "excluded" | "failed",
  reason?: string,
): Promise<void> {
  const { error } = await admin
    .from("x_webhook_events")
    .update({ state, reason: reason ?? null })
    .eq("id", id);
  if (error) console.error("webhook-events: ledger state update failed", { id, state, error });
}

/** Claim one ledger row for processing (pending -> processing; the sweep also reclaims stale
 *  processing rows by passing them in `fromStates`). */
export async function claimLedgerRow(
  admin: AdminClient,
  id: string,
  fromStates: string[] = ["pending"],
): Promise<boolean> {
  const { data, error } = await admin
    .from("x_webhook_events")
    .update({ state: "processing", claimed_at: new Date().toISOString() })
    .eq("id", id)
    .in("state", fromStates)
    .select("id");
  if (error) {
    console.error("webhook-events: ledger claim failed", { id, error });
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** A reprocessed delivery that reports already_drafted is only "processed" once every matched
 *  desk really holds a settled outcome — a winner draft, an exclusion, or a story attachment.
 *  Guards the documented kill-loss mode where a platform kill strands the claim forever. */
async function verifySettled(
  admin: AdminClient,
  agentId: string,
  sourcePostId: string,
): Promise<boolean> {
  const [winner, exclusion, assignment] = await Promise.all([
    admin
      .from("drafts")
      .select("id")
      .eq("agent_id", agentId)
      .eq("source_post_id", sourcePostId)
      .eq("is_winner", true)
      .limit(1)
      .maybeSingle(),
    admin
      .from("excluded_posts")
      .select("id")
      .eq("agent_id", agentId)
      .eq("source_post_id", sourcePostId)
      .limit(1)
      .maybeSingle(),
    admin
      .from("story_assignments")
      .select("id")
      .eq("agent_id", agentId)
      .eq("source_post_id", sourcePostId)
      .limit(1)
      .maybeSingle(),
  ]);
  return Boolean(winner.data || exclusion.data || assignment.data);
}

/**
 * Run one CLAIMED ledger row through the pipeline and stamp its terminal state. Never throws:
 * a thrown pipeline failure becomes state "failed" + reason (the sweep retries it later).
 */
export async function processClaimedEvent(
  admin: AdminClient,
  row: { id: string; event_type: string; payload: Json },
  options: { deadlineAt?: number; verifySettledOnAlreadyDrafted?: boolean } = {},
): Promise<void> {
  const mapped = mapWebhookEvent(row.event_type, row.payload);
  try {
    if (mapped.kind === "excluded") {
      await setLedgerState(admin, row.id, "excluded", mapped.reason);
      return;
    }
    if (mapped.kind === "unrecognized") {
      await setLedgerState(admin, row.id, "excluded", "unrecognized_shape");
      return;
    }
    if (mapped.kind === "chat_received") {
      await handleInboundDm(admin, {
        senderXUserId: mapped.senderXUserId,
        text: mapped.text,
      });
      await setLedgerState(admin, row.id, "processed");
      return;
    }

    const result = await processDelivery(mapped.delivery, { deadlineAt: options.deadlineAt });
    if (options.verifySettledOnAlreadyDrafted) {
      for (const drafted of result.drafted) {
        if (drafted.skipped !== "already_drafted") continue;
        const settled = await verifySettled(admin, drafted.agentId, result.sourcePostId);
        if (!settled) {
          // Leave the row for the next sweep — the claim fence has not expired yet.
          return;
        }
      }
    }
    await setLedgerState(admin, row.id, "processed");
  } catch (error) {
    reportServerException(error, {
      tags: { area: "x_webhook" },
      extra: { ledgerRowId: row.id, eventType: row.event_type },
    });
    await setLedgerState(
      admin,
      row.id,
      "failed",
      error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    );
  }
}
