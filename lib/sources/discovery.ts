// lib/sources/discovery.ts
//
// Discovers how to detect new articles on a site (sitemap primary, RSS fallback) and
// what a safe default retrieval policy is, from robots.txt + a handful of well-known
// paths — no third-party discovery service. Pure I/O module: no Supabase, no React.

import { fetchWithTimeout } from "@/lib/http-fetch";

const SITEMAP_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/news-sitemap.xml",
  "/sitemap-news.xml",
];
const FEED_PATHS = ["/feed", "/rss.xml", "/feed/rss"];

// Bots that appear in a Disallow line even when `User-agent: *` allows generic crawling —
// robots.txt can name a bot as blocked while leaving the wildcard rule open.
const NAMED_BOTS = [
  "ClaudeBot",
  "anthropic-ai",
  "GPTBot",
  "CCBot",
  "PerplexityBot",
  "Google-Extended",
];

async function sourceFetch(endpoint: string, url: string): Promise<Response> {
  return fetchWithTimeout("Source", endpoint, url, { method: "GET" });
}

/** Fetches robots.txt at `origin`, returning its raw text, or null if unreachable/missing
 *  (a missing robots.txt is not an error — it means no crawl policy is declared). */
async function fetchRobotsTxt(origin: string): Promise<string | null> {
  try {
    const res = await sourceFetch("robots.txt", `${origin}/robots.txt`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Extracts `Sitemap:` directive URLs from robots.txt content. */
function extractSitemapDirectives(robotsTxt: string): string[] {
  const urls: string[] = [];
  for (const line of robotsTxt.split(/\r?\n/)) {
    const match = line.match(/^\s*sitemap:\s*(\S+)/i);
    if (match) urls.push(match[1]);
  }
  return urls;
}

/** Hostnames this server must never be talked into fetching: loopback, private-range and
 *  link-local IP literals (169.254.169.254 is the cloud metadata endpoint). Matched as
 *  literals only — this is not a DNS-resolving SSRF guard, it is the cheap check that stops
 *  a hostile robots.txt from naming an internal address outright. */
const PRIVATE_IPV4_PATTERNS = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(?:1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
];

/** Exported so `onboardSource` can reject a reporter-pasted URL that names a private/
 *  loopback/link-local address directly — `isSafeDiscoveredUrl`'s same-site check doesn't
 *  apply to the reporter's own input (it IS the site being onboarded by definition), so
 *  this is the standalone guard for that entry point. */
export function isPrivateHostname(hostname: string): boolean {
  // URL.hostname keeps IPv6 literals bracketed; strip so the prefix tests below apply.
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(host))) return true;
  // IPv6: ::1 loopback, fc00::/7 unique-local, fe80::/10 link-local.
  return host === "::1" || /^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host);
}

/** Guards a URL that came from site-controlled content — a robots.txt `Sitemap:` directive
 *  or a sitemap index's `<loc>` — before this server fetches it: http(s) only, same site as
 *  the host being onboarded (exact hostname, or a sub/parent domain of it, since apex and
 *  `www.` cross-reference each other constantly), and never a private/loopback/link-local
 *  literal. Without this a hostile site's robots.txt can point at an internal address and
 *  have the server fetch and parse it from inside its own network. */
export function isSafeDiscoveredUrl(candidate: string, expectedHostname: string): boolean {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  const expected = expectedHostname.toLowerCase();
  const sameSite =
    host === expected || host.endsWith(`.${expected}`) || expected.endsWith(`.${host}`);
  if (!sameSite) return false;

  return !isPrivateHostname(host);
}

/** True unless the response explicitly declares itself HTML. A soft-404 or SPA catch-all
 *  answers 200 with `text/html`, which would otherwise be read as a working sitemap/feed,
 *  parse to zero entries, and permanently skip the remaining fallbacks. A response with no
 *  content-type still passes — some servers omit it, and the `sitemap.xml.gz` robots.txt
 *  convention declares gzip rather than XML. */
function isNotHtmlResponse(res: Response): boolean {
  const contentType = res.headers.get("content-type");
  if (!contentType) return true;
  return !/^\s*(?:text|application)\/x?html\b/i.test(contentType);
}

async function urlExists(url: string): Promise<boolean> {
  try {
    const res = await sourceFetch(url, url);
    return res.ok && isNotHtmlResponse(res);
  } catch {
    return false;
  }
}

/** Extracts `<link rel="alternate" type="application/rss+xml" href="...">` from an HTML
 *  document's `<head>`, resolved against `pageUrl`. */
