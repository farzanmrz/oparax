"use client";

// Auth modals (log in / sign up / forgot password / set new password) —
// React port of the design reference modals, built on the design-system
// .overlay/.modal/.field classes from app/globals.css. Wired to the stateful
// Server Actions in lib/auth/modal-actions.ts: failures render inline,
// successes redirect or swap the form for a notice.
import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { EyeIcon, EyeOffIcon, GoogleIcon, XIcon } from "@/components/icons";
import {
  type AuthFormState,
  abandonRecoveryAction,
  loginAction,
  resetPasswordAction,
  signupAction,
  updatePasswordAction,
} from "@/lib/auth/modal-actions";

export type AuthView = "login" | "signup" | "forgot" | "reset";

const EMPTY_STATE: AuthFormState = {};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VIEW_LABEL: Record<AuthView, string> = {
  login: "Log in",
  signup: "Sign up",
  forgot: "Reset your password",
  reset: "Set a new password",
};

function useAutoFocus() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => ref.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, []);
  return ref;
}

// Re-shows the latest server error/message until the user edits the form.
function useServerFeedback(state: AuthFormState) {
  const [lastState, setLastState] = useState(state);
  const [hidden, setHidden] = useState(false);
  // A fresh submission result un-hides the feedback (state adjusted during
  // render, not in an effect, per React guidance).
  if (state !== lastState) {
    setLastState(state);
    setHidden(false);
  }
  return {
    error: !hidden && state.error ? state.error : null,
    message: !hidden && state.message ? state.message : null,
    hide: () => setHidden(true),
  };
}

function FormFeedback({ error, message }: { error: string | null; message: string | null }) {
  return (
    <>
      <div className={`form-err${error ? " show" : ""}`} role="alert">
        {error}
      </div>
      {message ? (
        <p className="form-ok" role="status">
          {message}
        </p>
      ) : null}
    </>
  );
}

function SubmitButton({
  pending,
  disabled,
  children,
}: {
  pending: boolean;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`btn btn-primary btn-block${pending ? " loading" : ""}`}
      type="submit"
      disabled={disabled}
    >
      <span className="ld" />
      {children}
    </button>
  );
}

function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      className="eye"
      type="button"
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      onClick={onToggle}
    >
      {visible ? <EyeOffIcon width={16} height={16} /> : <EyeIcon width={16} height={16} />}
    </button>
  );
}

function SocialRow() {
  return (
    <>
      <div className="sso-div">or continue with</div>
      <div className="sso-row">
        <span className="sso-btn" title="Coming soon">
          <GoogleIcon width={19} height={19} />
        </span>
        <span className="sso-btn" title="Coming soon">
          <XIcon width={17} height={17} fill="#E8EDF2" />
        </span>
      </div>
      <p className="sso-note">Google &amp; X sign-in coming soon</p>
    </>
  );
}

function Terms() {
  return (
    <p className="terms">
      By continuing, you agree to our <a href="#">Terms of Service</a> and{" "}
      <a href="#">Privacy Policy</a>.
    </p>
  );
}

function LoginView({
  onChangeView,
  initialState,
}: {
  onChangeView: (view: AuthView) => void;
  initialState?: AuthFormState;
}) {
  const id = useId();
  const [state, dispatch, pending] = useActionState(loginAction, initialState ?? EMPTY_STATE);
  const feedback = useServerFeedback(state);
  const firstRef = useAutoFocus();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);

  return (
    <>
      <h2>Log in</h2>
      <p className="msub">Sign in to run your desk.</p>
      <form
        noValidate
        action={dispatch}
        onSubmit={(event) => {
          if (!EMAIL_RE.test(email.trim())) {
            event.preventDefault();
            setEmailError(true);
          }
        }}
      >
        <div className="field">
          <label htmlFor={`${id}-email`}>Email</label>
          <input
            ref={firstRef}
            id={`${id}-email`}
            className={emailError ? "invalid" : undefined}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(false);
              feedback.hide();
            }}
            onBlur={() => {
              if (email && !EMAIL_RE.test(email.trim())) setEmailError(true);
            }}
            required
          />
          <div className={`ferr${emailError ? " show" : ""}`}>Email format incorrect</div>
        </div>
        <div className="field">
          <label htmlFor={`${id}-pw`}>Password</label>
          <span className="pw-box">
            <input
              id={`${id}-pw`}
              name="password"
              type={pwVisible ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                feedback.hide();
              }}
              required
            />
            <EyeToggle visible={pwVisible} onToggle={() => setPwVisible((v) => !v)} />
          </span>
          <button className="fhint" type="button" onClick={() => onChangeView("forgot")}>
            Forgot password?
          </button>
        </div>
        <FormFeedback error={feedback.error} message={feedback.message} />
        <SubmitButton pending={pending} disabled={!email.trim() || !password.trim()}>
          Log in
        </SubmitButton>
      </form>
      <SocialRow />
      <p className="mswitch">
        Don&apos;t have an account?{" "}
        <button type="button" onClick={() => onChangeView("signup")}>
          Sign up
        </button>
      </p>
      <Terms />
    </>
  );
}

