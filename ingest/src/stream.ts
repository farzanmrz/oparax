import { describeError } from "./errors";
import { logger } from "./logger";
import type { IngestDeliveryBody, StreamPayload } from "./types";

/** Thrown on a 401 from the stream connect — reconnect.ts counts consecutive occurrences
 *  and treats a PERSISTENT run of these as fatal (see reconnect.ts). */
export class StreamAuthError extends Error {}

/** Anything else that ends the connection — non-2xx status, no body, a closed socket, or an
 *  aborted read. reconnect.ts treats this as transient and retries with backoff. */
export class StreamTransientError extends Error {}

const STREAM_URL =
  "https://api.x.com/2/tweets/search/stream?expansions=author_id&user.fields=username&tweet.fields=created_at";

/** x_post_id = the tweet id; author_handle = the author's username (resolved via
 *  expansions=author_id/includes.users, requested above); text = tweet text; posted_at =
 *  the tweet's created_at; raw = the full stream payload for audit. Matches the contract in
 *  the brief and app/api/ingest/route.ts exactly. */
export function mapTweetToDelivery(payload: StreamPayload): IngestDeliveryBody | null {
  const tweet = payload.data;
  if (!tweet?.id || !tweet.text) return null;

  const author = payload.includes?.users?.find((u) => u.id === tweet.author_id);
  if (!author?.username) {
    logger.warn("stream: tweet missing author username in includes — dropping", {
      x_post_id: tweet.id,
    });
    return null;
  }

  return {
    x_post_id: tweet.id,
    author_handle: author.username,
    text: tweet.text,
    posted_at: tweet.created_at ?? new Date().toISOString(),
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
