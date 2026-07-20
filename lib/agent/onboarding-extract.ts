// lib/agent/onboarding-extract.ts
//
// Extracts the onboarding chat's FINAL presented scan items + drafted posts from the saved transcript,
// so a desk saved from the chat shows them immediately instead of discarding them. ONE generateObject
// (reasoning: "none" — same interleaving hazard as scan-run.ts's structure pass) over the assistant
// text. Faithful extraction, never a re-run (a re-scan would re-bill grok and could drift). SERVER-ONLY
// (reads lib/sysprompts, which loads markdown at module scope).
import { generateObject } from "ai";
import { z } from "zod";
import { ONBOARDING_EXTRACT_PROMPT } from "@/lib/sysprompts";
import { type NewsItem, newsItemSchema } from "./scan-result";
import { rawEstimatedCost } from "./usage-cost";

const onboardingExtractSchema = z.object({
  items: z.array(newsItemSchema),
  drafts: z.array(z.object({ itemIndex: z.number().int().nullable(), text: z.string() })),
});

/** Same generous ceiling as the scan structure pass — a full onboarding scan + drafts is large. */
const EXTRACT_MAX_OUTPUT_TOKENS = 16_000;

export async function extractOnboardingResults(input: { assistantText: string }): Promise<{
  items: NewsItem[];
  drafts: Array<{ itemIndex: number | null; text: string }>;
  costUsd: number | null;
  usage: unknown;
}> {
  const result = await generateObject({
    model: "deepseek/deepseek-v4-flash",
    reasoning: "none", // mechanical extraction; thinking-on breaks generateObject JSON (see agent.md)
    providerOptions: { gateway: { sort: "cost" } },
    maxOutputTokens: EXTRACT_MAX_OUTPUT_TOKENS,
    schema: onboardingExtractSchema,
    system: ONBOARDING_EXTRACT_PROMPT,
    prompt: input.assistantText,
  });
  return {
    items: result.object.items,
    drafts: result.object.drafts,
    costUsd: rawEstimatedCost(result.usage),
    usage: result.usage,
  };
}