function SignupView({
  onChangeView,
  onClose,
  initialState,
}: {
  onChangeView: (view: AuthView) => void;
  onClose: () => void;
  initialState?: AuthFormState;
}) {
  const id = useId();
  const [state, dispatch, pending] = useActionState(signupAction, initialState ?? EMPTY_STATE);
  const feedback = useServerFeedback(state);
  const firstRef = useAutoFocus();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  // The eye flips every password field in the form together, per the design.
  const [pwVisible, setPwVisible] = useState(false);

  // Submit unlocks only when the email is present, the password has reached
  // the 6-character server minimum, and the confirmation matches it exactly —
  // not merely when every field has some text.
  const canSubmit = email.trim() !== "" && password.length >= 6 && confirm === password;

  // Surface the mismatch while typing once the confirmation is as long as
  // the password: with masked fields the user only sees equal dot counts and
  // a dead submit button, so without this they get no clue what's wrong.
  // (Blur still sets confirmError for shorter, abandoned confirmations.)
  const confirmMismatch =
    password !== "" && confirm !== "" && confirm.length >= password.length && confirm !== password;
  const showConfirmError = confirmError || confirmMismatch;

  // Confirmation email sent — swap the form for the notice. Closing the
  // modal is enough: the email link signs the user in directly.
  if (state.signupComplete) {
    return (
      <>
        <h2>Check your email</h2>
        <p className="msub">
          We sent a confirmation link to <b>{state.email}</b>. Click it to activate your account.
        </p>
        <button className="btn btn-primary btn-block" type="button" onClick={onClose}>
          Close
        </button>
      </>
    );
  }

  return (
    <>
      <h2>Sign up</h2>
      <p className="msub">Spin up your first agent in minutes.</p>
      <form
        noValidate
        action={dispatch}
        onSubmit={(event) => {
          let ok = true;
          if (!EMAIL_RE.test(email.trim())) {
            setEmailError(true);
            ok = false;
          }
          if (password && confirm && password !== confirm) {
            setConfirmError(true);
            ok = false;
          }
          if (!ok) event.preventDefault();
        }}
      >
        <div className="field">
          <label htmlFor={`${id}-email`}>Email</label>
          <input
            ref={firstRef}
            id={`${id}-email`}
            className={emailError ? "invalid" : undefined}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(false);
              feedback.hide();
            }}
            onBlur={() => {
              if (email && !EMAIL_RE.test(email.trim())) setEmailError(true);
            }}
            required
          />
          <div className={`ferr${emailError ? " show" : ""}`}>Email format incorrect</div>
        </div>
        <div className="field">
          <label htmlFor={`${id}-pw`}>Password</label>
          <span className="pw-box">
            <input
              id={`${id}-pw`}
              name="password"
              type={pwVisible ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setConfirmError(false);
                feedback.hide();
              }}
              required
            />
            <EyeToggle visible={pwVisible} onToggle={() => setPwVisible((v) => !v)} />
          </span>
        </div>
        <div className="field">
          <label htmlFor={`${id}-pw2`}>Confirm password</label>
          <span className="pw-box">
            <input
              id={`${id}-pw2`}
              className={showConfirmError ? "invalid" : undefined}
              name="confirm-password"
              type={pwVisible ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value);
                setConfirmError(false);
                feedback.hide();
              }}
              onBlur={() => {
                if (confirm && password && password !== confirm) setConfirmError(true);
              }}
              required
            />
            <EyeToggle visible={pwVisible} onToggle={() => setPwVisible((v) => !v)} />
          </span>
          <div className={`ferr${showConfirmError ? " show" : ""}`}>Passwords don&apos;t match</div>
        </div>
        <FormFeedback error={feedback.error} message={feedback.message} />
        <SubmitButton pending={pending} disabled={!canSubmit}>
          Sign up
        </SubmitButton>
      </form>
      <SocialRow />
      <p className="mswitch">
        Already have an account?{" "}
        <button type="button" onClick={() => onChangeView("login")}>
          Log in
        </button>
      </p>
      <Terms />
    </>
  );
}

