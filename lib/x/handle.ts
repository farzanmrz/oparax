const X_HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

// Preserve the spelling people use for their own handle.
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "");
}

export function normalizeValidHandle(raw: string): string | null {
  const normalized = normalizeHandle(raw);
  return X_HANDLE_RE.test(normalized) ? normalized : null;
}

export const RESERVED_HANDLES = [
  "login",
  "signup",
  "forgot-password",
  "auth",
  "checkout",
  "privacy",
  "terms",
  "api",
  "settings",
  "onboarding",
  "agents",
  "opengraph-image",
  "favicon.ico",
  "icon.svg",
  "apple-icon.png",
  "robots.txt",
  "sitemap.xml",
  "_next",
  "static",
  "public",
  "admin",
  "oparax",
  "oparax_ai",
] as const;

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.some((reserved) => reserved === handle.toLowerCase());
}
