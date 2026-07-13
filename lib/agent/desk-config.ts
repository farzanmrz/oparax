// agent/lib/desk-config.ts
//
// The desk-completion contract as one zod schema — the single shape shared by
// the save_agent tool (model → tool boundary) and the app's saveAgent server
// action (browser → server boundary). Pure: zod + type-only imports, NO eve
// imports, NO I/O.
import { z } from "zod";
import type { Schedule } from "./scan-frequency";

/** The zod face of Schedule in ./scan-frequency.ts — `satisfies` makes drift a compile error. */
export const scheduleSchema = z.discriminatedUnion("kind", [
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
      .describe(
        "Every concrete weekly fire the scan frequency implies, in the reporter's timezone.",
      ),
  }),
]) satisfies z.ZodType<Schedule>;

export const deskConfigSchema = z.object({
  name: z.string().trim().min(1).max(120).describe("The desk name the reporter approved."),
  beat: z.string().trim().min(1).describe("What the desk tracks and what counts as a story."),
  handles: z
    .array(z.string().regex(/^[A-Za-z0-9_]{1,15}$/, "bare X handle, no @"))
    .min(1)
    .max(20)
    .describe("The verified bare handles, correctly cased."),
  draftingInstructions: z
    .string()
    .trim()
    .min(1)
    .describe("The reporter's drafting instructions — tone, angle, hashtags, formatting."),
  accountTier: z.enum(["standard", "premium"]).describe("X account tier: 280 vs 25,000 chars."),
  scanFrequency: scheduleSchema.describe(
    "The validated scan-frequency schedule (hours/days the desk scans).",
  ),
});

export type DeskConfig = z.infer<typeof deskConfigSchema>;
