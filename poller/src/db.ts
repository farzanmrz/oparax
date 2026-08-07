import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// This package never imports the app's generated lib/supabase/database.types.ts (isolation
// rule) — the row shape below is hand-typed against exactly the columns this worker reads,
// kept in sync with supabase/migrations/20260805012730_source_seen_items.sql by hand.
export interface SourceConfigRow {
  id: string;
  agent_id: string;
  url: string;
  domain: string;
  language: string | null;
  change_detection: string; // 'sitemap' | 'rss'
  // null = the poller decides adaptively, per fetch (#105's default); a non-null value is a
  // deliberate operator override consumed by fetch-body.ts's adaptive chain.
  retrieval: string | null; // null | 'none' | 'feed' | 'direct' | 'unlocker' | 'browser'
  prefilter: { pathPrefix?: string; reasoning?: string } | null;
  beat_guidance: { onBeat?: string; offBeat?: string } | null;
  sitemap_url: string | null;
  feed_url: string | null;
  status: string; // 'active' | 'failed_validation' | 'stale'
  last_matched_at: string | null;
  last_verified_at: string;
}

export function createPollerClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey);
}

export async function fetchActiveSourceConfigs(client: SupabaseClient): Promise<SourceConfigRow[]> {
  const { data, error } = await client
    .from("source_configs")
    .select(
      "id, agent_id, url, domain, language, change_detection, retrieval, prefilter, beat_guidance, sitemap_url, feed_url, status, last_matched_at, last_verified_at",
    )
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []) as SourceConfigRow[];
}

/** Read-only "have I delivered this before?" check. Split out from the mark so delivery can
 *  be attempted BEFORE the item is written off as seen — index.ts's in-flight guard keeps one
 *  tick running at a time, so the check and the mark can't interleave with another tick. */
export async function hasSeenItem(
  client: SupabaseClient,
  sourceConfigId: string,
  itemKey: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("source_seen_items")
    .select("id")
    .eq("source_config_id", sourceConfigId)
    .eq("item_key", itemKey)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Marks an item seen after its delivery has been processed. Also bumps
 *  source_configs.last_matched_at server-side (see the record_seen_item RPC). */
export async function markItemSeen(
  client: SupabaseClient,
  sourceConfigId: string,
  itemKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_seen_item", {
    p_source_config_id: sourceConfigId,
    p_item_key: itemKey,
    p_bump_last_matched: true,
  });
  if (error) throw error;
}

/** Priming-tick variant: seeds an item as seen WITHOUT bumping last_matched_at, because
 *  last_matched_at is also the "am I priming?" predicate — bumping it mid-loop would make a
 *  crashed priming pass resume as a steady-state tick and deliver the rest of the history. */
export async function seedSeenItem(
  client: SupabaseClient,
  sourceConfigId: string,
  itemKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_seen_item", {
    p_source_config_id: sourceConfigId,
    p_item_key: itemKey,
    p_bump_last_matched: false,
  });
  if (error) throw error;
}

/** Priming-tick-only: marks a source as no longer "first ever tick" without going through
 *  record_seen_item (no item is "new" during priming — see tick.ts). */
export async function markPrimed(client: SupabaseClient, sourceConfigId: string): Promise<void> {
  const { error } = await client
    .from("source_configs")
    .update({ last_matched_at: new Date().toISOString() })
    .eq("id", sourceConfigId);
  if (error) throw error;
}

/** Counts distinct website articles ingested (across every desk) in the last 24h — the same
 *  rolling-window shape as ingest/'s checkDeliveryCap, but measured against source_posts
 *  directly rather than usage_events: usage_events.kind = "stream_delivery" is shared with
 *  the X worker and stamped once per matched OWNER (so one popular article tracked by two
 *  desks writes two rows), while source_posts has exactly one row per distinct website
 *  article regardless of how many desks track it — the more precise proxy for "how much new
 *  content has this worker introduced," which is what a runaway-ingestion alarm cares about. */
export async function countRecentWebsiteDeliveries(client: SupabaseClient): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await client
    .from("source_posts")
    .select("*", { count: "exact", head: true })
    .eq("source", "website")
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}
