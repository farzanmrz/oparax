import type { SupabaseClient } from "@supabase/supabase-js";
import { countRecentWebsiteDeliveries } from "./db";
import { describeError } from "./errors";
import { logger } from "./logger";
import { sendSlackAlarm } from "./slack";

export interface AlarmState {
  lastAlarmAt: number | null;
}

function cooledDown(state: AlarmState, cooldownMs: number): boolean {
  return state.lastAlarmAt === null || Date.now() - state.lastAlarmAt >= cooldownMs;
}

/** A source that stops matching new items for env.staleThresholdMs may have drifted (site
 *  redesign, sitemap moved, path prefix no longer matches) rather than genuinely gone quiet
 *  — flags it for re-onboarding per the issue's amendment #4, debounced so a sustained
 *  staleness pages once per cooldown window, not every tick. */
export async function alarmStaleSource(
  slackWebhookUrl: string,
  cooldownMs: number,
  state: AlarmState,
  domain: string,
  daysSinceMatch: number,
): Promise<void> {
  if (!cooledDown(state, cooldownMs)) return;
  state.lastAlarmAt = Date.now();
  const message =
    `:warning: oparax-poller: ${domain} has had no new matched items in ${daysSinceMatch} ` +
    "day(s) — may need re-onboarding (site redesign, moved sitemap, or a path filter that " +
    "no longer matches).";
  try {
    await sendSlackAlarm(slackWebhookUrl, message);
  } catch (e) {
    logger.error("stale-alarm: slack alarm failed", { domain, error: describeError(e) });
  }
}

/** Mirrors ingest/src/alarm.ts's checkDeliveryCap: reads a rolling 24h count of website
 *  articles this worker has ingested (across every desk — see countRecentWebsiteDeliveries)
 *  and Slack-alarms at 80% of the operator-tuned observedDailyCap, debounced by cooldownMs so
 *  a sustained overage pages once, not every check. A safety net for a genuine runaway
 *  (broken dedup, unstable identity keys), not a hard stop — the worker keeps delivering. */
export async function checkDeliveryCap(
  client: SupabaseClient,
  observedDailyCap: number,
  cooldownMs: number,
  state: AlarmState,
  slackWebhookUrl: string,
): Promise<void> {
  let observed: number;
  try {
    observed = await countRecentWebsiteDeliveries(client);
  } catch (e) {
    logger.error("cap-check: source_posts query failed", { error: describeError(e) });
    return;
  }

  const ratio = observed / observedDailyCap;
  logger.info("cap-check", { observed, observedDailyCap, ratio: Number(ratio.toFixed(3)) });
  if (ratio < 0.8 || !cooledDown(state, cooldownMs)) return;

  state.lastAlarmAt = Date.now();
  const message =
    `:rotating_light: oparax-poller: ${observed}/${observedDailyCap} website deliveries in ` +
    `the last 24h (${Math.round(ratio * 100)}%) — approaching the observed cap. Check for a ` +
    "runaway source (broken dedup, an unstable item identity) before raising the cap.";
  try {
    await sendSlackAlarm(slackWebhookUrl, message);
  } catch (e) {
    logger.error("cap-check: slack alarm failed", { error: describeError(e) });
  }
}
