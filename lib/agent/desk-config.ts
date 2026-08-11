// agent/lib/desk-config.ts
//
// Platform and character-ceiling constants shared by the drafting council and the feed's
// platform pills. Pure constants plus the one pure predicate over them, NO eve imports, NO I/O.
import twitterText from "twitter-text";

/** The X post character ceiling per account tier — the ONE numeric source of truth. The draft
 *  runner enforces it, and the prompts (desk-agent.md, draft-runner.md) restate it in prose (see
 *  the drift guard in .claude/rules/sysprompts.md). A ceiling, never a target. */
export const X_CHAR_LIMITS = { standard: 280, premium: 25_000 } as const;

export type XAccountTier = keyof typeof X_CHAR_LIMITS;

/** Narrows a DB-stored tier (string | null from the generated row type) to a usable tier. */
export function resolveXTier(value: string | null | undefined): XAccountTier {
  return value === "premium" ? "premium" : "standard";
}

/** The ceiling a DESK drafts, counts, edits, and post-gates against: premium applies when either
 *  the corpus-proven reporter tier (`agents.reporter_tier`, written by voice extraction) or the
 *  posting account's stored tier is premium. One resolver shared by the drafting pipeline, the
 *  feed counter, editDraft, and post-core so those gates can never disagree. */
export function resolveDeskTier(
  reporterTier: string | null | undefined,
  accountTier: string | null | undefined,
): XAccountTier {
  return resolveXTier(reporterTier) === "premium" || resolveXTier(accountTier) === "premium"
    ? "premium"
    : "standard";
}

/** Shared X validity gate — the same weighted-length + validity check both the posting path
 *  (lib/x/post-core.ts) and the edit path (app/agents/[id]/actions.ts) must enforce identically,
 *  so a draft that passes at edit time is guaranteed to also pass at actual post time. Length
 *  alone was never enough: twitter-text's own `valid` flag also rejects text X will refuse (e.g.
 *  certain control characters), which a short-but-malformed draft would otherwise sail past. */
/**
 * The user-facing message for a failed `checkXPostable`.
 *
 * Lives beside the gate because both writers of a posted draft — `editDraft`
 * (app/agents/[id]/actions.ts) and `postDraftToXForOwner` (lib/x/post-core.ts) —
 * showed the reporter the same two sentences from their own copy. Two copies of a
 * string a user reads is two chances for them to diverge and for the same failure
 * to be described two ways.
 */
export function xUnpostableMessage(reason: "too_long" | "invalid"): string {
  return reason === "too_long"
    ? "This draft is over X's length limit and can't be posted as-is."
    : "This draft isn't valid for X and can't be posted as-is.";
}

export function checkXPostable(
  text: string,
  tier: XAccountTier = "standard",
): { ok: true } | { ok: false; reason: "too_long" | "invalid" } {
  // `configs.version3` is present on twitter-text's runtime export but omitted from its
  // @types package; the shape was verified against node_modules/twitter-text/dist/configs.js.
  type ParseTweetOptions = NonNullable<Parameters<typeof twitterText.parseTweet>[1]>;
  const twitterTextWithConfigs = twitterText as typeof twitterText & {
    configs: { version3: ParseTweetOptions };
  };
  const parsed = twitterText.parseTweet(text, {
    ...twitterTextWithConfigs.configs.version3,
    maxWeightedTweetLength: X_CHAR_LIMITS[tier],
  });
  if (!parsed.valid) {
    return {
      ok: false,
      reason: parsed.weightedLength > X_CHAR_LIMITS[tier] ? "too_long" : "invalid",
    };
  }
  if (parsed.weightedLength > X_CHAR_LIMITS[tier]) return { ok: false, reason: "too_long" };
  return { ok: true };
}

/** X is the only platform the product drafts for. */
export type Platform = "x";
