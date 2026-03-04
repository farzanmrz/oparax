"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { HandleInput } from "@/components/handle-input"
import { ScanResult } from "@/components/scan-result"
import {
  FREQUENCY_OPTIONS,
  MAX_HANDLES,
  type WorkflowFormState,
} from "./constants"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon, Loading03Icon } from "@hugeicons/core-free-icons"

type ScanPhase = "idle" | "loading" | "success" | "error"

export default function NewWorkflowPage() {
  const [formState, setFormState] = useState<WorkflowFormState>({
    name: "",
    description: "",
    frequency: "30m",
    handles: [],
  })
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle")
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const canTest =
    formState.name.trim().length > 0 &&
    formState.description.trim().length > 0 &&
    formState.frequency.length > 0 &&
    formState.handles.length > 0

  // --- Handles ---

  function addHandle(handle: string) {
    setFormState((prev) => ({
      ...prev,
      handles: [...prev.handles, handle],
    }))
  }

  function removeHandle(index: number) {
    setFormState((prev) => ({
      ...prev,
      handles: prev.handles.filter((_, i) => i !== index),
    }))
  }

  // --- Test run (real Grok scan) ---

  async function runTestScan() {
    // Reset stale state
    setScanResult(null)
    setScanError(null)
    setScanPhase("loading")

    // Abort any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formState.description,
          handles: formState.handles,
        }),
        signal: controller.signal,
      })

      // Non-streaming error responses (validation, auth) return JSON
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data.error || "Something went wrong."
        setScanError(msg)
        setScanPhase("error")
        toast.error(msg)
        return
      }

      // Stream SSE response
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (line === "data: [DONE]") continue
          if (!line.startsWith("data: ")) continue

          const payload = JSON.parse(line.slice(6))
          if (payload.error) {
            setScanError(payload.error)
            setScanPhase("error")
            toast.error(payload.error)
            return
          }
          if (payload.text) {
            accumulated += payload.text
            setScanResult(accumulated)
          }
        }
      }

      setScanPhase("success")
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setScanError("Network error. Check your connection and try again.")
      setScanPhase("error")
      toast.error("Network error. Check your connection and try again.")
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Workflow</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a monitoring workflow to detect breaking news and draft tweets.
        </p>
      </div>

      {/* ── Workflow config + test ── */}
      <Card>
        <CardContent className="space-y-6 p-6">
          {/* Section header */}
          <div className="pb-1">
            <h2 className="text-base font-semibold">Workflow Details</h2>
          </div>

          {/* Row 1: Name + Frequency side by side */}
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Workflow name">
              <Input
                value={formState.name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. PL Transfer Watch"
              />
            </FormField>

            <FormField label="Scan frequency">
              <Select
                value={formState.frequency}
                onValueChange={(val) =>
                  setFormState((prev) => ({ ...prev, frequency: val }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Row 2: Description (full width) */}
          <FormField
            label="Describe your beat"
            hint="Be specific — the more detail you give, the better the AI knows what to look for."
          >
            <Textarea
              value={formState.description}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="e.g. Premier League transfer rumors, focusing on top 6 clubs. I break signings, loan deals, and contract extensions."
              rows={3}
            />
          </FormField>

          {/* Row 3: Handles (full width) */}
          <FormField
            label="X accounts to monitor"
            optional
            hint="Type a handle and press comma, space, or Enter to add."
          >
            <HandleInput
              handles={formState.handles}
              maxHandles={MAX_HANDLES}
              onAdd={addHandle}
              onRemove={removeHandle}
            />
          </FormField>

          {/* Test run */}
          <Separator />

          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Test Run</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Preview what your workflow will find. This runs a real scan
                against X.
              </p>
            </div>

            <div className="flex justify-center py-2">
              <Button
                onClick={runTestScan}
                disabled={!canTest || scanPhase === "loading"}
              >
                Run Test
              </Button>
            </div>

            {/* Progress indicator */}
            {scanPhase === "loading" && (
              <ProgressStep
                label="Scanning X accounts..."
                active={true}
                done={false}
              />
            )}
            {scanPhase === "success" && (
              <ProgressStep
                label="Scanning X accounts..."
                active={false}
                done={true}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Streaming output (raw text while loading) ── */}
      {scanPhase === "loading" && scanResult && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-base font-semibold">Scan Results</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {scanResult}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Final scan results (with tweet embeds) ── */}
      {scanPhase === "success" && scanResult && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-base font-semibold">Scan Results</h2>
            <ScanResult outputText={scanResult} />
          </CardContent>
        </Card>
      )}

      {/* ── Scan error ── */}
      {scanPhase === "error" && scanError && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">{scanError}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Reusable form field wrapper with clear visual hierarchy ──

function FormField({
  label,
  optional,
  hint,
  children,
}: {
  label: string
  optional?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">
        {label}
        {optional && (
          <span className="ml-1.5 font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p className="text-xs leading-normal text-muted-foreground/70">
          {hint}
        </p>
      )}
    </div>
  )
}

// ── Progress step indicator ──

function ProgressStep({
  label,
  active,
  done,
}: {
  label: string
  active: boolean
  done: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <div className="flex size-6 items-center justify-center rounded-full bg-success text-success-foreground">
          <HugeiconsIcon
            icon={Tick02Icon}
            strokeWidth={2.5}
            className="size-3.5"
          />
        </div>
      ) : active ? (
        <div className="flex size-6 items-center justify-center">
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2}
            className="size-5 animate-spin text-primary"
          />
        </div>
      ) : (
        <div className="size-6 rounded-full border-2 border-muted-foreground/20" />
      )}
      <span className="text-sm text-foreground">{label}</span>
    </div>
  )
}
