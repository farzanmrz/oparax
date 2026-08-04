// Shared website-tracking helpers — mirrors lib/x/handle.ts's role for the websites field.
// Pure + dependency-free: safe to import from client and server alike (including "use server"
// files — a "use server" module may only EXPORT async functions, but it can freely IMPORT a
// plain constant/function like the ones here).

// A reasonable cap, not a measured limit.
export const MAX_WEBSITES = 20;

/** Narrows `agents.websites` (jsonb) to a plain string array. Shared by every reader —
 *  setup/page.tsx's initial render, setup/actions.ts's saveWebsites/removeWebsite — so a
 *  future validation change (trimming, case-folding) happens in one place. */
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
    return url;
  } catch {
    return null;
  }
}
