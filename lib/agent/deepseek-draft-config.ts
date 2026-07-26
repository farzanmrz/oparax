// lib/agent/deepseek-draft-config.ts
//
// The ONE deepseek-v4-flash drafting config, plus the drafting-concern helpers used by the
// council pipeline. Native adaptive thinking (NO `reasoning` param — the SDK's low/medium
// both coerce to its high, so an explicit level is a no-op; see .claude/rules/agent.md).
// Consumed by draft-council-run.ts (experiments/post_drafts council) — the old desk
// agents/drafts pipeline that once shared it (draft-run.ts) was deleted (D15).
export const DEEPSEEK_DRAFT_MODEL = "deepseek/deepseek-v4-flash";
export const DEEPSEEK_DRAFT_PROVIDER_OPTIONS = { gateway: { sort: "cost" } };

/** X renders no markdown, so a stray `**bold**` posts with literal asterisks. Both drafting
 *  pipelines forbid it in-prompt, but a small model still slips one in occasionally — strip the
 *  bold markers as a backstop so the stored draft is exactly what posts. Leaves `#hashtags` and
 *  `@handles` (which use `#`/`_`, not `**`) untouched. */
export function stripMarkdown(text: string): string {
  return text.replaceAll("**", "");
}
