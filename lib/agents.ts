// App-side helpers for rendering a saved desk. The Schedule and DeskConfig
// types come from the pure eve/agent/lib modules (no eve imports there), so
// app and agent speak one config shape.
import type { Schedule } from "@/eve/agent/lib/cadence";
import type { DeskConfig } from "@/eve/agent/lib/desk-config";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** One user-facing label per account tier — shared by the Save card and the dashboard. */
export const TIER_LABELS: Record<DeskConfig["accountTier"], string> = {
  standard: "Standard — 280 characters",
  premium: "Premium — 25,000 characters",
};

/** Bare stored handles → the "@a, @b" display line. */
export function formatHandles(handles: readonly string[]): string {
  return handles.map((handle) => `@${handle}`).join(", ");
}

/**
 * "Every 2 hours" · "Every day, hourly 9:00–17:00" · "Mondays at 9:00; Thursdays
 * at 14:30" — plain words for a stored cadence. Weekly fires are pattern-compressed
 * (a daily hourly window is one phrase, never the raw fire list).
 */
export function formatCadence(schedule: Schedule): string {
  if (schedule.kind === "interval") {
    const m = schedule.everyMinutes;
    if (m % 1440 === 0) return m === 1440 ? "Every day" : `Every ${m / 1440} days`;
    if (m % 60 === 0) return m === 60 ? "Every hour" : `Every ${m / 60} hours`;
    return `Every ${m} minutes`;
  }

  // Describe each day's fire times once, then merge consecutive days that share
  // the same pattern — 63 hourly fires collapse to "Every day, hourly 9:00–17:00".
  const byDay = new Map<number, number[]>();
  for (const fire of schedule.fires) {
    const mins = byDay.get(fire.dayOfWeek) ?? [];
    mins.push(fire.hour * 60 + fire.minute);
    byDay.set(fire.dayOfWeek, mins);
  }
  const patternByDay = new Map<number, string>();
  for (const [day, mins] of byDay) {
    mins.sort((a, b) => a - b);
    const hourlyRun = mins.length >= 3 && mins.every((m, i) => i === 0 || m - mins[i - 1] === 60);
    patternByDay.set(
      day,
      hourlyRun
        ? `hourly ${clock(mins[0])}–${clock(mins[mins.length - 1])}`
        : `at ${mins.map(clock).join(", ")}`,
    );
  }
  const groups: { days: number[]; pattern: string }[] = [];
  for (let day = 0; day < 7; day++) {
    const pattern = patternByDay.get(day);
    if (pattern === undefined) continue;
    const last = groups.at(-1);
    if (last && last.pattern === pattern && last.days.at(-1) === day - 1) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], pattern });
    }
  }
  return groups
    .map(
      ({ days, pattern }) =>
        `${dayLabel(days)}${pattern.startsWith("hourly") ? ", " : " "}${pattern}`,
    )
    .join("; ");
}

function dayLabel(days: number[]): string {
  if (days.length === 7) return "Every day";
  if (days.length === 1) return `${DAYS[days[0]]}s`;
  return `${DAYS[days[0]]}s–${DAYS[days[days.length - 1]]}s`;
}

function clock(minutesOfDay: number): string {
  const h = Math.floor(minutesOfDay / 60);
  const m = minutesOfDay % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
