// Imports
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { weightedLength } from "@/lib/draft/count"
import { createDraftClient, generateValidatedDraft } from "@/lib/draft/generate"

// Node runtime for generation; maxDuration for reasoning-heavy inference
export const runtime = "nodejs"
export const maxDuration = 120

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
 * Preview-draft for the create form: generate a draft from RAW fields (a story's
 * title/summary + the typed drafting context), with no saved story. Persists
 * nothing — returns the text + weighted length for inline preview.
 * @param req - the request carrying the story content + drafting context
 * @returns the generated draft as JSON, or a JSON error
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
  if (typeof body !== "object" || body === null) {
    return jsonError("Request body must be a JSON object.", 400)
  }
  const record = body as Record<string, unknown>

  // Extract and validate story content fields.
  const storyTitle =
    typeof record.storyTitle === "string" ? record.storyTitle.trim() : ""
  const storySummary =
    typeof record.storySummary === "string" ? record.storySummary.trim() : ""
  if (!storyTitle && !storySummary) {
    return jsonError("A story title or summary is required.", 400)
  }

  // Build drafting context from form fields.
  const exampleTweets = Array.isArray(record.exampleTweets)
    ? record.exampleTweets.filter((t): t is string => typeof t === "string")
    : []
  const context = {
    monitoringDescription:
      typeof record.monitoringDescription === "string"
        ? record.monitoringDescription
        : "",
    draftingInstructions:
      typeof record.draftingInstructions === "string"
        ? record.draftingInstructions
        : "",
    exampleTweets,
  }

  // Generate with validation and one repair pass.
  const result = await generateValidatedDraft({
    client: createDraftClient(),
    context,
    story: { title: storyTitle, summary: storySummary },
  })
  if (!result.ok) {
    return jsonError(result.error, 502)
  }

  return NextResponse.json({
    text: result.text,
    weightedLength: weightedLength(result.text),
  })
}
