// Trimmed re-implementation of lib/sources/feed.ts's RSS 2.0 parsing, adapted to FeedItem
// (sitemap.ts's shape) with conditional-GET support. Duplicated, not imported, per
// poller/README.md's isolation rule.

import { XMLParser } from "fast-xml-parser";
import { isSafeDiscoveredUrl } from "./discovery-safety";
import { assertFetchOk, fetchWithTimeout } from "./http";
import { logger } from "./logger";
import type { ConditionalGetCache, FeedItem } from "./sitemap";

/** Mirrors sitemap.ts's cap — a feed that lists thousands of items is not worth mapping in
 *  full every tick, since only the newest handful can ever be new. Truncation is always
 *  logged. */
const MAX_ITEMS_PER_FETCH = 500;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

type RawFeedItem = {
  link?: string;
  guid?: string | { "#text"?: string };
  title?: string;
  pubDate?: string;
  description?: string;
  "content:encoded"?: string;
};

function guidAsString(guid: RawFeedItem["guid"]): string | undefined {
  if (typeof guid === "string") return guid;
  return guid?.["#text"];
}

function toFeedItem(raw: RawFeedItem): FeedItem | null {
  const url = raw.link ?? guidAsString(raw.guid);
  if (!url) return null;
  return {
    url,
    // Prefer the feed's own guid as the dedup key when present — it's stable even if a
    // publisher later edits the URL (canonical redirect, slug tweak); fall back to the URL
    // itself when no guid exists.
    itemKey: guidAsString(raw.guid) ?? url,
    title: raw.title ?? null,
    publishedAt: raw.pubDate ?? null,
    bodyFromFeed: raw["content:encoded"] ?? raw.description ?? null,
  };
}

function conditionalHeaders(cache: ConditionalGetCache): Record<string, string> {
  const headers: Record<string, string> = {};
  if (cache.etag) headers["if-none-match"] = cache.etag;
  if (cache.lastModified) headers["if-modified-since"] = cache.lastModified;
  return headers;
}

function nextCacheFrom(res: Response): ConditionalGetCache {
  return {
    etag: res.headers.get("etag") ?? undefined,
    lastModified: res.headers.get("last-modified") ?? undefined,
  };
}

export async function fetchFeedItems(
  feedUrl: string,
  expectedHostname: string,
  userAgent: string,
  cache: ConditionalGetCache,
): Promise<{ items: FeedItem[]; notModified: boolean; nextCache: ConditionalGetCache }> {
  const res = await fetchWithTimeout("Feed", feedUrl, feedUrl, {
    method: "GET",
    headers: { ...conditionalHeaders(cache), "user-agent": userAgent },
  });
  if (res.status === 304) {
    return { items: [], notModified: true, nextCache: cache };
  }
  await assertFetchOk("Feed", feedUrl, res);
  const nextCache = nextCacheFrom(res);
  const parsed = parser.parse(await res.text());

  const rawItems = asArray<RawFeedItem>(parsed.rss?.channel?.item);
  const items = rawItems
    .map(toFeedItem)
    .filter((entry): entry is FeedItem => entry !== null)
    .filter((entry) => isSafeDiscoveredUrl(entry.url, expectedHostname));

  if (items.length > MAX_ITEMS_PER_FETCH) {
    logger.warn("feed: item count exceeds per-fetch cap, truncating", {
      feedUrl,
      hostname: expectedHostname,
      itemCount: items.length,
      cap: MAX_ITEMS_PER_FETCH,
    });
  }

  return { items: items.slice(0, MAX_ITEMS_PER_FETCH), notModified: false, nextCache };
}
