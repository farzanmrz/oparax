// Trimmed re-implementation of lib/sources/feed.ts's RSS 2.0 / Atom parsing, adapted to
// FeedItem (sitemap.ts's shape) with conditional-GET support. Duplicated, not imported, per
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

// Atom (RFC 4287): root is <feed><entry>, not RSS 2.0's <rss><channel><item> — a distinct
// schema, not a variant. <link> is a self-closing element carrying its URL in an `href`
// attribute (never text content); `rel="alternate"` (or no rel, the Atom default) is the one
// this cares about.
type RawAtomLink = { "@_href"?: string; "@_rel"?: string };
// An element with attributes (e.g. <summary type="html">, <title type="text">) parses to
// `{ "@_type": ..., "#text": ... }`, not a plain string — any Atom text-construct field can
// take either shape depending on whether the source feed put an attribute on that tag.
type AtomTextConstruct = string | { "#text"?: string };
type RawAtomEntry = {
  link?: RawAtomLink | RawAtomLink[];
  id?: string;
  title?: AtomTextConstruct;
  updated?: string;
  published?: string;
  summary?: AtomTextConstruct;
  content?: AtomTextConstruct;
};

function atomText(value: AtomTextConstruct | undefined): string | undefined {
  return typeof value === "string" ? value : value?.["#text"];
}

function atomLinkHref(link: RawAtomEntry["link"]): string | undefined {
  const links = asArray(link);
  const alternate = links.find((entry) => !entry["@_rel"] || entry["@_rel"] === "alternate");
  return (alternate ?? links[0])?.["@_href"];
}

function toAtomFeedItem(raw: RawAtomEntry): FeedItem | null {
  const url = atomLinkHref(raw.link) ?? raw.id;
  if (!url) return null;
  return {
    url,
    itemKey: raw.id ?? url,
    title: atomText(raw.title) ?? null,
    publishedAt: raw.updated ?? raw.published ?? null,
    bodyFromFeed: atomTeaser(raw) ?? null,
  };
}

function atomTeaser(raw: RawAtomEntry): string | undefined {
  return atomText(raw.summary) ?? atomText(raw.content);
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

  // A site's declared type="..." on the discovering <link> tag isn't trustworthy on its own
  // (managingmadrid.com labels its Atom feed application/rss+xml) — detect by root element
  // (<rss> vs <feed>) against the body actually fetched instead.
  const items = (
    parsed.feed
      ? asArray<RawAtomEntry>(parsed.feed?.entry).map(toAtomFeedItem)
      : asArray<RawFeedItem>(parsed.rss?.channel?.item).map(toFeedItem)
  )
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
