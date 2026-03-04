import { NextResponse } from "next/server"
import OpenAI from "openai"
import { prompts } from "@/lib/prompts"
import { createClient } from "@/lib/supabase/server"
import { SCAN_MAX_HANDLES, HANDLE_RE } from "@/lib/scan-constraints"

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  // 1 — Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return error("Authentication required.", 401)
  }

  // 2 — Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON.", 400)
  }

  if (typeof body !== "object" || body === null) {
    return error("Request body must be a JSON object.", 400)
  }

  const { description, handles } = body as {
    description?: unknown
    handles?: unknown
  }

  // 3 — Validate description
  if (typeof description !== "string" || !description.trim()) {
    return error("description is required and must be a non-empty string.", 400)
  }

  const trimmedDescription = description.trim()

  // 4 — Validate & normalize handles
  let normalizedHandles: string[] = []

  if (handles !== undefined) {
    if (!Array.isArray(handles)) {
      return error("handles must be an array.", 400)
    }

    normalizedHandles = [
      ...new Set(
        handles
          .filter((h): h is string => typeof h === "string")
          .map((h) => h.trim().replace(/^@/, ""))
          .filter((h) => h.length > 0)
      ),
    ]

    const invalid = normalizedHandles.filter((h) => !HANDLE_RE.test(h))
    if (invalid.length > 0) {
      return error(`Invalid X handle(s): ${invalid.join(", ")}`, 400)
    }

    if (normalizedHandles.length > SCAN_MAX_HANDLES) {
      return error(`Maximum ${SCAN_MAX_HANDLES} handles allowed.`, 400)
    }
  }

  // 5 — Env guard
  if (!process.env.XAI_API_KEY) {
    console.error("XAI_API_KEY is not configured.")
    return error("Server configuration error.", 500)
  }

  // 6 — Call Grok
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    const client = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
    })

    const response = await client.responses.create({
      model: "grok-4-1-fast-reasoning",
      input: [
        { role: "system", content: prompts.sysprompt_scan },
        { role: "user", content: trimmedDescription },
      ],
      tools: [
        {
          // @ts-expect-error x_search is xAI-specific, not in OpenAI SDK types
          type: "x_search",
          ...(normalizedHandles.length > 0 && {
            allowed_x_handles: normalizedHandles,
          }),
          from_date: oneDayAgo.toISOString(),
          to_date: now.toISOString(),
        },
      ],
      max_turns: 5,
    })

    return NextResponse.json({ outputText: response.output_text })
  } catch (err) {
    console.error("Grok API error:", err instanceof Error ? err.message : err)
    return error("Failed to reach news scanning service.", 502)
  }
}
