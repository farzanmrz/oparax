// Trimmed re-implementation of lib/sources/sitemap.ts — same fast-xml-parser config and
// <sitemapindex>/<urlset> recursion, but returns only the fields the poller needs (no
// SourceSampleEntry, no onboarding-time keywords field) and adds conditional-GET support so
// an unchanged sitemap short-circuits on a 304 without re-parsing. Duplicated, not imported,
// per poller/README.md's isolation rule.

import { XMLParser } from "fast-xml-parser";
import { isSafeDiscoveredUrl } from "./discovery-safety";
import { assertFetchOk, fetchWithTimeout } from "./http";
import { logger } from "./logger";

/** A large sitemap can list thousands of URLs; parsing them all every tick costs more than it
 *  buys, since only the newest handful can ever be new. Truncation is always logged. */
const MAX_ITEMS_PER_FETCH = 500;

export interface FeedItem {
  url: string;
  itemKey: string;
  title: string | null;
  publishedAt: string | null;
  bodyFromFeed: string | null;
}

export interface ConditionalGetCache {
  etag?: string;
  lastModified?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

type RawSitemapUrlEntry = {
  loc?: string;
  lastmod?: string;
  "news:news"?: {
    "news:title"?: string;
    "news:publication_date"?: string;
  };
};

function toFeedItem(raw: RawSitemapUrlEntry): FeedItem | null {
  if (!raw.loc) return null;
  const news = raw["news:news"];
  return {
    url: raw.loc,
    itemKey: raw.loc,
    title: news?.["news:title"] ?? null,
    publishedAt: news?.["news:publication_date"] ?? raw.lastmod ?? null,
    bodyFromFeed: null, // sitemaps never carry article body/teaser text
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

/** Resolves a <sitemapindex>'s newest-dated <sitemap> entry (falling back to the last entry
 *  when none carry a <lastmod>), then fetches and recurses into it — bounded by `maxDepth`
 *  (real sitemap indexes nest at most 1-2 levels deep) so a self-referencing or cyclic index
 *  can't recurse indefinitely; it is exhausted, not treated as an error. Every level below
 *  the top is a plain, non-conditional fetch: only the outermost fetch needs to be
 *  conditional, since a sub-sitemap's own freshness is irrelevant if the index itself hasn't
 *  changed. */
async function resolveLeafEntries(
  indexEntries: Array<{ loc?: string; lastmod?: string }>,
  expectedHostname: string,
  userAgent: string,
  maxDepth: number,
): Promise<RawSitemapUrlEntry[]> {
  if (maxDepth <= 0 || indexEntries.length === 0) return [];

  const dated = indexEntries.filter(
    (entry): entry is { loc: string; lastmod: string } => !!entry.loc && !!entry.lastmod,
  );
  const newest =
    dated.length > 0
      ? dated.reduce((a, b) => (new Date(a.lastmod) >= new Date(b.lastmod) ? a : b))
      : indexEntries[indexEntries.length - 1];

  if (!newest.loc || !isSafeDiscoveredUrl(newest.loc, expectedHostname)) return [];

  const res = await fetchWithTimeout("Sitemap", newest.loc, newest.loc, {
    method: "GET",
    headers: { "user-agent": userAgent },
  });
  await assertFetchOk("Sitemap", newest.loc, res);
  const parsed = parser.parse(await res.text());

  const nextIndexEntries = asArray<{ loc?: string; lastmod?: string }>(
    parsed.sitemapindex?.sitemap,
  );
  if (nextIndexEntries.length === 0) return asArray<RawSitemapUrlEntry>(parsed.urlset?.url);
  return resolveLeafEntries(nextIndexEntries, expectedHostname, userAgent, maxDepth - 1);
}

export async function fetchSitemapItems(
  sitemapUrl: string,
  expectedHostname: string,
  userAgent: string,
  cache: ConditionalGetCache,
): Promise<{ items: FeedItem[]; notModified: boolean; nextCache: ConditionalGetCache }> {
  const res = await fetchWithTimeout("Sitemap", sitemapUrl, sitemapUrl, {
    method: "GET",
    headers: { ...conditionalHeaders(cache), "user-agent": userAgent },
  });
  if (res.status === 304) {
    return { items: [], notModified: true, nextCache: cache };
  }
  await assertFetchOk("Sitemap", sitemapUrl, res);
  const nextCache = nextCacheFrom(res);
  const parsed = parser.parse(await res.text());

  const indexEntries = asArray<{ loc?: string; lastmod?: string }>(parsed.sitemapindex?.sitemap);
  const rawEntries =
    indexEntries.length === 0
      ? asArray<RawSitemapUrlEntry>(parsed.urlset?.url)
      : await resolveLeafEntries(indexEntries, expectedHostname, userAgent, 5);

  const items = rawEntries
    .map(toFeedItem)
    .filter((entry): entry is FeedItem => entry !== null)
    .filter((entry) => isSafeDiscoveredUrl(entry.url, expectedHostname));

  if (items.length > MAX_ITEMS_PER_FETCH) {
    logger.warn("sitemap: item count exceeds per-fetch cap, truncating", {
      sitemapUrl,
      hostname: expectedHostname,
      itemCount: items.length,
      cap: MAX_ITEMS_PER_FETCH,
    });
  }

  return { items: items.slice(0, MAX_ITEMS_PER_FETCH), notModified: false, nextCache };
}
