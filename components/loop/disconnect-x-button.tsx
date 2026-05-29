"use client"

// Imports
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

/**
 * Disconnect-X control: deletes the x_connections row via the disconnect route,
 * then refreshes so the Settings page falls back to the Connect X state.
 * @returns the Disconnect button + any error
 */
export function DisconnectXButton() {

  // Router to refresh the page after disconnect.
  const router = useRouter()

  // Request pending flag, error message from last attempt.
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Call /api/x/disconnect, then refresh the page.
   */
  async function disconnect() {

    setPending(true)
    setError(null)

    try {

      // Call the disconnect endpoint.
      const response = await fetch("/api/x/disconnect", { method: "POST" })

      if (!response.ok) {

        // Extract error message from response.
        const data = (await response.json().catch(() => null)) as {
          error?: string
        } | null

        throw new Error(data?.error || "Failed to disconnect.")
      }

      router.refresh()
    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to disconnect.")
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={disconnect}
        pending={pending}
        disabled={pending}
        className="self-start"
      >
        Disconnect
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
