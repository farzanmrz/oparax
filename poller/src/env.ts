import { logger } from "./logger";

export interface PollerEnv {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  ingestUrl: string;
  ingestSecret: string;
  slackWebhookUrl: string;
  userAgent: string;
  brightdataApiKey: string | null;
  brightdataZone: string | null;
  tickIntervalMs: number;
  staleThresholdMs: number;
  alarmCooldownMs: number;
  maxNewItemsPerSourceTick: number;
  observedDailyCap: number;
  capCheckIntervalMs: number;
}

/** Missing/blank required env is a fatal state — this exits immediately rather than looping,
 *  so Railway's restartPolicyType=ALWAYS surfaces it as a visible crash loop in the dashboard
 *  instead of a worker that silently sits there misconfigured. Mirrors ingest/src/env.ts. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    logger.fatal(`missing required env var ${name} — exiting`, { reason: "bad_env" });
    process.exit(1);
  }
  return value;
}

/** Not fatal: BRIGHTDATA_API_KEY / BRIGHTDATA_ZONE are the adaptive retrieval chain's Tier 2
 *  fallback (#105) — used automatically for any source, not gated on a retrieval override —
 *  but a direct-fetch-only deployment still degrades cleanly to the teaser without them. */
function optional(name: string): string | null {
  const value = process.env[name];
  return value ? value : null;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn(`ignoring invalid ${name}=${raw}, using default ${fallback}`);
    return fallback;
  }
  return parsed;
}

export function loadEnv(): PollerEnv {
  return {
    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    ingestUrl: required("INGEST_URL"),
    ingestSecret: required("INGEST_SECRET"),
    slackWebhookUrl: required("SLACK_WEBHOOK_URL"),
    // No default: a fabricated contact URL in the User-Agent is worse than a required var.
    userAgent: required("OPARAX_POLLER_USER_AGENT"),
    brightdataApiKey: optional("BRIGHTDATA_API_KEY"),
    brightdataZone: optional("BRIGHTDATA_ZONE"),
    tickIntervalMs: optionalNumber("POLLER_TICK_INTERVAL_MS", 45_000),
    staleThresholdMs: optionalNumber("POLLER_STALE_THRESHOLD_MS", 5 * 24 * 60 * 60 * 1000),
    alarmCooldownMs: optionalNumber("POLLER_ALARM_COOLDOWN_MS", 60 * 60 * 1000),
    maxNewItemsPerSourceTick: optionalNumber("POLLER_MAX_NEW_ITEMS_PER_TICK", 20),
    // A busy multi-source desk realistically sees tens of new articles/day (priming absorbs
    // the initial backlog, dedup absorbs repeats) — 300 is generous headroom above that while
    // still catching a genuine runaway (broken dedup, unstable keys) within hours, not days.
    // Same "conservative starting guess, operator tunes it" framing as ingest/'s own cap.
    observedDailyCap: optionalNumber("POLLER_OBSERVED_DAILY_CAP", 300),
    capCheckIntervalMs: optionalNumber("POLLER_CAP_CHECK_INTERVAL_MS", 5 * 60 * 1000),
  };
}
