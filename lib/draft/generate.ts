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

/**
 * Run one generation via the AI Gateway and return the draft text.
 * @param system - system prompt (DRAFT_SYSTEM_PROMPT or DRAFT_REPAIR_SYSTEM_PROMPT)
 * @param prompt - user-message content
 * @returns the draft text
 */
async function generateOnce(system: string, prompt: string): Promise<string> {
  const { output } = await generateText({
    model: DRAFT_MODEL,
    output: Output.object({
      schema: draftSchema,
    }),
    system,
    prompt,
    providerOptions: {
      ...GATEWAY_PROVIDER_OPTIONS,
    },
  });
  return output.text;
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
}): Promise<
  | {
      ok: true;
      text: string;
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
  try {
    text = await generateOnce(DRAFT_SYSTEM_PROMPT, userContent);
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
      text = await generateOnce(
        DRAFT_REPAIR_SYSTEM_PROMPT,
        `${userContent}\n\nYour previous draft was invalid: ${issue} Return only a corrected single tweet body.`,
      );
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
  };
}
