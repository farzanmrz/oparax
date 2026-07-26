/** Serializes an unknown catch value for structured logging. A plain `String(e)` on a
 *  Supabase/PostgREST error object (or any non-Error thrown value) collapses to the useless
 *  "[object Object]" — this pulls out `message`/`code`/`details` when present, falling back
 *  to a best-effort stringify. */
export function describeError(e: unknown): unknown {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const { message, code, details, hint } = e as Record<string, unknown>;
    if (message || code || details || hint) return { message, code, details, hint };
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}
