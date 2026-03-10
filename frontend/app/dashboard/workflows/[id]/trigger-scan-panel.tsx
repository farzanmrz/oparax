"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScanResult } from "@/components/scan-result"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon, Loading03Icon } from "@hugeicons/core-free-icons"
import { createScanRun, completeScanRun, failScanRun } from "./actions"

type ScanPhase = "idle" | "loading" | "success" | "error"

interface TriggerScanPanelProps {
  triggerId: string
  description: string
  handles: string[]
}

export function TriggerScanPanel({
  triggerId,
  description,
  handles,
}: TriggerScanPanelProps) {
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle")
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const router = useRouter()

  async function runScan() {
    setScanResult(null)
    setScanError(null)
    setScanPhase("loading")

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // 1 — Create a scan_run record
    const { scanRunId, error: createError } = await createScanRun(triggerId)
    if (createError || !scanRunId) {
      setScanError(createError ?? "Failed to start scan.")
      setScanPhase("error")
      toast.error(createError ?? "Failed to start scan.")
      return
    }

    try {
      // 2 — Call the existing scan API with trigger's config
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, handles }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data.error || "Something went wrong."
        setScanError(msg)
        setScanPhase("error")
        toast.error(msg)
        await failScanRun(scanRunId)
        return
      }

      // 3 — Stream SSE response
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (line === "data: [DONE]") continue
          if (!line.startsWith("data: ")) continue

          const payload = JSON.parse(line.slice(6))
          if (payload.error) {
            setScanError(payload.error)
            setScanPhase("error")
            toast.error(payload.error)
            await failScanRun(scanRunId)
            return
          }
          if (payload.text) {
            accumulated += payload.text
            setScanResult(accumulated)
          }
        }
      }

      // 4 — Save results to scan_runs
      setScanPhase("success")
      await completeScanRun(scanRunId, triggerId, accumulated, 0)

      // Refresh the server component data (updates last_run_at etc.)
      router.refresh()
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setScanError("Network error. Check your connection and try again.")
      setScanPhase("error")
      toast.error("Network error.")
      await failScanRun(scanRunId)
    }
  }

  return (
    <div className="space-y-4">
      <Separator />

      {/* Scan button + status */}
      <div className="flex flex-col items-center gap-2 py-2">
        <Button onClick={runScan} disabled={scanPhase === "loading"}>
          {scanPhase === "loading" ? "Scanning…" : "Run Scan"}
        </Button>

        {scanPhase === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HugeiconsIcon
              icon={Loading03Icon}
              strokeWidth={2}
              className="size-4 animate-spin text-primary"
            />
            Scanning X accounts…
          </div>
        )}

        {scanPhase === "success" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex size-5 items-center justify-center rounded-full bg-success text-success-foreground">
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="size-3" />
            </div>
            Scan complete
          </div>
        )}
      </div>

      {/* Streaming output (raw text while loading) */}
      {scanPhase === "loading" && scanResult && (
        <div className="rounded-lg border p-4">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {scanResult}
          </p>
        </div>
      )}

      {/* Final rendered results */}
      {scanPhase === "success" && scanResult && (
        <div className="rounded-lg border p-4">
          <ScanResult outputText={scanResult} />
        </div>
      )}

      {/* Error */}
      {scanPhase === "error" && scanError && (
        <div className="rounded-lg border border-destructive/50 p-4">
          <p className="text-sm text-destructive">{scanError}</p>
        </div>
      )}
    </div>
  )
}
