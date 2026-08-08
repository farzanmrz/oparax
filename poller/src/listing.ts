// Trimmed re-implementation of lib/sources/discovery.ts's listing extraction. Duplicated,
// not imported, per poller/README.md's isolation rule.

import { isPrivateHostname } from "./discovery-safety";
import { assertFetchOk, fetchWithTimeout } from "./http";
import { logger } from "./logger";
import type { ConditionalGetCache, FeedItem } from "./sitemap";

const MAX_ITEMS_PER_FETCH = 500;
const NON_ARTICLE_EXT_RE =
  /\.(svg|png|jpe?g|gif|webp|ico|css|js|json|xml|woff2?|ttf|otf|pdf|mp4|webm)$/i;

function isArticleShapedPath(pathname: string): boolean {
  if (NON_ARTICLE_EXT_RE.test(pathname)) return false;
  if (/\/(?:19|20)\d{2}(?:\/|$)/.test(pathname)) return true;
  const leaf = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const hyphens = leaf.match(/-/g)?.length ?? 0;
  return hyphens >= 3 || (/\.html?$/i.test(leaf) && leaf.includes("-"));
}

function comparableHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
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

export async function fetchListingItems(
  pageUrl: string,
  expectedHostname: string,
  userAgent: string,
  cache: ConditionalGetCache,
): Promise<{ items: FeedItem[]; notModified: boolean; nextCache: ConditionalGetCache }> {
  const res = await fetchWithTimeout("Listing", pageUrl, pageUrl, {
    method: "GET",
    headers: { ...conditionalHeaders(cache), "user-agent": userAgent },
    redirect: "manual",
  });
  if (res.status === 304) return { items: [], notModified: true, nextCache: cache };
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`Listing ${pageUrl} redirected (${res.status}), refusing to follow`);
  }
  await assertFetchOk("Listing", pageUrl, res);
  const contentType = res.headers.get("content-type");
  if (contentType && !/^\s*(?:text|application)\/x?html\b/i.test(contentType)) {
    throw new Error(`Listing ${pageUrl} returned non-HTML content`);
  }

  const finalUrl = res.url || pageUrl;
  const listingUrl = new URL(finalUrl);
  listingUrl.hash = "";
  const listingHostname = comparableHostname(listingUrl.hostname);
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  const html = await res.text();
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    let candidate: URL;
    try {
      candidate = new URL(match[1], finalUrl);
    } catch {
      continue;
    }
    if (candidate.protocol !== "http:" && candidate.protocol !== "https:") continue;
    if (
      comparableHostname(candidate.hostname) !== listingHostname ||
      isPrivateHostname(candidate.hostname)
    ) {
      continue;
    }
    candidate.hash = "";
    const url = candidate.toString();
    if (
      url === listingUrl.toString() ||
      seen.has(url) ||
      !isArticleShapedPath(candidate.pathname)
    ) {
      continue;
    }
    seen.add(url);
    const anchorText = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    items.push({
      url,
      itemKey: url,
      title: anchorText || null,
      publishedAt: null,
      bodyFromFeed: null,
    });
  }

  if (items.length > MAX_ITEMS_PER_FETCH) {
    logger.warn("listing: item count exceeds per-fetch cap, truncating", {
      pageUrl,
      hostname: expectedHostname,
      itemCount: items.length,
      cap: MAX_ITEMS_PER_FETCH,
    });
  }

  return {
    items: items.slice(0, MAX_ITEMS_PER_FETCH),
    notModified: false,
    nextCache: nextCacheFrom(res),
  };
}
