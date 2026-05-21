"use client"

import { useState } from "react"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/password-input"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const labelClass = "text-[0.93rem] font-semibold !text-foreground/90"
const inputClass = "!text-foreground"

function SignupLiveFields() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  })

  const trimmedEmail = email.trim()
  const emailError =
    touched.email && trimmedEmail.length > 0 && !EMAIL_RE.test(trimmedEmail)
        ? "Enter a valid email address."
        : null
  const passwordError =
    touched.password && password.length > 0 && password.length < 6
      ? "Password must be at least 6 characters."
      : null
  const confirmPasswordError =
    touched.confirmPassword &&
    confirmPassword.length > 0 &&
    confirmPassword !== password
        ? "Passwords do not match."
        : null
  const showConfirmSuccess =
    touched.confirmPassword &&
    confirmPassword.length > 0 &&
    confirmPassword === password
  const passwordsMatch = confirmPassword === password

  return (
    <>
      <Field data-invalid={emailError ? true : undefined}>
        <FieldLabel htmlFor="email" className={labelClass}>
          Email
        </FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          className={inputClass}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "email-format-error" : undefined}
          required
        />
        {emailError && (
          <FieldError id="email-format-error" className="ml-2 text-xs leading-5">
            {emailError}
          </FieldError>
        )}
      </Field>
      <Field data-invalid={passwordError ? true : undefined}>
        <FieldLabel htmlFor="password" className={labelClass}>
          Password
        </FieldLabel>
        <PasswordInput
          id="password"
          name="password"
          value={password}
          className={inputClass}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={() =>
            setTouched((current) => ({ ...current, password: true }))
          }
          aria-invalid={!!passwordError}
          aria-describedby={
            passwordError ? "password-length-error" : undefined
          }
          required
        />
        {passwordError && (
          <FieldError
            id="password-length-error"
            className="ml-2 text-xs leading-5"
          >
            {passwordError}
          </FieldError>
        )}
      </Field>
      <Field data-invalid={confirmPasswordError ? true : undefined}>
        <FieldLabel htmlFor="confirm-password" className={labelClass}>
          Confirm Password
        </FieldLabel>
        <PasswordInput
          id="confirm-password"
          name="confirm-password"
          value={confirmPassword}
          className={inputClass}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onBlur={() =>
            setTouched((current) => ({ ...current, confirmPassword: true }))
          }
          aria-invalid={!!confirmPasswordError}
          aria-describedby={
            touched.confirmPassword
              ? "confirm-password-match-status"
              : undefined
          }
          required
        />
        {confirmPasswordError && (
          <FieldError
            id="confirm-password-match-status"
            className="ml-2 text-xs leading-5"
          >
            {confirmPasswordError}
          </FieldError>
        )}
        {showConfirmSuccess && (
          <FieldDescription
            id="confirm-password-match-status"
            aria-live="polite"
            className="ml-2 text-xs leading-5 text-emerald-600 dark:text-emerald-300"
          >
            {passwordsMatch ? "Passwords match." : null}
          </FieldDescription>
        )}
      </Field>
    </>
  )
}

export { SignupLiveFields }
