// Duplicated (not imported) from lib/http-fetch.ts — this package imports nothing from the
// app's lib/, per poller/README.md's isolation rule.

/** Runs `fetch`, hard-timing-out at 15s (override via `timeoutMs`) and rethrowing a clear
 *  Error on TimeoutError/AbortError so a stalled call fails fast instead of hanging
 *  indefinitely. */
export async function fetchWithTimeout(
  label: string,
  endpoint: string,
  url: string,
  init: RequestInit,
  timeoutMs = 15_000,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error(`${label} ${endpoint} timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  }
}

/** Transport-level check only — a non-2xx here means the server itself failed to respond. */
export async function assertFetchOk(label: string, endpoint: string, res: Response): Promise<void> {
  if (res.ok) return;
  const text = await res.text();
  throw new Error(`${label} ${endpoint} ${res.status}: ${text.slice(0, 500)}`);
}
