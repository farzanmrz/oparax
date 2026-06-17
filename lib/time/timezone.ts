/**
 * Check whether a string is a valid IANA time-zone identifier.
 * Uses `Intl.DateTimeFormat` — throws on invalid identifiers in all modern
 * runtimes (Node 12+, V8, SpiderMonkey). Returns false on any error.
 *
 * @param tz - the time-zone string to validate (e.g. "America/New_York")
 * @returns true if the identifier is recognized by the runtime
 */
export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, {
      timeZone: tz,
    });
    return true;
  } catch {
    return false;
  }
}
