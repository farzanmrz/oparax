"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  failScanRun as persistFailedScanRun,
  normalizeScanHandles,
  persistScanRunResults,
  runWorkflowScan,
  WorkflowScanError,
} from "@/lib/workflow-scans"
import type { KnowledgeBank } from "@/lib/workflow-drafting"

export async function createScanRun(triggerId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("scan_runs")
    .insert({ trigger_id: triggerId, status: "running" })
    .select("id")
    .single()

  if (error || !data) {
    return { error: "Failed to create scan run." }
  }

  return { scanRunId: data.id }
}

export async function completeScanRun(
  scanRunId: string,
  triggerId: string,
  knowledgeBank: KnowledgeBank,
) {
  const supabase = await createClient()

  const { data: trigger, error: triggerError } = await supabase
    .from("triggers")
    .select("workflow_id")
    .eq("id", triggerId)
    .single()

  if (triggerError || !trigger) {
    return { error: "Failed to save scan results." }
  }

  try {
    const result = await persistScanRunResults({
      supabase,
      workflowId: trigger.workflow_id,
      triggerId,
      scanRunId,
      knowledgeBank,
      source: "manual",
    })

    revalidatePath(`/dashboard/workflows/${trigger.workflow_id}`)
    return { success: true, ...result }
  } catch (error) {
    console.error("Failed to save scan results:", error)
    await persistFailedScanRun(
      supabase,
      scanRunId,
      "Failed to save scan results.",
    )
    return { error: "Failed to save scan results." }
  }
}

export async function failScanRun(scanRunId: string) {
  const supabase = await createClient()

  await persistFailedScanRun(supabase, scanRunId, "Manual scan failed.")
}

function getTriggerConfigValue(
  config: unknown,
  key: "description" | "handles",
) {
  if (typeof config !== "object" || config === null || !(key in config)) {
    return undefined
  }

  return (config as Record<string, unknown>)[key]
}

export async function runManualWorkflowScan(triggerId: string) {
  const supabase = await createClient()

  const { data: trigger, error: triggerError } = await supabase
    .from("triggers")
    .select("id, workflow_id, config, last_run_at")
    .eq("id", triggerId)
    .single()

  if (triggerError || !trigger) {
    return { error: "Workflow trigger was not found." }
  }

  const description = getTriggerConfigValue(trigger.config, "description")
  if (typeof description !== "string" || !description.trim()) {
    return { error: "Workflow trigger is missing a scan description." }
  }

  const { data: scanRun, error: scanRunError } = await supabase
    .from("scan_runs")
    .insert({
      trigger_id: triggerId,
      status: "running",
      source: "manual",
    })
    .select("id")
    .single()

  if (scanRunError || !scanRun) {
    return { error: "Failed to start scan." }
  }

  try {
    const knowledgeBank = await runWorkflowScan({
      description,
      handles: normalizeScanHandles(getTriggerConfigValue(trigger.config, "handles")),
      minimumPublishedAt: trigger.last_run_at,
    })
    const result = await persistScanRunResults({
      supabase,
      workflowId: trigger.workflow_id,
      triggerId,
      scanRunId: scanRun.id,
      knowledgeBank,
      source: "manual",
      minimumPublishedAt: trigger.last_run_at,
    })

    revalidatePath(`/dashboard/workflows/${trigger.workflow_id}`)
    return { success: true, scanRunId: scanRun.id, ...result }
  } catch (error) {
    const message =
      error instanceof WorkflowScanError || error instanceof Error
        ? error.message
        : "Manual scan failed."

    await persistFailedScanRun(supabase, scanRun.id, message)
    revalidatePath(`/dashboard/workflows/${trigger.workflow_id}`)
    return { error: message }
  }
}
