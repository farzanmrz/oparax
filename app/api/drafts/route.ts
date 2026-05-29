// Imports
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { weightedLength } from "@/lib/draft/count"
import { createDraftClient, generateValidatedDraft } from "@/lib/draft/generate"
import type { DraftContext, DraftStoryInput } from "@/lib/draft/prompt"

// Node runtime for generation; maxDuration for reasoning-heavy inference
export const runtime = "nodejs"
export const maxDuration = 120

// Story + monitor_id loaded for drafting (RLS scopes to owner)
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
 * Generate one draft for a saved story (one validation/repair pass) and persist
 * it as a drafts row.
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

  // Parse + validate the request body.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid JSON.", 400)
  }

  // Extract and validate the storyId.
  const storyId =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).storyId
      : undefined
  if (typeof storyId !== "string" || !storyId) {
    return jsonError("storyId is required.", 400)
  }

  // Load the story scoped to the authenticated user.
  const { data: story } = await supabase
    .from("stories")
    .select("id, title, summary, monitor_id")
    .eq("id", storyId)
    .single<DraftStoryRow>()
  if (!story) {
    return jsonError("Story not found.", 404)
  }

  // Load the monitor's drafting context.
  const { data: monitor } = await supabase
    .from("monitors")
    .select("monitoring_description, drafting_instructions, example_tweets")
    .eq("id", story.monitor_id)
    .single<{
      monitoring_description: string
      drafting_instructions: string
      example_tweets: string[]
    }>()

  // Build context + story for the generator.
  const context: DraftContext = {
    monitoringDescription: monitor?.monitoring_description ?? "",
    draftingInstructions: monitor?.drafting_instructions ?? "",
    exampleTweets: monitor?.example_tweets ?? [],
  }
  const storyInput: DraftStoryInput = {
    title: story.title,
    summary: story.summary,
  }

  // Generate with validation and one repair pass.
  const result = await generateValidatedDraft({
    client: createDraftClient(),
    context,
    story: storyInput,
  })
  if (!result.ok) {
    return jsonError(result.error, 502)
  }

  // Persist as a drafts row (status draft) under the user session (RLS).
  const { data: draft, error } = await supabase
    .from("drafts")
    .insert({ story_id: storyId, text: result.text, status: "draft" })
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
