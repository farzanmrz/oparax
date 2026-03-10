import { NextResponse } from "next/server"
import { prompts, buildScanUserPrompt } from "@/lib/prompts"
import { createClient } from "@/lib/supabase/server"
import { SCAN_MAX_HANDLES, HANDLE_RE } from "@/lib/scan-constraints"
import { parseKnowledgeBank } from "@/lib/workflow-drafting"
import { createXaiClient, extractResponseText } from "@/lib/xai"

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

const knowledgeBankJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    generatedAt: {
      type: "string",
      description: "ISO timestamp for when the knowledge bank was generated.",
    },
    headlines: {
      type: "array",
      description: "Distinct source-grounded knowledge items found in the scan results.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: {
            type: "string",
            description: "Stable slug-like identifier for the knowledge item.",
          },
          title: {
            type: "string",
            maxLength: 180,
            description: "Short title for one atomic news angle.",
          },
          aggregatedContext: {
            type: "string",
            maxLength: 2400,
            description:
              "Human-readable accumulated context for the angle, preserving useful detail from the retrieved sources.",
          },
          evidencePoints: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: {
              type: "string",
              maxLength: 500,
            },
            description:
              "Source-grounded details, claims, quotes, or developments gathered under the same angle.",
          },
          primaryTweetUrl: {
            type: "string",
            description:
              "The most representative X post URL for the angle.",
          },
          supportingTweetUrls: {
            type: "array",
            maxItems: 8,
            items: { type: "string" },
            description:
              "Additional X post URLs that support the same angle and are suitable for embedding.",
          },
          sourceHandles: {
            type: "array",
            maxItems: 8,
            items: { type: "string" },
            description: "Supporting X handles without @ symbols.",
          },
          sourceUrls: {
            type: "array",
            maxItems: 12,
            items: { type: "string" },
            description: "Supporting source URLs used for this headline.",
          },
        },
        required: [
          "id",
          "title",
          "aggregatedContext",
          "evidencePoints",
          "primaryTweetUrl",
          "supportingTweetUrls",
          "sourceHandles",
          "sourceUrls",
        ],
      },
    },
  },
  required: ["generatedAt", "headlines"],
} as const

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return error("Authentication required.", 401)
  }

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

  if (typeof description !== "string" || !description.trim()) {
    return error("description is required and must be a non-empty string.", 400)
  }

  let normalizedHandles: string[] = []

  if (handles !== undefined) {
    if (!Array.isArray(handles)) {
      return error("handles must be an array.", 400)
    }

    normalizedHandles = [
      ...new Set(
        handles
          .filter((handle): handle is string => typeof handle === "string")
          .map((handle) => handle.trim().replace(/^@/, ""))
          .filter((handle) => handle.length > 0),
      ),
    ]

    const invalid = normalizedHandles.filter((handle) => !HANDLE_RE.test(handle))
    if (invalid.length > 0) {
      return error(`Invalid X handle(s): ${invalid.join(", ")}`, 400)
    }

    if (normalizedHandles.length > SCAN_MAX_HANDLES) {
      return error(`Maximum ${SCAN_MAX_HANDLES} handles allowed.`, 400)
    }
  }

  if (!process.env.XAI_API_KEY) {
    console.error("XAI_API_KEY is not configured.")
    return error("Server configuration error.", 500)
  }

  try {
    const client = createXaiClient()
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const response = await client.responses.create({
      // x_search and no_inline_citations are xAI-specific extensions that are
      // accepted by the runtime API but not reflected in the OpenAI SDK types.
      model: "grok-4-1-fast-reasoning",
      input: [
        { role: "system", content: prompts.sysprompt_scan },
        { role: "user", content: buildScanUserPrompt(description) },
      ],
      tools: [
        {
          type: "x_search",
          ...(normalizedHandles.length > 0 && {
            allowed_x_handles: normalizedHandles,
          }),
          from_date: yesterday.toISOString().split("T")[0],
          to_date: today.toISOString().split("T")[0],
        },
      ],
      include: ["no_inline_citations"],
      text: {
        format: {
          type: "json_schema",
          name: "knowledge_bank",
          schema: knowledgeBankJsonSchema,
          strict: true,
        },
      },
    } as unknown as Parameters<typeof client.responses.create>[0])

    const outputText = extractResponseText(response)
    if (!outputText) {
      return error("News scanning service returned an empty response.", 502)
    }

    const knowledgeBank = parseKnowledgeBank(JSON.parse(outputText))
    if (!knowledgeBank) {
      console.error("Invalid scan response payload:", outputText)
      return error("News scanning service returned an invalid result.", 502)
    }

    return NextResponse.json(knowledgeBank)
  } catch (err) {
    console.error("Grok scan error:", err instanceof Error ? err.message : err)
    return error("Failed to reach news scanning service.", 502)
  }
}
