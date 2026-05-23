import type { SupabaseClient } from "@supabase/supabase-js"
import { prompts, buildWorkflowScanUserPrompt } from "@/lib/prompts"
import { SCAN_MAX_HANDLES, HANDLE_RE } from "@/lib/scan-constraints"
import {
  getHeadlineTweetUrls,
  parseKnowledgeBank,
  type KnowledgeBank,
  type KnowledgeHeadline,
  type ScanMetadata,
  type ScanToolCall,
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
  minimumPublishedAt?: Date | string | null
  timeoutMs?: number
}

export interface PersistScanResultInput {
  supabase: SupabaseLike
  workflowId: string
  triggerId: string
  scanRunId: string
  knowledgeBank: KnowledgeBank
  source: ScanRunSource
  updateNextRunAt?: boolean
  minimumPublishedAt?: Date | string | null
}

const scanResultJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    generatedAt: {
      type: "string",
      description: "ISO timestamp for when the scan result was generated.",
    },
    newsItems: {
      type: "array",
      description:
        "Every distinct source-grounded news item found from X and/or web search.",
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
          explanation: {
            type: "string",
            maxLength: 4000,
            description:
              "Plain-language explanation of what happened, combining only what the sources support.",
          },
          sources: {
            type: "array",
            minItems: 1,
            description: "All tweet and website sources used for this scan item.",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: {
                  type: "string",
                  enum: ["tweet", "site"],
                },
                title: {
                  type: "string",
                  description:
                    "Tweet/post title, article headline, page title, or short source label.",
                },
                url: {
                  type: "string",
                  description: "Source URL.",
                },
                publisher: {
                  type: "string",
                  description:
                    "X handle without @ for tweets, or publisher/site name for websites.",
                },
              },
              required: ["type", "title", "url", "publisher"],
            },
          },
          sourceTweetUrls: {
            type: "array",
            items: { type: "string" },
            description: "X post/profile URLs used for this item.",
          },
          sourceSiteUrls: {
            type: "array",
            items: { type: "string" },
            description: "Non-X website URLs used for this item.",
          },
          sourceHandles: {
            type: "array",
            items: { type: "string" },
            description: "Supporting X handles without @ symbols.",
          },
        },
        required: [
          "id",
          "title",
          "explanation",
          "sources",
          "sourceTweetUrls",
          "sourceSiteUrls",
          "sourceHandles",
        ],
      },
    },
  },
  required: ["generatedAt", "newsItems"],
} as const

const TWEET_STATUS_RE = /(?:x|twitter)\.com\/[^/\s]+\/status\/(\d+)/i
const X_SNOWFLAKE_EPOCH_MS = BigInt(1288834974657)
const X_SNOWFLAKE_TIMESTAMP_SHIFT = BigInt(22)
const SCAN_MAX_TURNS = 10

function parseOptionalDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getCostInUsdTicks(response: unknown): number | null {
  if (!isRecord(response) || !isRecord(response.usage)) {
    return null
  }

  const ticks = response.usage.cost_in_usd_ticks
  if (typeof ticks === "number" && Number.isFinite(ticks)) {
    return ticks
  }

  if (typeof ticks === "string" && /^\d+$/.test(ticks)) {
    return Number(ticks)
  }

  return null
}

function getServerSideToolUsage(response: unknown): Record<string, number> {
  if (!isRecord(response) || !isRecord(response.server_side_tool_usage)) {
    return {}
  }

  const usage: Record<string, number> = {}

  for (const [key, value] of Object.entries(response.server_side_tool_usage)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      usage[key] = value
    }
  }

  return usage
}

