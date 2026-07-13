// lib/agent/scan-frequency.ts
//
// Pure, stateless rate-rail math for the onboarding scan frequency step. NO eve imports,
// NO I/O, NO persistence — just the arithmetic behind the two HARD invariants
// (hourly minimum spacing, 84 scans / rolling 7 days) and the since-window
// derivation. Imported by `lib/agent/agent.ts` — `validateScanFrequency` backs the
// save-approval gate, `sinceUnixFor` + `DEFAULT_ONBOARDING_INTERVAL_MINUTES`
// derive the injected clock block.

/** Tightest scan frequency offered: scans are never < 1h apart. Also floors the since-window. HARD. */
export const MIN_SPACING_MINUTES = 60;
/** HARD ceiling: 84 scans per rolling 7 days ("12/day × 7"). */
export const WEEKLY_BUDGET = 84;
/** Minutes in a week (7 × 24 × 60). */
export const MINUTES_PER_WEEK = 10_080;
/** Boundary overlap folded into every since-window so a post on the edge isn't dropped. */
export const OVERLAP_SECONDS = 120;
/** Since-window interval for the onboarding scan, before any scan frequency is saved. */
export const DEFAULT_ONBOARDING_INTERVAL_MINUTES = 60;

export type IntervalSchedule = { kind: "interval"; everyMinutes: number };
export type WeeklyFire = { dayOfWeek: number; hour: number; minute: number };
export type WeeklySchedule = { kind: "weekly"; fires: WeeklyFire[] };
export type Schedule = IntervalSchedule | WeeklySchedule;

export type ScanFrequencyViolation = "SUB_HOURLY" | "OVER_WEEKLY_BUDGET";

export type ScanFrequencyVerdict = {
  ok: boolean;
  firesPerWeek: number;
  minSpacingMinutes: number;
  /**
   * Look-back for the since-window (fed to current_time → sinceUnixFor): the
   * WIDEST gap between consecutive fires, floored at MIN_SPACING. Using the max
   * (not the min) gap guarantees the fire after the longest quiet stretch still
   * tiles back to the previous scan — no under-coverage. Tighter gaps over-cover,
   * and downstream dedup absorbs the overlap.
   */
  intervalMinutes: number;
  violations: ScanFrequencyViolation[];
};

function fireToMinuteOfWeek(f: WeeklyFire): number {
  return f.dayOfWeek * 1440 + f.hour * 60 + f.minute;
}

/**
 * Validate a proposed schedule as a STATIC property — no scan history, no DB.
 * Checks only the two HARD invariants (hourly spacing, 84/week). The soft ~12/day
 * daily face of the cap is deliberately NOT enforced here, so the reporter can
 * spend the weekly budget however they like across the week.
 */
export function validateScanFrequency(schedule: Schedule): ScanFrequencyVerdict {
  let firesPerWeek: number;
  let minSpacingMinutes: number;
  let maxSpacingMinutes: number;

  if (schedule.kind === "interval") {
    const m = schedule.everyMinutes;
    minSpacingMinutes = m;
    maxSpacingMinutes = m;
    // Max fires in ANY rolling 7-day window — a fire can land on the window start,
    // so it is ceil, not floor. floor under-counts by 1 and would false-pass an
    // over-budget interval (e.g. 119 min fits 85 fires, but floor(10080/119)=84).
    firesPerWeek = Math.ceil(MINUTES_PER_WEEK / m);
  } else {
    const mins = schedule.fires.map(fireToMinuteOfWeek).sort((a, b) => a - b);
    firesPerWeek = mins.length;
    if (mins.length <= 1) {
      minSpacingMinutes = MINUTES_PER_WEEK; // at most once a week
      maxSpacingMinutes = MINUTES_PER_WEEK;
    } else {
      let smallest = Number.POSITIVE_INFINITY;
      let largest = 0;
      for (let i = 1; i < mins.length; i++) {
        const gap = mins[i] - mins[i - 1];
        smallest = Math.min(smallest, gap);
        largest = Math.max(largest, gap);
      }
      // wrap: last fire of the week to the first fire of the next week
      const wrapGap = MINUTES_PER_WEEK - mins[mins.length - 1] + mins[0];
      minSpacingMinutes = Math.min(smallest, wrapGap);
      maxSpacingMinutes = Math.max(largest, wrapGap);
    }
  }

  const violations: ScanFrequencyViolation[] = [];
  if (minSpacingMinutes < MIN_SPACING_MINUTES) violations.push("SUB_HOURLY");
  if (firesPerWeek > WEEKLY_BUDGET) violations.push("OVER_WEEKLY_BUDGET");

  return {
    ok: violations.length === 0,
    firesPerWeek,
    minSpacingMinutes,
    intervalMinutes: Math.max(maxSpacingMinutes, MIN_SPACING_MINUTES),
    violations,
  };
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
