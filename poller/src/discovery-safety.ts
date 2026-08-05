// Duplicated (not imported) from lib/sources/discovery.ts — this package imports nothing
// from the app's lib/, per poller/README.md's isolation rule. Any URL pulled out of a
// sitemap/feed is untrusted third-party content and must pass this check before being
// fetched; the source's own onboarded URL (source_configs.url/domain) is trusted, it came
// from #100's own SSRF-checked onboarding path.

/** Hostnames this worker must never be talked into fetching: loopback, private-range and
 *  link-local IP literals (169.254.169.254 is the cloud metadata endpoint), plus the
 *  100.64.0.0/10 CGNAT range. Matched as literals only — not a DNS-resolving SSRF guard. */
const PRIVATE_IPV4_PATTERNS = [
  /^0\./,
  /^10\./,
  /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(?:1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
];

export function isPrivateHostname(hostname: string): boolean {
  // URL.hostname keeps IPv6 literals bracketed; strip so the prefix tests below apply.
  let host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return true;
  }
  // A single-label host (no dot) is never a real internet destination we'd ever legitimately
  // discover from a sitemap or SERP result — it's resolvable only inside a private network
  // (Kubernetes service names, internal DNS search domains, etc.).
  if (!host.includes(":") && !host.includes(".")) return true;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or its hex form ::ffff:7f00:1) — unwrap to the embedded
  // IPv4 address before applying the dotted-quad checks below.
  const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) host = mapped[1];
  if (PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(host))) return true;
  // IPv6: ::1 loopback, fc00::/7 unique-local, fe80::/10 link-local.
  return host === "::1" || /^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host);
}

/** Guards a URL pulled out of a sitemap `<loc>` or feed `<link>`/`<guid>` before this worker
 *  fetches it: http(s) only, same site as the source being polled (exact hostname, or a
 *  sub/parent domain of it), and never a private/loopback/link-local literal. */
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

/** Guards a URL discovered from a SERP search result before this worker fetches it: http(s)
 *  only, never a private/loopback/link-local literal. Deliberately has NO same-site
 *  requirement — unlike isSafeDiscoveredUrl, a SERP candidate is expected to be a different
 *  hostname than the source being polled; that's the entire point of the search. */
export function isSafePublicUrl(candidate: string): boolean {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return !isPrivateHostname(url.hostname.toLowerCase());
}
