"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  addFrequencyToDate,
  persistScanRunResults,
} from "@/lib/workflow-scans"
import type { KnowledgeBank } from "@/lib/workflow-drafting"
import {
  isFrequencyUnit,
  parseFrequencyAmount,
} from "./constants"

interface CreateWorkflowInput {
  name: string
  description: string
  frequencyAmount: number
  frequencyUnit: string
  handles: string[]
  draftingInstructions: string
  exampleTweets: string[]
  initialKnowledgeBank: KnowledgeBank | null
}

function generateWorkflowName(description: string): string {
  const words = description.trim().split(/\s+/)
  let name = ""
  for (const word of words) {
    if ((name + " " + word).trim().length > 40) break
    name = (name + " " + word).trim()
  }
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export async function createWorkflow(input: CreateWorkflowInput) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const description = input.description.trim()
  if (!description) {
    return { error: "Description is required." }
  }
  if (!isFrequencyUnit(input.frequencyUnit)) {
    return { error: "Invalid frequency." }
  }
  const frequencyAmount = parseFrequencyAmount(
    String(input.frequencyAmount),
    input.frequencyUnit,
  )
  if (frequencyAmount === null) {
    return { error: "Invalid frequency." }
  }
  if (input.handles.length > 10) {
    return { error: "Maximum 10 handles allowed." }
  }

  const name = input.name.trim() || generateWorkflowName(description)
  const draftingInstructions = input.draftingInstructions.trim()
  const exampleTweets = input.exampleTweets
    .map((example) => example.trim())
    .filter(Boolean)
  const firstNextRunAt = addFrequencyToDate(
    new Date(),
    frequencyAmount,
    input.frequencyUnit,
  )

  // 1 — Create the workflow
  const { data: workflow, error: wfError } = await supabase
    .from("workflows")
    .insert({
      user_id: user.id,
      name,
      description,
      drafting_instructions: draftingInstructions,
      example_tweets: exampleTweets,
      status: "active",
    })
    .select("id")
    .single()

  if (wfError || !workflow) {
    return { error: "Failed to create workflow. Please try again." }
  }

  // 2 — Create the x_search trigger linked to the workflow
  const { data: trigger, error: trgError } = await supabase
    .from("triggers")
    .insert({
      workflow_id: workflow.id,
      type: "x_search",
      config: {
        handles: input.handles,
        description,
      },
      frequency_amount: frequencyAmount,
      frequency_unit: input.frequencyUnit,
      next_run_at: firstNextRunAt?.toISOString(),
      status: "active",
    })
    .select("id")
    .single()

  if (trgError || !trigger) {
    // Clean up the orphaned workflow
    await supabase.from("workflows").delete().eq("id", workflow.id)
    return { error: "Failed to create trigger. Please try again." }
  }

  if (input.initialKnowledgeBank) {
    const { data: scanRun, error: scanRunError } = await supabase
      .from("scan_runs")
      .insert({
        trigger_id: trigger.id,
        status: "running",
        source: "create",
      })
      .select("id")
      .single()

    if (scanRunError || !scanRun) {
      await supabase.from("workflows").delete().eq("id", workflow.id)
      return { error: "Failed to save initial scan. Please try again." }
    }

    try {
      await persistScanRunResults({
        supabase,
        workflowId: workflow.id,
        triggerId: trigger.id,
        scanRunId: scanRun.id,
        knowledgeBank: input.initialKnowledgeBank,
        source: "create",
      })
    } catch (error) {
      console.error("Failed to persist initial scan:", error)
      await supabase.from("workflows").delete().eq("id", workflow.id)
      return { error: "Failed to save initial scan. Please try again." }
    }
  }

  return { workflowId: workflow.id, triggerId: trigger.id }
}
