/**
 * The one place a caller-supplied `returnTo` is validated.
 *
 * Every OAuth entry point and callback accepts a `returnTo` so the flow can send
 * the reporter back to the desk they started from. That value reaches us from a
 * query string or a cookie, both of which the user controls, so an unvalidated
 * one is an open redirect: `?returnTo=https://evil.example` would have us hand
 * the browser to an attacker's page immediately after a successful login.
 *
 * The guard is to accept only an app-internal desk path. `//evil.example` is
 * rejected because it does not start with `/agents/`, and a traversal like
 * `/agents/../..` resolves against our own origin rather than escaping it.
 *
 * This lived as four copies — `app/auth/x/route.ts`, `app/auth/x/callback`,
 * `app/auth/slack/link`, `app/auth/slack/callback` — which is three chances for
 * one to drift and reopen the hole silently. Mirrors `lib/x/handle.ts`'s role as
 * the shared normalize-and-validate rail: a new entry point calls this rather
 * than re-deriving the check.
 */
const DESK_PATH_PREFIX = "/agents/";

function isSafeReturnPath(raw: string | null | undefined): raw is string {
  return typeof raw === "string" && raw.startsWith(DESK_PATH_PREFIX);
}

/** The validated path, or `null` when the caller supplied nothing usable. */
export function safeReturnPath(raw: string | null | undefined): string | null;
/** The validated path, or `fallback` when the caller supplied nothing usable. */
export function safeReturnPath(raw: string | null | undefined, fallback: string): string;
export function safeReturnPath(
  raw: string | null | undefined,
  fallback: string | null = null,
): string | null {
  return isSafeReturnPath(raw) ? raw : fallback;
}
