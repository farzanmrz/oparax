// lib/owner-allowlist.ts
//
// The owner's own accounts, allowed to extract a voice from a handle they haven't authenticated
// as. This exists for ONE reason: testing the shipped flow against a real reporter (Reshad) whose
// X account the owner cannot log into. Every other user is still derived-handle-only.
//
// Why a hardcoded list rather than an env var: an unset env var would silently disable the
// override, and the failure would look like "the field vanished" rather than "config is missing"
// — on localhost, on preview, and in production independently. A literal list behaves identically
// in all three with nothing to sync.
//
// **This is not a security boundary, and must never be described as one.** `experiments` has an
// owner-scoped INSERT policy with no value constraint, so any signed-in user can already mint a
// row with an arbitrary `reporter_handle` — see AGENTS.md's Connect-X settled decision. This list
// gates a FORM AFFORDANCE. It exists so the product rule ("extract your own voice") holds for
// real users while the owner can still test, not because relaxing it would widen anything.
//
// Pure + dependency-free: safe to import from a server action, a page, or a client component.
//
// `testuser@oparax.ai` is gated to non-production only: AGENTS.md publishes that exact
// account's password as the frontend test login, so on production the override is a spend
// hole — anyone who reads the repo can sign in with the published credential and extract a
// voice from ANY public X handle, each pull costing a Bright Data corpus scrape plus an
// ~$0.43 Opus 5 extraction call. Locally and in preview it's exactly the convenience it was
// added for. Gated on `process.env.NODE_ENV === "production"` rather than `VERCEL_ENV`: this
// module is imported by both server actions and client components (see the file header above),
// and `NODE_ENV` is the one of the two Next.js guarantees is set correctly in every one of
// those contexts — `VERCEL_ENV` is only defined on Vercel's own infra, so a non-Vercel
// production build (or `next build && next start` run elsewhere) would silently fall back to
// treating itself as non-production. The two real owner accounts stay unconditional in every
// environment.

/** Owner-controlled accounts. Lowercase — `isOverrideOwner` lowercases before comparing. */
const OVERRIDE_OWNER_EMAILS: readonly string[] = ["farzan@oparax.ai", "farzanmrz@gmail.com"];

/** The shared test login (AGENTS.md), admitted only outside production — see the file header. */
const NON_PRODUCTION_OVERRIDE_OWNER_EMAILS: readonly string[] = ["testuser@oparax.ai"];

/**
 * True when this signed-in email may type a different handle to extract a voice from.
 *
 * Callers MUST re-check this server-side before honoring an override — a client that renders the
 * field is not proof the caller is allowed to use it (every exported server action is its own
 * reachable endpoint, reachable by ID regardless of which component imports it).
 */
export function isOverrideOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (OVERRIDE_OWNER_EMAILS.includes(normalized)) return true;
  return (
    process.env.NODE_ENV !== "production" &&
    NON_PRODUCTION_OVERRIDE_OWNER_EMAILS.includes(normalized)
  );
}
