"use client"

// Imports
import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  updateUsername,
  type UpdateUsernameState,
} from "@/app/dashboard/settings/actions"

/**
 * Profile settings section (id="profile"): a large click-to-upload avatar plus a
 * side-by-side Name / Email / Phone field row. Only Name is real — it is wired to
 * the updateUsername Server Action and saves on change (debounced) and on blur,
 * then refreshes the router so the sidebar username updates. Email and Phone are
 * display/edit-only UI that persist nothing this sprint.
 *
 * Client island because it drives a Server Action via useActionState and the
 * save-on-change debounce + router.refresh() both need client hooks.
 * @param props.initialUsername - current username (the real, persisted field)
 * @param props.email - the signed-in user's email (prefilled display-only)
 * @returns the profile section
 */
export function ProfileSection({
  initialUsername,
  email,
}: {
  initialUsername: string
  email: string
}) {
  // Router to refresh server components (sidebar username) after a save.
  const router = useRouter()

  // Wire the username Server Action into a form action.
  const [state, dispatch] = useActionState<UpdateUsernameState, FormData>(
    updateUsername,
    {},
  )

  // The form drives the dispatch; we keep a ref so the debounce can requestSubmit.
  const formRef = useRef<HTMLFormElement>(null)

  // Track the field value so we only save when it actually changed, and so the
  // debounce/blur don't fire redundant saves.
  const [name, setName] = useState(initialUsername)
  const lastSavedRef = useRef(initialUsername)

  // Submit the form (running the Server Action) only when the value changed.
  function save() {
    const next = name.trim()
    if (next === lastSavedRef.current.trim()) return
    lastSavedRef.current = next
    formRef.current?.requestSubmit()
  }

  // Save-on-change: debounce ~600ms after the latest keystroke.
  useEffect(() => {
    if (name.trim() === lastSavedRef.current.trim()) return
    const t = setTimeout(() => {
      lastSavedRef.current = name.trim()
      formRef.current?.requestSubmit()
    }, 600)
    return () => clearTimeout(t)
  }, [name])

  // On a successful save, refresh so the sidebar/header re-read the new name.
  useEffect(() => {
    if (state.success) {
      router.refresh()
    }
  }, [state.success, router])

  return (
    <section id="profile" className="card-sec set-sec">
      <h2 className="sec-title">Profile</h2>

      <div className="set-profile">
        <label className="avatar-up" title="Change avatar">
          {/* UI-only avatar control: a file picker that goes nowhere (no upload
              or storage this sprint). The gradient fill is applied in
              workspace.css (.set-profile .avatar-up). */}
          <span className="ov" aria-hidden="true">
            <CameraIcon width={22} height={22} />
          </span>
          <input
            type="file"
            accept="image/*"
            className="set-avatar-input"
            aria-label="Upload avatar"
            onChange={(e) => {
              // No-op: clear the selection so the control stays decorative.
              e.currentTarget.value = ""
            }}
          />
        </label>

        <form ref={formRef} action={dispatch} className="set-grid">
          <div className="fld">
            <label htmlFor="username">Name</label>
            <input
              id="username"
              name="username"
              className="set-input"
              value={name}
              maxLength={60}
              autoComplete="name"
              placeholder="Your name"
              aria-invalid={state.error ? true : undefined}
              onChange={(e) => setName(e.target.value)}
              onBlur={save}
            />
            {state.error ? (
              <p className="set-note set-note-err">{state.error}</p>
            ) : state.success ? (
              <p className="set-note set-note-ok">Saved.</p>
            ) : null}
          </div>

          <div className="fld">
            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              className="set-input"
              defaultValue={email}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="fld">
            <label htmlFor="profile-phone">Phone</label>
            <input
              id="profile-phone"
              type="tel"
              className="set-input"
              autoComplete="tel"
              placeholder="Add a phone number"
            />
          </div>
        </form>
      </div>
    </section>
  )
}

// Small camera glyph for the avatar hover overlay.
function CameraIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