function ForgotView({
  onChangeView,
  initialState,
}: {
  onChangeView: (view: AuthView) => void;
  initialState?: AuthFormState;
}) {
  const id = useId();
  const [state, dispatch, pending] = useActionState(
    resetPasswordAction,
    initialState ?? EMPTY_STATE,
  );
  const feedback = useServerFeedback(state);
  const firstRef = useAutoFocus();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);

  return (
    <>
      <h2>Reset your password</h2>
      <p className="msub">We&apos;ll email you a secure reset link.</p>
      <form
        noValidate
        action={dispatch}
        onSubmit={(event) => {
          if (!EMAIL_RE.test(email.trim())) {
            event.preventDefault();
            setEmailError(true);
          }
        }}
      >
        <div className="field">
          <label htmlFor={`${id}-email`}>Email</label>
          <input
            ref={firstRef}
            id={`${id}-email`}
            className={emailError ? "invalid" : undefined}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(false);
              feedback.hide();
            }}
            onBlur={() => {
              if (email && !EMAIL_RE.test(email.trim())) setEmailError(true);
            }}
            required
          />
          <div className={`ferr${emailError ? " show" : ""}`}>Email format incorrect</div>
        </div>
        <FormFeedback error={feedback.error} message={feedback.message} />
        <SubmitButton pending={pending} disabled={!email.trim()}>
          Send reset link
        </SubmitButton>
      </form>
      <p className="mswitch">
        <button type="button" onClick={() => onChangeView("login")}>
          Return to log in
        </button>
      </p>
      <Terms />
    </>
  );
}

