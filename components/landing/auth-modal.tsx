"use client"

import { useActionState, useEffect, useId, useRef, useState } from "react"
import { Eye, EyeOff, Loader2, Mail, UserRoundPlus, X } from "lucide-react"

import "@/app/auth-modal.css"
import {
  loginAction,
  resetPasswordAction,
  signupAction,
  type AuthFormState,
} from "@/lib/auth/modal-actions"

export type AuthView = "login" | "signup" | "forgot"

const EMPTY_STATE: AuthFormState = {}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VIEW_LABEL: Record<AuthView, string> = {
  login: "Log in",
  signup: "Sign up",
  forgot: "Reset password",
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-7.8Z" />
      <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.8L6 14.3Z" />
      <path fill="#EA4335" d="M12 5.5c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.3L6 10.1c.9-2.6 3.2-4.6 6-4.6Z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#e9e9ea" aria-hidden="true">
      <path d="M18.9 2H22l-7.6 8.7L23.3 22h-6.8l-5.3-6.9L5.1 22H2l8.1-9.3L1.5 2h6.9l4.8 6.4L18.9 2Zm-1.2 18h1.9L7.3 4H5.3l12.4 16Z" />
    </svg>
  )
}

function SocialRow() {
  return (
    <>
      <div className="lp-auth-or">or continue with</div>
      <div className="lp-auth-social">
        <button className="lp-soc-btn" type="button" aria-label="Continue with Google">
          <GoogleIcon />
        </button>
        <button className="lp-soc-btn" type="button" aria-label="Continue with X">
          <XIcon />
        </button>
      </div>
    </>
  )
}

