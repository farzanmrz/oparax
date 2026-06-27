import { z } from "zod";
import { HANDLE_RE, MONITOR_MAX_HANDLES } from "@/lib/scan/handles";
import { isValidTimeZone } from "@/lib/time/timezone";
import type { Database } from "@/lib/types/database";

export const agentConfigSchema = z.object({
  name: z.string().min(1),
  scanningInstructions: z.string(),
  draftingInstructions: z.string(),
  exampleTweets: z
    .array(
      z.object({
        url: z.string(),
        text: z.string(),
      }),
    )
    .default([]),
  sources: z.object({
    x: z.object({
      enabled: z.boolean(),
      handles: z.array(z.string().regex(HANDLE_RE)).max(MONITOR_MAX_HANDLES),
    }),
    web: z.object({
      enabled: z.boolean(),
      preferredDomains: z.array(z.string()).max(5),
    }),
  }),
  schedule: z.object({
    cadenceMinutes: z.number().int().min(60).nullable(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
    windowStart: z.string().nullable(), // "HH:MM"
    windowEnd: z.string().nullable(),
    timezone: z.string().refine(isValidTimeZone, "Invalid IANA timezone"),
  }),
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;

/**
 * A source counts as "on" when it is explicitly enabled OR the reporter named handles/domains
 * for it. Single source of truth for the live ConfigCard ("what I'll save") and configToColumns
 * (what Save persists) so the saved agent scans exactly the sources the card advertised — handles
 * the reporter gave are never silently dropped.
 */
export const xSourceActive = (c: AgentConfig): boolean =>
  c.sources.x.enabled || c.sources.x.handles.length > 0;
export const webSourceActive = (c: AgentConfig): boolean =>
  c.sources.web.enabled || c.sources.web.preferredDomains.length > 0;

export const DEFAULT_CONFIG: AgentConfig = {
  name: "",
  scanningInstructions: "",
  draftingInstructions: "",
  exampleTweets: [],
  sources: {
    x: {
      // Off by default so the live "what I'll save" card does not assert an
      // "X — broad search" the reporter never chose during intake. A real source
      // choice flips this on via runScan/updateConfig; the runScan tool still
      // defaults searchX=true at scan time, so picking X is one step, not two.
      enabled: false,
      handles: [],
    },
    web: {
      enabled: false,
      preferredDomains: [],
    },
  },
  schedule: {
    cadenceMinutes: null,
    daysOfWeek: [],
    windowStart: null,
    windowEnd: null,
    timezone: "UTC",
  },
};

/**
 * Map an `agents` Row (from Supabase) back to an `AgentConfig` object so the
 * detail page can prefill the form / chat UI. Any missing / null columns fall
 * back to `DEFAULT_CONFIG` values.
 */
export function columnsToConfig(row: Database["public"]["Tables"]["agents"]["Row"]): AgentConfig {
  return {
    name: row.name ?? DEFAULT_CONFIG.name,
    scanningInstructions: row.monitoring_description ?? DEFAULT_CONFIG.scanningInstructions,
    draftingInstructions: row.drafting_instructions ?? DEFAULT_CONFIG.draftingInstructions,
    exampleTweets: Array.isArray(row.example_tweets)
      ? row.example_tweets.map((text) => ({
          url: "",
          text,
        }))
      : DEFAULT_CONFIG.exampleTweets,
    sources: {
      x: {
        enabled: row.search_x ?? DEFAULT_CONFIG.sources.x.enabled,
        handles: Array.isArray(row.monitored_handles)
          ? row.monitored_handles
          : DEFAULT_CONFIG.sources.x.handles,
      },
      web: {
        enabled: row.search_web ?? DEFAULT_CONFIG.sources.web.enabled,
        preferredDomains: Array.isArray(row.preferred_domains)
          ? row.preferred_domains
          : DEFAULT_CONFIG.sources.web.preferredDomains,
      },
    },
    schedule: {
      cadenceMinutes: row.scan_cadence_minutes ?? DEFAULT_CONFIG.schedule.cadenceMinutes,
      daysOfWeek: Array.isArray(row.schedule_days)
        ? row.schedule_days
        : DEFAULT_CONFIG.schedule.daysOfWeek,
      windowStart: row.schedule_window_start ?? DEFAULT_CONFIG.schedule.windowStart,
      windowEnd: row.schedule_window_end ?? DEFAULT_CONFIG.schedule.windowEnd,
      timezone: row.schedule_timezone ?? DEFAULT_CONFIG.schedule.timezone,
    },
  };
}

/**
 * Map an `AgentConfig` (from the chat compiler) to the `agents` Insert/Update
 * column shape understood by Supabase. The `userId` is required for Insert.
 */
export function configToColumns(
  config: AgentConfig,
  userId: string,
): Database["public"]["Tables"]["agents"]["Insert"] {
  return {
    user_id: userId,
    name: config.name,
    monitoring_description: config.scanningInstructions,
    drafting_instructions: config.draftingInstructions,
    example_tweets: config.exampleTweets.map((t) => t.text),
    search_x: xSourceActive(config),
    monitored_handles: config.sources.x.handles,
    search_web: webSourceActive(config),
    preferred_domains: config.sources.web.preferredDomains,
    scan_cadence_minutes: config.schedule.cadenceMinutes,
    schedule_days: config.schedule.daysOfWeek,
    schedule_window_start: config.schedule.windowStart,
    schedule_window_end: config.schedule.windowEnd,
    schedule_timezone: config.schedule.timezone,
  };
}
