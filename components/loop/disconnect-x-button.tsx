"use client"

// Imports
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

/**
 * Disconnect-X control: deletes the x_connections row via the disconnect route,
 * then refreshes so the Settings page falls back to the Connect X state. When the
 * user has saved agents, a design-system confirm modal warns they'll be marked
 * inactive first.
 * @param props.agentCount - saved agents affected by disconnecting X
 * @returns the Disconnect button + any error
 */
export function DisconnectXButton({ agentCount }: { agentCount: number }) {
  // Router to refresh the page after disconnect.
  const router = useRouter()

  // Request pending flag, error message, confirm-modal state.
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  // Escape closes the confirm modal (unless disconnect is in flight).
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, pending])

  // Call /api/x/disconnect, then refresh the page.
  async function disconnect() {
    setPending(true)
    setError(null)

    try {
      const response = await fetch("/api/x/disconnect", { method: "POST" })
      if (!response.ok) {
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

  // With saved agents, confirm first; otherwise disconnect directly.
  function onTrigger() {
    if (agentCount > 0) {
      setError(null)
      setOpen(true)
    } else {
      void disconnect()
    }
  }

  return (
    <div className="ws-account-actions">
      <button
        type="button"
        className={`btn btn-secondary btn-sm${pending && !open ? " loading" : ""}`}
        onClick={onTrigger}
        disabled={pending}
      >
        <span className="ld" />
        Disconnect
      </button>
      {error && !open && (
        <p className="ferr show" style={{ margin: 0 }}>
          {error}
        </p>
      )}

      <div
        className={`overlay${open ? " open" : ""}`}
        role="alertdialog"
        aria-modal="true"
        aria-label="Disconnect X"
        aria-hidden={open ? undefined : true}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) setOpen(false)
        }}
      >
        {open ? (
          <div className="modal">
            <h2>Disconnect X?</h2>
            <p className="msub">
              This will disable posting for {agentCount} saved agent
              {agentCount === 1 ? "" : "s"} and mark them inactive. You can
              reconnect X later to reactivate them.
            </p>
            <div className={`form-err${error ? " show" : ""}`} role="alert">
              {error}
            </div>
            <button
              type="button"
              className={`btn btn-danger btn-block${pending ? " loading" : ""}`}
              onClick={disconnect}
            >
              <span className="ld" />
              Disconnect
            </button>
            <p className="mswitch">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
