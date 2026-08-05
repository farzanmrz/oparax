import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { isSafeDiscoveredUrl } from "./discovery-safety";
import type { PollerEnv } from "./env";
import { describeError } from "./errors";
import { fetchWithTimeout } from "./http";
import { logger } from "./logger";
import type { FeedItem } from "./sitemap";

const BRIGHTDATA_REQUEST_URL = "https://api.brightdata.com/request";

/** Below this length, extraction is treated as having failed — not a real article body,
 *  likely a block page, a paywall stub, or a template with no article content actually
 *  present. Also the "did this fetch actually work" signal the adaptive retrieval chain
 *  (fetchArticleBody) uses to decide whether to escalate to the next tier. */
const MIN_BODY_LENGTH = 200;

/** Above this length, skip JSON-LD/JSDOM/Readability entirely and go straight to the blunt
 *  strip — a generous cap (real article pages are typically well under 500KB) that guards
 *  against synchronously allocating a huge DOM for an unusually large or hostile page on this
 *  single-instance worker (railway.json's numReplicas: 1), where one bad page could stall or
 *  crash the process mid-tick and take every other source's polling down with it. */
const MAX_HTML_LENGTH = 5_000_000;

/** Bright Data's Web Unlocker does block-bypass/challenge-solving server-side and routinely
 *  takes longer than the shared 15s default — this tier exists specifically for hostile sites,
 *  so it gets its own longer budget instead of inheriting fetchWithTimeout's default. */
const UNLOCKER_TIMEOUT_MS = 45_000;

/** Strips tags to plain text — the last-resort fallback when neither JSON-LD nor Readability
 *  produce anything usable. Never crashes, always returns SOMETHING. Same approach as #100's
 *  measureFullTextAvailability (lib/sources/onboard-source.ts). */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Many real-world news sites emit schema.org NewsArticle/Article JSON-LD with an
 *  `articleBody` field for SEO — when present, it's the cleanest possible source (no page
 *  chrome to strip at all). Tries every <script type="application/ld+json"> block on the
 *  page; a site can have several (breadcrumbs, org info) alongside the one that matters. */
function extractFromJsonLd(html: string): string | null {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        const body = candidate?.articleBody;
        if (typeof body === "string" && body.length >= MIN_BODY_LENGTH) return body;
        // WordPress/Yoast SEO commonly wraps the article node inside a top-level `@graph`
        // array alongside unrelated nodes (breadcrumbs, org info) — search those too.
        if (Array.isArray(candidate?.["@graph"])) {
          for (const node of candidate["@graph"]) {
            const graphBody = node?.articleBody;
            if (typeof graphBody === "string" && graphBody.length >= MIN_BODY_LENGTH) {
              return graphBody;
            }
          }
        }
      }
    } catch {
      // malformed JSON-LD on this block — try the next one
    }
  }
  return null;
}

/** Real content extraction, preferred over the blunt strip: structured JSON-LD markup first
 *  (cheap, exact, no DOM parsing needed), then Mozilla's Readability algorithm (the same one
 *  behind Firefox's Reader View) for everything else, falling back to the blunt tag-strip
 *  only if both of those come back empty or throw. Never crashes — always returns something
 *  the caller can send to /api/ingest. */
function extractArticleBody(html: string, url: string): string {
  if (html.length > MAX_HTML_LENGTH) return stripHtml(html);

  const jsonLd = extractFromJsonLd(html);
  if (jsonLd) return jsonLd;

  try {
    const dom = new JSDOM(html, { url });
    const parsed = new Readability(dom.window.document).parse();
    if (parsed?.textContent) {
      const cleaned = parsed.textContent.replace(/\s+/g, " ").trim();
      if (cleaned.length >= MIN_BODY_LENGTH) return cleaned;
    }
  } catch {
    // malformed HTML Readability can't parse — fall through to the blunt strip
  }

  return stripHtml(html);
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
  return extractArticleBody(await res.text(), item.url);
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
  const res = await fetchWithTimeout(
    "Unlocker",
    item.url,
    BRIGHTDATA_REQUEST_URL,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        "user-agent": userAgent,
      },
      body: JSON.stringify({ zone, url: item.url, format: "raw" }),
    },
    UNLOCKER_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`Unlocker ${item.url} ${res.status}: ${await res.text()}`);
  return extractArticleBody(await res.text(), item.url);
}

