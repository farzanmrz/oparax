"use client"

// Set-a-new-password card — the landing target of the email recovery link.
// Built on the design-system card/field classes; submits to the routed
// updatePassword Server Action, which redirects with error params on failure.
import Link from "next/link"
import { useId, useState } from "react"
import { useFormStatus } from "react-dom"

import { updatePassword } from "@/app/auth/reset-password/actions"
import { EyeIcon, EyeOffIcon } from "@/components/icons"

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      className={`btn btn-primary btn-block${pending ? " loading" : ""}`}
      type="submit"
      disabled={disabled}
    >
      <span className="ld" />
      Update password
    </button>
  )
}

function EyeToggle({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  return (
    <button
      className="eye"
      type="button"
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      onClick={onToggle}
    >
      {visible ? (
        <EyeOffIcon width={16} height={16} />
      ) : (
        <EyeIcon width={16} height={16} />
      )}
    </button>
  )
}

export function ResetPasswordForm({
  error,
  tokenHash,
  type,
}: {
  error?: string
  tokenHash?: string
  type?: "recovery"
}) {
  const id = useId()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [confirmError, setConfirmError] = useState(false)
  // The eye flips every password field in the form together, per the design.
  const [visible, setVisible] = useState(false)

  return (
    <div className="modal">
      <h2>Set a new password</h2>
      <p className="msub">
        Use at least 6 characters and keep it unique to this account.
      </p>
      <form
        noValidate
        action={updatePassword}
        onSubmit={(event) => {
          if (password !== confirm) {
            event.preventDefault()
            setConfirmError(true)
          }
        }}
      >
        {tokenHash && (
          <input type="hidden" name="token_hash" value={tokenHash} />
        )}
        {type && <input type="hidden" name="type" value={type} />}
        <div className="field">
          <label htmlFor={`${id}-pw`}>New password</label>
          <span className="pw-box">
            <input
              id={`${id}-pw`}
              name="password"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setConfirmError(false)
              }}
              required
            />
            <EyeToggle
              visible={visible}
              onToggle={() => setVisible((v) => !v)}
            />
          </span>
        </div>
        <div className="field">
          <label htmlFor={`${id}-pw2`}>Confirm new password</label>
          <span className="pw-box">
            <input
              id={`${id}-pw2`}
              className={confirmError ? "invalid" : undefined}
              name="confirm-password"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value)
                setConfirmError(false)
              }}
              onBlur={() => {
                if (confirm && password && password !== confirm)
                  setConfirmError(true)
              }}
              required
            />
            <EyeToggle
              visible={visible}
              onToggle={() => setVisible((v) => !v)}
            />
          </span>
          <div className={`ferr${confirmError ? " show" : ""}`}>
            Passwords don&apos;t match
          </div>
        </div>
        <div className={`form-err${error ? " show" : ""}`} role="alert">
          {error}
        </div>
        <SubmitButton disabled={!password.trim() || !confirm.trim()} />
      </form>
      <p className="mswitch">
        <Link href="/login">Back to log in</Link>
      </p>
    </div>
  )
}
