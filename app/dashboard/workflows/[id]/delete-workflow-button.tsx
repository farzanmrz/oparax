"use client"

import { ConfirmedDeleteButton } from "@/components/confirmed-delete-button"
import { deleteWorkflow } from "./actions"

export function DeleteWorkflowButton({
  workflowId,
  workflowName,
}: {
  workflowId: string
  workflowName: string
}) {
  return (
    <ConfirmedDeleteButton
      action={() => deleteWorkflow(workflowId)}
      confirmDescription={`Delete "${workflowName}" and all of its triggers, scan runs, and scan items? This cannot be undone.`}
      label="Delete"
      redirectTo="/dashboard"
    />
  )
}
