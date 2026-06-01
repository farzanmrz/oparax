// Imports
import type OpenAI from "openai"
import { SCAN_MODEL } from "@/lib/scan/prompt"

// Monitor/scan inputs and Responses API request construction
// Inputs that vary per monitor/scan; everything else is a fixed scan config
export interface ScanRequestInput {
  handles: string[]
  fromDate: string | null
  toDate: string | null
  instructions: string
  userPrompt: string
}

/**
 * Build the streaming Responses API params for a scan. Reproduced from the
 * proven test-scan buildResponseParams, but with the x_search date window and
 * handles parameterized from the monitor, and include:["no_inline_citations"]
 * added per SPEC §3.2. xAI-specific fields require the final cast.
 * @param input - per-scan handles, date window, and prompt text
 * @returns the streaming Responses API request params
 */
export function buildScanRequest(
  input: ScanRequestInput,
): OpenAI.Responses.ResponseCreateParamsStreaming {
  // x_search tool config; date bounds are optional per monitor config
  const xSearch: Record<string, unknown> = {
    type: "x_search",
    allowed_x_handles: input.handles,
  }
  if (input.fromDate) {
    xSearch.from_date = input.fromDate
  }
  if (input.toDate) {
    xSearch.to_date = input.toDate
  }

  return {
    model: SCAN_MODEL,
    instructions: input.instructions,
    temperature: 0,
    top_p: 1,
    max_output_tokens: 1_000_000,
    max_turns: 5,
    reasoning: { effort: "low", summary: "detailed" },
    include: ["no_inline_citations"],
    tools: [xSearch],
    text: {
      format: {
        type: "json_schema",
        name: "atomic_news_items",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                  urls: {
                    type: "array",
                    minItems: 1,
                    description:
                      "Source URLs for this item, including at least one direct X/Twitter URL.",
                    items: { type: "string", format: "uri" },
                  },
                  draft: {
                    type: "string",
                    maxLength: 280,
                    description:
                      "A single postable X draft for this item, with no raw URLs or markdown.",
                  },
                },
                required: ["title", "body", "urls", "draft"],
              },
            },
          },
          required: ["items"],
        },
      },
    },
    stream: true,
    input: [{ role: "user", content: input.userPrompt }],
  } as unknown as OpenAI.Responses.ResponseCreateParamsStreaming
}
