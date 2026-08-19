import { fetchWithTimeout } from "./http";
import { logger } from "./logger";

/** How often the spend watchdog runs. Daily is the right cadence for a cost anomaly: the
 *  2026-08-09 runaway burned ~$10 in its first 24h and ~$32 on its worst day, so one check a
 *  day catches it while it is still a rounding error, and a tighter loop would only add noise
 *  (the query is a full-window aggregate, not an incremental read). */
export const SPEND_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1_000;

const SPEND_CHECK_TIMEOUT_MS = 60_000;

/** Wall-clock of the last completed attempt, kept in memory. A worker restart re-runs the
 *  check early, which is harmless because the route is read-only and idempotent. */
let lastRunAt = 0;

export function spendCheckDue(now: number): boolean {
  return now - lastRunAt >= SPEND_CHECK_INTERVAL_MS;
}

/** Asks the app to run the read-only spend watchdog. Best-effort and fire-and-forget in
 *  spirit: a failure here must never touch polling, because this observes cost, it does not
 *  gate delivery. The app owns the thresholds and the alerting; this only sets the cadence. */
export async function runSpendCheck(ingestUrl: string, ingestSecret: string): Promise<void> {
  // Stamped before the request, not after: a hanging or failing check must not turn into a
  // per-tick retry storm against the app — the same before-the-work discipline the refresh
  // attempt counter uses.
  lastRunAt = Date.now();
  const url = new URL("/api/ops/spend-check", ingestUrl);
  const res = await fetchWithTimeout(
    "SpendCheck",
    "ops",
    url.toString(),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ingestSecret}`,
      },
      body: JSON.stringify({}),
    },
    SPEND_CHECK_TIMEOUT_MS,
  );
  if (!res.ok) {
    throw new Error(`spend check ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json().catch(() => null)) as {
    anomalyCount?: number;
    creditBalance?: number | null;
    creditAlert?: { balance: number; threshold: number } | null;
  } | null;
  logger.info("tick: spend check complete", {
    anomalyCount: body?.anomalyCount ?? 0,
    creditBalance: body?.creditBalance ?? null,
    creditAlert: body?.creditAlert ? `<= $${body.creditAlert.threshold}` : null,
  });
}
