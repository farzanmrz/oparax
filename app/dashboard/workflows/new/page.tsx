"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HandleInput } from "@/components/handle-input"
import { WorkflowDraftingStudio } from "@/components/workflow-drafting-studio"
import {
  CREATE_WORKFLOW_DRAFTING_ID,
  createEmptyWorkflowDraftingState,
  getWorkflowDraftingScopeId,
  migrateWorkflowDraftingState,
  WorkflowDraftingState,
} from "@/lib/workflow-drafting"
import {
  FREQUENCY_OPTIONS,
  MAX_HANDLES,
  type WorkflowFormState,
} from "./constants"
import { createWorkflow } from "./actions"

export default function NewWorkflowPage() {
  const router = useRouter()
  const [formState, setFormState] = useState<WorkflowFormState>({
    name: "",
    frequency: "30m",
    handles: [],
  })
  const [draftingState, setDraftingState] = useState<WorkflowDraftingState>(() =>
    createEmptyWorkflowDraftingState(""),
  )
  const [saving, setSaving] = useState(false)

  const validDrafts = draftingState.drafts.filter((draft) => !draft.isOverflow)
  const canSave =
    draftingState.monitoringDescription.trim().length > 0 &&
    draftingState.draftingProfile.instructions.trim().length > 0 &&
    validDrafts.length > 0 &&
    !saving

  function addHandle(handle: string) {
    setFormState((prev) => ({
      ...prev,
      handles: [...prev.handles, handle],
    }))
  }

  function removeHandle(index: number) {
    setFormState((prev) => ({
      ...prev,
      handles: prev.handles.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function handleSave() {
    setSaving(true)

    try {
      const result = await createWorkflow({
        name: formState.name,
        description: draftingState.monitoringDescription,
        frequency: formState.frequency,
        handles: formState.handles,
      })

      if (result?.error) {
        toast.error(result.error)
        setSaving(false)
        return
      }

      if (!result?.workflowId || !result?.triggerId) {
        toast.error("Failed to create workflow. Please try again.")
        setSaving(false)
        return
      }

      migrateWorkflowDraftingState(
        localStorage,
        CREATE_WORKFLOW_DRAFTING_ID,
        getWorkflowDraftingScopeId(result.workflowId, result.triggerId),
      )
      router.push(`/dashboard/workflows/${result.workflowId}`)
      router.refresh()
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        throw error
      }

      toast.error("Failed to create workflow. Please try again.")
      setSaving(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <DashboardPageHeader
        title="Create Workflow"
        breadcrumbs={[
          { label: "Workflows", href: "/dashboard" },
          { label: "Create Workflow" },
        ]}
      />

      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-8 px-2 md:px-4">
        <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/20">
          <CardHeader>
            <CardTitle>Workflow Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Workflow name</label>
                <Input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="e.g. PL Transfer Watch"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold">Scan frequency</label>
                <Select
                  value={formState.frequency}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, frequency: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold">
                X accounts to monitor
              </label>
              <HandleInput
                handles={formState.handles}
                maxHandles={MAX_HANDLES}
                onAdd={addHandle}
                onRemove={removeHandle}
              />
            </div>
          </CardContent>
        </Card>

        <WorkflowDraftingStudio
          storageId={CREATE_WORKFLOW_DRAFTING_ID}
          handles={formState.handles}
          initialMonitoringDescription=""
          onStateChange={setDraftingState}
        />

        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Ready to save?</p>
          </div>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? "Saving..." : "Save Workflow"}
          </Button>
        </div>
      </div>
    </div>
  )
}