function extractOutputToolCalls(response: unknown): ScanToolCall[] {
  if (!isRecord(response) || !Array.isArray(response.output)) {
    return []
  }

  return response.output
    .filter(isRecord)
    .filter((item) => {
      const type = typeof item.type === "string" ? item.type : ""
      return type === "web_search_call" || type === "x_search_call"
    })
    .map((item) => ({
      type: typeof item.type === "string" ? item.type : "",
      name:
        typeof item.name === "string"
          ? item.name
          : typeof item.action === "string"
            ? item.action
            : "",
      arguments: item.arguments ?? null,
    }))
}

function extractTopLevelToolCalls(response: unknown): ScanToolCall[] {
  if (!isRecord(response) || !Array.isArray(response.tool_calls)) {
    return []
  }

  return response.tool_calls.filter(isRecord).map((toolCall) => {
    const fn = isRecord(toolCall.function) ? toolCall.function : null

    return {
      type: typeof toolCall.type === "string" ? toolCall.type : "",
      name: typeof fn?.name === "string" ? fn.name : "",
      arguments: fn?.arguments ?? null,
    }
  })
}

function extractScanMetadata(response: unknown): ScanMetadata {
  const toolCalls = [
    ...extractTopLevelToolCalls(response),
    ...extractOutputToolCalls(response),
  ]

  return {
    model: "grok-4.3",
    maxTurns: SCAN_MAX_TURNS,
    serverSideToolUsage: getServerSideToolUsage(response),
    toolCalls,
    costInUsdTicks: getCostInUsdTicks(response),
  }
}

function isRequestTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const name = error.name.toLowerCase()
  const message = error.message.toLowerCase()
  return (
    name.includes("timeout") ||
    name === "aborterror" ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("aborted")
  )
}

export function extractTweetStatusId(url: string): string | null {
  return url.match(TWEET_STATUS_RE)?.[1] ?? null
}

