// lib/http-fetch.ts
//
// Shared raw-fetch-with-timeout helper for lib/x/api.ts —
// wraps fetch with a 15s AbortSignal.timeout, a clear TimeoutError/AbortError
// rethrow shape, and a consistent non-2xx error format. Pure
// module: no Supabase, no Next.js, no React, no I/O beyond fetch.

/** Runs `fetch`, hard-timing-out at 15s and rethrowing a clear Error on
 *  TimeoutError/AbortError so a stalled call fails fast instead of hanging indefinitely.
 *  `label` prefixes the error message (e.g. "X") so the caller's own errors
 *  keep their provider-specific wording. */
export async function fetchWithTimeout(
  label: string,
  endpoint: string,
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error(`${label} ${endpoint} timed out after 15s`);
    }
    throw err;
  }
}

/** Transport-level check only — a non-2xx here means the server itself failed to respond.
 *  `label` prefixes the error message the same way `fetchWithTimeout` does. */
export async function assertFetchOk(label: string, endpoint: string, res: Response): Promise<void> {
  if (res.ok) return;
  const text = await res.text();
  throw new Error(`${label} ${endpoint} ${res.status}: ${text.slice(0, 500)}`);
}
