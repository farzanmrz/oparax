// App-side helpers for rendering a saved desk. The DeskConfig and ScanFrequency
// types come from the pure lib/agent modules, so app and agent speak one
// config shape.

import { type DeskConfig, X_CHAR_LIMITS } from "@/lib/agent/desk-config";
import type { ScanFrequency } from "@/lib/agent/scan-frequency";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** One user-facing label per account tier — shared by the Save card and the dashboard. Character
 *  counts render from `X_CHAR_LIMITS` (desk-config.ts), the single source for the tier ceilings. */
export const TIER_LABELS: Record<DeskConfig["accountTier"], string> = {
  standard: `Standard — ${X_CHAR_LIMITS.standard} characters`,
  premium: `Premium — ${X_CHAR_LIMITS.premium.toLocaleString("en-US")} characters`,
};

/** Bare stored handles → the "@a, @b" display line. */
export function formatHandles(handles: readonly string[]): string {
  return handles.map((handle) => `@${handle}`).join(", ");
}

/**
 * "Weekdays hourly 9:00–17:00; weekends at 12:00 · Europe/Madrid" — plain words for a stored,
 * grouped scan frequency. One phrase per group (day label + cadence + window), joined by "; ",
 * with the desk's timezone as a trailing " · «timezone»" suffix.
 */
export function formatScanFrequency(sf: ScanFrequency): string {
  const groups = sf.groups
    .map((group) => {
      const label = dayLabel(group.days);
      if (group.start === group.end) return `${label} at ${group.start}`;
      const middle = group.everyHours === 1 ? "hourly" : `every ${group.everyHours} hours`;
      return `${label} ${middle} ${group.start}–${group.end}`;
    })
    .join("; ");
  return `${groups} · ${sf.timezone}`;
}

/**
 * All 7 days → "Every day"; Mon–Fri exactly → "Weekdays"; Sat+Sun exactly → "Weekends"; a
 * contiguous run → a range like "Monday–Thursday"; otherwise a comma list of day names.
 */
function dayLabel(days: readonly number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const set = new Set(sorted);
  if (set.size === 7) return "Every day";
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Weekdays";
  if (set.size === 2 && set.has(0) && set.has(6)) return "Weekends";
  const isContiguousRun =
    sorted.length > 1 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (isContiguousRun) return `${DAYS[sorted[0]]}–${DAYS[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => DAYS[d]).join(", ");
}
