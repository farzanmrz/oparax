"use client"

// Imports
import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  updateUsername,
  type UpdateUsernameState,
} from "@/app/dashboard/settings/actions"
import { SubmitButton } from "@/components/submit-button"
import { SignOutButton } from "@/components/sign-out-button"
import { ConnectX } from "@/components/loop/connect-x"
import { DisconnectXButton } from "@/components/loop/disconnect-x-button"
import { DeleteAccountButton } from "@/components/settings/delete-account-button"

/**
 * Profile settings section: edit the display name, manage the connected X
 * account, and sign out. Client island because it drives a Server Action via
 * useActionState and refreshes the router so the sidebar name updates on save.
 * @param props.initialUsername - current username (defaultValue)
 * @param props.xUsername - connected X handle, if any
 * @param props.xError - X connect/callback error to surface, if any
 * @returns the profile section UI
 */
export function ProfileSection({
  initialUsername,
  xUsername,
  xError,
  agentCount,
}: {
  initialUsername: string
  xUsername?: string
  xError?: string
  agentCount: number
}) {
  // Router to refresh server components (sidebar username) after a save.
  const router = useRouter()

  // Wire the username Server Action into a form action.
  const [state, dispatch] = useActionState<UpdateUsernameState, FormData>(
    updateUsername,
    {},
  )

  // On a successful save, refresh so the sidebar/header re-read the new name.
  useEffect(() => {
    if (state.success) {
      router.refresh()
    }
  }, [state.success, router])

  return (
    <div className="ws-settings">
      <div className="ws-panel">
        <div className="ws-panel-head">
          <div className="ws-panel-title">
            <span>Profile</span>
          </div>
          <p className="ws-panel-desc">
            Your username appears in the sidebar and on your drafts.
          </p>
        </div>
        <div className="ws-panel-body">
          <form action={dispatch} className="ws-settings-form">
            <div className="ffield-wrap">
              <label className="flabel" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                className={`ws-input${state.error ? " invalid" : ""}`}
                defaultValue={initialUsername}
                maxLength={60}
                aria-invalid={state.error ? true : undefined}
                placeholder="Your username"
              />
              {state.error && <div className="ferr show">{state.error}</div>}
              {state.success && (
                <p className="ws-saved-note" style={{ marginTop: 6 }}>
                  Saved.
                </p>
              )}
            </div>
            <SubmitButton>Save</SubmitButton>
          </form>
        </div>
      </div>

      <div className="ws-panel">
        <div className="ws-panel-head">
          <div className="ws-panel-title">
            <span>Connected accounts</span>
          </div>
          <p className="ws-panel-desc">
            Link your X (Twitter) account to post drafts.
          </p>
        </div>
        <div className="ws-panel-body">
          {xUsername ? (
            <div className="ws-account-actions">
              <p className="ws-connected-line">
                Connected as <b>@{xUsername}</b>
              </p>
              <DisconnectXButton agentCount={agentCount} />
            </div>
          ) : (
            <ConnectX />
          )}
          {xError && (
            <p className="ferr show" style={{ marginTop: 10 }}>
              {xError}
            </p>
          )}
        </div>
      </div>

      <div className="ws-panel">
        <div className="ws-panel-head">
          <div className="ws-panel-title">
            <span>Account</span>
          </div>
          <p className="ws-panel-desc">Your account details and session.</p>
        </div>
        <div className="ws-panel-body">
          <div className="ws-account-actions">
            <SignOutButton />
            <DeleteAccountButton />
          </div>
        </div>
      </div>
    </div>
  )
}