function extractRssAlternateLink(html: string, pageUrl: string): string | null {
  const linkTagPattern = /<link\b[^>]*>/gi;
  for (const tag of html.match(linkTagPattern) ?? []) {
    const relMatch = tag.match(/rel\s*=\s*["']alternate["']/i);
    const typeMatch = tag.match(/type\s*=\s*["']application\/rss\+xml["']/i);
    if (!relMatch || !typeMatch) continue;
    const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    try {
      return new URL(hrefMatch[1], pageUrl).toString();
    } catch {
      return null;
    }
  }
  return null;
}

/** Checks the given page for an RSS `<link rel="alternate">` tag, returning its resolved
 *  feed URL if present. Returns null on any fetch/parse failure — RSS discovery has more
 *  fallback paths to try after this one, so a failure here is never fatal. */
async function checkPageForRssLink(pageUrl: string): Promise<string | null> {
  try {
    const res = await sourceFetch(pageUrl, pageUrl);
    if (!res.ok) return null;
    const html = await res.text();
    return extractRssAlternateLink(html, pageUrl);
  } catch {
    return null;
  }
}

/** Discovers the change-detection mechanism for `inputUrl` — the full URL the reporter
 *  pasted, not just its hostname, since a specific section page carries real signal (its
 *  own `<link rel="alternate">` distinct from the homepage's, and a strong prefilter
 *  hint). Sitemap (primary) is checked via robots.txt's `Sitemap:` directive against the
 *  origin, then common paths. RSS (fallback, only tried if no sitemap found) checks the
 *  exact input URL first, then the domain root, then common feed paths. */
export async function discoverChangeDetection(inputUrl: URL): Promise<{
  mechanism: "sitemap" | "rss" | null;
  sitemapUrl?: string;
  feedUrl?: string;
}> {
  const origin = inputUrl.origin;

  const robotsTxt = await fetchRobotsTxt(origin);
  if (robotsTxt) {
    for (const directive of extractSitemapDirectives(robotsTxt)) {
      if (!isSafeDiscoveredUrl(directive, inputUrl.hostname)) continue;
      if (await urlExists(directive)) return { mechanism: "sitemap", sitemapUrl: directive };
    }
  }
  for (const path of SITEMAP_PATHS) {
    const candidate = `${origin}${path}`;
    if (await urlExists(candidate)) return { mechanism: "sitemap", sitemapUrl: candidate };
  }

  const exactPageFeed = await checkPageForRssLink(inputUrl.toString());
  if (exactPageFeed) return { mechanism: "rss", feedUrl: exactPageFeed };

  if (inputUrl.toString() !== `${origin}/`) {
    const rootFeed = await checkPageForRssLink(`${origin}/`);
    if (rootFeed) return { mechanism: "rss", feedUrl: rootFeed };
  }

  for (const path of FEED_PATHS) {
    const candidate = `${origin}${path}`;
    if (await urlExists(candidate)) return { mechanism: "rss", feedUrl: candidate };
  }

  return { mechanism: null };
}

/** Parses `Disallow` rules under `User-agent: *` and under any of `NAMED_BOTS`, deriving a
 *  safe default `retrieval` policy: broad disallow or a named-bot block -> `"feed"`
 *  (teaser-only access), otherwise `"direct"`. This is the two values this slice's code
 *  ever selects — see plan-100.md's "Enum headroom" note for the rest of the vocabulary. */
export async function checkRobotsPolicy(origin: string): Promise<{
  allowsGenericCrawl: boolean;
  blocksNamedBots: boolean;
  policyNote: string;
}> {
  const robotsTxt = await fetchRobotsTxt(origin);
  if (!robotsTxt) {
    return { allowsGenericCrawl: true, blocksNamedBots: false, policyNote: "no robots.txt found" };
  }

  const blocks = parseDisallowBlocks(robotsTxt);
  const wildcardBlock = blocks.get("*");
  const allowsGenericCrawl = !wildcardBlock?.includes("/");

  const blockedBots = NAMED_BOTS.filter((bot) => {
    const block = blocks.get(bot.toLowerCase());
    return block !== undefined && block.length > 0;
  });
  const blocksNamedBots = blockedBots.length > 0;

  const policyNote = !allowsGenericCrawl
    ? "robots.txt disallows generic crawling of /"
    : blocksNamedBots
      ? `robots.txt blocks named bot(s): ${blockedBots.join(", ")}`
      : "robots.txt allows generic crawling";

  return { allowsGenericCrawl, blocksNamedBots, policyNote };
}

/** Groups robots.txt `Disallow` paths by their preceding `User-agent` line(s), keyed
 *  lower-case (`"*"` for the wildcard block). A `User-agent` line starts a new group;
 *  consecutive `User-agent` lines share the following `Disallow` rules (standard
 *  robots.txt grouping). */
function parseDisallowBlocks(robotsTxt: string): Map<string, string[]> {
  const blocks = new Map<string, string[]>();
  let currentAgents: string[] = [];
  let sawDisallowSinceAgent = false;

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const agentMatch = line.match(/^user-agent:\s*(.+)$/i);
    if (agentMatch) {
      if (sawDisallowSinceAgent) currentAgents = [];
      currentAgents.push(agentMatch[1].trim().toLowerCase());
      sawDisallowSinceAgent = false;
      continue;
    }

    const disallowMatch = line.match(/^disallow:\s*(.*)$/i);
    if (disallowMatch) {
      sawDisallowSinceAgent = true;
      const path = disallowMatch[1].trim();
      for (const agent of currentAgents) {
        const existing = blocks.get(agent) ?? [];
        if (path) existing.push(path);
        blocks.set(agent, existing);
      }
    }
  }

  return blocks;
}
