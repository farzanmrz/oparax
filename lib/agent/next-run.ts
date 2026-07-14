// lib/agent/next-run.ts
//
// Pure, Intl-only timezone math for the grouped scan-frequency shape — local wall-clock fires in
// a desk's IANA timezone converted to UTC instants, and back. NO eve imports, NO I/O, NO deps
// (`@js-temporal` is deliberately not used). Consumed by the per-minute dispatcher (a later task)
// and by `scanWindowFor`, which derives the since-window for an actual scan trigger.
import {
  DEFAULT_ONBOARDING_INTERVAL_MINUTES,
  parseHHMM,
  type ScanFrequency,
  sinceUnixFor,
} from "./scan-frequency";

const DAY_MS = 24 * 60 * 60 * 1000;
const SEARCH_SPAN_DAYS = 8;

function tzOffsetMs(instantMs: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(instantMs))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    parts.hour === "24" ? 0 : +parts.hour,
    +parts.minute,
    +parts.second,
  );
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/** Local wall-clock → UTC instant, two-pass. DST: nonexistent spring-forward wall time maps
 *  to the post-transition instant; ambiguous fall-back time resolves deterministically to the
 *  offset Intl reports at the guess. Document both in-file. */
export function wallClockToInstant(
  timeZone: string,
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const corrected = guess - tzOffsetMs(guess, timeZone);
  return new Date(guess - tzOffsetMs(corrected, timeZone));
}

/** The local calendar {y, mo, d} for an instant, as seen in `timeZone`. */
function localDateParts(instant: Date, timeZone: string): { y: number; mo: number; d: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return { y: +parts.year, mo: +parts.month, d: +parts.day };
}

/**
 * Walk the local calendar dates spanning `[from, to]` (padded a day on each side to catch
 * offset edges — a DST transition can shift a fire's UTC instant across a calendar-date
 * boundary that a naive unpadded walk would miss), and for each date whose local weekday is in
 * a group's `days`, emit that group's fires (`start`, then `+everyHours` h at the start minute,
 * while ≤ `end`) converted to UTC instants via `wallClockToInstant`. A minute hit by two groups
 * is one fire (deduped); the result is sorted ascending and filtered to `[from, to]`.
 */
export function firesBetween(sf: ScanFrequency, from: Date, to: Date): Date[] {
  const fromLocal = localDateParts(from, sf.timezone);
  const toLocal = localDateParts(to, sf.timezone);
  const walkStart = Date.UTC(fromLocal.y, fromLocal.mo - 1, fromLocal.d) - DAY_MS;
  const walkEnd = Date.UTC(toLocal.y, toLocal.mo - 1, toLocal.d) + DAY_MS;

  const fireInstants = new Set<number>();
  for (let cursor = walkStart; cursor <= walkEnd; cursor += DAY_MS) {
    const cursorDate = new Date(cursor);
    const y = cursorDate.getUTCFullYear();
    const mo = cursorDate.getUTCMonth() + 1;
    const d = cursorDate.getUTCDate();
    const dayOfWeek = cursorDate.getUTCDay();

    for (const group of sf.groups) {
      if (!group.days.includes(dayOfWeek)) continue;
      const startMin = parseHHMM(group.start);
      const endMin = parseHHMM(group.end);
      const stepMinutes = group.everyHours * 60;
      for (let t = startMin; t <= endMin; t += stepMinutes) {
        const h = Math.floor(t / 60);
        const mi = t % 60;
        const instant = wallClockToInstant(sf.timezone, y, mo, d, h, mi);
        const instantMs = instant.getTime();
        if (instantMs >= from.getTime() && instantMs <= to.getTime()) {
          fireInstants.add(instantMs);
        }
      }
    }
  }

  return [...fireInstants].sort((a, b) => a - b).map((ms) => new Date(ms));
}

/**
 * The minimum fire strictly after `after`, searched across an 8-day span. Callers pass the
 * ACTUAL claim time (not a stored due time) so downtime never causes catch-up bursts. A schedule
 * always has at least one fire in 8 days (`groups.min(1)`, `days.min(1)`) — if none is found
 * (an invalid/unvalidated schedule), throw rather than return an invalid Date.
 */
export function nextFire(sf: ScanFrequency, after: Date): Date {
  const to = new Date(after.getTime() + SEARCH_SPAN_DAYS * DAY_MS);
  const found = firesBetween(sf, after, to).find((fire) => fire.getTime() > after.getTime());
  if (!found) {
    throw new Error("nextFire: no fire found within the 8-day search window");
  }
  return found;
}

/**
 * The maximum fire strictly before `before`, looked back across 8 days, or `null` if none.
 * Strictness matters: fires and ticks are both minute-aligned, and strict-before prevents the
 * just-claimed fire from collapsing its own look-back window.
 */
export function prevFire(sf: ScanFrequency, before: Date): Date | null {
  const from = new Date(before.getTime() - SEARCH_SPAN_DAYS * DAY_MS);
  const fires = firesBetween(sf, from, before).filter((fire) => fire.getTime() < before.getTime());
  return fires.length > 0 ? fires[fires.length - 1] : null;
}

/**
 * The since-window for an actual scan trigger. `now` is the real wall clock (drives `toDate` and
 * the 24h floor); `firedAt` is the scheduled fire this run is servicing (the claimed `next_run_at`),
 * and defaults to `now`. The lookback tiles back to the fire BEFORE `firedAt` — computing `prevFire`
 * from `firedAt` rather than `now` is essential: the dispatcher runs a few seconds AFTER the
 * minute-aligned fire, so `prevFire(now)` would return the very fire being scanned (strict-before
 * still includes it, since `fire < now`) and collapse the window to the 60-minute floor. Anchoring
 * on `firedAt` makes `prevFire(firedAt)` return the genuinely previous fire. `sinceUnix` tiles back
 * from there (or `DEFAULT_ONBOARDING_INTERVAL_MINUTES` when there is no prior fire — the desk's first
 * scan), `fromDate` covers the wider of `sinceUnix` and `now − 24h` so a coarse day window can't
 * clamp the finer since-bound (the same covering rule as `agent.ts`'s `clockBlock`), and `toDate` is
 * simply "today" in UTC.
 */
export function scanWindowFor(
  sf: ScanFrequency,
  now: Date,
  firedAt: Date = now,
): { sinceUnix: number; fromDate: string; toDate: string } {
  const nowUnix = Math.floor(now.getTime() / 1000);
  const prev = prevFire(sf, firedAt);
  const minutesSince = prev
    ? Math.round((now.getTime() - prev.getTime()) / 60_000)
    : DEFAULT_ONBOARDING_INTERVAL_MINUTES;
  const sinceUnix = sinceUnixFor(nowUnix, minutesSince);
  const windowStartUnix = Math.min(sinceUnix, nowUnix - 24 * 60 * 60);
  const day = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString().slice(0, 10);
  return {
    sinceUnix,
    fromDate: day(windowStartUnix),
    toDate: day(nowUnix),
  };
}
