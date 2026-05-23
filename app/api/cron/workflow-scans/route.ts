import { NextResponse, type NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  failScanRun,
  normalizeScanHandles,
  persistScanRunResults,
  runWorkflowScan,
  WorkflowScanError,
} from "@/lib/workflow-scans"

export const runtime = "nodejs"
export const maxDuration = 800

const SCHEDULED_SCAN_TIMEOUT_MS = 10 * 60 * 1000
const STALE_SCHEDULED_SCAN_AFTER_MS = 15 * 60 * 1000

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>

type ClaimedTrigger = {
  trigger_id: string
  workflow_id: string
  workflow_name: string
  workflow_description: string
  trigger_config: {
    description?: unknown
    handles?: unknown
  } | null
  frequency_amount: number
  frequency_unit: string
  last_run_at: string | null
  claimed_at: string
  scheduled_next_run_at: string
}

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  return (
    Boolean(cronSecret) &&
    request.headers.get("authorization") === `Bearer ${cronSecret}`
  )
}

function getClaimedTrigger(data: unknown): ClaimedTrigger | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null
  }

  return data[0] as ClaimedTrigger
}

function getIsoBefore(durationMs: number) {
  return new Date(Date.now() - durationMs).toISOString()
}

async function failStaleScheduledScanRuns(supabase: ServiceRoleClient) {
  const { count, error } = await supabase
    .from("scan_runs")
    .update(
      {
        status: "failed",
        error_message:
          "Scheduled scan exceeded the execution window and was marked failed.",
        completed_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("source", "scheduled")
    .eq("status", "running")
    .lt("started_at", getIsoBefore(STALE_SCHEDULED_SCAN_AFTER_MS))

  if (error) {
    console.error("Failed to reap stale scheduled scan runs:", error)
    return 0
  }

  return count ?? 0
}

async function getActiveScheduledScanRun(
  supabase: ServiceRoleClient,
  triggerId: string,
) {
  const { data, error } = await supabase
    .from("scan_runs")
    .select("id, started_at")
    .eq("trigger_id", triggerId)
    .eq("source", "scheduled")
    .eq("status", "running")
    .gte("started_at", getIsoBefore(STALE_SCHEDULED_SCAN_AFTER_MS))
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

function getScanInput(claimed: ClaimedTrigger) {
  const description =
    typeof claimed.trigger_config?.description === "string" &&
    claimed.trigger_config.description.trim()
      ? claimed.trigger_config.description.trim()
      : claimed.workflow_description

  return {
    description,
    handles: normalizeScanHandles(claimed.trigger_config?.handles),
    minimumPublishedAt: claimed.last_run_at,
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const reapedStaleRunCount = await failStaleScheduledScanRuns(supabase)
  const { data, error } = await supabase.rpc("claim_due_workflow_trigger")

  if (error) {
    console.error("Failed to claim workflow trigger:", error)
    return NextResponse.json(
      { claimed: false, completed: false, failed: true },
      { status: 500 },
    )
  }

  const claimed = getClaimedTrigger(data)
  if (!claimed) {
    return NextResponse.json({
      claimed: false,
      completed: false,
      failed: false,
      newItemCount: 0,
      reapedStaleRunCount,
    })
  }

  try {
    const activeScanRun = await getActiveScheduledScanRun(
      supabase,
      claimed.trigger_id,
    )

    if (activeScanRun) {
      return NextResponse.json({
        claimed: true,
        completed: false,
        failed: false,
        skipped: true,
        reason: "A scheduled scan is already running for this trigger.",
        triggerId: claimed.trigger_id,
        activeScanRunId: activeScanRun.id,
        activeScanRunStartedAt: activeScanRun.started_at,
        nextRunAt: claimed.scheduled_next_run_at,
        reapedStaleRunCount,
      })
    }
  } catch (activeRunError) {
    console.error("Failed to check active scheduled scan run:", activeRunError)
    return NextResponse.json(
      {
        claimed: true,
        completed: false,
        failed: true,
        triggerId: claimed.trigger_id,
        reapedStaleRunCount,
      },
      { status: 500 },
    )
  }

  const { data: scanRun, error: scanRunError } = await supabase
    .from("scan_runs")
    .insert({
      trigger_id: claimed.trigger_id,
      status: "running",
      source: "scheduled",
    })
    .select("id")
    .single()

  if (scanRunError || !scanRun) {
    console.error("Failed to create scheduled scan run:", scanRunError)
    return NextResponse.json(
      {
        claimed: true,
        completed: false,
        failed: true,
        triggerId: claimed.trigger_id,
      },
      { status: 500 },
    )
  }

  try {
    const knowledgeBank = await runWorkflowScan({
      ...getScanInput(claimed),
      timeoutMs: SCHEDULED_SCAN_TIMEOUT_MS,
    })
    const result = await persistScanRunResults({
      supabase,
      workflowId: claimed.workflow_id,
      triggerId: claimed.trigger_id,
      scanRunId: String(scanRun.id),
      knowledgeBank,
      source: "scheduled",
      updateNextRunAt: false,
      minimumPublishedAt: claimed.last_run_at,
    })

    return NextResponse.json({
      claimed: true,
      completed: true,
      failed: false,
      triggerId: claimed.trigger_id,
      scanRunId: scanRun.id,
      itemCount: result.itemCount,
      newItemCount: result.newItemCount,
      nextRunAt: claimed.scheduled_next_run_at,
    })
  } catch (err) {
    const message =
      err instanceof WorkflowScanError || err instanceof Error
        ? err.message
        : "Scheduled scan failed."

    console.error("Scheduled workflow scan failed:", message)
    await failScanRun(supabase, String(scanRun.id), message)

    return NextResponse.json({
      claimed: true,
      completed: false,
      failed: true,
      triggerId: claimed.trigger_id,
      scanRunId: scanRun.id,
      error: message,
      nextRunAt: claimed.scheduled_next_run_at,
    })
  }
}
