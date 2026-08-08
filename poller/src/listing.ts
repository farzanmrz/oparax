// Trimmed re-implementation of lib/sources/discovery.ts's listing extraction. Duplicated,
// not imported, per poller/README.md's isolation rule.

import { isPrivateHostname, isSafeDiscoveredUrl } from "./discovery-safety";
import { readHtmlWithinLimit } from "./html";
import { fetchWithTimeout } from "./http";
import { logger } from "./logger";
import type { ConditionalGetCache, FeedItem } from "./sitemap";

const MAX_ITEMS_PER_FETCH = 500;
const LISTING_MIN_ARTICLE_LINKS = 5;
const LISTING_MIN_ARTICLE_RATIO = 0.2;
const NON_ARTICLE_EXT_RE =
  /\.(svg|png|jpe?g|gif|webp|ico|css|js|json|xml|woff2?|ttf|otf|pdf|mp4|webm)$/i;

function extractAnchors(html: string): { href: string; text: string }[] {
  const anchors: { href: string; text: string }[] = [];
  let open: { href: string; contentStart: number } | null = null;
  let cursor = 0;

  while (cursor < html.length) {
    const tagStart = html.indexOf("<", cursor);
    if (tagStart === -1) break;
    const tagEnd = html.indexOf(">", tagStart + 1);
    if (tagEnd === -1) break;
    const tagText = html.slice(tagStart, tagEnd + 1);
    cursor = tagEnd + 1;
    if (/^<\/a\b/i.test(tagText)) {
      if (!open) continue;
      anchors.push({
        href: open.href,
        text: html
          .slice(open.contentStart, tagStart)
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      });
      open = null;
      continue;
    }
    if (!/^<a\b/i.test(tagText)) continue;
    const hrefMatch = tagText.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    open = hrefMatch ? { href: hrefMatch[1], contentStart: cursor } : null;
  }
  return anchors;
}

function isArticleShapedPath(pathname: string): boolean {
  if (NON_ARTICLE_EXT_RE.test(pathname)) return false;
  if (/\/(?:19|20)\d{2}(?:\/|$)/.test(pathname)) return true;
  if (/\/(?:topics?|tags?|authors?|categories?)(?:\/|$)/i.test(pathname)) return false;
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

async function fetchListingPage(
  pageUrl: string,
  expectedHostname: string,
  cache: ConditionalGetCache,
): Promise<{ res: Response; finalUrl: string }> {
  let currentUrl = pageUrl;
  const visited = new Set<string>();
  for (let redirects = 0; redirects < 20; redirects += 1) {
    if (!isSafeDiscoveredUrl(currentUrl, expectedHostname) || visited.has(currentUrl)) {
      throw new Error(`Listing ${pageUrl} redirected to an unsafe URL`);
    }
    visited.add(currentUrl);
    const res = await fetchWithTimeout("Listing", pageUrl, currentUrl, {
      method: "GET",
      headers: {
        ...conditionalHeaders(cache),
        accept: "text/html, application/xml, application/rss+xml;q=0.9, */*;q=0.8",
        "accept-encoding": "identity",
        "user-agent": "Oparax source discovery",
      },
      redirect: "manual",
    });
    if (res.status < 300 || res.status >= 400) return { res, finalUrl: currentUrl };
    const location = res.headers.get("location");
    await res.body?.cancel();
    if (!location) return { res, finalUrl: currentUrl };
    currentUrl = new URL(location, currentUrl).toString();
  }
  throw new Error(`Listing ${pageUrl} exceeded the redirect limit`);
}

export async function fetchListingItems(
  pageUrl: string,
  expectedHostname: string,
  _userAgent: string,
  cache: ConditionalGetCache,
): Promise<{ items: FeedItem[]; notModified: boolean; nextCache: ConditionalGetCache }> {
  const { res, finalUrl } = await fetchListingPage(pageUrl, expectedHostname, cache);
  if (res.status === 304) {
    await res.body?.cancel();
    return { items: [], notModified: true, nextCache: cache };
  }
  if (!res.ok) {
    let text: string;
    try {
      text = await readHtmlWithinLimit(res, pageUrl);
    } catch (err) {
      throw new Error(
        `Listing ${pageUrl} ${res.status}: ${err instanceof Error ? err.message : "body read failed"}`,
      );
    }
    throw new Error(`Listing ${pageUrl} ${res.status}: ${text.slice(0, 500)}`);
  }
  const contentType = res.headers.get("content-type");
  if (contentType && !/^\s*(?:text|application)\/x?html\b/i.test(contentType)) {
    await res.body?.cancel();
    throw new Error(`Listing ${pageUrl} returned non-HTML content`);
  }

  const listingUrl = new URL(finalUrl);
  listingUrl.hash = "";
  listingUrl.search = "";
  const listingHostname = comparableHostname(listingUrl.hostname);
  const seen = new Map<string, number>();
  const sameHostDistinct: FeedItem[] = [];
  const html = await readHtmlWithinLimit(res, pageUrl);

  for (const anchor of extractAnchors(html)) {
    let candidate: URL;
    try {
      candidate = new URL(anchor.href, finalUrl);
    } catch {
      continue;
    }
    if (candidate.protocol !== "http:" && candidate.protocol !== "https:") continue;
    if (
      comparableHostname(candidate.hostname) !== listingHostname ||
      isPrivateHostname(candidate.hostname) ||
      !isSafeDiscoveredUrl(candidate.toString(), expectedHostname)
    ) {
      continue;
    }
    candidate.hash = "";
    candidate.search = "";
    const url = candidate.toString();
    if (url === listingUrl.toString()) continue;
    const anchorText = anchor.text;
    const item: FeedItem = {
      url,
      itemKey: url,
      title: anchorText || null,
      publishedAt: null,
      bodyFromFeed: null,
    };
    const previousIndex = seen.get(url);
    if (previousIndex === undefined) {
      seen.set(url, sameHostDistinct.length);
      sameHostDistinct.push(item);
    } else if (anchorText.length > (sameHostDistinct[previousIndex].title?.length ?? 0)) {
      sameHostDistinct[previousIndex] = item;
    }
  }

  const items = sameHostDistinct.filter((item) => isArticleShapedPath(new URL(item.url).pathname));
  if (
    items.length < LISTING_MIN_ARTICLE_LINKS ||
    items.length / sameHostDistinct.length < LISTING_MIN_ARTICLE_RATIO
  ) {
    return { items: [], notModified: false, nextCache: nextCacheFrom(res) };
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
