"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
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
  FREQUENCY_UNIT_OPTIONS,
  getFrequencyError,
  getFrequencyUnitOption,
  MAX_HANDLES,
  parseFrequencyAmount,
  type FrequencyUnit,
  type WorkflowFormState,
} from "./constants"
import { createWorkflow } from "./actions"

export default function NewWorkflowPage() {
  const router = useRouter()
  const [formState, setFormState] = useState<WorkflowFormState>({
    name: "",
    frequencyAmountInput: "10",
    frequencyUnit: "m",
    handles: [],
  })
  const [draftingState, setDraftingState] = useState<WorkflowDraftingState>(() =>
    createEmptyWorkflowDraftingState(""),
  )
  const [saving, setSaving] = useState(false)
  const [frequencyTouched, setFrequencyTouched] = useState(false)

  const validDrafts = draftingState.drafts.filter((draft) => !draft.isOverflow)
  const frequencyError = getFrequencyError(
    formState.frequencyAmountInput,
    formState.frequencyUnit,
  )
  const showFrequencyError = frequencyTouched && !!frequencyError
  const canSave =
    draftingState.monitoringDescription.trim().length > 0 &&
    draftingState.draftingProfile.instructions.trim().length > 0 &&
    validDrafts.length > 0 &&
    !frequencyError &&
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

  function updateFrequencyUnit(unit: FrequencyUnit) {
    const option = getFrequencyUnitOption(unit)
    if (!option) return

    setFormState((prev) => ({
      ...prev,
      frequencyAmountInput: String(option.defaultAmount),
      frequencyUnit: unit,
    }))
    setFrequencyTouched(false)
  }

  async function handleSave() {
    const frequencyAmount = parseFrequencyAmount(
      formState.frequencyAmountInput,
      formState.frequencyUnit,
    )

    if (frequencyAmount === null) {
      setFrequencyTouched(true)
      toast.error("Enter a valid scan frequency.")
      return
    }

    setSaving(true)

    try {
      const result = await createWorkflow({
        name: formState.name,
        description: draftingState.monitoringDescription,
        frequencyAmount,
        frequencyUnit: formState.frequencyUnit,
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
        <WorkflowDraftingStudio
          storageId={CREATE_WORKFLOW_DRAFTING_ID}
          handles={formState.handles}
          initialMonitoringDescription=""
          onStateChange={setDraftingState}
          variant="create"
          setupFields={
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="workflow-name">
                    Workflow name
                  </FieldLabel>
                  <Input
                    id="workflow-name"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="e.g. PL Transfer Watch"
                  />
                </Field>

                <Field
                  data-invalid={showFrequencyError ? true : undefined}
                  className="data-[invalid=true]:text-foreground"
                >
                  <FieldLabel htmlFor="scan-frequency-amount">
                    Scan frequency
                  </FieldLabel>
                  <div className="grid max-w-md grid-cols-[9.5rem_minmax(0,1fr)] gap-0">
                    <Select
                      value={formState.frequencyUnit}
                      onValueChange={(value) =>
                        updateFrequencyUnit(value as FrequencyUnit)
                      }
                    >
                      <SelectTrigger
                        className="w-full rounded-r-none border-r-0 text-foreground"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {FREQUENCY_UNIT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Input
                      id="scan-frequency-amount"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formState.frequencyAmountInput}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          frequencyAmountInput: event.target.value.replace(
                            /\D/g,
                            "",
                          ),
                        }))
                      }
                      onFocus={() => setFrequencyTouched(false)}
                      onBlur={() => setFrequencyTouched(true)}
                      aria-invalid={showFrequencyError}
                      aria-describedby={
                        showFrequencyError ? "scan-frequency-error" : undefined
                      }
                      className="rounded-l-none text-foreground"
                    />
                    {showFrequencyError && (
                      <FieldError
                        id="scan-frequency-error"
                        className="col-start-2 mt-1"
                      >
                        {frequencyError}
                      </FieldError>
                    )}
                  </div>
                </Field>
              </div>

              <Field>
                <FieldLabel>
                  X accounts to monitor
                </FieldLabel>
                <HandleInput
                  handles={formState.handles}
                  maxHandles={MAX_HANDLES}
                  onAdd={addHandle}
                  onRemove={removeHandle}
                />
              </Field>
            </>
          }
        />

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!canSave || saving}
            pending={saving}
          >
            {saving ? "Saving..." : "Save Workflow"}
          </Button>
        </div>
      </div>
    </div>
  )
}
