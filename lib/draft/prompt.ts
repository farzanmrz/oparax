// Imports

// Grok model used for draft generation.
export const DRAFT_MODEL = "grok-4.3";

// Strict JSON schema for a single tweet draft (the body only).
export const DRAFT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: {
      type: "string",
      description: "The drafted post body only — no markdown, no raw URLs.",
    },
  },
  required: ["text"],
} as const;

// System prompt for generating one postable tweet from a single story.
export const DRAFT_SYSTEM_PROMPT = `You draft a single postable X (Twitter) post for a professional reporter, in their voice.

Rules:
- Output only the post body — no headings, markdown, explanations, or source footers.
- Do not include raw URLs.
- Match the post length the reporter asks for in the drafting instructions; if they give no length, keep it tight and scannable. Do NOT force a 280-character cap — the reporter sets their own limit.
- Use only the provided story as the factual basis; do not invent details.
- Follow the drafting instructions provided in the user message.`;

// System prompt for the single repair pass when a draft fails validation.
export const DRAFT_REPAIR_SYSTEM_PROMPT = `You are repairing a drafted X post so it becomes directly postable.

Rules:
- Rewrite the invalid draft into a single clean post body.
- Keep the same underlying angle and use only the provided story.
- Remove headings, markdown, explanations, source footers, and raw URLs.
- Match the reporter's requested length; if they gave none, keep it tight — drop secondary detail while preserving the main angle and the drafting instructions.
- Output only the repaired post body.`;

// The story content fed to the drafting model (trimmed stories: title + summary).
export interface DraftStoryInput {
  title: string;
  summary: string;
}

// Shared drafting context from the monitor.
export interface DraftContext {
  monitoringDescription: string;
  draftingInstructions: string;
  exampleTweets: string[];
}

// Minimal story shape for the Gateway draft path.
export interface DraftStory {
  title: string;
  summary: string;
}

/**
 * Build the plain-text user content for Gateway draft generation.
 * When example tweets are provided they are appended as a style-examples block
 * so the model can match the reporter's voice without copying content.
 * @param draftingInstructions - operator guidance (may be empty)
 * @param story - the selected story
 * @param exampleTweets - previous tweets by this reporter (may be empty)
 * @returns the user-message content string
 */
export function buildDraftUserContent(
  draftingInstructions: string,
  story: DraftStory,
  exampleTweets: string[],
): string {
  const guidance = draftingInstructions.trim();
  const head = guidance ? `Drafting instructions: ${guidance}\n\n` : "";
  let content = `${head}Story title: ${story.title}\nStory summary: ${story.summary}`;
  if (exampleTweets.length > 0) {
    const examples = exampleTweets.map((t) => `- "${t}"`).join("\n");
    content += `\n\nStyle examples (match this voice; do not copy content):\n${examples}`;
  }
  return content;
}

/**
 * Build the generation user prompt (JSON) from the monitor context + story.
 * @param input - drafting context plus the single story to draft
 * @returns a JSON string user prompt
 */
export function buildDraftUserPrompt(
  input: DraftContext & {
    story: DraftStoryInput;
  },
): string {
  return JSON.stringify(
    {
      monitoringDescription: input.monitoringDescription.trim(),
      draftingInstructions: input.draftingInstructions.trim(),
      exampleTweets: input.exampleTweets,
      story: {
        title: input.story.title,
        summary: input.story.summary,
      },
    },
    null,
    2,
  );
}

/**
 * Build the repair user prompt (JSON), passing back the bad draft + reason.
 * @param input - drafting context, the story, and the failed draft + issue
 * @returns a JSON string user prompt
 */
export function buildDraftRepairUserPrompt(
  input: DraftContext & {
    story: DraftStoryInput;
    invalidDraft: string;
    invalidReason: string;
  },
): string {
  return JSON.stringify(
    {
      monitoringDescription: input.monitoringDescription.trim(),
      draftingInstructions: input.draftingInstructions.trim(),
      exampleTweets: input.exampleTweets,
      story: {
        title: input.story.title,
        summary: input.story.summary,
      },
      invalidDraft: input.invalidDraft,
      invalidReason: input.invalidReason,
    },
    null,
    2,
  );
}
