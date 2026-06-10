"use client"

// Delete-account control: a danger button that opens a design-system confirm
// modal. On confirm it calls the deleteAccount Server Action, which removes
// the auth user (cascading to agents/runs/X connection), clears the session,
// and redirects to the landing page.
import { useEffect, useState, useTransition } from "react"

import { deleteAccount } from "@/app/dashboard/settings/actions"

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Escape closes the confirm modal (unless deletion is in flight).
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, isPending])

  const confirm = () => {
    setError(null)
    startTransition(async () => {
      // On success the action redirects to "/", unmounting this modal.
      const result = await deleteAccount()
      if (result?.error) setError(result.error)
    })
  }

  return (
    <>
      <button
        className="btn btn-danger"
        type="button"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
      >
        Delete account
      </button>

      <div
        className={`overlay${open ? " open" : ""}`}
        role="alertdialog"
        aria-modal="true"
        aria-label="Delete account"
        aria-hidden={open ? undefined : true}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) {
            setOpen(false)
          }
        }}
      >
        {open ? (
          <div className="modal">
            <h2>Delete account?</h2>
            <p className="msub">
              This permanently deletes your account, agents, runs, and X
              connection. This cannot be undone.
            </p>
            <div className={`form-err${error ? " show" : ""}`} role="alert">
              {error}
            </div>
            <button
              className={`btn btn-danger btn-block${isPending ? " loading" : ""}`}
              type="button"
              onClick={confirm}
            >
              <span className="ld" />
              Yes, delete my account
            </button>
            <p className="mswitch">
              <button
                type="button"
                disabled={isPending}
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
