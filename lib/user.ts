import type { User } from "@supabase/supabase-js";

export const AVATAR_KEYS = [
  "av01",
  "av02",
  "av03",
  "av04",
  "av05",
  "av06",
  "av07",
  "av08",
  "av09",
  "av10",
  "av11",
  "av12",
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === "string" && (AVATAR_KEYS as readonly string[]).includes(value);
}

export function getAvatarKey(user: User | null | undefined): AvatarKey {
  const metadataAvatar = user?.user_metadata?.avatar;
  if (isAvatarKey(metadataAvatar)) return metadataAvatar;

  let hash = 0;
  for (const character of user?.id ?? "") {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return AVATAR_KEYS[hash % AVATAR_KEYS.length];
}

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
  for (const key of ["username", "display_name", "full_name", "name"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return deriveUsernameFromEmail(user?.email);
}
