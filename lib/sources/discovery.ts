// lib/sources/discovery.ts
//
// Discovers how to detect new articles on a site (sitemap primary, RSS fallback). robots.txt
// is read for ONE purpose only — as a source of candidate sitemap URLs when a site declares
// one there instead of (or in addition to) a conventional path (#108) — never as a retrieval
// decision: fetching stays adaptive, decided per fetch at the poller, never declared up front
// here (#105). robots.txt is a politeness signal, not an access mechanism, and this codebase
// still never uses it to gate what the fetcher is willing to do. Pure I/O module: no
// Supabase, no React.

import { fetchWithTimeout } from "@/lib/http-fetch";

const SITEMAP_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/news-sitemap.xml",
  "/sitemap-news.xml",
];
const FEED_PATHS = ["/feed", "/rss.xml", "/feed/rss"];

/** Same bound as sitemap.ts's NO_LASTMOD_CANDIDATE_CAP — a robots.txt declaring dozens of
 *  sitemaps (goal.com: 35 locale variants) can't turn one onboarding attempt into dozens of
 *  fetches. */
const ROBOTS_CANDIDATE_CAP = 10;

export async function fetchSafeSource(
  endpoint: string,
  url: string,
  expectedHostname: string,
): Promise<Response> {
  let current = new URL(url);
  // Match fetch's existing redirect ceiling while validating every destination before it is
  // requested. A repeated URL is a redirect loop even before the ceiling is exhausted.
  const visited = new Set<string>();
  for (let redirects = 0; redirects < 20; redirects += 1) {
    if (
      !isSafeDiscoveredUrl(current.toString(), expectedHostname) ||
      visited.has(current.toString())
    ) {
      throw new Error(`Source ${endpoint} redirected to an unsafe URL`);
    }
    visited.add(current.toString());
    const res = await fetchWithTimeout("Source", endpoint, current.toString(), {
      method: "GET",
      redirect: "manual",
    });
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    if (!location) return res;
    current = new URL(location, current);
  }
  throw new Error(`Source ${endpoint} exceeded the redirect limit`);
}

async function sourceFetch(endpoint: string, url: string): Promise<Response> {
  return fetchSafeSource(endpoint, url, new URL(url).hostname);
}

/** Hostnames this server must never be talked into fetching: loopback, private-range and
 *  link-local IP literals (169.254.169.254 is the cloud metadata endpoint). Matched as
 *  literals only — this is not a DNS-resolving SSRF guard, it is the cheap check that stops
 *  a hostile site from naming an internal address outright. */
