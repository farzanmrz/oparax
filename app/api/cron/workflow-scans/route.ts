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
export const maxDuration = 60

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
    })
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
    const knowledgeBank = await runWorkflowScan(getScanInput(claimed))
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
