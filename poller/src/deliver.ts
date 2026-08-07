import { backoffDelay, sleep } from "./backoff";
import { describeError } from "./errors";
import { logger } from "./logger";
import type { WebsiteDeliveryBody } from "./types";

/** Thrown on a 401 from /api/ingest — a bad/rotated INGEST_SECRET is a config problem, not
 *  network flakiness, so it's fatal on the first occurrence. The caller exits so Railway's
 *  restartPolicyType=ALWAYS is the outer net. Mirrors ingest/src/deliver.ts. */
export class FatalIngestError extends Error {}

const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

/** Thrown after MAX_ATTEMPTS exhausted on a 500/network error — tick.ts's own contract
 *  (see its comment above the deliverNewItem call) is that a throw here means the item stays
 *  unseen and the next tick retries it, since marking it seen first would lose it permanently.
 *  Found live (2026-08-06): before this class existed, exhausting retries just logged and
 *  returned normally, which tick.ts's caller couldn't tell apart from a real success — the
 *  item got marked seen and silently dropped forever on a persistent failure (e.g. a
 *  drafting-model schema-validation error that happens to repeat across every retry). Not a
 *  FatalIngestError: this is one item failing, not a worker-wide config problem, so it must
 *  never escape past the per-source catch in tick.ts's pollAllSources. */
export class DeliveryExhaustedError extends Error {}

/** POSTs one delivery to /api/ingest, matching the exact contract verified in the app:
 *  - 200: accepted — log the processDelivery result and return.
 *  - 401: bad INGEST_SECRET — fatal, throws FatalIngestError for the caller to exit on.
 *  - 422: bad body (zod validation) — log + DROP, never retry a delivery the app will
 *    never accept.
 *  - 500 / network error: transient — retry with backoff, then throw DeliveryExhaustedError
 *    after MAX_ATTEMPTS so the item stays unseen and the next tick gets a fresh attempt,
 *    rather than being silently marked seen and lost. */
export async function postDelivery(
  ingestUrl: string,
  ingestSecret: string,
  body: WebsiteDeliveryBody,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(ingestUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ingestSecret}`,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      logger.warn("delivery: network error, retrying", {
        external_id: body.external_id,
        attempt,
        error: describeError(e),
      });
      await sleep(backoffDelay(attempt, { base: BASE_DELAY_MS, max: MAX_DELAY_MS }));
      continue;
    }

    if (res.ok) {
      const result = await res.json().catch(() => null);
      logger.info("delivery: accepted", { external_id: body.external_id, result });
      return;
    }

    if (res.status === 401) {
      throw new FatalIngestError("INGEST_SECRET rejected by /api/ingest (401)");
    }

    if (res.status === 422) {
      const text = await res.text().catch(() => "");
      logger.error("delivery: 422 rejected — dropping (never retry a bad body)", {
        external_id: body.external_id,
        body: text,
      });
      return;
    }

    logger.warn("delivery: transient app error, retrying", {
      external_id: body.external_id,
      status: res.status,
      attempt,
    });
    await sleep(backoffDelay(attempt, { base: BASE_DELAY_MS, max: MAX_DELAY_MS }));
  }

  logger.error("delivery: exhausted retries — leaving unseen for next tick", {
    external_id: body.external_id,
    maxAttempts: MAX_ATTEMPTS,
  });
  throw new DeliveryExhaustedError(
    `delivery exhausted ${MAX_ATTEMPTS} attempts: ${body.external_id}`,
  );
}