const PRIVATE_IPV4_PATTERNS = [
  /^0\./,
  /^10\./,
  /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
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
  // URL.hostname keeps IPv6 literals bracketed; strip so the prefix tests below apply. Also
  // strip a trailing FQDN dot — found in QC review (#110): "localhost." (a valid absolute
  // hostname per DNS) passed both the exact-match and suffix checks below unstripped, a
  // second route to the same hole a direct "localhost." paste already had.
  let host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return true;
  }
  if (!host.includes(":") && !host.includes(".")) return true;
  const dottedMapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dottedMapped) {
    host = dottedMapped[1];
  } else {
    const hexMapped = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hexMapped) {
      const high = Number.parseInt(hexMapped[1], 16);
      const low = Number.parseInt(hexMapped[2], 16);
      host = `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
    }
  }
  if (PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(host))) return true;
  // IPv6: ::1 loopback, fc00::/7 unique-local, fe80::/10 link-local.
  return host === "::1" || /^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host);
}

/** Guards a URL that came from site-controlled content — a sitemap index's `<loc>` — before
 *  this server fetches it: http(s) only, same site as the host being onboarded (exact
 *  hostname, or a sub/parent domain of it, since apex and `www.` cross-reference each other
 *  constantly), and never a private/loopback/link-local literal. Without this a hostile
 *  site's sitemap index can point at an internal address and have the server fetch and parse
 *  it from inside its own network. */
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
 *  content-type still passes — some servers omit it, and the `sitemap.xml.gz` convention
 *  declares gzip rather than XML. */
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

/** Any response at all counts as reachable — even a 404 means the network layer worked.
 *  Only a genuine transport-level error (DNS/connection failure) counts as unreachable. Found
 *  live (2026-08-06): `sport.es` (bare apex) is unreachable outright — `fetch` throws before
 *  any HTTP response exists — while `www.sport.es`, the exact same site, resolves fine. #109.
 *
 *  A 15s timeout is NOT treated as unreachable — a slow response still means something is
 *  there. Found in QC review: `fetchWithTimeout` (lib/http-fetch.ts) rethrows a timeout as a
 *  plain `Error` with the message `"... timed out after 15s"`, indistinguishable from a real
 *  connection failure by `.name` alone once caught here — a slow-but-real apex site would
 *  otherwise get misdiverted to a `www.` host that may not even exist, the opposite of what
 *  this function exists to prevent. */
async function isOriginReachable(origin: string): Promise<boolean> {
  try {
    await sourceFetch(origin, origin);
    return true;
  } catch (err) {
    if (err instanceof Error && err.message.includes("timed out after")) return true;
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

/** Extracts every `Sitemap:` directive from a robots.txt body, resolved against `origin`
 *  (the directive's own value may be relative or absolute — real sites do both), deduped.
 *  Directive matching is case-insensitive per the robots.txt convention; malformed lines are
 *  skipped rather than failing the whole parse. */
function parseRobotsSitemaps(robotsTxt: string, origin: string): string[] {
  const found = new Set<string>();
  for (const match of robotsTxt.matchAll(/^\s*sitemap:\s*(\S+)/gim)) {
    try {
      found.add(new URL(match[1], origin).toString());
    } catch {
      // malformed directive value — skip, try the rest
    }
  }
  return [...found];
}

/** Soft-prioritizes candidates whose PATH names them as news/article content — tested against
 *  `pathname`, not the whole URL: every candidate shares `origin`, so on a hostname that
 *  itself contains "news"/"article" (e.g. foxnews.com) a whole-URL test scores every candidate
 *  identically and silently turns the sort into a no-op. Real signal this guards
 *  (tycsports.com's actual recent-article sitemap is `sitemap_news_48hs.xml`, not the
 *  first-listed `discover.xml`) but not a filter: every candidate is still tried, this only
 *  changes the order. Stable sort — original robots.txt order is preserved within each group. */
function sortByNewsKeyword(candidates: string[]): string[] {
  const isNewsy = (url: string) => /news|article/i.test(new URL(url).pathname);
  return [...candidates].sort((a, b) => Number(isNewsy(b)) - Number(isNewsy(a)));
}

/** Cheap non-emptiness probe for a sitemap-shaped URL — every real `<urlset>` or
 *  `<sitemapindex>` entry is wrapped in a `<loc>` tag, so a body with none is either a
 *  genuinely empty sitemap or not a sitemap at all. Found live (2026-08-06): `urlExists` alone
 *  can't tell an empty `<urlset/>` (a real, 200-OK, non-HTML response) from a populated one —
 *  90min.com declares an empty `news-sitemap.xml` in robots.txt that would otherwise win and
 *  permanently shadow the working hardcoded `/sitemap.xml` fallback below. Deliberately not a
 *  full XML parse (that's `fetchSitemapSample` in sitemap.ts, run once later by the caller on
 *  whichever URL wins) — importing it here would be circular (sitemap.ts already imports
 *  `isSafeDiscoveredUrl` from this module). */
async function hasSitemapEntries(url: string): Promise<boolean> {
  try {
    const res = await sourceFetch(url, url);
    if (!res.ok || !isNotHtmlResponse(res)) return false;
    return /<loc[\s>]/i.test(await res.text());
  } catch {
    return false;
  }
}

/** Tries robots.txt-declared sitemap candidates in priority order, returning the first that
 *  passes the same SSRF guard `fetchLeafEntries` applies to sitemap-index `<loc>` entries (a
 *  robots.txt-declared URL is equally site-controlled, untrusted content — redirects are
 *  refused outright for the same reason, never followed), then genuinely has entries. Never
 *  throws — a missing or unreachable robots.txt just means no candidates. */
async function discoverFromRobots(
  origin: string,
  expectedHostname: string,
): Promise<string | null> {
  let candidates: string[];
  try {
    const res = await sourceFetch(`${origin}/robots.txt`, `${origin}/robots.txt`);
    if (!res.ok) return null;
    candidates = sortByNewsKeyword(parseRobotsSitemaps(await res.text(), origin)).slice(
      0,
      ROBOTS_CANDIDATE_CAP,
    );
  } catch {
    return null;
  }

  for (const raw of candidates) {
    // robots.txt text controls the scheme too — upgrade a same-host http: candidate to https:
    // before validating it, matching lib/websites.ts's normalizeSourceUrl always preferring
    // https for reporter input. A candidate that's genuinely http-only still fails urlExists
    // here and is simply skipped, same as any other non-existent candidate.
    const candidate = raw.startsWith("http://") ? raw.replace(/^http:/, "https:") : raw;
    if (!isSafeDiscoveredUrl(candidate, expectedHostname)) continue;
    if (await hasSitemapEntries(candidate)) return candidate;
  }
  return null;
}

/** Resolves `inputUrl` to whichever of it or its `www.`-toggled variant is actually
 *  reachable, tried in that order. Generalizes #109's one-directional (bare → `www.` only)
 *  retry to both directions: a `www.`-prefixed input whose `www.` host is dead but whose
 *  bare apex works now also resolves correctly, not just the reverse (#110). Returns
 *  `inputUrl` UNCHANGED when neither the toggle nor the original beats the reachability
 *  check — including when toggling isn't meaningful at all (an IP-literal host, where the
 *  hostname setter silently no-ops rather than throwing, verified live in #109's QC round;
 *  or a bare `"www."` host, where stripping leaves an empty string). Callers always get a
 *  valid URL back, never null — the rest of discovery correctly falls through to "nothing
 *  found" on a URL that's genuinely unreachable either way. At most 2 reachability checks
 *  total for any input, by construction — never more, no recursion. Found in QC review
 *  (#110): #109's original guard order meant a `www.`-prefixed input paid ZERO reachability
 *  checks (the retry only ever fired for non-`www.` hosts); this version always pays at
 *  least 1, since the whole point is protecting `www.` inputs too — an accepted, necessary
 *  cost of bidirectionality, not an oversight. */
async function resolveReachableInputUrl(inputUrl: URL): Promise<URL> {
  if (await isOriginReachable(inputUrl.origin)) return inputUrl;

  const toggledHostname = inputUrl.hostname.startsWith("www.")
    ? inputUrl.hostname.slice(4)
    : `www.${inputUrl.hostname}`;
  // Prepending or stripping a literal "www." can never reproduce the original string, so the
  // only real guard here is emptiness (a bare "www." host strips to "").
  if (!toggledHostname) return inputUrl;

  const toggledUrl = new URL(inputUrl.toString());
  toggledUrl.hostname = toggledHostname;
  if (toggledUrl.hostname !== toggledHostname) return inputUrl;

  return (await isOriginReachable(toggledUrl.origin)) ? toggledUrl : inputUrl;
}

/** Discovers the change-detection mechanism for `inputUrl` — the full URL the reporter
 *  pasted, not just its hostname, since a specific section page carries real signal (its
 *  own `<link rel="alternate">` distinct from the homepage's, and a strong prefilter
 *  hint). Sitemap (primary): robots.txt-declared candidates are tried first when present —
 *  the authoritative source when a site bothers to declare one (#108) — then the hardcoded
 *  well-known paths as before. RSS (fallback, only tried if no sitemap found) checks the
 *  exact input URL first, then the domain root, then common feed paths.
 *
 *  `resolveReachableInputUrl` resolves the host first (#109/#110) before any of the above
 *  runs. */
export async function discoverChangeDetection(inputUrl: URL): Promise<{
  mechanism: "sitemap" | "rss" | null;
  sitemapUrl?: string;
  feedUrl?: string;
}> {
  const resolvedUrl = await resolveReachableInputUrl(inputUrl);
  const origin = resolvedUrl.origin;

  const robotsSitemap = await discoverFromRobots(origin, resolvedUrl.hostname);
  if (robotsSitemap) return { mechanism: "sitemap", sitemapUrl: robotsSitemap };

  for (const path of SITEMAP_PATHS) {
    const candidate = `${origin}${path}`;
    if (await urlExists(candidate)) return { mechanism: "sitemap", sitemapUrl: candidate };
  }

  const exactPageFeed = await checkPageForRssLink(resolvedUrl.toString());
  if (exactPageFeed) return { mechanism: "rss", feedUrl: exactPageFeed };

  if (resolvedUrl.toString() !== `${origin}/`) {
    const rootFeed = await checkPageForRssLink(`${origin}/`);
    if (rootFeed) return { mechanism: "rss", feedUrl: rootFeed };
  }

  for (const path of FEED_PATHS) {
    const candidate = `${origin}${path}`;
    if (await urlExists(candidate)) return { mechanism: "rss", feedUrl: candidate };
  }

  return { mechanism: null };
}
