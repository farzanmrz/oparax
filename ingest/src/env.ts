import { logger } from "./logger";

export interface WorkerEnv {
  xBearerToken: string;
  ingestUrl: string;
  ingestSecret: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  slackWebhookUrl: string;
  observedDailyCap: number;
  ruleSyncIntervalMs: number;
  livenessTimeoutMs: number;
  alarmCooldownMs: number;
}

/** Missing/blank required env is a fatal state — bad env is one of the two named fatal
 *  states in the brief, so this exits immediately rather than looping. Railway's
 *  restartPolicyType=ALWAYS keeps restarting it, which is deliberate: it surfaces as a
 *  crash loop in the dashboard until the operator fixes the variable, instead of a worker
 *  that silently sits there doing nothing. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    logger.fatal(`missing required env var ${name} — exiting`, { reason: "bad_env" });
    process.exit(1);
  }
  return value;
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

export function loadEnv(): WorkerEnv {
  return {
    // X_BEARER_TOKEN is read RAW here and used raw everywhere it's consumed (stream.ts,
    // rules.ts) — never URL-decode the portal's %2B/%3D escapes; decoding produces a 401.
    xBearerToken: required("X_BEARER_TOKEN"),
    ingestUrl: required("INGEST_URL"),
    ingestSecret: required("INGEST_SECRET"),
    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    slackWebhookUrl: required("SLACK_WEBHOOK_URL"),
    // The X free tier publishes no delivery-volume cap — it can only be discovered
    // operationally, hence "observed". This default is a conservative starting guess; the
    // operator tunes it after real traffic (see README "Deploy checklist").
    observedDailyCap: optionalNumber("INGEST_OBSERVED_DAILY_CAP", 2000),
    ruleSyncIntervalMs: optionalNumber("INGEST_RULE_SYNC_INTERVAL_MS", 5 * 60 * 1000),
    livenessTimeoutMs: optionalNumber("INGEST_LIVENESS_TIMEOUT_MS", 90 * 1000),
    alarmCooldownMs: optionalNumber("INGEST_ALARM_COOLDOWN_MS", 60 * 60 * 1000),
  };
}
