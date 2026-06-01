// Imports
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { weightedLength } from "@/lib/draft/count"
import { createDraftClient, generateDraftFromPrompts } from "@/lib/draft/generate"

// Node runtime for the OpenAI SDK; generation is reasoning-heavy.
export const runtime = "nodejs"
export const maxDuration = 120

/**
 * Prompt-lab draft: generate one tweet from the editable draft system + user
 * prompts and the selected story. Ephemeral — persists nothing (post does that).
 * @param req - the request carrying the prompts + selected story content
 * @returns the generated draft text + weighted length, or a JSON error
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  // Parse the request body.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  }
  const record = body as Record<string, unknown>

  const systemPrompt =
    typeof record.systemPrompt === "string" ? record.systemPrompt : ""
  const userPrompt =
    typeof record.userPrompt === "string" ? record.userPrompt : ""
  const storyTitle =
    typeof record.storyTitle === "string" ? record.storyTitle.trim() : ""
  const storySummary =
    typeof record.storySummary === "string" ? record.storySummary.trim() : ""
  if (!systemPrompt.trim() || !userPrompt.trim()) {
    return NextResponse.json(
      { error: "Draft system and user prompts are required." },
      { status: 400 },
    )
  }
  if (!storyTitle && !storySummary) {
    return NextResponse.json({ error: "Select a story first." }, { status: 400 })
  }

  // Generate + validate (+ one repair) from the editable prompts.
  const result = await generateDraftFromPrompts({
    client: createDraftClient(),
    systemPrompt,
    userPrompt,
    story: { title: storyTitle, summary: storySummary },
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({
    text: result.text,
    weightedLength: weightedLength(result.text),
  })
}
