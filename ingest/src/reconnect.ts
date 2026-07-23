import { FatalIngestError, postDelivery } from "./deliver";
import { describeError } from "./errors";
import { logger } from "./logger";
import { connectStream, StreamAuthError } from "./stream";
import type { IngestDeliveryBody } from "./types";

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 60_000;
/** A single 401 from X could be transient (clock skew, a momentary edge issue) — only a
 *  RUN of consecutive 401s means the bearer token itself is bad. Below this the loop keeps
 *  backing off and retrying like any other transient error. */
const PERSISTENT_401_THRESHOLD = 3;

function backoffDelay(attempt: number): number {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return exp / 2 + Math.random() * (exp / 2);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ReconnectDeps {
  bearerToken: string;
  ingestUrl: string;
  ingestSecret: string;
  livenessTimeoutMs: number;
  onLivenessTimeout: (silentForMs: number) => void;
  /** Never returns — exits the process so Railway's restartPolicyType=ALWAYS restarts it. */
  onFatal: (reason: string) => never;
}

/** The outer loop: hold one stream connection at a time, reconnecting on any transient
 *  failure with exponential backoff + jitter, and exiting ONLY on a fatal state (bad env is
 *  checked earlier in env.ts; here it's a persistent 401 from X, or any 401 from
 *  /api/ingest itself via FatalIngestError). Everything else — network blips, X 5xx, a
 *  closed socket, our own liveness watchdog forcing a reconnect — retries in-process and
 *  never exits. */
export async function runIngestionLoop(deps: ReconnectDeps): Promise<void> {
  let attempt = 0;
  let consecutive401s = 0;

  while (true) {
    const controller = new AbortController();
    let forcedByLiveness = false;

    try {
      await connectStream({
        bearerToken: deps.bearerToken,
        livenessTimeoutMs: deps.livenessTimeoutMs,
        signal: controller.signal,
        onLivenessTimeout: (silentForMs) => {
          if (forcedByLiveness) return;
          forcedByLiveness = true;
          deps.onLivenessTimeout(silentForMs);
          controller.abort();
        },
        onDelivery: (delivery: IngestDeliveryBody) => {
          // Fire-and-forget: a slow retry on one delivery must never block the reader loop
          // from draining the next chunk off the socket.
          postDelivery(deps.ingestUrl, deps.ingestSecret, delivery).catch((e) => {
            if (e instanceof FatalIngestError) {
              deps.onFatal(e.message);
              return;
            }
            logger.error("delivery: unexpected failure", { error: describeError(e) });
          });
        },
      });
    } catch (e) {
      if (controller.signal.aborted && forcedByLiveness) {
        logger.warn("stream: reconnecting after liveness timeout");
        attempt = 0;
        consecutive401s = 0;
        continue;
      }

      if (e instanceof StreamAuthError) {
        consecutive401s += 1;
        logger.error("stream: 401 from X", { consecutive401s });
        if (consecutive401s >= PERSISTENT_401_THRESHOLD) {
          deps.onFatal(`persistent 401 from X stream after ${consecutive401s} attempts`);
        }
      } else {
        consecutive401s = 0;
        logger.warn("stream: transient disconnect, reconnecting", {
          error: describeError(e),
        });
      }
    }

    const delay = backoffDelay(attempt);
    attempt += 1;
    logger.info("stream: backing off before reconnect", { delayMs: Math.round(delay) });
    await sleep(delay);
  }
}
