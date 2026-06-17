import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Mask an email for display in a "this account is already taken" message.
 *
 * Masking rule (kept deliberately simple + consistent): reveal the FIRST and
 * LAST character of the local part, replace everything in between with three
 * bullet characters (U+2022 "•"), and keep the FULL domain. So
 * `farzanmrz@gmail.com` -> `f•••z@gmail.com`. Short local parts (<= 2 chars)
 * reveal only the first char (e.g. `ab@x.com` -> `a•••@x.com`) so we never
 * expose the whole name. The domain is intentionally left intact — it's far
 * less identifying than the local part and helps the user recognise which of
 * their own accounts is the conflict.
 *
 * Never throws; a malformed/empty input returns a fully-masked placeholder.
 * @param email - the raw email to mask
 * @returns the masked email (e.g. `f•••z@gmail.com`)
 */
export function maskEmail(email: string | null | undefined): string {
  const value = (email ?? "").trim();
  const at = value.lastIndexOf("@");
  if (at <= 0) {
    // No usable local part — return a generic masked placeholder.
    return "•••";
  }
  const local = value.slice(0, at);
  const domain = value.slice(at); // includes the leading "@"
  const middle = "•••";
  if (local.length <= 2) {
    return `${local[0]}${middle}${domain}`;
  }
  return `${local[0]}${middle}${local[local.length - 1]}${domain}`;
}

// One page is plenty for this app (single-digit accounts today); cap generously
// so the scan stays a single round-trip.
const ADMIN_LIST_PER_PAGE = 1000;

/**
 * Find the masked email of the Oparax account that already owns an `x` identity
 * other than the given current user.
 *
 * Why this shape: when `linkIdentity({ provider: "x" })` collides with an X
 * account that's already linked, GoTrue rejects the link AFTER it has exchanged
 * the code with X — so by the time control returns to our `/auth/callback`
 * there is no `code` and no X subject id in the error redirect (GoTrue only
 * sends `error` / `error_code` / `error_description`, never the provider id or
 * the conflicting email). We therefore can't key the lookup on the attempted X
 * id.
 *
 * What we CAN rely on: `startXConnect` unlinks the current user's own (stale) X
 * identity before linking, so the current user has no `x` identity when this
 * runs. Any existing `x` identity therefore belongs to a DIFFERENT account — the
 * one blocking the link. We scan via the service-role Admin API (bypasses RLS;
 * `auth.identities` isn't PostgREST-exposed) for `x` identities not owned by the
 * current user and, when exactly one such owner exists, return its masked email.
 * If zero or more than one exist we return null so the caller falls back to a
 * generic message rather than naming the wrong account.
 *
 * @param currentUserId - the Supabase user id attempting the link
 * @returns the masked owning email, or null if it can't be determined unambiguously
 */
export async function findConflictingXOwnerMaskedEmail(
  currentUserId: string,
): Promise<string | null> {
  try {
    const admin = createServiceRoleClient();
    const {
      data: { users },
      error,
    } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: ADMIN_LIST_PER_PAGE,
    });
    if (error || !users) {
      return null;
    }

    // Collect every account (other than the current one) that has an `x`
    // identity, deduped by user id in case of multiple identity rows.
    const ownersById = new Map<string, string | null>();
    for (const user of users) {
      if (user.id === currentUserId) continue;
      const hasX = (user.identities ?? []).some((identity) => identity.provider === "x");
      if (hasX) {
        ownersById.set(user.id, user.email ?? null);
      }
    }

    // Only name the account when it's unambiguous.
    if (ownersById.size !== 1) {
      return null;
    }
    const [email] = [...ownersById.values()];
    return maskEmail(email);
  } catch {
    // Lookup is best-effort — never let it break the redirect.
    return null;
  }
}