export function decodeTweetPublishedAt(statusId: string): Date | null {
  if (!/^\d+$/.test(statusId)) return null

  try {
    const millis =
      (BigInt(statusId) >> X_SNOWFLAKE_TIMESTAMP_SHIFT) +
      X_SNOWFLAKE_EPOCH_MS
    const date = new Date(Number(millis))
    return Number.isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

export function getHeadlinePublishedAt(headline: KnowledgeHeadline): Date | null {
  const tweetUrls = [
    headline.primaryTweetUrl,
    ...headline.supportingTweetUrls,
    ...headline.sourceUrls,
  ].filter(Boolean)

  for (const url of tweetUrls) {
    const statusId = extractTweetStatusId(url)
    if (!statusId) continue

    const publishedAt = decodeTweetPublishedAt(statusId)
    if (publishedAt) return publishedAt
  }

  return parseOptionalDate(headline.publishedAt)
}

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
    const minimumPublishedAt = parseOptionalDate(input.minimumPublishedAt)
    const fromDate = minimumPublishedAt ? toIsoDate(minimumPublishedAt) : toIsoDate(yesterday)
    const toDate = toIsoDate(today)

    const response = await client.responses.create(
      {
        // x_search, web_search, reasoning, and no_inline_citations are xAI-specific extensions that are
        // accepted by the runtime API but not reflected in the OpenAI SDK types.
        model: "grok-4.3",
        reasoning: {
          effort: "high",
          summary: "detailed",
        },
        max_turns: SCAN_MAX_TURNS,
        input: [
          { role: "system", content: prompts.sysprompt_scan },
          {
            role: "user",
            content: buildWorkflowScanUserPrompt({
              description: input.description,
              handles: input.handles,
              fromDate,
              toDate,
              minimumPublishedAt: minimumPublishedAt?.toISOString(),
            }),
          },
        ],
        tools: [
          {
            type: "web_search",
          },
          {
            type: "x_search",
            ...(input.handles.length > 0 && {
              allowed_x_handles: input.handles,
            }),
            from_date: fromDate,
            to_date: toDate,
          },
        ],
        include: ["no_inline_citations"],
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "web_and_x_scan",
            schema: scanResultJsonSchema,
            strict: true,
          },
        },
      } as unknown as Parameters<typeof client.responses.create>[0],
      input.timeoutMs
        ? {
            timeout: input.timeoutMs,
            maxRetries: 0,
          }
        : undefined,
    )

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

    return {
      ...knowledgeBank,
      scanMetadata: extractScanMetadata(response),
    }
  } catch (error) {
    if (error instanceof WorkflowScanError) {
      throw error
    }

    if (isRequestTimeoutError(error)) {
      throw new WorkflowScanError(
        "News scanning service exceeded the scheduled scan time budget.",
        504,
      )
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

  const firstSourceUrl = headline.sourceUrls.find(Boolean)

  if (firstSourceUrl) {
    return `url:${firstSourceUrl.toLowerCase()}`
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
  minimumPublishedAt,
}: PersistScanResultInput) {
  const completedAt = new Date()
  const minimumPublishedAtDate = parseOptionalDate(minimumPublishedAt)
  const itemRows = new Map<
    string,
    {
      dedupeKey: string
      shouldInsert: boolean
      payload: {
        workflow_id: string
        trigger_id: string
        last_scan_run_id: string
        title: string
        aggregated_context: string
        evidence_points: string[]
        primary_tweet_url: string
        supporting_tweet_urls: string[]
        source_handles: string[]
        source_urls: string[]
        raw_headline: KnowledgeHeadline
        published_at: string | null
        last_seen_at: string
      }
    }
  >()

  for (const headline of knowledgeBank.headlines) {
    const dedupeKey = buildScanItemDedupeKey(headline)
    if (itemRows.has(dedupeKey)) continue
    const publishedAt = getHeadlinePublishedAt(headline)
    const shouldInsert =
      !minimumPublishedAtDate ||
      !publishedAt ||
      publishedAt.getTime() > minimumPublishedAtDate.getTime()

    itemRows.set(dedupeKey, {
      dedupeKey,
      shouldInsert,
      payload: {
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
        raw_headline: {
          ...headline,
          ...(publishedAt && { publishedAt: publishedAt.toISOString() }),
        },
        published_at: publishedAt?.toISOString() ?? null,
        last_seen_at: completedAt.toISOString(),
      },
    })
  }

  const dedupeKeys = [...itemRows.keys()]
  const existingByDedupeKey = new Map<string, string>()

  if (dedupeKeys.length > 0) {
    const { data: existingItems, error: lookupError } = await supabase
      .from("scan_items")
      .select("id, dedupe_key")
      .eq("trigger_id", triggerId)
      .in("dedupe_key", dedupeKeys)

    if (lookupError) {
      throw new Error("Failed to check existing scan item.")
    }

    for (const item of existingItems ?? []) {
      if (typeof item.dedupe_key === "string" && typeof item.id === "string") {
        existingByDedupeKey.set(item.dedupe_key, item.id)
      }
    }
  }

  const updates = [...itemRows.values()]
    .map((item) => ({
      id: existingByDedupeKey.get(item.dedupeKey),
      payload: item.payload,
    }))
    .filter((item): item is { id: string; payload: typeof item.payload } =>
      Boolean(item.id),
    )
  const inserts = [...itemRows.values()]
    .filter(
      (item) =>
        item.shouldInsert && !existingByDedupeKey.has(item.dedupeKey),
    )
    .map((item) => ({
      ...item.payload,
      first_scan_run_id: scanRunId,
      dedupe_key: item.dedupeKey,
      first_seen_at: completedAt.toISOString(),
    }))

  await Promise.all(
    updates.map(async (item) => {
      const { error: updateError } = await supabase
        .from("scan_items")
        .update(item.payload)
        .eq("id", item.id)

      if (updateError) {
        throw new Error("Failed to update scan item.")
      }
    }),
  )

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from("scan_items").insert(inserts)

    if (insertError) {
      throw new Error("Failed to save scan item.")
    }
  }

  const newItemCount = inserts.length

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
