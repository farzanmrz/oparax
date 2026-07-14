// lib/agent/scan-frequency.ts
//
// Pure, stateless rate-rail math for the onboarding scan frequency step. NO eve imports,
// NO I/O, NO persistence — just the schema for the grouped scan-frequency shape
// ({ timezone, groups: [{ days, start, end, everyHours }] }), the static rail check
// (`validateScanFrequency`), and the since-window derivation (`sinceUnixFor`). Timezone
// math (local wall-clock fires ↔ UTC instants) lives in `./next-run.ts`, which imports the
// schema from here. Imported by `lib/agent/agent.ts` — `validateScanFrequency` backs the
// save-approval gate, `sinceUnixFor` + `DEFAULT_ONBOARDING_INTERVAL_MINUTES` derive the
// injected clock block.
import { z } from "zod";

/** Tightest scan frequency offered: scans are never < 1h apart. Also floors the since-window,
 *  and doubles as the SUB_HOURLY minimum-gap threshold in `validateScanFrequency`. HARD. */
export const MIN_SPACING_MINUTES = 60;
/** Boundary overlap folded into every since-window so a post on the edge isn't dropped. */
export const OVERLAP_SECONDS = 120;
/** Since-window interval for the onboarding scan, before any scan frequency is saved. */
export const DEFAULT_ONBOARDING_INTERVAL_MINUTES = 60;

/** True if `tz` is a valid IANA timezone name — probes `Intl.DateTimeFormat`, which throws a
 *  RangeError on an unknown zone. Used by the schema's `.refine()` and by `./next-run.ts`. */
export function isIanaTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const scanFrequencySchema = z.object({
  timezone: z.string().refine(isIanaTimeZone, "must be a valid IANA timezone"),
  groups: z
    .array(
      z.object({
        days: z.array(z.number().int().min(0).max(6)).min(1), // 0=Sun..6=Sat
        start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), // local HH:MM; minutes allowed
        end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), // start ≤ end; equal = one fire
        everyHours: z.number().int().min(1),
      }),
    )
    .min(1),
});
export type ScanFrequency = z.infer<typeof scanFrequencySchema>;

export type ScanFrequencyViolation = "WINDOW_INVERTED" | "SUB_HOURLY" | "OVER_DAILY_BUDGET";

export function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

/**
 * Validate a proposed scan frequency as a STATIC property — no scan history, no DB. Materializes
 * the deduped week of local fire-minutes (minute-of-week values across all groups' days and
 * windows, a fire hit by two groups on the same minute is one fire) and checks it against the
 * three rails below. `ok` is true iff `violations` is empty.
 *
 * - WINDOW_INVERTED — a group whose `end < start`. Overnight windows are DEFERRED (represent as
 *   two groups); this does not wrap midnight, and an inverted group contributes no fires to the
 *   other two checks.
 * - SUB_HOURLY — the minimum gap between distinct weekly fires, across ALL groups and including
 *   the day-boundary and week-wrap gap (last fire of the week → first fire of the next week), is
 *   < MIN_SPACING_MINUTES.
 * - OVER_DAILY_BUDGET — more than 12 distinct fires land on any single local day of the week.
 */
export function validateScanFrequency(sf: ScanFrequency): {
  ok: boolean;
  violations: ScanFrequencyViolation[];
} {
  const WEEK_MINUTES = 7 * 24 * 60;
  const violations = new Set<ScanFrequencyViolation>();
  const fireSet = new Set<number>(); // minute-of-week, deduped

  for (const group of sf.groups) {
    const startMin = parseHHMM(group.start);
    const endMin = parseHHMM(group.end);
    if (endMin < startMin) {
      violations.add("WINDOW_INVERTED");
      continue;
    }
    const stepMinutes = group.everyHours * 60;
    for (const day of group.days) {
      for (let t = startMin; t <= endMin; t += stepMinutes) {
        fireSet.add(day * 1440 + t);
      }
    }
  }

  const fires = [...fireSet].sort((a, b) => a - b);

  if (fires.length > 1) {
    let minGap = Number.POSITIVE_INFINITY;
    for (let i = 1; i < fires.length; i++) {
      minGap = Math.min(minGap, fires[i] - fires[i - 1]);
    }
    const wrapGap = WEEK_MINUTES - fires[fires.length - 1] + fires[0];
    minGap = Math.min(minGap, wrapGap);
    if (minGap < MIN_SPACING_MINUTES) violations.add("SUB_HOURLY");
  }

  const perDayCounts = new Map<number, number>();
  for (const minuteOfWeek of fires) {
    const day = Math.floor(minuteOfWeek / 1440);
    perDayCounts.set(day, (perDayCounts.get(day) ?? 0) + 1);
  }
  if ([...perDayCounts.values()].some((count) => count > 12)) violations.add("OVER_DAILY_BUDGET");

  return { ok: violations.size === 0, violations: [...violations] };
}

/**
 * The freshness floor for one scan trigger: tile back one interval from the
 * trigger, fold in the boundary overlap, and never let the window fall below the
 * 1h minimum spacing. LLMs have no clock, so all unix math stays here.
 */
export function sinceUnixFor(triggerUnix: number, intervalMinutes: number): number {
  const minutes = Math.max(intervalMinutes, MIN_SPACING_MINUTES);
  return triggerUnix - minutes * 60 - OVERLAP_SECONDS;
}
