// agent/lib/desk-config.ts
//
// The desk-completion contract as one zod schema — the single shape shared by
// the save_agent tool (model → tool boundary) and the app's saveAgent server
// action (browser → server boundary). Pure: zod schemas only, NO eve imports,
// NO I/O.
import { z } from "zod";
import { scanFrequencySchema } from "./scan-frequency";

/** The X post character ceiling per account tier — the ONE numeric source of truth. The draft
 *  runner enforces it, `TIER_LABELS` (lib/agents.ts) and the schema description below render it,
 *  and the prompts (desk-agent.md, draft-runner.md) restate it in prose (see the drift guard in
 *  .claude/rules/sysprompts.md). A ceiling, never a target. */
export const X_CHAR_LIMITS = { standard: 280, premium: 25_000 } as const;

/** Every platform the drafting code knows how to draft for. The TYPE stays complete so the
 *  LinkedIn/Bluesky paths (per-platform char ceilings, the feed's pill switcher, the council
 *  fan-out) keep compiling — they are dormant, not deleted. */
export const ALL_PLATFORMS = ["x", "linkedin", "bluesky"] as const;
export type Platform = (typeof ALL_PLATFORMS)[number];

/** The platforms drafting actually FANS OUT to today — X only, matching the shipped flow
 *  (X sources → X draft → Slack → post to X). Adding a platform back to this array is the one
 *  edit that reactivates it end to end: the council fan-out, the feed's platform pills, and
 *  `isPlatform`'s filter all read from here. Order is fan-out order, not priority — every
 *  platform runs in parallel via `Promise.allSettled`. */
export const PLATFORMS = ["x"] as const satisfies readonly Platform[];

/** Character ceilings for the non-X platforms. X's ceiling stays SOLELY in X_CHAR_LIMITS
 *  (account-tier-dependent) — these two are flat, no tier concept for either platform. */
export const NON_X_PLATFORM_CHAR_LIMITS: Record<Exclude<Platform, "x">, number> = {
  linkedin: 3000, // LinkedIn's own post character cap
  bluesky: 300, // Bluesky's own post character cap
};

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
  accountTier: z
    .enum(["standard", "premium"])
    .describe(
      `X account tier: ${X_CHAR_LIMITS.standard} vs ${X_CHAR_LIMITS.premium.toLocaleString("en-US")} chars.`,
    ),
  scanFrequency: scanFrequencySchema.describe(
    'The scan frequency, grouped by shared cadence: a timezone (IANA, e.g. "Europe/Madrid") ' +
      "plus one or more groups, each a set of local weekdays (0=Sun..6=Sat), a local HH:MM " +
      "start/end window (equal start and end fires exactly once that day), and everyHours " +
      "(≥ 1) between fires within the window.",
  ),
});

export type DeskConfig = z.infer<typeof deskConfigSchema>;
