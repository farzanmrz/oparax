// lib/agent/draft-run.ts
//
// Headless draft runner: ONE structured DeepSeek call drafts a post per news item, in the
// reporter's saved voice, and also returns that call's DeepSeek dollar cost. No tool loop,
// no persistence — task 8's `draftSelected` server action inserts the resulting `drafts`
// rows. SERVER-ONLY (transitively reads fs via lib/sysprompts, which loads
// DRAFT_RUNNER_PROMPT at module scope).
import { generateText, Output } from "ai";
import { z } from "zod";
import { DRAFT_RUNNER_PROMPT } from "@/lib/sysprompts";
import { X_CHAR_LIMITS } from "./desk-config";
import type { NewsItem } from "./scan-result";
import { rawEstimatedCost } from "./usage-cost";

function newsItemsBlock(items: NewsItem[]): string {
  return items
    .map((item, i) => {
      const sources = item.sources.map((s) => `${s.handle} — ${s.url}`).join("\n  ");
      return [
        `${i + 1}. Headline: ${item.headline}`,
        `Body: ${item.body}`,
        `Sources:\n  ${sources}`,
      ].join("\n");
    })
    .join("\n\n");
}

export async function draftItems(input: {
  draftingInstructions: string;
  accountTier: "standard" | "premium";
  items: NewsItem[];
}): Promise<{ drafts: string[]; usage: unknown; costUsd: number | null }> {
  const { draftingInstructions, accountTier, items } = input;
  const ceiling = X_CHAR_LIMITS[accountTier];

  const userMessage = [
    `Drafting instructions: ${draftingInstructions}`,
    `Account tier: ${accountTier} (character ceiling: ${ceiling} — a ceiling, never a target).`,
    "News items (produce exactly one draft per item, in the same order):",
    "",
    newsItemsBlock(items),
  ].join("\n");

  const result = await generateText({
    model: "deepseek/deepseek-v4-flash",
    // No `reasoning`: DeepSeek V4 thinks by default and self-scales effort (see agent.ts).
    // Drafting in-voice is judgment, so let its native adaptive thinking run.
    providerOptions: { gateway: { sort: "cost" } },
    system: DRAFT_RUNNER_PROMPT,
    prompt: userMessage,
    output: Output.object({
      schema: z.object({ drafts: z.array(z.string()) }),
    }),
  });
  const { output, usage } = result;

  if (output.drafts.length !== items.length) {
    throw new Error(
      `draftItems: model returned ${output.drafts.length} drafts for ${items.length} items — expected one draft per item, index-aligned.`,
    );
  }

  // Belt-and-braces: the draft call is a single no-tools step, so steps[0].usage carries
  // `.raw`; fall back to the top-level (summed) usage if steps is somehow empty.
  const costUsd = rawEstimatedCost(result.steps[0]?.usage) ?? rawEstimatedCost(result.usage);

  return { drafts: output.drafts, usage, costUsd };
}
