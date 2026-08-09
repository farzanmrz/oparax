import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlarmState } from "./alarm";
import { alarmStaleSource } from "./alarm";
import {
  fetchActiveSourceConfigs,
  hasSeenItem,
  markItemSeen,
  markPrimed,
  type SourceConfigRow,
  seedSeenItem,
} from "./db";
import { FatalIngestError, postDelivery } from "./deliver";
import type { PollerEnv } from "./env";
import { describeError } from "./errors";
import { fetchFeedItems } from "./feed";
import { fetchArticleBody } from "./fetch-body";
import { fetchListingItems } from "./listing";
import { logger } from "./logger";
import type { ConditionalGetCache, FeedItem } from "./sitemap";
import { fetchSitemapItems } from "./sitemap";
import { buildExternalId } from "./types";

function applyPrefilter(items: FeedItem[], prefilter: SourceConfigRow["prefilter"]): FeedItem[] {
  if (!prefilter?.pathPrefix) return items;
  const prefix = prefilter.pathPrefix;
  return items.filter((item) => {
    try {
      return new URL(item.url).pathname.startsWith(prefix);
    } catch {
      return false;
    }
  });
}

/** Newest first, so the per-tick cap keeps the most recent items rather than whichever ones
 *  the feed or sitemap happened to list first. A missing or unparseable publishedAt sorts
 *  oldest — an undated item is never worth spending the cap on ahead of a dated one. */
function byNewestFirst(items: FeedItem[]): FeedItem[] {
  const publishedMs = (item: FeedItem): number => {
    if (!item.publishedAt) return Number.NEGATIVE_INFINITY;
    const parsed = Date.parse(item.publishedAt);
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
  };
  return [...items].sort((a, b) => publishedMs(b) - publishedMs(a));
}

async function fetchCandidateItems(
  source: SourceConfigRow,
  userAgent: string,
  cache: ConditionalGetCache,
): Promise<{ items: FeedItem[]; notModified: boolean; nextCache: ConditionalGetCache }> {
  if (source.change_detection === "listing") {
    return fetchListingItems(source.listing_url ?? source.url, source.domain, userAgent, cache);
  }
  if (source.change_detection === "sitemap" && source.sitemap_url) {
    return fetchSitemapItems(source.sitemap_url, source.domain, userAgent, cache);
  }
  if (source.change_detection === "rss" && source.feed_url) {
    return fetchFeedItems(source.feed_url, source.domain, userAgent, cache);
  }
  throw new Error(
    `source ${source.id}: change_detection=${source.change_detection} but its URL is missing`,
  );
}

async function deliverNewItem(
  source: SourceConfigRow,
  item: FeedItem,
  env: PollerEnv,
): Promise<void> {
  const { text } = await fetchArticleBody(
    item,
    source.retrieval,
    source.domain,
    env,
    source.strip_phrases,
  );
  const externalId = buildExternalId(item.url, item.publishedAt);
  await postDelivery(env.ingestUrl, env.ingestSecret, {
    source: "website",
    source_config_id: source.id,
    external_id: externalId,
    url: item.url,
    title: item.title ?? item.url,
    text,
    author_handle: null,
    published_at: item.publishedAt,
    lang: source.language,
  });
}

