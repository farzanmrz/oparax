import type { AlarmState } from "./alarm";
import { alarmLiveness, checkDeliveryCap } from "./alarm";
import { loadEnv } from "./env";
import { describeError } from "./errors";
import { logger } from "./logger";
import { runIngestionLoop } from "./reconnect";
import { buildRuleGroups, createRulesClient, fetchTrackedHandles, syncRules } from "./rules";

async function main(): Promise<void> {
  const env = loadEnv();
  const supabase = createRulesClient(env.supabaseUrl, env.supabaseServiceRoleKey);

  function fatal(reason: string): never {
    logger.fatal("fatal — exiting so Railway's restart policy can recover", { reason });
    process.exit(1);
  }

  async function syncRulesOnce(): Promise<void> {
    try {
      const handles = await fetchTrackedHandles(supabase);
      const { groups, dropped } = buildRuleGroups(handles);
      await syncRules(env.xBearerToken, groups);
      logger.info("rule-sync: complete", {
        handleCount: handles.length,
        ruleCount: groups.length,
        droppedCount: dropped.length,
      });
    } catch (e) {
      // A failed sync keeps whatever rules X already has — never let a sync hiccup tear
      // down the previous, still-good rule set.
      logger.error("rule-sync: failed, keeping previous rules", { error: describeError(e) });
    }
  }

  await syncRulesOnce();
  const ruleSyncTimer = setInterval(() => {
    syncRulesOnce().catch((e) =>
      logger.error("rule-sync: unexpected failure", { error: describeError(e) }),
    );
  }, env.ruleSyncIntervalMs);

  const capAlarmState: AlarmState = { lastAlarmAt: null };
  const capAlarmTimer = setInterval(() => {
    checkDeliveryCap(
      supabase,
      env.observedDailyCap,
      env.alarmCooldownMs,
      capAlarmState,
      env.slackWebhookUrl,
    ).catch((e) => logger.error("cap-check: unexpected failure", { error: describeError(e) }));
  }, env.ruleSyncIntervalMs);

  const livenessAlarmState: AlarmState = { lastAlarmAt: null };

  const shutdown = (signal: string) => {
    logger.info("shutting down", { signal });
    clearInterval(ruleSyncTimer);
    clearInterval(capAlarmTimer);
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await runIngestionLoop({
    bearerToken: env.xBearerToken,
    ingestUrl: env.ingestUrl,
    ingestSecret: env.ingestSecret,
    livenessTimeoutMs: env.livenessTimeoutMs,
    onLivenessTimeout: (silentForMs) => {
      logger.error("stream: liveness timeout", { silentForMs });
      alarmLiveness(
        env.slackWebhookUrl,
        env.alarmCooldownMs,
        livenessAlarmState,
        silentForMs,
      ).catch((e) => logger.error("liveness: alarm failed", { error: describeError(e) }));
    },
    onFatal: fatal,
  });
}

main().catch((e) => {
  logger.fatal("unhandled error in main — exiting", {
    error: e instanceof Error ? (e.stack ?? e.message) : String(e),
  });
  process.exit(1);
});
