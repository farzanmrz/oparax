import { describeError } from "./errors";
import { logger } from "./logger";
import type { IngestDeliveryBody, StreamPayload } from "./types";

/** Thrown on a 401 from the stream connect — reconnect.ts counts consecutive occurrences
 *  and treats a PERSISTENT run of these as fatal (see reconnect.ts). */
export class StreamAuthError extends Error {}

/** Anything else that ends the connection — non-2xx status, no body, a closed socket, or an
 *  aborted read. reconnect.ts treats this as transient and retries with backoff. */
export class StreamTransientError extends Error {}

// `note_tweet` is REQUIRED here, not optional enrichment: without it X sends a long post's
// body truncated to ~280 chars in `data.text` — cut at a token boundary with a t.co link to the
// original appended — and every consumer downstream (source_posts.text, the drafting council,
// the feed card) treats that as the complete post. It reads as ordinary prose, so nothing can
// detect the loss. Measured across the first 147 ingested posts: 5 were truncated this way,
// losing 12-126 characters each, including whole facts the drafts were then written without.
// The syndication API cannot rescue this either — it returns `note_tweet: { id }` and no text.
//
// `attachments.media_keys`/`media.fields` mirror lib/x/timeline.ts's extraction-side read
// exactly — a post whose meaning lives entirely in a photo (or is off-beat/on-beat only once
// you can see the picture) must reach the grounding stage able to look at it, not just at an
// opaque t.co link.
const STREAM_URL =
  "https://api.x.com/2/tweets/search/stream?expansions=author_id,attachments.media_keys&user.fields=username&tweet.fields=created_at,note_tweet,lang&media.fields=type,url,preview_image_url";

/** x_post_id = the tweet id; author_handle = the author's username (resolved via
 *  expansions=author_id/includes.users, requested above); text = the COMPLETE tweet body —
 *  `note_tweet.text` for a long post, `text` otherwise (see STREAM_URL above); posted_at =
 *  the tweet's created_at; media = attached photos in full / video-GIF poster frames (see
 *  IngestDeliveryMedia); raw = the full stream payload for audit. Matches the contract in
 *  the brief and app/api/ingest/route.ts exactly. */
export function mapTweetToDelivery(payload: StreamPayload): IngestDeliveryBody | null {
  const tweet = payload.data;
  if (!tweet?.id || !tweet.text) return null;

  // Prefer the note body whenever X sends one, but never let an empty/absent note field
  // blank out a post that has perfectly good short text.
  const fullText = tweet.note_tweet?.text?.trim() ? tweet.note_tweet.text : tweet.text;

  const author = payload.includes?.users?.find((u) => u.id === tweet.author_id);
  if (!author?.username) {
    logger.warn("stream: tweet missing author username in includes — dropping", {
      x_post_id: tweet.id,
    });
    return null;
  }

  // Media arrives once in `includes`, referenced by key from the tweet — same shape and same
  // "photo carries `url`, video/GIF carry only a poster frame" rule as lib/x/timeline.ts.
  const mediaByKey = new Map(
    (payload.includes?.media ?? [])
      .filter((m) => m.media_key)
      .map((m) => [m.media_key as string, m]),
  );
  const media = (tweet.attachments?.media_keys ?? []).flatMap((key) => {
    const m = mediaByKey.get(key);
    const imageUrl = m?.url ?? m?.preview_image_url;
    if (!m?.type || !imageUrl) return [];
    return [{ kind: m.type, imageUrl }];
  });

  return {
    source: "x",
    x_post_id: tweet.id,
    author_handle: author.username,
    text: fullText,
    posted_at: tweet.created_at ?? new Date().toISOString(),
    lang: tweet.lang ?? null,
    ...(media.length > 0 ? { media } : {}),
    raw: payload,
  };
}

interface ConnectStreamOptions {
  bearerToken: string;
  livenessTimeoutMs: number;
  signal: AbortSignal;
  onDelivery: (delivery: IngestDeliveryBody) => void;
  onLivenessTimeout: (silentForMs: number) => void;
}

/** Holds ONE persistent connection to GET /2/tweets/search/stream. Only returns normally if
 *  `opts.signal` aborts (a clean shutdown or a caller-forced reconnect); any other way this
 *  ends is a thrown error for reconnect.ts to classify. Newline-delimited JSON: X sends a
 *  blank line as a keepalive roughly every 20s, and a tweet payload as one JSON object per
 *  line — either counts as "activity" for the liveness watchdog. */
export async function connectStream(opts: ConnectStreamOptions): Promise<void> {
  const res = await fetch(STREAM_URL, {
    // X_BEARER_TOKEN used RAW — never URL-decoded.
    headers: { Authorization: `Bearer ${opts.bearerToken}` },
    signal: opts.signal,
  });

  if (res.status === 401) {
    throw new StreamAuthError(`stream connect rejected (401): ${await res.text()}`);
  }
  if (!res.ok) {
    throw new StreamTransientError(`stream connect failed: ${res.status} ${await res.text()}`);
  }
  if (!res.body) {
    throw new StreamTransientError("stream connect returned no body");
  }

  logger.info("stream: connected");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastActivity = Date.now();

  const watchdog = setInterval(
    () => {
      const silentFor = Date.now() - lastActivity;
      if (silentFor > opts.livenessTimeoutMs) opts.onLivenessTimeout(silentFor);
    },
    Math.min(15_000, opts.livenessTimeoutMs),
  );

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) throw new StreamTransientError("stream closed by server");
      lastActivity = Date.now();
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line.length > 0) {
          try {
            const payload = JSON.parse(line) as StreamPayload;
            const delivery = mapTweetToDelivery(payload);
            if (delivery) opts.onDelivery(delivery);
          } catch (e) {
            logger.warn("stream: failed to parse line, skipping", { error: describeError(e) });
          }
        }
        newlineIndex = buffer.indexOf("\n");
      }
    }
  } finally {
    clearInterval(watchdog);
    reader.releaseLock();
  }
}
