import { createPollerClient } from "./db";
import { loadEnv } from "./env";
import { describeError } from "./errors";
import { logger } from "./logger";
import type { ConditionalGetCache } from "./sitemap";
import { pollAllSources } from "./tick";

async function main(): Promise<void> {
  const env = loadEnv();
  const client = createPollerClient(env.supabaseUrl, env.supabaseServiceRoleKey);

  const caches = new Map<string, ConditionalGetCache>();

  function fatal(reason: string): never {
    logger.fatal("fatal — exiting so Railway's restart policy can recover", { reason });
    process.exit(1);
  }

  async function tickOnce(): Promise<void> {
    try {
      await pollAllSources(client, env, caches);
    } catch (e) {
      // Only FatalIngestError propagates out of pollAllSources — every other per-source
      // failure is already caught and logged inside it.
      fatal(describeError(e) as string);
    }
  }

  // Ticks never overlap: a slow tick (many sources, slow feeds) must not have the next
  // interval firing start a second concurrent pass over the same sources.
  let isTicking = false;

  async function tickGuarded(): Promise<void> {
    if (isTicking) {
      logger.warn("tick: skipping — previous tick still running");
      return;
    }
    isTicking = true;
    try {
      await tickOnce();
    } finally {
      isTicking = false;
    }
  }

  await tickGuarded();
  const tickTimer = setInterval(() => {
    tickGuarded().catch((e) =>
      logger.error("tick: unexpected top-level failure", {
        error: describeError(e),
      }),
    );
  }, env.tickIntervalMs);

  const shutdown = (signal: string) => {
    logger.info("shutting down", { signal });
    clearInterval(tickTimer);
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((e) => {
  logger.fatal("unhandled error in main — exiting", {
    error: e instanceof Error ? (e.stack ?? e.message) : String(e),
  });
  process.exit(1);
});
