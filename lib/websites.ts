// Shared website-tracking helpers — mirrors lib/x/handle.ts's role for the websites field.
// Pure + dependency-free: safe to import from client and server alike (including "use server"
// files — a "use server" module may only EXPORT async functions, but it can freely IMPORT a
// plain constant/function like the ones here).

// The handoff cap for one desk. Existing over-cap desks keep their rows but cannot add more.
export const MAX_WEBSITES = 5;

/** Narrows `agents.websites` (jsonb) to a plain string array. Shared by every reader —
 *  sources/page.tsx's initial render, sources/actions.ts's website actions, and
 *  new/actions.ts's MAX_WEBSITES check — so a future validation change (trimming,
 *  case-folding) happens in one place. */
export function parseWebsites(json: unknown): string[] {
  return Array.isArray(json)
    ? json.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/** Trim + prepend `https://` when the entry has no scheme, then verify with `new URL(...)`.
 *  `null` means "not a well-formed website". Moved here (from setup/actions.ts, where it was
 *  `normalizeWebsiteUrl`) because a `"use server"` module may only export async Server
 *  Actions — it cannot export this as a plain synchronous helper, and `lib/sources/
 *  onboard-source.ts` needs to call it too. Renamed to `normalizeSourceUrl` now that it's
 *  used beyond the simple website list. */
export function normalizeSourceUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    // Reject any scheme but http(s) — a bare "example.com" gets https:// prepended above, but
    // an explicit "javascript://…" / "file://…" / "ftp://…" entry matched the scheme regex
    // above too and would otherwise pass through unrestricted into agents.websites (and
    // from there into the scraper/ingestion worker).
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    // IPv6 literals and hostnames without a dot are not public website sources.
    if (url.hostname.includes("[") || !url.hostname.includes(".")) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

/** Reader-facing form of a stored website href: scheme, leading www., and the trailing
 *  slash stripped, PATH KEPT so two sections of one site stay distinguishable. Display only —
 *  the create form intentionally dedupes this projection, while Sources reserves exact
 *  normalized URLs through its RPC. */
export function displaySourceUrl(href: string): string {
  return href
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

/** The URL a source config ACTUALLY watches, per its detection mechanism — what the Sources
 *  chip should show under the display name. Before this, only resolver-narrowed listing
 *  sources ever showed a tracked path; a sitemap- or feed-detected source fell back to the
 *  typed URL, so a nytimes.com chip labeled "The Athletic" gave no hint of what was really
 *  being polled (owner report, 2026-08-09). Display-only: falls back to the typed URL, never
 *  to nothing.
 *  - any mechanism with a prefilter → that watched domain + path scope
 *  - listing without one → the resolver-validated section page (`listing_url` IS the poll target)
 *  - rss/sitemap without one → the typed URL; feed and sitemap XML are plumbing, not
 *    reader-facing consumer scope */
export function trackedSourceUrl(config: {
  url: string;
  domain: string | null;
  changeDetection: string | null;
  listingUrl: string | null;
  feedUrl: string | null;
  prefilter: unknown;
}): string {
  if (config.domain) {
    const prefix =
      typeof config.prefilter === "object" &&
      config.prefilter !== null &&
      "pathPrefix" in config.prefilter &&
      typeof (config.prefilter as { pathPrefix: unknown }).pathPrefix === "string"
        ? (config.prefilter as { pathPrefix: string }).pathPrefix
        : null;
    if (prefix) return `https://${config.domain}${prefix.startsWith("/") ? prefix : `/${prefix}`}`;
  }
  if (config.changeDetection === "listing" && config.listingUrl) return config.listingUrl;
  return config.url;
}
