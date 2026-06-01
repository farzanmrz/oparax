// Imports
import OpenAI from "openai"
import { getDraftIssue } from "@/lib/draft/validate"
import { DRAFT_JSON_SCHEMA, DRAFT_MODEL } from "@/lib/draft/prompt"

/**
 * Build a Grok client for draft generation (openai SDK @ api.x.ai).
 * @returns an OpenAI client for the xAI Responses API
 */
export function createDraftClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: 60_000,
  })
}

/**
 * Pull the structured-output text from a Responses API result.
 * @param response - the completed Responses API result
 * @returns the output text, or an empty string
 */
function extractResponseText(response: OpenAI.Responses.Response): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text
  }

  // Fallback: walk output[].content[] for the first output_text part
  const output = (response as { output?: unknown }).output
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = (item as { content?: unknown }).content
      if (Array.isArray(content)) {
        for (const part of content) {
          const record = part as { type?: unknown; text?: unknown }
          if (record.type === "output_text" && typeof record.text === "string") {
            return record.text
          }
        }
      }
    }
  }
  return ""
}

/**
 * Parse the structured JSON { text } from the model output.
 * @param raw - the raw output text
 * @returns the draft text, or null if it could not be parsed
 */
function parseDraftText(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { text?: unknown }).text === "string"
    ) {
      return (parsed as { text: string }).text
    }
  } catch {
    return null
  }
  return null
}

/**
 * Run one Grok generation with a system + user prompt.
 * @param client - the Grok client
 * @param systemPrompt - the system instructions
 * @param userPrompt - the user prompt
 * @returns the draft text
 */
async function generateOnce(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await client.responses.create({
    model: DRAFT_MODEL,
    reasoning: { effort: "high" },
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "tweet_draft",
        schema: DRAFT_JSON_SCHEMA,
        strict: true,
      },
    },
  } as unknown as OpenAI.Responses.ResponseCreateParamsNonStreaming)

  const text = parseDraftText(extractResponseText(response))
  if (!text) {
    throw new Error("Drafting service returned an invalid result.")
  }
  return text
}

// The story content the draft is grounded in (appended to the user prompt).
export interface DraftStory {
  title: string
  summary: string
}

/**
 * Generate one tweet draft from editable system + user prompts (the prompt-lab
 * path). The story is appended to the user prompt; one validation/repair pass
 * strips URLs/markdown/over-length.
 * @param input - client, editable system + user prompts, and the story
 * @returns the valid draft text, or a readable error
 */
export async function generateDraftFromPrompts(input: {
  client: OpenAI
  systemPrompt: string
  userPrompt: string
  story: DraftStory
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  // Ground the editable user prompt in the selected story.
  const userContent = `${input.userPrompt}\n\nStory title: ${input.story.title}\nStory summary: ${input.story.summary}`

  // Generate the first draft.
  let text: string
  try {
    text = await generateOnce(input.client, input.systemPrompt, userContent)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Drafting failed.",
    }
  }

  // One repair pass if the draft fails validation, reusing the editable prompt.
  let issue = getDraftIssue(text)
  if (issue) {
    try {
      text = await generateOnce(
        input.client,
        input.systemPrompt,
        `${userContent}\n\nYour previous draft was invalid: ${issue} Return only a corrected single tweet body — no markdown, no raw URLs, within 280 characters.`,
      )
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Draft repair failed.",
      }
    }
    issue = getDraftIssue(text)
    if (issue) {
      return { ok: false, error: "Drafting could not produce valid tweet text." }
    }
  }

  return { ok: true, text }
}
