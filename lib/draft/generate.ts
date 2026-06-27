// Imports
import { generateText, Output } from "ai";
import { DRAFT_MODEL, GATEWAY_PROVIDER_OPTIONS } from "@/lib/ai/providers";
import type { DraftStory } from "@/lib/draft/prompt";
import {
  buildDraftUserContent,
  DRAFT_REPAIR_SYSTEM_PROMPT,
  DRAFT_SYSTEM_PROMPT,
} from "@/lib/draft/prompt";
import { draftSchema } from "@/lib/draft/schema";
import { getDraftIssue } from "@/lib/draft/validate";

// Re-export DraftStory for callers that import it from here.
export type { DraftStory };

interface GenerateOnceResult {
  text: string;
  /** Gateway market-rate cost from providerMetadata.gateway.marketCost (BYOK estimate). */
  marketCost: number | null;
  /** Resolved BYOK provider the gateway routed to. */
  resolved: string | null;
}

/**
 * Run one generation via the AI Gateway and return the draft text plus the
 * gateway's market-rate cost + resolved provider (read defensively, same shape
 * as chat/route.ts) so callers can log usage.
 * @param system - system prompt (DRAFT_SYSTEM_PROMPT or DRAFT_REPAIR_SYSTEM_PROMPT)
 * @param prompt - user-message content
 * @returns the draft text, gateway market cost, and resolved provider
 */
async function generateOnce(
  system: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<GenerateOnceResult> {
  const { output, providerMetadata } = await generateText({
    model: DRAFT_MODEL,
    output: Output.object({
      schema: draftSchema,
    }),
    system,
    prompt,
    abortSignal: signal,
    providerOptions: {
      ...GATEWAY_PROVIDER_OPTIONS,
    },
  });
  const gw = (providerMetadata?.gateway ?? {}) as Record<string, unknown>;
  const routing = (gw.routing ?? {}) as Record<string, unknown>;
  const resolved = (routing.finalProvider ?? routing.resolvedProvider) as string | undefined;
  const marketCost = gw.marketCost != null ? Number(gw.marketCost) : null;
  return {
    text: output.text,
    marketCost,
    resolved: resolved ?? null,
  };
}

/**
 * Generate one tweet draft for a story. The draft system prompt is fixed in
 * code; the operator supplies drafting instructions, the story, and optional
 * example tweets for voice matching. One validation/repair pass strips
 * URLs/markdown/over-length.
 * @param input - drafting instructions, story, and example tweets
 * @returns the valid draft text, or a readable error
 */
export async function generateDraft(input: {
  draftingInstructions: string;
  story: DraftStory;
  exampleTweets: string[];
  /** Optional deadline/abort — bounds the draft so the saved-run leg can't blow the wall. */
  signal?: AbortSignal;
}): Promise<
  | {
      ok: true;
      text: string;
      /** Summed gateway market cost across the initial + any repair pass. */
      marketCost: number | null;
      /** Resolved BYOK provider from the last call. */
      resolved: string | null;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const userContent = buildDraftUserContent(
    input.draftingInstructions,
    input.story,
    input.exampleTweets,
  );

  // Generate the first draft (system prompt from code).
  let text: string;
  let marketCost: number | null = null;
  let resolved: string | null = null;
  try {
    const first = await generateOnce(DRAFT_SYSTEM_PROMPT, userContent, input.signal);
    text = first.text;
    marketCost = first.marketCost;
    resolved = first.resolved;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Drafting failed.",
    };
  }

  // One repair pass if the draft fails validation.
  let issue = getDraftIssue(text);
  if (issue) {
    try {
      const repair = await generateOnce(
        DRAFT_REPAIR_SYSTEM_PROMPT,
        `${userContent}\n\nYour previous draft was invalid: ${issue} Return only a corrected single tweet body.`,
        input.signal,
      );
      text = repair.text;
      // Sum the repair-pass cost onto the initial draft's cost.
      if (repair.marketCost != null) {
        marketCost = (marketCost ?? 0) + repair.marketCost;
      }
      resolved = repair.resolved ?? resolved;
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Draft repair failed.",
      };
    }
    issue = getDraftIssue(text);
    if (issue) {
      return {
        ok: false,
        error: "Drafting could not produce valid tweet text.",
      };
    }
  }

  return {
    ok: true,
    text,
    marketCost,
    resolved,
  };
}