/** Bright Data Unlocker, or the teaser if it's unconfigured or itself fails — the shared
 *  terminal step for both the explicit `retrieval === "unlocker"` override and the adaptive
 *  chain's own Tier 2 escalation. */
async function fetchViaUnlockerOrTeaser(
  item: FeedItem,
  env: PollerEnv,
): Promise<{ text: string; usedFallback: boolean }> {
  if (!env.brightdataApiKey || !env.brightdataZone) {
    logger.error("fetch-body: retrieval=unlocker but BRIGHTDATA_API_KEY/ZONE unset", {
      url: item.url,
    });
    return { text: teaserOnlyText(item), usedFallback: true };
  }
  try {
    const text = await fetchViaUnlocker(
      item,
      env.brightdataApiKey,
      env.brightdataZone,
      env.userAgent,
    );
    return { text, usedFallback: text.length < MIN_BODY_LENGTH };
  } catch (e) {
    logger.warn("fetch-body: unlocker fetch failed, falling back to teaser", {
      url: item.url,
      error: describeError(e),
    });
    return { text: teaserOnlyText(item), usedFallback: true };
  }
}

/** Fetches an item's article body. Adaptive by default (#105) — no site-specific decision is
 *  made in advance; a plain honest fetch is tried first, and Bright Data's Web Unlocker only
 *  gets used when that fetch actually fails or comes back suspiciously short (a soft block —
 *  a "please enable JS" stub, a challenge page — the "curtain, not wall" case). `retrieval`
 *  is now an OPTIONAL OPERATOR OVERRIDE, not a declared policy: null means "figure it out";
 *  an explicit value skips straight to that tier, never falling back further — the override
 *  exists precisely to bypass the adaptive chain's own judgment for a site the operator
 *  already understands. Never throws for a fetch/parse failure — always falls back to the
 *  feed/sitemap-derived teaser so one bad fetch never drops a delivery entirely.
 *  `expectedHostname` is the source's own hostname, checked once here so every tier is gated
 *  by the same same-site rule. */
export async function fetchArticleBody(
  item: FeedItem,
  retrieval: string | null,
  expectedHostname: string,
  env: PollerEnv,
): Promise<{ text: string; usedFallback: boolean }> {
  if (!isSafeDiscoveredUrl(item.url, expectedHostname)) {
    logger.error("fetch-body: refusing unsafe URL", { url: item.url, hostname: expectedHostname });
    return { text: teaserOnlyText(item), usedFallback: true };
  }

  // Explicit operator override: skip the adaptive chain entirely.
  if (retrieval === "feed" || retrieval === "none") {
    return { text: teaserOnlyText(item), usedFallback: false };
  }
  if (retrieval === "unlocker") {
    return fetchViaUnlockerOrTeaser(item, env);
  }

  // Default: adaptive chain (retrieval is null, or a legacy "direct"/"browser" value — both
  // mean "no override decided in advance," so the chain runs the same either way).
  // Tier 1 — plain direct fetch. Kept even when short/suspicious: a genuinely short real
  // body still beats a bare-title teaser if every later tier also comes up empty.
  let shortDirectText: string | null = null;
  try {
    const text = await fetchDirect(item, env.userAgent);
    if (text.length >= MIN_BODY_LENGTH) return { text, usedFallback: false };
    logger.warn("fetch-body: direct fetch returned suspiciously short content, escalating", {
      url: item.url,
      length: text.length,
    });
    if (text) shortDirectText = text;
  } catch (e) {
    logger.warn("fetch-body: direct fetch failed, escalating", {
      url: item.url,
      error: describeError(e),
    });
  }

  // Tier 2 — Bright Data Web Unlocker, only if configured.
  if (env.brightdataApiKey && env.brightdataZone) {
    const result = await fetchViaUnlockerOrTeaser(item, env);
    if (!result.usedFallback) return result;
    return shortDirectText ? { text: shortDirectText, usedFallback: true } : result;
  }

  // Tier 3 — no Unlocker configured, nothing left but the teaser (unless a short-but-real
  // direct-fetch body is still on hand — that beats a bare headline).
  return shortDirectText
    ? { text: shortDirectText, usedFallback: true }
    : { text: teaserOnlyText(item), usedFallback: true };
}
