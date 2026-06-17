// X-handle rules shared by the agent config form and the scan/save routes.
// Capped at 10 to match the @ai-sdk/xai xSearch `allowedXHandles` runtime limit
// (the DB `monitored_handles <= 20` CHECK remains a looser backstop).
export const MONITOR_MAX_HANDLES = 10;

// Syntactically valid X username: 1–15 chars of [A-Za-z0-9_].
export const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

/**
 * Strip a leading @ and surrounding whitespace from a raw handle entry.
 * @param raw - the user-entered handle string
 * @returns the normalized handle without @ or whitespace
 */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

/**
 * Check if an already-normalized handle is a valid X username.
 * @param handle - the normalized handle to validate
 * @returns true if the handle matches [A-Za-z0-9_]{1,15}
 */
export function isValidHandle(handle: string): boolean {
  return HANDLE_RE.test(handle);
}
