import { describeError } from "./errors";
import { logger } from "./logger";
import type { IngestDeliveryBody } from "./types";

/** Thrown on a 401 from /api/ingest — a bad/rotated INGEST_SECRET is a config problem, not
 *  network flakiness, so it's fatal on the first occurrence (no threshold, unlike the
 *  stream's persistent-401 handling in reconnect.ts, which guards against a transient X-side
 *  401). The caller exits so Railway's restartPolicyType=ALWAYS is the outer net. */
export class FatalIngestError extends Error {}

const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

function backoffDelay(attempt: number): number {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return exp / 2 + Math.random() * (exp / 2);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** POSTs one delivery to /api/ingest, matching the exact contract verified in the app:
 *  - 200: accepted — log the processDelivery result and return.
 *  - 401: bad INGEST_SECRET — fatal, throws FatalIngestError for the caller to exit on.
 *  - 422: bad body (zod validation) — log + DROP, never retry-loop a delivery the app will
 *    never accept.
 *  - 500 / network error: transient — retry with backoff, then log + drop after
 *    MAX_ATTEMPTS so one bad delivery can never stall the stream reader indefinitely. */
export async function postDelivery(
  ingestUrl: string,
  ingestSecret: string,
  body: IngestDeliveryBody,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(ingestUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${ingestSecret}`,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      logger.warn("delivery: network error, retrying", {
        x_post_id: body.x_post_id,
        attempt,
        error: describeError(e),
      });
      await sleep(backoffDelay(attempt));
      continue;
    }

    if (res.ok) {
      const result = await res.json().catch(() => null);
      logger.info("delivery: accepted", { x_post_id: body.x_post_id, result });
      return;
    }

    if (res.status === 401) {
      throw new FatalIngestError("INGEST_SECRET rejected by /api/ingest (401)");
    }

    if (res.status === 422) {
      const text = await res.text().catch(() => "");
      logger.error("delivery: 422 rejected — dropping (never retry a bad body)", {
        x_post_id: body.x_post_id,
        body: text,
      });
      return;
    }

    logger.warn("delivery: transient app error, retrying", {
      x_post_id: body.x_post_id,
      status: res.status,
      attempt,
    });
    await sleep(backoffDelay(attempt));
  }

  logger.error("delivery: exhausted retries — dropping", {
    x_post_id: body.x_post_id,
    maxAttempts: MAX_ATTEMPTS,
  });
}
