"use client"

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  NewsIcon,
  SentIcon,
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Field,
  FieldLabel,
} from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { DraftProfileEditor } from "@/components/draft-profile-editor"
import { KnowledgeBankPanel } from "@/components/knowledge-bank-panel"
import { DraftPreviewPanel } from "@/components/draft-preview-panel"
import {
  completeScanRun,
  createScanRun,
  failScanRun,
} from "@/app/dashboard/workflows/[id]/actions"
import {
  clearWorkflowDraftingState,
  CREATE_WORKFLOW_DRAFTING_ID,
  createEmptyWorkflowDraftingState,
  DraftingProfile,
  DraftedTweet,
  getExampleTweetError,
  KnowledgeBank,
  loadWorkflowDraftingState,
  normalizeExampleTweets,
  parseKnowledgeBank,
  saveWorkflowDraftingState,
  WorkflowDraftingState,
} from "@/lib/workflow-drafting"

const workflowActionButtonClass =
  "h-10 bg-teal-600 px-4 text-white shadow-sm shadow-teal-950/20 hover:-translate-y-px hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-950/25 active:translate-y-0 active:scale-[0.99] active:bg-teal-700 active:shadow-inner dark:bg-teal-300 dark:text-zinc-950 dark:hover:bg-teal-200 dark:active:bg-teal-400"

interface WorkflowDraftingStudioProps {
  storageId: string
  handles: string[]
  initialMonitoringDescription: string
  initialDraftingProfile?: DraftingProfile
  triggerId?: string
  onStateChange?: (state: WorkflowDraftingState) => void
  setupFields?: ReactNode
  variant?: "standard" | "create"
}

function buildInitialState(
  monitoringDescription: string,
  draftingProfile?: DraftingProfile,
): WorkflowDraftingState {
  const state = createEmptyWorkflowDraftingState(monitoringDescription)

  if (!draftingProfile) {
    return state
  }

  return {
    ...state,
    draftingProfile: {
      instructions: draftingProfile.instructions,
      examples: normalizeExampleTweets(draftingProfile.examples),
    },
  }
}

