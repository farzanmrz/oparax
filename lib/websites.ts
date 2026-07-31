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
