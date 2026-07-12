// agent/tools/validate_cadence.ts
import { defineTool } from "eve/tools";
import { z } from "zod";
import { type Schedule, validateCadence } from "../lib/cadence";

// STATELESS setup-time rate-rail check (the NOW-layer). The reporter states a
// cadence in natural language (step 5 of agent/instructions.md); DeepSeek
// interprets it into a concrete schedule and calls this tool to validate it as a
// STATIC property — never two scans < 1h apart, never > 84 scans / rolling 7
// days. This is a cron FIRE-PATTERN check, not a scan-history check, so it needs
// NO database. Runtime accounting (counting scans actually fired, the hard
// backend cap, the scheduler that fires, config persistence) is DEFERRED and
// rides with the scheduler. The 12/day figure is the SOFT sizing basis + default
// rhythm, deliberately NOT a hard per-day gate.
export default defineTool({
  description:
    "Validate a proposed scan cadence against the per-agent rate rail (hourly minimum spacing + 84 scans / rolling 7 days) as a static schedule property. Interpret the reporter's natural-language cadence into a concrete schedule and pass it here BEFORE reading the cadence back. Returns ok plus any violations and the representative interval; on a violation, adjust the schedule and explain the correction in plain words.",
  inputSchema: z.object({
    schedule: z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("interval"),
        everyMinutes: z
          .number()
          .int()
          .positive()
          .describe("Minutes between scans, e.g. 120 for every 2 hours."),
      }),
      z.object({
        kind: z.literal("weekly"),
        fires: z
          .array(
            z.object({
              dayOfWeek: z.number().int().min(0).max(6).describe("0 = Sunday … 6 = Saturday."),
              hour: z.number().int().min(0).max(23),
              minute: z.number().int().min(0).max(59),
            }),
          )
          .min(1)
          .describe("Every concrete weekly fire the cadence implies, in the reporter's timezone."),
      }),
    ]),
  }),
  async execute({ schedule }) {
    return validateCadence(schedule as Schedule);
  },
});
