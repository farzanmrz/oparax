import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { isSafeDiscoveredUrl, isSafePublicUrl } from "./discovery-safety";
import type { PollerEnv } from "./env";
import { describeError } from "./errors";
import { MAX_HTML_LENGTH, readHtmlWithinLimit } from "./html";
import { fetchWithTimeout } from "./http";
import { logger } from "./logger";
import type { FeedItem } from "./sitemap";

const BRIGHTDATA_REQUEST_URL = "https://api.brightdata.com/request";

/** Below this length, extraction is treated as having failed — not a real article body,
 *  likely a block page, a paywall stub, or a template with no article content actually
 *  present. Also the "did this fetch actually work" signal the adaptive retrieval chain
 *  (fetchArticleBody) uses to decide whether to escalate to the next tier. */
export const MIN_BODY_LENGTH = 200;

/** Above this length, skip JSON-LD/JSDOM/Readability entirely and go straight to the blunt
 *  strip — a generous cap (real article pages are typically well under 500KB) that guards
 *  against synchronously allocating a huge DOM for an unusually large or hostile page on this
 *  single-instance worker (railway.json's numReplicas: 1), where one bad page could stall or
 *  crash the process mid-tick and take every other source's polling down with it. */
/** Ceiling on the final extracted text, applied once across every tier — MAX_HTML_LENGTH
 *  above only bounds the raw HTML read into memory, nothing bounds what comes OUT of
 *  extraction. Found live (2026-08-06): bbc.co.uk's sitemap surfaces sport-category landing
 *  pages (e.g. /sport/boxing) alongside real articles; those extract to 300K+ characters of
 *  page chrome, JSON-LD, and dozens of unrelated headlines. That text feeds straight into the
 *  drafting prompt uncapped — observed ballooning it past 130K input tokens, which left the
 *  model burning its output budget on reasoning and frequently never reaching the structured
 *  response at all. Now the cost lands twice, since a non-English article crosses BOTH the
 *  translator and the drafter. 20,000 chars is generous for any real long-form article.  */
const MAX_BODY_LENGTH = 20_000;

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

/** Onboarding's contract for source_configs.strip_phrases (lib/sources/onboard-source.ts):
 *  at most 12 phrases, each at least 12 chars, validated against a real sample there. Enforced
 *  again here defensively — a degenerate short phrase (worst case a single space) would turn
 *  the strip into a text shredder, and a huge array would be unbounded work per fetch on this
 *  single-instance worker. */
const MAX_STRIP_PHRASES = 12;
const MIN_STRIP_PHRASE_LENGTH = 12;
const MAX_STRIP_PHRASE_LENGTH = 120;

/** Narrows source_configs.strip_phrases — a jsonb column that arrives as `unknown` — to the
 *  only shape the contract allows: an array of verbatim substrings. Anything else (null, a
 *  string, an object, non-string or out-of-contract entries) is silently ignored: stripping is
 *  best-effort cleanup, never a reason to fail a fetch. */
export function narrowStripPhrases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (p): p is string =>
        typeof p === "string" &&
        p.trim().length >= MIN_STRIP_PHRASE_LENGTH &&
        p.length <= MAX_STRIP_PHRASE_LENGTH,
    )
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .slice(0, MAX_STRIP_PHRASES);
}

/** Removes every occurrence of each onboarding-measured boilerplate phrase without any further
 *  whitespace normalization. Purely mechanical — the smart model measured the phrases ONCE
 *  at onboarding; no model call happens here, ever, and no phrase list is hardcoded in this
 *  package. Observed live (2026-08-09) on a nytimes.com editorial: "AdvertisementSKIP
 *  ADVERTISEMENT", "Thank you for your patience while we verify access." and subscribe/log-in
 *  prompts interleaved with the real article text across every extraction tier. Verbatim
 *  substring match only (split/join, no regex — phrases are data, not patterns), one pass per
 *  phrase, bounded by the caps above. */
function stripConfiguredPhrases(text: string, phrases: readonly string[]): string {
  if (phrases.length === 0 || !text) return text;
  let out = text;
  let stripped = false;
  for (const phrase of phrases) {
    if (!out.includes(phrase)) continue;
    out = out.split(phrase).join(" ");
    stripped = true;
  }
  return stripped ? out : text;
}

/** Many real-world news sites emit schema.org NewsArticle/Article JSON-LD with an
 *  `articleBody` field for SEO — when present, it's the cleanest possible source (no page
 *  chrome to strip at all — though the configured phrase strip still runs on it, and some sites
 *  do leak chrome into articleBody). Tries
 *  every <script type="application/ld+json"> block on the page; a site can have several
 *  (breadcrumbs, org info) alongside the one that matters. Phrases are stripped BEFORE the
 *  MIN_BODY_LENGTH gate so a body that is pure boilerplate correctly fails it. */
