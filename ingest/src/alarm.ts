import { describeError } from "./errors";
import { logger } from "./logger";
import type { RulesClient } from "./rules";
import { sendSlackAlarm } from "./slack";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface AlarmState {
  lastAlarmAt: number | null;
}

function cooledDown(state: AlarmState, cooldownMs: number): boolean {
  return state.lastAlarmAt === null || Date.now() - state.lastAlarmAt >= cooldownMs;
}

/** Metering itself happens app-side (processDelivery stamps usage_events, kind
 *  "stream_delivery") — this only READS that count via the worker's own service-role
 *  client and alarms Slack at 80% of the operator-tuned INGEST_OBSERVED_DAILY_CAP over a
 *  rolling 24h window. Debounced by alarmCooldownMs so a sustained overage pages once, not
 *  every rule-sync tick. */
export async function checkDeliveryCap(
  client: RulesClient,
  observedDailyCap: number,
  alarmCooldownMs: number,
  state: AlarmState,
  slackWebhookUrl: string,
): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count, error } = await client
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("kind", "stream_delivery")
    .gte("created_at", since);
  if (error) {
    logger.error("cap-check: usage_events query failed", { error: describeError(error) });
    return;
  }

  const observed = count ?? 0;
  const ratio = observed / observedDailyCap;
  logger.info("cap-check", { observed, observedDailyCap, ratio: Number(ratio.toFixed(3)) });
  if (ratio < 0.8 || !cooledDown(state, alarmCooldownMs)) return;

  state.lastAlarmAt = Date.now();
  const message =
    `:rotating_light: oparax-ingest: ${observed}/${observedDailyCap} stream deliveries in ` +
    `the last 24h (${Math.round(ratio * 100)}%) — approaching the observed cap. Re-probe ` +
    "X limits (rules/counts + a bare connect) and consider a billing tier change.";
  try {
    await sendSlackAlarm(slackWebhookUrl, message);
  } catch (e) {
    logger.error("cap-check: slack alarm failed", { error: describeError(e) });
  }
}

/** No stream event AND no keepalive for livenessTimeoutMs means the connection is almost
 *  certainly dead without X telling us so (a keepalive normally arrives every ~20s) —
 *  reconnect.ts forces a reconnect on this signal; this function only owns the Slack side. */
export async function alarmLiveness(
  slackWebhookUrl: string,
  alarmCooldownMs: number,
  state: AlarmState,
  silentForMs: number,
): Promise<void> {
  if (!cooledDown(state, alarmCooldownMs)) return;
  state.lastAlarmAt = Date.now();
  const message =
    `:warning: oparax-ingest: no stream activity (event or keepalive) for ` +
    `${Math.round(silentForMs / 1000)}s — forcing a reconnect.`;
  try {
    await sendSlackAlarm(slackWebhookUrl, message);
  } catch (e) {
    logger.error("liveness: slack alarm failed", { error: describeError(e) });
  }
}
