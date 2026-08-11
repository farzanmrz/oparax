import { logger } from "./logger";

export interface PollerEnv {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  ingestUrl: string;
  ingestSecret: string;
  userAgent: string;
  brightdataApiKey: string | null;
  brightdataZone: string | null;
  brightdataSerpZone: string | null;
  tickIntervalMs: number;
  maxNewItemsPerSourceTick: number;
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
    // No default: a fabricated contact URL in the User-Agent is worse than a required var.
    userAgent: required("OPARAX_POLLER_USER_AGENT"),
    brightdataApiKey: optional("BRIGHTDATA_API_KEY"),
    brightdataZone: optional("BRIGHTDATA_ZONE"),
    // A separate zone from brightdataZone — Bright Data's SERP API and Web Unlocker are
    // different products, each provisioned as its own zone under the same account/API key.
    // Powers Tier 2b (#107): the SERP-search fallback tried after Tier 1 (direct) and Tier 2
    // (Unlocker) both fail. Unset means Tier 2b is skipped, same degrade-cleanly pattern as
    // brightdataZone above.
    brightdataSerpZone: optional("BRIGHTDATA_SERP_ZONE"),
    tickIntervalMs: optionalNumber("POLLER_TICK_INTERVAL_MS", 45_000),
    maxNewItemsPerSourceTick: optionalNumber("POLLER_MAX_NEW_ITEMS_PER_TICK", 20),
  };
}
