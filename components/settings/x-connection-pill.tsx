"use client"

// Imports
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { startXConnect } from "@/lib/x/link-identity"
import { XTile } from "@/components/dashboard/shell-icons"

/**
 * X connection pill (issue #25): the only real/interactive connection on the
 * Settings → Connections list. Renders as a `.pill` button so it stays keyboard
 * accessible. Two states:
 *   • Connected (xUsername present) — black X tile + `@handle` + green pulse;
 *     clicking ALWAYS opens the disconnect confirm modal (never an instant
 *     disconnect). The disconnect logic is duplicated here (the connect-x gate
 *     uses a different component, ConnectXButton) so the pill itself can trigger
 *     the modal: a `.overlay`/`.modal` confirm warns first — with saved agents it
 *     spells out the impact, with none it just confirms — and on confirm POSTs
 *     /api/x/disconnect then router.refresh().
 *   • Not connected — black X tile + "Connect" + red pulse; clicking calls
 *     startXConnect("/dashboard/settings") (the shared ?next= clamp flow).
 * @param props.xUsername - connected X handle, if any
 * @param props.agentCount - saved agents affected by disconnecting X
 * @returns the X connection pill (+ inline error / confirm modal)
 */
export function XConnectionPill({
  xUsername,
  agentCount,
}: {
  xUsername?: string
  agentCount: number
}) {
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

  // Start the shared X link flow (unlink stale identity → linkIdentity → callback).
  async function connect() {
    setPending(true)
    setError(null)
    try {
      await startXConnect("/dashboard/settings")
      // On success the browser redirects to X for consent.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start X connection.")
      setPending(false)
    }
  }

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
      // The pill stays mounted across the refresh (it renders both states), so
      // close the modal + clear pending ourselves; the refresh flips the pill to
      // its "Connect" state. Without this the confirm button hangs on loading.
      router.refresh()
      setOpen(false)
      setPending(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect.")
      setPending(false)
    }
  }

  // Pill click: connected → always open the disconnect confirm modal; not
  // connected → start the connect flow.
  function onTrigger() {
    if (pending) return
    if (xUsername) {
      setError(null)
      setOpen(true)
    } else {
      void connect()
    }
  }

  return (
    <>
      <button
        type="button"
        className="pill"
        onClick={onTrigger}
        disabled={pending}
        aria-label={xUsername ? `Disconnect @${xUsername}` : "Connect X"}
      >
        <span className="pill-logo" style={{ background: "#000000" }}>
          <XTile />
        </span>
        <span className="pill-body">
          {xUsername ? `@${xUsername}` : "Connect"}
          <span className={`pblink ${xUsername ? "on" : "off"}`} />
        </span>
      </button>

      {error && !open && (
        <p className="ferr show" style={{ flexBasis: "100%", margin: 0 }}>
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
              {agentCount > 0 ? (
                <>
                  This will disable posting for {agentCount} saved agent
                  {agentCount === 1 ? "" : "s"} and mark them inactive. You can
                  reconnect X later to reactivate them.
                </>
              ) : (
                <>
                  Are you sure you want to disconnect your X account? You can
                  reconnect anytime.
                </>
              )}
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
    </>
  )
}
