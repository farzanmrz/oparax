// agent/lib/desk-config.ts
//
// Platform and character-ceiling constants shared by the drafting council and the feed's
// platform pills. Pure constants, NO eve imports, NO I/O.

/** The X post character ceiling per account tier — the ONE numeric source of truth. The draft
 *  runner enforces it, and the prompts (desk-agent.md, draft-runner.md) restate it in prose (see
 *  the drift guard in .claude/rules/sysprompts.md). A ceiling, never a target. */
export const X_CHAR_LIMITS = { standard: 280, premium: 25_000 } as const;

/** Every platform the drafting code knows how to draft for. The TYPE stays complete so the
 *  LinkedIn/Bluesky paths (per-platform char ceilings, the feed's pill switcher, the council
 *  fan-out) keep compiling — they are dormant, not deleted. */
const ALL_PLATFORMS = ["x", "linkedin", "bluesky"] as const;
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

/** Dormant-by-design (AGENTS.md): auto-post (publish without review) is a settled off-switch,
 *  not a gap. The SHARED source of truth — `sources-card.tsx` reads it to grey the toggle
 *  client-side, `draft-pipeline.ts` reads the SAME constant to gate the server-side auto-post
 *  path, so the UI being disabled is never the only thing standing between a delivery and an
 *  unreviewed post. Flipping this back is the lever's whole reactivation on the server side —
 *  the master switch also needs a UI path to ever become true, which does not exist yet (see
 *  `auto_post_master`'s own comment in the `experiments` table). */
export const AUTO_POST_ENABLED = false;
