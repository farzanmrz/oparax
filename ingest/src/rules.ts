import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import type { RuleGroup } from "./types";

/** The ONE deliberate exception to "zero imports from the app's lib/" (see README.md
 *  "Isolation exception"): its own inline @supabase/supabase-js client, sharing only CONFIG
 *  (the Supabase project URL + a service-role key) with the app — never code, never the
 *  app's generated database.types.ts. Read-only here: rule sync selects
 *  experiments.tracked_handles, the cap alarm (alarm.ts) selects usage_events counts. This
 *  worker never writes to Supabase — metering (usage_events inserts) happens app-side in
 *  processDelivery, per the plan text. */
export function createRulesClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type RulesClient = ReturnType<typeof createRulesClient>;

const MAX_RULES = 5;
const MAX_HANDLES_PER_RULE = 40;
const RULE_TAG_PREFIX = "oparax-group-";

// Re-declared, NOT imported: `ingest/` is an isolated package with zero `lib/` imports (the
// README's "Isolation exception" covers only the Supabase client). Keep this in sync with
// lib/x/handle.ts's X_HANDLE_RE. This is defense-in-depth: the app-side write paths already
// validate handles, but the worker must never interpolate an unvalidated handle into a rule
// value below (`from:${h}`) — a handle carrying stream operators (`) OR (`, spaces, etc.) that
// reached the DB via pre-existing data or a future unguarded write path could break or hijack
// the globally-shared rule set for every tenant.
const X_HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

/** Pulls tracked_handles from ACTIVE desks only — a paused desk "stops watching the beat", so
 *  its handles must leave the stream — deduped case-insensitively. Mirrors the app's own
 *  author-routing shape (lib/agent/draft-pipeline.ts), which likewise drafts only for active
 *  desks: the pipeline is the immediate guard, this rebuild (every ~5 min) is the eventual one. */
export async function fetchTrackedHandles(client: RulesClient): Promise<string[]> {
  const { data, error } = await client
    .from("experiments")
    .select("tracked_handles, status")
    .returns<{ tracked_handles: string[]; status: string }[]>();
  if (error) throw error;

  const seen = new Set<string>();
  const handles: string[] = [];
  const invalid: string[] = [];
  for (const row of data ?? []) {
    if (row.status !== "active") continue; // paused desks stop watching — drop from the stream
    for (const handle of row.tracked_handles) {
      // Defense-in-depth: never let an unvalidated handle reach the shared stream rule.
      if (!X_HANDLE_RE.test(handle)) {
        invalid.push(handle);
        continue;
      }
      const key = handle.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      handles.push(handle);
    }
  }
  if (invalid.length > 0) {
    logger.error(
      "dropped tracked_handles failing the X handle shape — stale data or injection attempt",
      {
        invalidCount: invalid.length,
        invalid,
      },
    );
  }
  return handles;
}

/** Groups handles into at most 5 rules of at most 40 handles each. Anything past that cap
 *  is DROPPED, never silently truncated into the last group — the caller must log
 *  `dropped`. */
export function buildRuleGroups(handles: string[]): { groups: RuleGroup[]; dropped: string[] } {
  const capacity = MAX_RULES * MAX_HANDLES_PER_RULE;
  const kept = handles.slice(0, capacity);
  const dropped = handles.slice(capacity);

  const groups: RuleGroup[] = [];
  for (let i = 0; i < kept.length; i += MAX_HANDLES_PER_RULE) {
    const chunk = kept.slice(i, i + MAX_HANDLES_PER_RULE);
    const value = `(${chunk.map((h) => `from:${h}`).join(" OR ")}) -is:retweet -is:quote -is:reply`;
    groups.push({ tag: `${RULE_TAG_PREFIX}${groups.length}`, value, handles: chunk });
  }

  if (dropped.length > 0) {
    logger.error("tracked_handles exceed the 5-rule x 40-handle cap — dropping overflow", {
      cappedAt: capacity,
      droppedCount: dropped.length,
      dropped,
    });
  }

  return { groups, dropped };
}

interface XRule {
  id: string;
  value: string;
  tag?: string;
}
interface XRulesResponse {
  data?: XRule[];
}

const STREAM_RULES_URL = "https://api.x.com/2/tweets/search/stream/rules";

async function xRulesFetch(bearerToken: string, init?: RequestInit): Promise<Response> {
  return fetch(STREAM_RULES_URL, {
    ...init,
    headers: {
      // X_BEARER_TOKEN used RAW — never URL-decoded.
      Authorization: `Bearer ${bearerToken}`,
      ...(init?.headers ?? {}),
    },
  });
}

/** Rebuilds the stream rules from scratch every call (the plan text says "rebuilt", not
 *  "diffed") — delete every rule this worker owns (tagged `oparax-group-*`), then add the
 *  freshly built groups. Simple and idempotent; a 5-minute interval means a brief rule gap
 *  during the swap costs at most a few seconds of missed matches, not correctness. Rules not
 *  owned by this worker (no tag, or a different prefix) are left untouched. */
export async function syncRules(bearerToken: string, groups: RuleGroup[]): Promise<void> {
  const currentRes = await xRulesFetch(bearerToken);
  if (!currentRes.ok) {
    throw new Error(`rule fetch failed: ${currentRes.status} ${await currentRes.text()}`);
  }
  const current = ((await currentRes.json()) as XRulesResponse).data ?? [];
  const ownIds = current.filter((r) => r.tag?.startsWith(RULE_TAG_PREFIX)).map((r) => r.id);

  if (ownIds.length > 0) {
    const res = await xRulesFetch(bearerToken, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ delete: { ids: ownIds } }),
    });
    if (!res.ok) throw new Error(`rule delete failed: ${res.status} ${await res.text()}`);
  }

  if (groups.length === 0) {
    logger.warn("no tracked_handles found — stream rules cleared, nothing will match");
    return;
  }

  const addRes = await xRulesFetch(bearerToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ add: groups.map(({ tag, value }) => ({ value, tag })) }),
  });
  if (!addRes.ok) throw new Error(`rule add failed: ${addRes.status} ${await addRes.text()}`);
}
