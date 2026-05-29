// Imports
import OpenAI from "openai"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { weightedLength } from "@/lib/draft/count"
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

// Node runtime for the OpenAI SDK; generation is quick but reasoning-heavy.
export const runtime = "nodejs"
export const maxDuration = 120

// Story + nested monitor context loaded for drafting (selected under RLS).
interface DraftStoryRow {
  id: string
  title: string
  summary: string
  monitor_id: string
}

/**
 * JSON error response helper.
 * @param message - the user-facing error message
 * @param status - the HTTP status code
 * @returns a JSON error response
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
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
  // Fallback: walk output[].content[] for the first output_text part.
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
 * Generate one draft for a single story, with one validation/repair pass, and
 * persist it as a drafts row. Reproduces the legacy validate/repair flow,
 * simplified to one story → one draft and weighted character counting.
 * @param req - the request carrying { storyId }
 * @returns the persisted draft as JSON, or a JSON error
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return jsonError("Authentication required.", 401)
  }

  // Parse the request body.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid JSON.", 400)
  }

  // Validate that storyId is provided and is a string.
  const storyId =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).storyId
      : undefined
  if (typeof storyId !== "string" || !storyId) {
    return jsonError("storyId is required.", 400)
  }

  // RLS scopes the story to the owner via its monitor.
  const { data: story } = await supabase
    .from("stories")
    .select("id, title, summary, monitor_id")
    .eq("id", storyId)
    .single<DraftStoryRow>()
  if (!story) {
    return jsonError("Story not found.", 404)
  }

  // Drafting context comes from the story's monitor.
  const { data: monitor } = await supabase
    .from("monitors")
    .select("monitoring_description, drafting_instructions, example_tweets")
    .eq("id", story.monitor_id)
    .single<{
      monitoring_description: string
      drafting_instructions: string
      example_tweets: string[]
    }>()

  // Prepare the drafting context and story input for the model.
  const context: DraftContext = {
    monitoringDescription: monitor?.monitoring_description ?? "",
    draftingInstructions: monitor?.drafting_instructions ?? "",
    exampleTweets: monitor?.example_tweets ?? [],
  }
  const storyInput: DraftStoryInput = {
    title: story.title,
    summary: story.summary,
  }

  // Grok client configured for xAI.
  const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: 60_000,
  })

  // Generate a draft once or with repair; calls Grok with system + user prompt.
  async function generate(
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

  // Generate the initial draft.
  let text: string
  try {
    text = await generate(
      DRAFT_SYSTEM_PROMPT,
      buildDraftUserPrompt({ ...context, story: storyInput }),
    )
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Drafting failed.",
      502,
    )
  }

  // One repair pass if the first draft fails validation.
  let issue = getDraftIssue(text)
  if (issue) {
    try {
      text = await generate(
        DRAFT_REPAIR_SYSTEM_PROMPT,
        buildDraftRepairUserPrompt({
          ...context,
          story: storyInput,
          invalidDraft: text,
          invalidReason: issue,
        }),
      )
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Draft repair failed.",
        502,
      )
    }
    issue = getDraftIssue(text)
    if (issue) {
      return jsonError("Drafting service could not produce valid tweet text.", 502)
    }
  }

  // Persist as a drafts row with status 'draft' (RLS scopes to user).
  const { data: draft, error } = await supabase
    .from("drafts")
    .insert({ story_id: storyId, text, status: "draft" })
    .select("id, text, status")
    .single<{ id: string; text: string; status: string }>()
  if (error || !draft) {
    return jsonError("Failed to save draft.", 500)
  }

  return NextResponse.json({
    draftId: draft.id,
    text: draft.text,
    status: draft.status,
    weightedLength: weightedLength(draft.text),
  })
}
