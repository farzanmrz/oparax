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

const NO_LASTMOD_CANDIDATE_CAP = 10;

async function fetchAndParseSitemap(
  sitemapUrl: string,
  userAgent: string,
): Promise<{
  indexEntries: Array<{ loc?: string; lastmod?: string }>;
  leaves: RawSitemapUrlEntry[];
}> {
  const res = await fetchWithTimeout("Sitemap", sitemapUrl, sitemapUrl, {
    method: "GET",
    headers: { "user-agent": userAgent },
  });
  await assertFetchOk("Sitemap", sitemapUrl, res);
  const parsed = parser.parse(await res.text());
  const indexEntries = asArray<{ loc?: string; lastmod?: string }>(parsed.sitemapindex?.sitemap);
  const leaves = indexEntries.length === 0 ? asArray<RawSitemapUrlEntry>(parsed.urlset?.url) : [];
  return { indexEntries, leaves };
}

/** Resolves a <sitemapindex>'s newest-dated <sitemap> entry (by `<lastmod>`), then fetches
 *  and recurses into it — bounded by `maxDepth` (real sitemap indexes nest at most 1-2
 *  levels deep) so a self-referencing or cyclic index can't recurse indefinitely; it is
 *  exhausted, not treated as an error. When no entry carries a date, list position carries
 *  no reliable meaning — some sites shard content into the first sub-sitemap and leave the
 *  rest as empty placeholders, others do the reverse — so candidates are tried in order
 *  (capped) until one actually yields entries, rather than guessing a single position and
 *  giving up on an empty pick (found live: manutd.com's index has no `<lastmod>` anywhere;
 *  its real content is in the first sub-sitemap, the rest are empty shards). Every level
 *  below the top is a plain, non-conditional fetch: only the outermost fetch needs to be
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
  if (dated.length > 0) {
    const newest = dated.reduce((a, b) => (new Date(a.lastmod) >= new Date(b.lastmod) ? a : b));
    if (!isSafeDiscoveredUrl(newest.loc, expectedHostname)) return [];
    const { indexEntries: nextIndexEntries, leaves } = await fetchAndParseSitemap(
      newest.loc,
      userAgent,
    );
    if (nextIndexEntries.length === 0) return leaves;
    return resolveLeafEntries(nextIndexEntries, expectedHostname, userAgent, maxDepth - 1);
  }

  for (const entry of indexEntries.slice(0, NO_LASTMOD_CANDIDATE_CAP)) {
    if (!entry.loc || !isSafeDiscoveredUrl(entry.loc, expectedHostname)) continue;
    const { indexEntries: nextIndexEntries, leaves } = await fetchAndParseSitemap(
      entry.loc,
      userAgent,
    );
    const resolved =
      nextIndexEntries.length === 0
        ? leaves
        : await resolveLeafEntries(nextIndexEntries, expectedHostname, userAgent, maxDepth - 1);
    if (resolved.length > 0) return resolved;
  }
  return [];
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

  // Sitemaps may be ordered oldest-first. Sort before truncating so the cap preserves the
  // articles most likely to be new, rather than permanently discarding the current tail.
  const newestFirst = [...items].sort((a, b) => {
    const publishedMs = (item: FeedItem) => {
      if (!item.publishedAt) return Number.NEGATIVE_INFINITY;
      const parsed = Date.parse(item.publishedAt);
      return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
    };
    return publishedMs(b) - publishedMs(a);
  });

  return { items: newestFirst.slice(0, MAX_ITEMS_PER_FETCH), notModified: false, nextCache };
}
