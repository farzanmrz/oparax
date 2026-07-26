// lib/agent/scan-frequency.ts
//
// The grouped scan-frequency shape ({ timezone, groups: [{ days, start, end, everyHours }] })
// as one zod schema. Consumed by `desk-config.ts`'s `deskConfigSchema` for its `scanFrequency`
// field description. The rate-rail validation math this file used to carry
// (`validateScanFrequency`, `sinceUnixFor`, the onboarding interval/spacing constants) was
// orphaned rate-rail code with no live dispatcher input — see the retired scan pipeline note in
// AGENTS.md — and was deleted once its last two keepers (`lib/agents.ts`'s display formatter and
// `desk-config.ts`'s now-removed `deskConfigSchema` export) both went away.
import { z } from "zod";

/** True if `tz` is a valid IANA timezone name — probes `Intl.DateTimeFormat`, which throws a
 *  RangeError on an unknown zone. Used by the schema's `.refine()` and by `./next-run.ts`. */
function isIanaTimeZone(tz: string): boolean {
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