async function pollOneSource(
  client: SupabaseClient,
  env: PollerEnv,
  source: SourceConfigRow,
  caches: Map<string, ConditionalGetCache>,
  staleAlarms: Map<string, AlarmState>,
): Promise<void> {
  const cache = caches.get(source.id) ?? {};
  const {
    items: rawItems,
    notModified,
    nextCache,
  } = await fetchCandidateItems(source, env.userAgent, cache);

  let deliveredCount = 0;

  // A 304 means "nothing new since last tick" — the same thing zero deliveries means, so it
  // falls through to the staleness check below rather than returning early.
  if (notModified) {
    caches.set(source.id, nextCache);
    logger.info("tick: not modified", { domain: source.domain });
  } else {
    const candidates = applyPrefilter(rawItems, source.prefilter);

    if (source.last_matched_at === null) {
      // Priming tick: this source has never had a new-item match recorded. Its sitemap/feed
      // sample can already hold ~100 items from #100's onboarding SAMPLE_LIMIT — seed them as
      // seen WITHOUT delivering, so the first real tick doesn't fire a delivery storm of
      // "breaking news" that's actually months old. markPrimed is the ONLY thing that sets
      // last_matched_at here, so a crash mid-loop resumes as a priming tick, not a storm.
      for (const item of candidates) {
        await seedSeenItem(client, source.id, item.itemKey);
      }
      await markPrimed(client, source.id);
      caches.set(source.id, nextCache);
      logger.info("tick: priming complete, 0 delivered", {
        domain: source.domain,
        seeded: candidates.length,
      });
      return;
    }

    // Check seen status before applying the per-tick cap. Otherwise the same newest seen
    // entries consume the window on every tick and older unseen entries never reach delivery.
    const unseen: FeedItem[] = [];
    for (const item of byNewestFirst(candidates)) {
      if (!(await hasSeenItem(client, source.id, item.itemKey))) unseen.push(item);
    }
    // Undated listing items retain extraction order under JavaScript's stable sort. If the cap
    // binds, later links wait for later ticks and can be lost if the page rotates first.
    const capped = unseen.slice(0, env.maxNewItemsPerSourceTick);
    if (unseen.length > capped.length) {
      logger.warn("tick: candidate list exceeds per-tick cap, remainder retried next tick", {
        domain: source.domain,
        candidateCount: unseen.length,
        cap: env.maxNewItemsPerSourceTick,
      });
    }

    for (const item of capped) {
      // item.itemKey is the STABLE identity (sitemap: the <loc> URL; feed: the guid when
      // present) — dedup must not key off publishedAt, or a publisher editing an already-
      // published article redelivers it.
      // Deliver FIRST, mark seen only once postDelivery returns (a 422 drop counts as
      // processed just as much as a 200 does). If delivery throws, the item stays unseen and
      // the next tick retries it — marking first would lose it permanently.
      await deliverNewItem(source, item, env);
      await markItemSeen(client, source.id, item.itemKey);
      deliveredCount++;
    }

    // Keep the prior validators while uncapped unseen entries remain. A 304 against the new
    // validator would otherwise hide the remainder forever; already-delivered entries are
    // harmless on the refetch because hasSeenItem filters them above.
    if (unseen.length <= env.maxNewItemsPerSourceTick) {
      caches.set(source.id, nextCache);
    }
  }

  if (deliveredCount > 0) {
    logger.info("tick: delivered new items", { domain: source.domain, count: deliveredCount });
    return;
  }

  const lastMatch = source.last_matched_at ?? source.last_verified_at;
  const msSinceMatch = Date.now() - Date.parse(lastMatch);
  if (msSinceMatch > env.staleThresholdMs) {
    const state = staleAlarms.get(source.id) ?? { lastAlarmAt: null };
    staleAlarms.set(source.id, state);
    await alarmStaleSource(
      env.slackWebhookUrl,
      env.alarmCooldownMs,
      state,
      source.domain,
      Math.floor(msSinceMatch / (24 * 60 * 60 * 1000)),
    );
  }
}

/** One tick: every source is polled independently — a network error, malformed XML, or a
 *  500 from one feed is caught here and logged, never allowed to stall or crash the others.
 *  Only FatalIngestError (a bad INGEST_SECRET, from postDelivery) propagates past this loop —
 *  that's a config problem no amount of per-source isolation can route around. */
export async function pollAllSources(
  client: SupabaseClient,
  env: PollerEnv,
  caches: Map<string, ConditionalGetCache>,
  staleAlarms: Map<string, AlarmState>,
): Promise<void> {
  let sources: SourceConfigRow[];
  try {
    sources = await fetchActiveSourceConfigs(client);
  } catch (e) {
    // A transient Supabase blip is not a config problem — skip this tick, keep the worker up.
    logger.error("tick: could not load source configs, skipping tick", { error: describeError(e) });
    return;
  }
  logger.info("tick: starting", { sourceCount: sources.length });

  for (const source of sources) {
    try {
      await pollOneSource(client, env, source, caches, staleAlarms);
    } catch (e) {
      if (e instanceof FatalIngestError) throw e;
      logger.error("tick: source failed, continuing", {
        domain: source.domain,
        error: describeError(e),
      });
    }
  }
}
