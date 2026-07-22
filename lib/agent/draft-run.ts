// lib/agent/draft-run.ts
//
// Headless draft runner: one structured DeepSeek call PER selected news item, run in parallel,
// each drafting a single post in the reporter's saved voice, plus that call's DeepSeek dollar
// cost. Per-item calls guarantee exactly one draft per item — a single batched call let the model
// merge/drop items and return the wrong count (an observed failure when 3+ similar items were
// selected, which the caller surfaced as "Could not draft those items"). No tool loop, no
// persistence — the `[id]` dashboard's `draftSelected` inserts the resulting `drafts` rows.
// SERVER-ONLY (transitively reads fs via lib/sysprompts, which loads DRAFT_RUNNER_PROMPT at
// module scope).
import { generateText } from "ai";
import { DRAFT_RUNNER_PROMPT } from "@/lib/sysprompts";
import {
  DEEPSEEK_DRAFT_MODEL,
  DEEPSEEK_DRAFT_PROVIDER_OPTIONS,
  stripMarkdown,
} from "./deepseek-draft-config";
import { X_CHAR_LIMITS } from "./desk-config";
import type { NewsItem } from "./scan-result";
import { rawEstimatedCost } from "./usage-cost";

function newsItemBlock(item: NewsItem): string {
  const sources = item.sources.map((s) => `${s.handle} — ${s.url}`).join("\n  ");
  return [`Headline: ${item.headline}`, `Body: ${item.body}`, `Sources:\n  ${sources}`].join("\n");
}

export async function draftItems(input: {
  draftingInstructions: string;
  accountTier: "standard" | "premium";
  items: NewsItem[];
}): Promise<{ drafts: string[]; usage: unknown; costUsd: number | null }> {
  const { draftingInstructions, accountTier, items } = input;
  const ceiling = X_CHAR_LIMITS[accountTier];

  const drafted = await Promise.all(
    items.map(async (item) => {
      const userMessage = [
        `Drafting instructions: ${draftingInstructions}`,
        `Account tier: ${accountTier} (character ceiling: ${ceiling} — a ceiling, never a target).`,
        "News item to draft a single post for:",
        "",
        newsItemBlock(item),
      ].join("\n");

      const result = await generateText({
        model: DEEPSEEK_DRAFT_MODEL,
        // No `reasoning`: DeepSeek V4 thinks by default and self-scales effort (see agent.ts).
        // Drafting in-voice is judgment, so let its native adaptive thinking run.
        providerOptions: DEEPSEEK_DRAFT_PROVIDER_OPTIONS,
        system: DRAFT_RUNNER_PROMPT,
        prompt: userMessage,
        // Plain text, NOT structured output. A draft IS a string, so an `Output.object({ draft })`
        // schema buys nothing — and forcing deepseek-v4-flash into it made it intermittently return
        // a degenerate `{"": ""}` and throw AI_NoObjectGeneratedError (the observed 3+-item failure).
      });

      // A single no-tools step, so steps[0].usage carries `.raw`; fall back to the top-level
      // (summed) usage if steps is somehow empty.
      const costUsd = rawEstimatedCost(result.steps[0]?.usage) ?? rawEstimatedCost(result.usage);
      return { draft: stripMarkdown(result.text.trim()), usage: result.usage, costUsd };
    }),
  );

  const costs = drafted.map((d) => d.costUsd).filter((c): c is number => c != null);
  return {
    drafts: drafted.map((d) => d.draft),
    // Informational per-row (no rollup over drafts) — the per-item usages, index-aligned.
    usage: drafted.map((d) => d.usage),
    // Total DeepSeek spend across the per-item calls; null only if every call reported none.
    costUsd: costs.length > 0 ? costs.reduce((sum, c) => sum + c, 0) : null,
  };
}
