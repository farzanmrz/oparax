// X handle rules — one source of truth for every path that persists a tracked/reporter handle.
//
// Validation here is a SECURITY boundary, not cosmetics: a persisted handle flows into the
// ingestion worker's globally-shared X filtered-stream rule (`(from:h1 OR from:h2 …)`), built by
// string interpolation. An unvalidated handle containing stream operators — e.g.
// `a) OR from:someoneelse -is:retweet OR (from:a` — would break or hijack the rule set for EVERY
// tenant, not just its author. So every write path validates against X's handle shape before
// storing, and the worker re-validates defensively (it can't import this file — `ingest/` is an
// isolated package — so it re-declares the same regex).
//
// Pure + dependency-free: safe to import from client and server alike.

/** X handles are `[A-Za-z0-9_]`, 1–15 chars. */
export const X_HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

/** Max tracked X accounts per desk. Enforced client-side (create-desk form + Sources card) and
 *  re-enforced server-side (createDesk + addTrackedHandle(s)). Well under the worker's stream
 *  capacity (5 rules × 40 handles = 200 across ALL desks). */
export const MAX_TRACKED_HANDLES = 20;

/**
 * The one stored normal form: trim and strip a single leading `@`. Casing is PRESERVED as the
 * user typed it — `ReshadRahman` stays `ReshadRahman`.
 *
 * This used to lowercase as well. Nothing depended on it: matching in `draft-pipeline.ts` is
 * case-insensitive (it lowercases both the delivery author and each stored handle at compare
 * time), x.com resolves `/ReshadRahman` and `/reshadrahman` to the same profile, and the one
 * genuine reason — `voice_guides` and the extraction claim table being globally unique on
 * `reporter_handle`, so two casings of one reporter would have been billed as two reporters —
 * disappeared when guides became per-desk. All that lowercasing did by the end was make stored
 * and displayed handles disagree with what the reporter typed.
 */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "");
}

/**
 * Normalize, then validate against `X_HANDLE_RE`. Returns the normalized handle, or `null` for
 * anything that isn't a valid X handle. Callers persisting a handle MUST reject `null` rather than
 * store it — see the security note above.
 */
export function normalizeValidHandle(raw: string): string | null {
  const normalized = normalizeHandle(raw);
  return X_HANDLE_RE.test(normalized) ? normalized : null;
}
