import type { SupabaseClient } from "@supabase/supabase-js"
import { prompts, buildScanUserPrompt } from "@/lib/prompts"
import { SCAN_MAX_HANDLES, HANDLE_RE } from "@/lib/scan-constraints"
import {
  getHeadlineTweetUrls,
  parseKnowledgeBank,
  type KnowledgeBank,
  type KnowledgeHeadline,
} from "@/lib/workflow-drafting"
import { createXaiClient, extractResponseText } from "@/lib/xai"

type SupabaseLike = SupabaseClient

export class WorkflowScanError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "WorkflowScanError"
    this.status = status
  }
}

export type ScanRunSource = "create" | "manual" | "scheduled"

export interface ScanInput {
  description: string
  handles: string[]
}

export interface PersistScanResultInput {
  supabase: SupabaseLike
  workflowId: string
  triggerId: string
  scanRunId: string
  knowledgeBank: KnowledgeBank
  source: ScanRunSource
  updateNextRunAt?: boolean
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
            description: "The most representative X post URL for the angle.",
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

const TWEET_STATUS_RE = /(?:x|twitter)\.com\/[^/\s]+\/status\/(\d+)/i

export function normalizeScanHandles(handles: unknown): string[] {
  if (handles === undefined) {
    return []
  }

  if (!Array.isArray(handles)) {
    throw new WorkflowScanError("handles must be an array.", 400)
  }

  const normalizedHandles = [
    ...new Set(
      handles
        .filter((handle): handle is string => typeof handle === "string")
        .map((handle) => handle.trim().replace(/^@/, ""))
        .filter((handle) => handle.length > 0),
    ),
  ]

  const invalid = normalizedHandles.filter((handle) => !HANDLE_RE.test(handle))
  if (invalid.length > 0) {
    throw new WorkflowScanError(`Invalid X handle(s): ${invalid.join(", ")}`, 400)
  }

  if (normalizedHandles.length > SCAN_MAX_HANDLES) {
    throw new WorkflowScanError(`Maximum ${SCAN_MAX_HANDLES} handles allowed.`, 400)
  }

  return normalizedHandles
}

export function parseScanInput(body: unknown): ScanInput {
  if (typeof body !== "object" || body === null) {
    throw new WorkflowScanError("Request body must be a JSON object.", 400)
  }

  const { description, handles } = body as {
    description?: unknown
    handles?: unknown
  }

  if (typeof description !== "string" || !description.trim()) {
    throw new WorkflowScanError(
      "description is required and must be a non-empty string.",
      400,
    )
  }

  return {
    description: description.trim(),
    handles: normalizeScanHandles(handles),
  }
}

export async function runWorkflowScan(input: ScanInput): Promise<KnowledgeBank> {
  if (!process.env.XAI_API_KEY) {
    console.error("XAI_API_KEY is not configured.")
    throw new WorkflowScanError("Server configuration error.", 500)
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
        { role: "user", content: buildScanUserPrompt(input.description) },
      ],
      tools: [
        {
          type: "x_search",
          ...(input.handles.length > 0 && {
            allowed_x_handles: input.handles,
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
      throw new WorkflowScanError(
        "News scanning service returned an empty response.",
        502,
      )
    }

    const knowledgeBank = parseKnowledgeBank(JSON.parse(outputText))
    if (!knowledgeBank) {
      console.error("Invalid scan response payload:", outputText)
      throw new WorkflowScanError(
        "News scanning service returned an invalid result.",
        502,
      )
    }

    return knowledgeBank
  } catch (error) {
    if (error instanceof WorkflowScanError) {
      throw error
    }

    console.error("Grok scan error:", error instanceof Error ? error.message : error)
    throw new WorkflowScanError("Failed to reach news scanning service.", 502)
  }
}

export function addFrequencyToDate(
  date: Date,
  amount: number | null | undefined,
  unit: string | null | undefined,
): Date | null {
  if (!amount || !unit) return null

  const next = new Date(date)
  switch (unit) {
    case "m":
      next.setMinutes(next.getMinutes() + amount)
      return next
    case "h":
      next.setHours(next.getHours() + amount)
      return next
    case "d":
      next.setDate(next.getDate() + amount)
      return next
    case "w":
      next.setDate(next.getDate() + amount * 7)
      return next
    default:
      return null
  }
}

export function buildScanItemDedupeKey(headline: KnowledgeHeadline): string {
  const primaryTweetId = headline.primaryTweetUrl?.match(TWEET_STATUS_RE)?.[1]

  if (primaryTweetId) {
    return `tweet:${primaryTweetId}`
  }

  const firstTweetId = getHeadlineTweetUrls(headline)
    .map((url) => url.match(TWEET_STATUS_RE)?.[1])
    .find((id): id is string => Boolean(id))

  if (firstTweetId) {
    return `tweet:${firstTweetId}`
  }

  const normalizedTitle = headline.title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)

  return `title:${normalizedTitle || headline.id}`
}

export async function persistScanRunResults({
  supabase,
  workflowId,
  triggerId,
  scanRunId,
  knowledgeBank,
  source,
  updateNextRunAt = true,
}: PersistScanResultInput) {
  const completedAt = new Date()
  let newItemCount = 0

  for (const headline of knowledgeBank.headlines) {
    const dedupeKey = buildScanItemDedupeKey(headline)
    const { data: existing, error: lookupError } = await supabase
      .from("scan_items")
      .select("id")
      .eq("trigger_id", triggerId)
      .eq("dedupe_key", dedupeKey)
      .maybeSingle()

    if (lookupError) {
      throw new Error("Failed to check existing scan item.")
    }

    const itemPayload = {
      workflow_id: workflowId,
      trigger_id: triggerId,
      last_scan_run_id: scanRunId,
      title: headline.title,
      aggregated_context: headline.aggregatedContext,
      evidence_points: headline.evidencePoints,
      primary_tweet_url: headline.primaryTweetUrl,
      supporting_tweet_urls: headline.supportingTweetUrls,
      source_handles: headline.sourceHandles,
      source_urls: headline.sourceUrls,
      raw_headline: headline,
      last_seen_at: completedAt.toISOString(),
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("scan_items")
        .update(itemPayload)
        .eq("id", existing.id)

      if (updateError) {
        throw new Error("Failed to update scan item.")
      }
      continue
    }

    const { error: insertError } = await supabase.from("scan_items").insert({
      ...itemPayload,
      first_scan_run_id: scanRunId,
      dedupe_key: dedupeKey,
      first_seen_at: completedAt.toISOString(),
    })

    if (insertError) {
      throw new Error("Failed to save scan item.")
    }

    newItemCount += 1
  }

  const { error: runError } = await supabase
    .from("scan_runs")
    .update({
      status: "completed",
      raw_output: JSON.stringify(knowledgeBank),
      item_count: knowledgeBank.headlines.length,
      new_item_count: newItemCount,
      source,
      error_message: null,
      completed_at: completedAt.toISOString(),
    })
    .eq("id", scanRunId)

  if (runError) {
    throw new Error("Failed to save scan run.")
  }

  const triggerUpdate: Record<string, string> = {
    last_run_at: completedAt.toISOString(),
  }

  if (updateNextRunAt) {
    const { data: trigger, error: triggerError } = await supabase
      .from("triggers")
      .select("frequency_amount, frequency_unit")
      .eq("id", triggerId)
      .single()

    if (triggerError || !trigger) {
      throw new Error("Failed to load trigger schedule.")
    }

    const nextRunAt = addFrequencyToDate(
      completedAt,
      Number(trigger.frequency_amount),
      String(trigger.frequency_unit),
    )

    if (nextRunAt) {
      triggerUpdate.next_run_at = nextRunAt.toISOString()
    }
  }

  const { error: triggerUpdateError } = await supabase
    .from("triggers")
    .update(triggerUpdate)
    .eq("id", triggerId)

  if (triggerUpdateError) {
    throw new Error("Failed to update trigger run time.")
  }

  return {
    itemCount: knowledgeBank.headlines.length,
    newItemCount,
  }
}

export async function failScanRun(
  supabase: SupabaseLike,
  scanRunId: string,
  message: string,
) {
  await supabase
    .from("scan_runs")
    .update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", scanRunId)
}
