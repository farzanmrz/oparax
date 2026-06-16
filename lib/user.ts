import type { User } from "@supabase/supabase-js";

/**
 * Derive a username from an email's local part (the text before "@"). Used to
 * seed a new user's username at signup and as the display fallback for accounts
 * that predate the stored username.
 * @param email - the user's email (may be missing)
 * @returns the local part, or "reporter" if none
 */
export function deriveUsernameFromEmail(email: string | null | undefined): string {
  const local = (email ?? "").split("@")[0]?.trim() ?? "";
  return local || "reporter";
}

/**
 * The user's display username — single source for the sidebar and settings so
 * they never disagree. Prefers the explicit `username` (set at signup, editable
 * in settings), falls back to legacy name metadata, then the email local part.
 * @param user - the signed-in Supabase user (or null)
 * @returns a non-empty username for display
 */
export function getUsername(user: User | null | undefined): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of [
    "username",
    "display_name",
    "full_name",
    "name",
  ]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return deriveUsernameFromEmail(user?.email);
}
