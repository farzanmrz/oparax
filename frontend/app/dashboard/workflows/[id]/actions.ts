"use server"

import { createClient } from "@/lib/supabase/server"

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
  rawOutput: string,
  itemCount: number,
) {
  const supabase = await createClient()

  // Update the scan run with results
  const { error: runError } = await supabase
    .from("scan_runs")
    .update({
      status: "completed",
      raw_output: rawOutput,
      item_count: itemCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", scanRunId)

  if (runError) {
    return { error: "Failed to save scan results." }
  }

  // Update the trigger's last_run_at
  await supabase
    .from("triggers")
    .update({ last_run_at: new Date().toISOString() })
    .eq("id", triggerId)

  return { success: true }
}

export async function failScanRun(scanRunId: string) {
  const supabase = await createClient()

  await supabase
    .from("scan_runs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", scanRunId)
}
