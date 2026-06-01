// Imports
import { NextResponse } from "next/server"
import {
  MONITOR_MAX_HANDLES,
  isValidHandle,
  normalizeHandle,
} from "@/lib/scan/handles"
import { createClient } from "@/lib/supabase/server"
import type { PreviewStory, ScanMetrics } from "@/lib/scan/stream"
import type { RunItemInsert } from "@/lib/types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeStory(value: unknown): PreviewStory | null {
  if (!isRecord(value)) return null
  const title = typeof value.title === "string" ? value.title.trim() : ""
  const summary = typeof value.summary === "string" ? value.summary.trim() : ""
  const primaryTweetUrl =
    typeof value.primaryTweetUrl === "string" ? value.primaryTweetUrl.trim() : ""
  const dedupeKey =
    typeof value.dedupeKey === "string" ? value.dedupeKey.trim() : ""
  const draft = typeof value.draft === "string" ? value.draft.trim() : ""
  const sourceUrls = Array.isArray(value.sourceUrls)
    ? value.sourceUrls
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean)
    : []

  if (!title || !summary || !dedupeKey || !draft) return null

  return { title, summary, sourceUrls, primaryTweetUrl, dedupeKey, draft }
}

function normalizeMetrics(value: unknown): ScanMetrics | null {
  if (!isRecord(value)) return null
  const costUsd =
    typeof value.costUsd === "number" && Number.isFinite(value.costUsd)
      ? value.costUsd
      : null
  const elapsedMs =
    typeof value.elapsedMs === "number" && Number.isFinite(value.elapsedMs)
      ? value.elapsedMs
      : 0
  const xSearchCalls =
    typeof value.xSearchCalls === "number" && Number.isFinite(value.xSearchCalls)
      ? value.xSearchCalls
      : null

  return { costUsd, elapsedMs, xSearchCalls }
}

/**
 * Save the prompt-lab inputs as a real agent configuration after the operator
 * has proven the scan + draft shape in the lab UI.
 * @param req - request carrying the agent name, handles, and instructions
 * @returns the saved agent id, or a JSON error
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    )
  }

  const { data: connection } = await supabase
    .from("x_connections")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>()
  if (!connection) {
    return NextResponse.json(
      { error: "Connect X before creating an agent." },
      { status: 403 },
    )
  }

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
  const name =
    typeof record.name === "string" && record.name.trim()
      ? record.name.trim()
      : "Prompt lab agent"
  const monitoringDescription =
    typeof record.monitoringDescription === "string"
      ? record.monitoringDescription.trim()
      : ""
  const draftingInstructions =
    typeof record.draftingInstructions === "string"
      ? record.draftingInstructions.trim()
      : ""
  const rawHandles = Array.isArray(record.handles) ? record.handles : []
  const stories = Array.isArray(record.stories)
    ? record.stories
        .map(normalizeStory)
        .filter((story): story is PreviewStory => story !== null)
    : []
  const metrics = normalizeMetrics(record.metrics)
  const seenHandles = new Set<string>()
  const handles = rawHandles
    .filter((handle): handle is string => typeof handle === "string")
    .map(normalizeHandle)
    .filter((handle) => {
      const key = handle.toLowerCase()
      if (!handle || seenHandles.has(key)) return false
      seenHandles.add(key)
      return true
    })

  if (handles.length === 0) {
    return NextResponse.json(
      { error: "Add at least one X account to monitor." },
      { status: 400 },
    )
  }
  if (handles.length > MONITOR_MAX_HANDLES) {
    return NextResponse.json(
      { error: `Use ${MONITOR_MAX_HANDLES} or fewer X accounts.` },
      { status: 400 },
    )
  }

  const invalidHandle = handles.find((handle) => !isValidHandle(handle))
  if (invalidHandle) {
    return NextResponse.json(
      { error: `@${invalidHandle} is not a valid X handle.` },
      { status: 400 },
    )
  }

  const { data: existingAgents, error: existingError } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", name)
    .limit(1)

  if (existingError) {
    return NextResponse.json(
      { error: "Failed to check existing agents." },
      { status: 500 },
    )
  }
  if ((existingAgents ?? []).length > 0) {
    return NextResponse.json(
      { error: "An agent with this name already exists." },
      { status: 409 },
    )
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      user_id: user.id,
      name,
      monitored_handles: handles,
      monitoring_description: monitoringDescription,
      drafting_instructions: draftingInstructions,
      status: "active",
    })
    .select("id")
    .single<{ id: string }>()

  if (error || !agent) {
    return NextResponse.json(
      { error: "Failed to save agent." },
      { status: 500 },
    )
  }

  if (stories.length > 0) {
    const { data: run, error: runError } = await supabase
      .from("runs")
      .insert({
        agent_id: agent.id,
        source: "manual",
        status: "completed",
        completed_at: new Date().toISOString(),
        cost_usd: metrics?.costUsd ?? null,
        x_search_count: metrics?.xSearchCalls ?? null,
        item_count: stories.length,
        inputs: {
          handles,
          monitoringDescription,
          draftingInstructions,
        },
      })
      .select("id")
      .single<{ id: string }>()

    if (runError || !run) {
      return NextResponse.json(
        { error: "Agent saved, but the preview run could not be saved." },
        { status: 500 },
      )
    }

    const runItems: RunItemInsert[] = stories.map((story) => ({
      run_id: run.id,
      agent_id: agent.id,
      story_title: story.title,
      story_summary: story.summary,
      source_urls: story.sourceUrls,
      primary_tweet_url: story.primaryTweetUrl,
      dedupe_key: story.dedupeKey,
      drafted_text: story.draft,
      final_text: story.draft,
      status: "drafted",
    }))
    const { error: itemsError } = await supabase.from("run_items").insert(runItems)

    if (itemsError) {
      return NextResponse.json(
        { error: "Agent saved, but the preview items could not be saved." },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ id: agent.id })
}