// Set-new-password view — the landing target of the email recovery link.
// The one-time token rides along as hidden fields and is only consumed on
// submit. Mirrors the signup password validations: 6-character minimum,
// live mismatch error once the confirmation reaches the password's length.
function ResetView({
  onRecoveryActive,
  tokenHash,
  tokenType,
  initialState,
}: {
  onRecoveryActive: (active: boolean) => void;
  tokenHash?: string;
  tokenType?: "recovery";
  initialState?: AuthFormState;
}) {
  const id = useId();
  const [state, dispatch, pending] = useActionState(
    updatePasswordAction,
    initialState ?? EMPTY_STATE,
  );
  const feedback = useServerFeedback(state);
  const firstRef = useAutoFocus();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmError, setConfirmError] = useState(false);
  // The eye flips every password field in the form together, per the design.
  const [pwVisible, setPwVisible] = useState(false);

  const canSubmit = password.length >= 6 && confirm === password;

  // Surface the mismatch while typing once the confirmation is as long as
  // the password (masked fields otherwise give no clue why submit is dead).
  const confirmMismatch =
    password !== "" && confirm !== "" && confirm.length >= password.length && confirm !== password;
  const showConfirmError = confirmError || confirmMismatch;

  // Tell the modal whether a consumed-token session is dangling, so closing
  // without finishing signs it out instead of leaving the user logged in.
  // (On success the action redirects to the login modal, so no flag needed.)
  useEffect(() => {
    onRecoveryActive(Boolean(state.recovered));
  }, [
    state,
    onRecoveryActive,
  ]);

  return (
    <>
      <h2>Set a new password</h2>
      <p className="msub">Use at least 6 characters and keep it unique to this account.</p>
      <form
        noValidate
        action={dispatch}
        onSubmit={(event) => {
          if (password !== confirm) {
            event.preventDefault();
            setConfirmError(true);
          }
        }}
      >
        {tokenHash ? <input type="hidden" name="token_hash" value={tokenHash} /> : null}
        {tokenType ? <input type="hidden" name="type" value={tokenType} /> : null}
        <div className="field">
          <label htmlFor={`${id}-pw`}>New password</label>
          <span className="pw-box">
            <input
              ref={firstRef}
              id={`${id}-pw`}
              name="password"
              type={pwVisible ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setConfirmError(false);
                feedback.hide();
              }}
              required
            />
            <EyeToggle visible={pwVisible} onToggle={() => setPwVisible((v) => !v)} />
          </span>
        </div>
        <div className="field">
          <label htmlFor={`${id}-pw2`}>Confirm new password</label>
          <span className="pw-box">
            <input
              id={`${id}-pw2`}
              className={showConfirmError ? "invalid" : undefined}
              name="confirm-password"
              type={pwVisible ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value);
                setConfirmError(false);
                feedback.hide();
              }}
              onBlur={() => {
                if (confirm && password && password !== confirm) setConfirmError(true);
              }}
              required
            />
            <EyeToggle visible={pwVisible} onToggle={() => setPwVisible((v) => !v)} />
          </span>
          <div className={`ferr${showConfirmError ? " show" : ""}`}>Passwords don&apos;t match</div>
        </div>
        <FormFeedback error={feedback.error} message={feedback.message} />
        <SubmitButton pending={pending} disabled={!canSubmit}>
          Update password
        </SubmitButton>
      </form>
    </>
  );
}

export function AuthModal({
  view,
  initialError,
  initialMessage,
  tokenHash,
  tokenType,
  onClose,
  onChangeView,
}: {
  view: AuthView | null;
  initialError?: string;
  initialMessage?: string;
  tokenHash?: string;
  tokenType?: "recovery";
  onClose: () => void;
  onChangeView: (view: AuthView) => void;
}) {
  const open = view !== null;

  // A consumed recovery token leaves a session behind until the password is
  // updated; if the user closes the reset modal mid-flow, sign it out so
  // they are not silently logged in (closing must not equal logging in).
  const recoveryActiveRef = useRef(false);
  const handleClose = useCallback(() => {
    if (recoveryActiveRef.current) {
      recoveryActiveRef.current = false;
      void abandonRecoveryAction();
    }
    onClose();
  }, [
    onClose,
  ]);

  // A seeded alert (e.g. "Password updated successfully" after a reset) is
  // bound to the view that was auto-opened on mount, so it only shows there
  // and not after the user navigates to a different view.
  const [seed] = useState(() =>
    initialError || initialMessage
      ? {
          view,
          state: {
            error: initialError,
            message: initialMessage,
          } as AuthFormState,
        }
      : null,
  );
  const seedFor = (target: AuthView) => (seed && seed.view === target ? seed.state : undefined);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [
    open,
  ]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    open,
    handleClose,
  ]);

  return (
    <div
      className={`overlay${open ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={view ? VIEW_LABEL[view] : "Account"}
      aria-hidden={open ? undefined : true}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      {open ? (
        <div className="modal">
          <button className="modal-x" type="button" aria-label="Close" onClick={handleClose}>
            ✕
          </button>

          {view === "login" ? (
            <LoginView onChangeView={onChangeView} initialState={seedFor("login")} />
          ) : null}
          {view === "signup" ? (
            <SignupView
              onChangeView={onChangeView}
              onClose={handleClose}
              initialState={seedFor("signup")}
            />
          ) : null}
          {view === "forgot" ? (
            <ForgotView onChangeView={onChangeView} initialState={seedFor("forgot")} />
          ) : null}
          {view === "reset" ? (
            <ResetView
              onRecoveryActive={(active) => {
                recoveryActiveRef.current = active;
              }}
              tokenHash={tokenHash}
              tokenType={tokenType}
              initialState={seedFor("reset")}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
