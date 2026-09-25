export const X_HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

// Preserve the spelling people use for their own handle.
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "");
}

export function normalizeValidHandle(raw: string): string | null {
  const normalized = normalizeHandle(raw);
  return X_HANDLE_RE.test(normalized) ? normalized : null;
}