function extractFromJsonLd(html: string, stripPhrases: readonly string[]): string | null {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        const body = candidate?.articleBody;
        if (typeof body === "string") {
          const cleaned = stripConfiguredPhrases(body, stripPhrases);
          if (cleaned.length >= MIN_BODY_LENGTH) return cleaned;
        }
        // WordPress/Yoast SEO commonly wraps the article node inside a top-level `@graph`
        // array alongside unrelated nodes (breadcrumbs, org info) — search those too.
        if (Array.isArray(candidate?.["@graph"])) {
          for (const node of candidate["@graph"]) {
            const graphBody = node?.articleBody;
            if (typeof graphBody === "string") {
              const cleaned = stripConfiguredPhrases(graphBody, stripPhrases);
              if (cleaned.length >= MIN_BODY_LENGTH) return cleaned;
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
 *  the caller can send to /api/ingest. Every tier's output goes through the configured phrase
 *  strip BEFORE its MIN_BODY_LENGTH check, so a page that is pure boilerplate correctly reads
 *  as a failed extraction and lets the adaptive chain escalate — and before fetchArticleBody's
 *  MAX_BODY_LENGTH truncation, so chrome never crowds real content out of the cap. */
function extractArticleBody(html: string, url: string, stripPhrases: readonly string[]): string {
  if (html.length > MAX_HTML_LENGTH) return stripConfiguredPhrases(stripHtml(html), stripPhrases);

  const jsonLd = extractFromJsonLd(html, stripPhrases);
  if (jsonLd) return jsonLd;

  try {
    const dom = new JSDOM(html, { url });
    const parsed = new Readability(dom.window.document).parse();
    if (parsed?.textContent) {
      const cleaned = stripConfiguredPhrases(
        parsed.textContent.replace(/\s+/g, " ").trim(),
        stripPhrases,
      );
      if (cleaned.length >= MIN_BODY_LENGTH) return cleaned;
    }
  } catch {
    // malformed HTML Readability can't parse — fall through to the blunt strip
  }

  return stripConfiguredPhrases(stripHtml(html), stripPhrases);
}

function teaserOnlyText(item: FeedItem, stripPhrases: readonly string[]): string {
  // The feed teaser comes from the source's own feed markup, so the same site chrome can leak
  // into it — same strip, same no-op fast path when no phrases are configured.
  return item.bodyFromFeed
    ? stripConfiguredPhrases(stripHtml(item.bodyFromFeed), stripPhrases)
    : (item.title ?? item.url);
}

async function fetchDirect(
  url: string,
  userAgent: string,
  stripPhrases: readonly string[],
): Promise<string> {
  const res = await fetchWithTimeout("Article", url, url, {
    method: "GET",
    headers: { "user-agent": userAgent },
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`Article ${url} redirected (${res.status}), refusing to follow`);
  }
  if (!res.ok) throw new Error(`Article ${url} ${res.status}`);
  return extractArticleBody(await readHtmlWithinLimit(res, url), url, stripPhrases);
}

/** Web Unlocker API contract verified against Bright Data's current docs (2026-08):
 *  POST https://api.brightdata.com/request, Bearer auth, JSON body
 *  { zone, url, format: "raw" }, response body is the raw target-site HTML (not JSON). */
async function fetchViaUnlocker(
  item: FeedItem,
  apiKey: string,
  zone: string,
  userAgent: string,
  stripPhrases: readonly string[],
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
  return extractArticleBody(await readHtmlWithinLimit(res, item.url), item.url, stripPhrases);
}

/** Bright Data Unlocker, or the teaser if it's unconfigured or itself fails — the shared
 *  terminal step for both the explicit `retrieval === "unlocker"` override and the adaptive
 *  chain's own Tier 2 escalation. */
async function fetchViaUnlockerOrTeaser(
  item: FeedItem,
  env: PollerEnv,
  stripPhrases: readonly string[],
): Promise<{ text: string; usedFallback: boolean }> {
  if (!env.brightdataApiKey || !env.brightdataZone) {
    logger.error("fetch-body: retrieval=unlocker but BRIGHTDATA_API_KEY/ZONE unset", {
      url: item.url,
    });
    return { text: teaserOnlyText(item, stripPhrases), usedFallback: true };
  }
  try {
    const text = await fetchViaUnlocker(
      item,
      env.brightdataApiKey,
      env.brightdataZone,
      env.userAgent,
      stripPhrases,
    );
    return { text, usedFallback: text.length < MIN_BODY_LENGTH };
  } catch (e) {
    logger.warn("fetch-body: unlocker fetch failed, falling back to teaser", {
      url: item.url,
      error: describeError(e),
    });
    return { text: teaserOnlyText(item, stripPhrases), usedFallback: true };
  }
}

const MAX_SERP_CANDIDATES = 5;

interface SerpOrganicResult {
  link?: string;
  url?: string;
}

/** Fetches a SERP-discovered URL — unlike fetchDirect's caller (Tier 1, always the source's
 *  own already-vetted domain), this URL is untrusted third-party content picked from search
 *  results, so it gets two guards fetchDirect doesn't need: redirects are refused outright
 *  (isSafePublicUrl only validated the URL we asked for, not wherever a 3xx might forward to
 *  — following it would bypass the check entirely) and an oversized declared body is rejected
 *  before it's read into memory (this single-instance worker has no MAX_HTML_LENGTH-style
 *  guard on a stream, only on already-buffered text). */
async function fetchUntrustedCandidate(
  url: string,
  userAgent: string,
  stripPhrases: readonly string[],
): Promise<string> {
  const res = await fetchWithTimeout("SerpCandidate", url, url, {
    method: "GET",
    headers: { "user-agent": userAgent },
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`SerpCandidate ${url} redirected (${res.status}), refusing to follow`);
  }
  if (!res.ok) throw new Error(`SerpCandidate ${url} ${res.status}`);
  const contentLength = Number(res.headers.get("content-length") ?? "0");
  if (contentLength > MAX_HTML_LENGTH) {
    await res.body?.cancel();
    throw new Error(`SerpCandidate ${url} declared body too large (${contentLength} bytes)`);
  }
  // The source's strip phrases still apply — an alternate host mostly won't contain them, in
  // which case the strip is a no-op, but a www./syndication mirror of the same publisher can.
  return extractArticleBody(await readHtmlWithinLimit(res, url), url, stripPhrases);
}

/** Tier 2b (#107): only reached after Tier 1 and Tier 2 (Unlocker) have both failed to produce
 *  usable text. Searches Bright Data's SERP API for the article's own title, takes the first
 *  result that's a safe, different-hostname URL, and retries a plain direct fetch against it —
 *  the same mechanism Tier 1 uses, just against an alternate source. Returns null (never
 *  throws) when unconfigured, the search itself fails, no safe candidate is found, or the one
 *  candidate tried doesn't come back with enough text — the caller falls through to the
 *  existing teaser fallback in every one of those cases. */
async function fetchViaSerpFallback(
  item: FeedItem,
  expectedHostname: string,
  env: PollerEnv,
  stripPhrases: readonly string[],
): Promise<{ text: string; usedFallback: boolean } | null> {
  if (!env.brightdataApiKey || !env.brightdataSerpZone) return null;
  // No reliable search query without a title — a URL-only query is too unreliable to trust
  // for a deterministic, non-model-judged match. Whitespace-only is the same case: it would
  // still reach Bright Data as a billed, useless query.
  const title = item.title?.trim();
  if (!title) return null;

  const searchUrl = new URL("https://www.google.com/search");
  searchUrl.searchParams.set("q", title);

  let organic: SerpOrganicResult[];
  try {
    const res = await fetchWithTimeout("Serp", item.url, BRIGHTDATA_REQUEST_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.brightdataApiKey}`,
      },
      body: JSON.stringify({
        zone: env.brightdataSerpZone,
        url: searchUrl.toString(),
        format: "raw",
        data_format: "parsed_light",
      }),
    });
    if (!res.ok) throw new Error(`Serp ${item.url} ${res.status}`);
    const parsed = await res.json();
    organic = Array.isArray(parsed?.organic) ? parsed.organic : [];
  } catch (e) {
    logger.warn("fetch-body: serp search failed", { url: item.url, error: describeError(e) });
    return null;
  }

  const expected = expectedHostname.toLowerCase();
  for (const result of organic.slice(0, MAX_SERP_CANDIDATES)) {
    const candidate = result.link ?? result.url;
    if (!candidate || !isSafePublicUrl(candidate)) continue;
    const candidateHost = new URL(candidate).hostname.toLowerCase();
    // Suffix-aware, same shape as isSafeDiscoveredUrl — an exact-match-only check let
    // www./amp. variants of the very source that just failed re-qualify as a "different" host.
    const sameAsSource =
      candidateHost === expected ||
      candidateHost.endsWith(`.${expected}`) ||
      expected.endsWith(`.${candidateHost}`);
    if (sameAsSource) continue;

    try {
      const text = await fetchUntrustedCandidate(candidate, env.userAgent, stripPhrases);
      if (text.length >= MIN_BODY_LENGTH) return { text, usedFallback: false };
    } catch (e) {
      logger.warn("fetch-body: serp candidate fetch failed", {
        url: candidate,
        error: describeError(e),
      });
    }
    break; // only the first qualifying candidate is ever tried — see #107's plan Approach.
  }

  return null;
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
 *  by the same same-site rule. `rawStripPhrases` is source_configs.strip_phrases exactly as it
 *  came off the row (jsonb → unknown) — narrowed once here, then applied inside every tier's
 *  extraction, before its MIN_BODY_LENGTH check and before the MAX_BODY_LENGTH truncation
 *  below (see extractArticleBody's comment). */
export async function fetchArticleBody(
  item: FeedItem,
  retrieval: string | null,
  expectedHostname: string,
  env: PollerEnv,
  rawStripPhrases: unknown,
): Promise<{ text: string; usedFallback: boolean }> {
  const stripPhrases = narrowStripPhrases(rawStripPhrases);
  const result = await fetchArticleBodyByTier(item, retrieval, expectedHostname, env, stripPhrases);
  // A configured removal may reveal that the only apparent body was source chrome. Do not send
  // and permanently mark that item seen: throwing leaves it eligible for the next poll, where
  // the normal adaptive retrieval chain can retry/escalate safely.
  if (stripPhrases.length > 0 && result.text.length < MIN_BODY_LENGTH) {
    throw new Error(
      `article content below usable length after configured stripping (${result.text.length})`,
    );
  }
  if (result.text.length <= MAX_BODY_LENGTH) return result;
  logger.warn("fetch-body: extracted text exceeds cap, truncating", {
    url: item.url,
    length: result.text.length,
    cap: MAX_BODY_LENGTH,
  });
  return { text: result.text.slice(0, MAX_BODY_LENGTH), usedFallback: result.usedFallback };
}

async function fetchArticleBodyByTier(
  item: FeedItem,
  retrieval: string | null,
  expectedHostname: string,
  env: PollerEnv,
  stripPhrases: readonly string[],
): Promise<{ text: string; usedFallback: boolean }> {
  if (!isSafeDiscoveredUrl(item.url, expectedHostname)) {
    logger.error("fetch-body: refusing unsafe URL", { url: item.url, hostname: expectedHostname });
    return { text: teaserOnlyText(item, stripPhrases), usedFallback: true };
  }

  // Explicit operator override: skip the adaptive chain entirely.
  if (retrieval === "feed" || retrieval === "none") {
    return { text: teaserOnlyText(item, stripPhrases), usedFallback: false };
  }
  if (retrieval === "unlocker") {
    const result = await fetchViaUnlockerOrTeaser(item, env, stripPhrases);
    if (!result.usedFallback) return result;
    const serpResult = await fetchViaSerpFallback(item, expectedHostname, env, stripPhrases);
    return serpResult ?? result;
  }

  // Default: adaptive chain (retrieval is null, or a legacy "direct"/"browser" value — both
  // mean "no override decided in advance," so the chain runs the same either way).
  // Tier 1 — plain direct fetch. Kept even when short/suspicious: a genuinely short real
  // body still beats a bare-title teaser if every later tier also comes up empty.
  let shortDirectText: string | null = null;
  try {
    const text = await fetchDirect(item.url, env.userAgent, stripPhrases);
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
    const result = await fetchViaUnlockerOrTeaser(item, env, stripPhrases);
    if (!result.usedFallback) return result;
    // A short Unlocker body still beats a bare headline, same as Tier 1's own short-text rule
    // below. Keep whichever candidate is longer.
    if (result.text.length > (shortDirectText?.length ?? 0)) shortDirectText = result.text;
  }

  // Tier 2b (#107) — always tried on any Tier 1+2 failure, unconditionally: a SERP search for
  // the same story elsewhere. Applies whether or not Unlocker was even configured above.
  const serpResult = await fetchViaSerpFallback(item, expectedHostname, env, stripPhrases);
  if (serpResult) return serpResult;

  // Tier 3 — nothing left but the teaser (unless a short-but-real direct-fetch body is still
  // on hand — that beats a bare headline).
  return shortDirectText
    ? { text: shortDirectText, usedFallback: true }
    : { text: teaserOnlyText(item, stripPhrases), usedFallback: true };
}
