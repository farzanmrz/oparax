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

/** Owner-controlled accounts. Lowercase — `isOverrideOwner` lowercases before comparing. */
const OVERRIDE_OWNER_EMAILS: readonly string[] = [
  "farzan@oparax.ai",
  "farzanmrz@gmail.com",
  "testuser@oparax.ai",
];

/**
 * True when this signed-in email may type a different handle to extract a voice from.
 *
 * Callers MUST re-check this server-side before honoring an override — a client that renders the
 * field is not proof the caller is allowed to use it (every exported server action is its own
 * reachable endpoint, reachable by ID regardless of which component imports it).
 */
export function isOverrideOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  return OVERRIDE_OWNER_EMAILS.includes(email.trim().toLowerCase());
}
