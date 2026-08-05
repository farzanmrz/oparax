import { isSafeDiscoveredUrl } from "./discovery-safety";
import type { PollerEnv } from "./env";
import { describeError } from "./errors";
import { fetchWithTimeout } from "./http";
import { logger } from "./logger";
import type { FeedItem } from "./sitemap";

const BRIGHTDATA_REQUEST_URL = "https://api.brightdata.com/request";

/** Strips tags to plain text — same approach as #100's measureFullTextAvailability
 *  (lib/sources/onboard-source.ts). */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function teaserOnlyText(item: FeedItem): string {
  return item.bodyFromFeed ? stripHtml(item.bodyFromFeed) : (item.title ?? item.url);
}

async function fetchDirect(item: FeedItem, userAgent: string): Promise<string> {
  const res = await fetchWithTimeout("Article", item.url, item.url, {
    method: "GET",
    headers: { "user-agent": userAgent },
  });
  if (!res.ok) throw new Error(`Article ${item.url} ${res.status}`);
  return stripHtml(await res.text());
}

/** Web Unlocker API contract verified against Bright Data's current docs (2026-08):
 *  POST https://api.brightdata.com/request, Bearer auth, JSON body
 *  { zone, url, format: "raw" }, response body is the raw target-site HTML (not JSON). */
async function fetchViaUnlocker(
  item: FeedItem,
  apiKey: string,
  zone: string,
  userAgent: string,
): Promise<string> {
  const res = await fetchWithTimeout("Unlocker", item.url, BRIGHTDATA_REQUEST_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "user-agent": userAgent,
    },
    body: JSON.stringify({ zone, url: item.url, format: "raw" }),
  });
  if (!res.ok) throw new Error(`Unlocker ${item.url} ${res.status}: ${await res.text()}`);
  return stripHtml(await res.text());
}

/** Fetches an item's article body per its source's retrieval tier. Never throws for a
 *  fetch/parse failure — falls back to the feed/sitemap-derived teaser so one bad fetch
 *  never drops a delivery entirely; the caller still gets something to send to /api/ingest.
 *  `expectedHostname` is the source's own hostname, checked once here so every retrieval tier
 *  — direct and unlocker alike — is gated by the same same-site rule. */
export async function fetchArticleBody(
  item: FeedItem,
  retrieval: string,
  expectedHostname: string,
  env: PollerEnv,
): Promise<{ text: string; usedFallback: boolean }> {
  if (!isSafeDiscoveredUrl(item.url, expectedHostname)) {
    logger.error("fetch-body: refusing unsafe URL", { url: item.url, hostname: expectedHostname });
    return { text: teaserOnlyText(item), usedFallback: true };
  }

  if (retrieval === "direct") {
    try {
      return { text: await fetchDirect(item, env.userAgent), usedFallback: false };
    } catch (e) {
      logger.warn("fetch-body: direct fetch failed, falling back to teaser", {
        url: item.url,
        error: describeError(e),
      });
      return { text: teaserOnlyText(item), usedFallback: true };
    }
  }

  if (retrieval === "unlocker") {
    if (!env.brightdataApiKey || !env.brightdataZone) {
      logger.error("fetch-body: retrieval=unlocker but BRIGHTDATA_API_KEY/ZONE unset", {
        url: item.url,
      });
      return fetchArticleBody(item, "direct", expectedHostname, env);
    }
    try {
      const text = await fetchViaUnlocker(
        item,
        env.brightdataApiKey,
        env.brightdataZone,
        env.userAgent,
      );
      return { text, usedFallback: false };
    } catch (e) {
      logger.warn("fetch-body: unlocker fetch failed, falling back to teaser", {
        url: item.url,
        error: describeError(e),
      });
      return { text: teaserOnlyText(item), usedFallback: true };
    }
  }

  // 'none' | 'feed' | 'browser' (browser has no implementation in this slice, same
  // not-yet-reachable status as 'unlocker' until an onboarding path produces it).
  return { text: teaserOnlyText(item), usedFallback: false };
}
