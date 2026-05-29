// Imports
import OpenAI from "openai"
import { getDraftIssue } from "@/lib/draft/validate"
import {
  DRAFT_JSON_SCHEMA,
  DRAFT_MODEL,
  DRAFT_REPAIR_SYSTEM_PROMPT,
  DRAFT_SYSTEM_PROMPT,
  buildDraftRepairUserPrompt,
  buildDraftUserPrompt,
  type DraftContext,
  type DraftStoryInput,
} from "@/lib/draft/prompt"

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
 * Parse the structured JSON text from the model output.
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
 * @param userPrompt - the JSON user prompt
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

/**
 * Generate a single tweet draft for a story with one validation/repair pass.
 * Shared by the saved-story route and the create-form preview route.
 * @param input - the Grok client, drafting context, and the story
 * @returns the valid draft text, or a readable error
 */
export async function generateValidatedDraft(input: {
  client: OpenAI
  context: DraftContext
  story: DraftStoryInput
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  // Generate the first draft from the prompt.
  let text: string
  try {
    text = await generateOnce(
      input.client,
      DRAFT_SYSTEM_PROMPT,
      buildDraftUserPrompt({ ...input.context, story: input.story }),
    )
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Drafting failed.",
    }
  }

  // One repair pass if the first draft fails validation.
  let issue = getDraftIssue(text)
  if (issue) {
    try {
      text = await generateOnce(
        input.client,
        DRAFT_REPAIR_SYSTEM_PROMPT,
        buildDraftRepairUserPrompt({
          ...input.context,
          story: input.story,
          invalidDraft: text,
          invalidReason: issue,
        }),
      )
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Draft repair failed.",
      }
    }
    issue = getDraftIssue(text)
    if (issue) {
      return { ok: false, error: "Drafting service could not produce valid tweet text." }
    }
  }

  return { ok: true, text }
}
