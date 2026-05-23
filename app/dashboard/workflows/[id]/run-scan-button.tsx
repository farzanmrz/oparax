"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { NewsIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { runManualWorkflowScan } from "./actions"

export function RunScanButton({ triggerId }: { triggerId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function runScan() {
    startTransition(async () => {
      const result = await runManualWorkflowScan(triggerId)

      if (!result || ("error" in result && result.error)) {
        toast.error(result?.error ?? "Scan failed.")
        return
      }

      const newItemCount = "newItemCount" in result ? result.newItemCount : 0
      toast.success(
        `Scan complete: ${newItemCount} new item${
          newItemCount === 1 ? "" : "s"
        }`,
      )
      router.refresh()
    })
  }

  return (
    <Button type="button" onClick={runScan} disabled={isPending} pending={isPending}>
      <HugeiconsIcon icon={NewsIcon} strokeWidth={1.8} data-icon="inline-start" />
      {isPending ? "Scanning..." : "Run scan now"}
    </Button>
  )
}