function Alert({ state }: { state: AuthFormState }) {
  if (state.error) {
    return (
      <div className="lp-auth-alert err" role="alert">
        {state.error}
      </div>
    )
  }
  if (state.message) {
    return (
      <div className="lp-auth-alert ok" role="status">
        {state.message}
      </div>
    )
  }
  return null
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  value,
  onChange,
  onBlur,
  invalid,
  message,
}: {
  id: string
  name: string
  label: string
  autoComplete: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  invalid?: boolean
  message?: { text: string; ok?: boolean } | null
}) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <div className="lp-field" data-invalid={invalid ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      <div className="lp-inwrap">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          onBlur={onBlur}
          aria-invalid={invalid || undefined}
          required
        />
        <button
          className="lp-eye"
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <Icon width={20} height={20} aria-hidden="true" />
        </button>
      </div>
      {message ? (
        <p className={`lp-field-msg ${message.ok ? "ok" : "err"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  )
}

function SubmitButton({
  pending,
  icon,
  children,
}: {
  pending: boolean
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button className="lp-auth-submit" type="submit" disabled={pending}>
      {pending ? <Loader2 className="lp-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}

function useAutoFocus() {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => ref.current?.focus(), 60)
    return () => window.clearTimeout(timer)
  }, [])
  return ref
}

function LoginView({
  onChangeView,
  initialState,
}: {
  onChangeView: (view: AuthView) => void
  initialState?: AuthFormState
}) {
  const id = useId()
  const [state, dispatch, pending] = useActionState(
    loginAction,
    initialState ?? EMPTY_STATE
  )
  const firstRef = useAutoFocus()

  return (
    <div>
      <div className="lp-auth-head">
        <div className="lp-auth-eyebrow">
          <span className="eyebrow">Welcome back</span>
        </div>
        <h2 className="lp-auth-title">Login</h2>
        <p className="lp-auth-sub">Sign in to run your desk.</p>
      </div>
      <form className="lp-auth-form" action={dispatch}>
        <Alert state={state} />
        <div className="lp-field">
          <label htmlFor={`${id}-email`}>Email</label>
          <div className="lp-inwrap">
            <input
              ref={firstRef}
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
        </div>
        <PasswordField
          id={`${id}-pw`}
          name="password"
          label="Password"
          autoComplete="current-password"
        />
        <div className="lp-auth-row">
          <button
            className="lp-auth-link"
            type="button"
            onClick={() => onChangeView("forgot")}
          >
            Forgot password?
          </button>
        </div>
        <SubmitButton
          pending={pending}
          icon={<Mail width={18} height={18} aria-hidden="true" />}
        >
          Login
        </SubmitButton>
      </form>
      <SocialRow />
      <p className="lp-auth-switch">
        Don&apos;t have an account?{" "}
        <button
          className="lp-auth-link"
          type="button"
          onClick={() => onChangeView("signup")}
        >
          Sign up
        </button>
      </p>
    </div>
  )
}

function SignupView({
  onChangeView,
  initialState,
}: {
  onChangeView: (view: AuthView) => void
  initialState?: AuthFormState
}) {
  const id = useId()
  const [state, dispatch, pending] = useActionState(
    signupAction,
    initialState ?? EMPTY_STATE
  )
  const firstRef = useAutoFocus()

  const [fields, setFields] = useState({ email: "", password: "", confirm: "" })
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirm: false,
  })

  const trimmedEmail = fields.email.trim()
  const emailError =
    touched.email && trimmedEmail.length > 0 && !EMAIL_RE.test(trimmedEmail)
      ? "Enter a valid email address."
      : null
  const passwordError =
    touched.password && fields.password.length > 0 && fields.password.length < 6
      ? "Password must be at least 6 characters."
      : null
  const confirmError =
    touched.confirm &&
    fields.confirm.length > 0 &&
    fields.confirm !== fields.password
      ? "Passwords do not match."
      : null
  const confirmOk =
    touched.confirm &&
    fields.confirm.length > 0 &&
    fields.confirm === fields.password

  return (
    <div>
      <div className="lp-auth-head">
        <div className="lp-auth-eyebrow">
          <span className="eyebrow">Get started free</span>
        </div>
        <h2 className="lp-auth-title">Sign Up</h2>
        <p className="lp-auth-sub">Spin up your first agent in minutes.</p>
      </div>
      <form className="lp-auth-form" action={dispatch}>
        <Alert state={state} />
        <div className="lp-field" data-invalid={emailError ? "true" : undefined}>
          <label htmlFor={`${id}-email`}>Email</label>
          <div className="lp-inwrap">
            <input
              ref={firstRef}
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              value={fields.email}
              onChange={(e) =>
                setFields((f) => ({ ...f, email: e.target.value }))
              }
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              aria-invalid={!!emailError}
              required
            />
          </div>
          {emailError ? <p className="lp-field-msg err">{emailError}</p> : null}
        </div>
        <PasswordField
          id={`${id}-pw`}
          name="password"
          label="Password"
          autoComplete="new-password"
          value={fields.password}
          onChange={(value) => setFields((f) => ({ ...f, password: value }))}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          invalid={!!passwordError}
          message={passwordError ? { text: passwordError } : null}
        />
        <PasswordField
          id={`${id}-pw2`}
          name="confirm-password"
          label="Confirm Password"
          autoComplete="new-password"
          value={fields.confirm}
          onChange={(value) => setFields((f) => ({ ...f, confirm: value }))}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          invalid={!!confirmError}
          message={
            confirmError
              ? { text: confirmError }
              : confirmOk
                ? { text: "Passwords match.", ok: true }
                : null
          }
        />
        <SubmitButton
          pending={pending}
          icon={<UserRoundPlus width={18} height={18} aria-hidden="true" />}
        >
          Sign Up
        </SubmitButton>
      </form>
      <SocialRow />
      <p className="lp-auth-switch">
        Already have an account?{" "}
        <button
          className="lp-auth-link"
          type="button"
          onClick={() => onChangeView("login")}
        >
          Login
        </button>
      </p>
    </div>
  )
}

function ForgotView({
  onChangeView,
  initialState,
}: {
  onChangeView: (view: AuthView) => void
  initialState?: AuthFormState
}) {
  const id = useId()
  const [state, dispatch, pending] = useActionState(
    resetPasswordAction,
    initialState ?? EMPTY_STATE
  )
  const firstRef = useAutoFocus()

  return (
    <div>
      <div className="lp-auth-head">
        <div className="lp-auth-eyebrow">
          <span className="eyebrow">Account recovery</span>
        </div>
        <h2 className="lp-auth-title">Reset your password</h2>
        <p className="lp-auth-sub">We&apos;ll email you a secure reset link.</p>
      </div>
      <form className="lp-auth-form" action={dispatch}>
        <Alert state={state} />
        <div className="lp-field">
          <label htmlFor={`${id}-email`}>Email</label>
          <div className="lp-inwrap">
            <input
              ref={firstRef}
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
        </div>
        <SubmitButton
          pending={pending}
          icon={<Mail width={18} height={18} aria-hidden="true" />}
        >
          Send reset link
        </SubmitButton>
      </form>
      <p className="lp-auth-switch">
        <button
          className="lp-auth-link"
          type="button"
          onClick={() => onChangeView("login")}
        >
          Return to Login
        </button>
      </p>
    </div>
  )
}

export function AuthModal({
  view,
  initialError,
  initialMessage,
  onClose,
  onChangeView,
}: {
  view: AuthView | null
  initialError?: string
  initialMessage?: string
  onClose: () => void
  onChangeView: (view: AuthView) => void
}) {
  const open = view !== null

  // A seeded alert (e.g. "Password updated successfully" after a reset) is bound
  // to the view that was auto-opened on mount, so it only shows on that view and
  // not after the user navigates to a different one.
  const [seed] = useState(() =>
    initialError || initialMessage
      ? {
          view,
          state: { error: initialError, message: initialMessage } as AuthFormState,
        }
      : null
  )
  const seedFor = (target: AuthView) =>
    seed && seed.view === target ? seed.state : undefined

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  // Escape to close.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  return (
    <div
      className={`lp-auth-overlay${open ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={view ? VIEW_LABEL[view] : "Account"}
      aria-hidden={open ? undefined : true}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open ? (
        <div className="lp-auth-card">
          <button
            className="lp-auth-close"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            <X width={18} height={18} aria-hidden="true" />
          </button>

          {view === "login" ? (
            <LoginView onChangeView={onChangeView} initialState={seedFor("login")} />
          ) : null}
          {view === "signup" ? (
            <SignupView onChangeView={onChangeView} initialState={seedFor("signup")} />
          ) : null}
          {view === "forgot" ? (
            <ForgotView onChangeView={onChangeView} initialState={seedFor("forgot")} />
          ) : null}

          <p className="lp-auth-terms">
            By clicking continue, you agree to our{" "}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      ) : null}
    </div>
  )
}
