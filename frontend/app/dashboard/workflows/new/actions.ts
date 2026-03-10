"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

interface CreateWorkflowInput {
  name: string
  description: string
  frequency: string
  handles: string[]
}

const VALID_FREQUENCIES = ["15m", "30m", "1h", "2h"]

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
  if (!VALID_FREQUENCIES.includes(input.frequency)) {
    return { error: "Invalid frequency." }
  }
  if (input.handles.length > 10) {
    return { error: "Maximum 10 handles allowed." }
  }

  const name = input.name.trim() || generateWorkflowName(description)

  // 1 — Create the workflow
  const { data: workflow, error: wfError } = await supabase
    .from("workflows")
    .insert({
      user_id: user.id,
      name,
      description,
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
      frequency: input.frequency,
      status: "active",
    })
    .select("id")
    .single()

  if (trgError || !trigger) {
    // Clean up the orphaned workflow
    await supabase.from("workflows").delete().eq("id", workflow.id)
    return { error: "Failed to create trigger. Please try again." }
  }

  return { workflowId: workflow.id, triggerId: trigger.id }
}