export function WorkflowDraftingStudio({
  storageId,
  handles,
  initialMonitoringDescription,
  initialDraftingProfile,
  triggerId,
  onStateChange,
  setupFields,
  variant = "standard",
}: WorkflowDraftingStudioProps) {
  const router = useRouter()
  const [state, setState] = useState<WorkflowDraftingState>(() =>
    buildInitialState(initialMonitoringDescription, initialDraftingProfile),
  )
  const [exampleInputs, setExampleInputs] = useState<string[]>(
    initialDraftingProfile?.examples ?? [],
  )
  const [scanError, setScanError] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [isHydrating, startHydrationTransition] = useTransition()
  const [isScanning, startScanningTransition] = useTransition()
  const [isDrafting, startDraftingTransition] = useTransition()

  useEffect(() => {
    startHydrationTransition(() => {
      if (storageId === CREATE_WORKFLOW_DRAFTING_ID) {
        clearWorkflowDraftingState(localStorage, storageId)
        const initialState = buildInitialState(
          initialMonitoringDescription,
          initialDraftingProfile,
        )
        setState(initialState)
        setExampleInputs(initialState.draftingProfile.examples)
      } else {
        const saved = loadWorkflowDraftingState(localStorage, storageId)
        if (saved) {
          setState(saved)
          setExampleInputs(saved.draftingProfile.examples)
        } else {
          const initialState = buildInitialState(
            initialMonitoringDescription,
            initialDraftingProfile,
          )
          setState(initialState)
          setExampleInputs(initialState.draftingProfile.examples)
        }
      }
      setHasHydrated(true)
    })
  }, [storageId, initialDraftingProfile, initialMonitoringDescription])

  useEffect(() => {
    if (!hasHydrated) return

    const persistableState = {
      ...state,
      drafts: state.drafts.filter((draft) => !draft.isOverflow),
    }

    saveWorkflowDraftingState(localStorage, storageId, persistableState)
    onStateChange?.(state)
  }, [hasHydrated, onStateChange, state, storageId])

  const exampleErrors = useMemo(
    () => exampleInputs.map((example) => getExampleTweetError(example) ?? ""),
    [exampleInputs],
  )
  const hasExampleErrors = exampleErrors.some(Boolean)
  const selectedHeadlines =
    state.knowledgeBank?.headlines.filter((headline) =>
      state.selectedHeadlineIds.includes(headline.id),
    ) ?? []

  const hasMonitoringDescription =
    state.monitoringDescription.trim().length > 0
  const hasDraftingProfile =
    state.draftingProfile.instructions.trim().length > 0 && !hasExampleErrors
  const canRunScan =
    hasMonitoringDescription &&
    (variant === "create" || hasDraftingProfile)
  const canGenerateDrafts =
    hasMonitoringDescription &&
    hasDraftingProfile &&
    selectedHeadlines.length > 0 &&
    !isScanning

  function syncExamples(nextInputs: string[]) {
    setExampleInputs(nextInputs)
    setState((prev) => ({
      ...prev,
      draftingProfile: {
        ...prev.draftingProfile,
        examples: normalizeExampleTweets(nextInputs),
      },
      drafts: [],
    }))
  }

  function updateMonitoringDescription(value: string) {
    setState((prev) => ({
      ...prev,
      monitoringDescription: value,
      drafts: [],
    }))
  }

  function updateDraftingInstructions(value: string) {
    setState((prev) => ({
      ...prev,
      draftingProfile: {
        ...prev.draftingProfile,
        instructions: value,
      },
      drafts: [],
    }))
  }

  function toggleHeadline(headlineId: string) {
    setState((prev) => ({
      ...prev,
      selectedHeadlineIds: prev.selectedHeadlineIds.includes(headlineId)
        ? prev.selectedHeadlineIds.filter((id) => id !== headlineId)
        : [...prev.selectedHeadlineIds, headlineId],
      drafts: [],
    }))
  }

  function handleScanSuccess(knowledgeBank: KnowledgeBank) {
    setState((prev) => ({
      ...prev,
      knowledgeBank,
      selectedHeadlineIds:
        variant === "create"
          ? knowledgeBank.headlines.map((headline) => headline.id)
          : [],
      drafts: [],
    }))
    setScanError(null)
    setDraftError(null)
  }

  function runScan() {
    setScanError(null)
    setDraftError(null)

    startScanningTransition(async () => {
      let scanRunId: string | null = null

      if (triggerId) {
        const scanRun = await createScanRun(triggerId)
        if (scanRun.error || !scanRun.scanRunId) {
          const message = scanRun.error ?? "Failed to start scan."
          setScanError(message)
          toast.error(message)
          return
        }

        scanRunId = scanRun.scanRunId
      }

      try {
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: state.monitoringDescription,
            handles,
          }),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          const message =
            typeof payload.error === "string"
              ? payload.error
              : "Something went wrong."
          setScanError(message)
          toast.error(message)
          if (scanRunId) {
            await failScanRun(scanRunId)
          }
          return
        }

        const knowledgeBank = parseKnowledgeBank(payload)
        if (!knowledgeBank) {
          const message = "News scanning service returned an invalid result."
          setScanError(message)
          toast.error(message)
          if (scanRunId) {
            await failScanRun(scanRunId)
          }
          return
        }

        handleScanSuccess(knowledgeBank)

        if (scanRunId && triggerId) {
          const persistResult = await completeScanRun(
            scanRunId,
            triggerId,
            JSON.stringify(knowledgeBank),
            knowledgeBank.headlines.length,
          )

          if (persistResult?.error) {
            setScanError(persistResult.error)
            toast.error(persistResult.error)
          } else {
            router.refresh()
          }
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Network error. Check your connection and try again."
        setScanError(message)
        toast.error(message)
        if (scanRunId) {
          await failScanRun(scanRunId)
        }
      }
    })
  }

  function generateDrafts() {
    setDraftError(null)

    startDraftingTransition(async () => {
      try {
        const response = await fetch("/api/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monitoringDescription: state.monitoringDescription,
            draftingInstructions: state.draftingProfile.instructions,
            exampleTweets: normalizeExampleTweets(exampleInputs),
            headlines: selectedHeadlines,
          }),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          const message =
            typeof payload.error === "string"
              ? payload.error
              : "Something went wrong."
          setDraftError(message)
          toast.error(message)
          return
        }

        const drafts = Array.isArray(payload.drafts)
          ? (payload.drafts as DraftedTweet[])
          : null

        if (!drafts) {
          const message = "Drafting service returned an invalid result."
          setDraftError(message)
          toast.error(message)
          return
        }

        setState((prev) => ({
          ...prev,
          drafts,
        }))
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Network error. Check your connection and try again."
        setDraftError(message)
        toast.error(message)
      }
    })
  }

  if (variant === "create") {
    const knowledgeItemCount = state.knowledgeBank?.headlines.length ?? 0
    const selectedCount = state.selectedHeadlineIds.length

    return (
      <div className="space-y-8">
        <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/20 py-0">
          <CardContent className="space-y-6 p-5 sm:p-6">
            {setupFields}

            <Field>
              <FieldLabel htmlFor="monitoring-description">
                What to monitor
              </FieldLabel>
              <Textarea
                id="monitoring-description"
                value={state.monitoringDescription}
                onChange={(event) =>
                  updateMonitoringDescription(event.target.value)
                }
                placeholder="e.g. Premier League transfer movement, injury developments, and manager comments involving the top six clubs."
                rows={6}
              />
            </Field>

            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {state.knowledgeBank && (
                  <Badge variant="outline" className="rounded-full px-2.5 py-1">
                    {knowledgeItemCount} knowledge item
                    {knowledgeItemCount === 1 ? "" : "s"}
                  </Badge>
                )}
                {selectedCount > 0 && (
                  <Badge className="rounded-full px-2.5 py-1">
                    {selectedCount} selected
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                onClick={runScan}
                disabled={!canRunScan || isScanning || isHydrating}
                className={workflowActionButtonClass}
              >
                <HugeiconsIcon icon={NewsIcon} strokeWidth={1.8} className="size-4" />
                {isScanning || isHydrating ? "Scanning..." : "Run Scan"}
              </Button>
            </div>

            <KnowledgeBankPanel
              knowledgeBank={state.knowledgeBank}
              selectedHeadlineIds={state.selectedHeadlineIds}
              canRunScan={canRunScan}
              isScanning={isScanning || isHydrating}
              scanError={scanError}
              onRunScan={runScan}
              onToggleHeadline={toggleHeadline}
              variant="embedded"
            />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-gradient-to-br from-card via-card to-primary/5 py-0">
          <CardContent className="space-y-6 p-5 sm:p-6">
            <DraftProfileEditor
              monitoringDescription={state.monitoringDescription}
              draftingInstructions={state.draftingProfile.instructions}
              exampleInputs={exampleInputs}
              exampleErrors={exampleErrors}
              onMonitoringDescriptionChange={updateMonitoringDescription}
              onDraftingInstructionsChange={updateDraftingInstructions}
              onExampleChange={(index, value) => {
                const nextInputs = [...exampleInputs]
                nextInputs[index] = value
                syncExamples(nextInputs)
              }}
              onAddExample={() => syncExamples([...exampleInputs, ""])}
              onRemoveExample={(index) => {
                const nextInputs = exampleInputs.filter(
                  (_, itemIndex) => itemIndex !== index,
                )
                syncExamples(nextInputs)
              }}
              showMonitoringDescription={false}
              variant="embedded"
            />

            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Badge variant="outline" className="w-fit rounded-full px-2.5 py-1">
                {selectedCount} selected
              </Badge>
              <Button
                type="button"
                onClick={generateDrafts}
                disabled={!canGenerateDrafts || isDrafting}
                className={workflowActionButtonClass}
              >
                <HugeiconsIcon icon={SentIcon} strokeWidth={1.8} className="size-4" />
                {isDrafting ? "Drafting..." : "Generate Drafts"}
              </Button>
            </div>

            <DraftPreviewPanel
              drafts={state.drafts}
              sourceHeadlines={selectedHeadlines}
              canGenerateDrafts={canGenerateDrafts}
              isDrafting={isDrafting}
              draftError={draftError}
              selectedCount={selectedCount}
              onGenerateDrafts={generateDrafts}
              variant="embedded"
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DraftProfileEditor
        monitoringDescription={state.monitoringDescription}
        draftingInstructions={state.draftingProfile.instructions}
        exampleInputs={exampleInputs}
        exampleErrors={exampleErrors}
        onMonitoringDescriptionChange={updateMonitoringDescription}
        onDraftingInstructionsChange={updateDraftingInstructions}
        onExampleChange={(index, value) => {
          const nextInputs = [...exampleInputs]
          nextInputs[index] = value
          syncExamples(nextInputs)
        }}
        onAddExample={() => syncExamples([...exampleInputs, ""])}
        onRemoveExample={(index) => {
          const nextInputs = exampleInputs.filter((_, itemIndex) => itemIndex !== index)
          syncExamples(nextInputs)
        }}
      />

      <KnowledgeBankPanel
        knowledgeBank={state.knowledgeBank}
        selectedHeadlineIds={state.selectedHeadlineIds}
        canRunScan={canRunScan}
        isScanning={isScanning || isHydrating}
        scanError={scanError}
        onRunScan={runScan}
        onToggleHeadline={toggleHeadline}
      />

      <DraftPreviewPanel
        drafts={state.drafts}
        sourceHeadlines={selectedHeadlines}
        canGenerateDrafts={canGenerateDrafts}
        isDrafting={isDrafting}
        draftError={draftError}
        selectedCount={state.selectedHeadlineIds.length}
        onGenerateDrafts={generateDrafts}
      />
    </div>
  )
}
