// lib/agent/qwen-draft-config.ts
//
// The one Qwen 3.7 Flash config shared by translation, drafting, and the cheaper support paths
// (correction revision and dormant clustering). Qwen 3.7 Flash is
// vision-capable, so callers with source media must pass the original attachments rather than a
// text-only description produced by another model.
export const QWEN_DRAFT_MODEL = "alibaba/qwen3.7-flash";
export const QWEN_DRAFT_PROVIDER_OPTIONS = { gateway: { sort: "cost" } };

/** X renders no markdown, so a stray `**bold**` posts with literal asterisks. Model prompts
 * forbid it, but this deterministic backstop keeps stored text postable. */
export function stripMarkdown(text: string): string {
  return text.replaceAll("**", "");
}
