"use client";

// The One log in and sign up card (design preview v2/one/login.tsx) on the existing auth actions: email and password
// first, blue Log in, "New to Oparax? Sign up" swapping Confirm password in place, then neutral X and Google. The
// card is the only lifted surface on a lit page.

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ProviderButtons } from "@/components/auth/provider-buttons";
import { OparaxMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, emailSigninLink, loginAction, signupAction } from "@/lib/auth/actions";
import { authContent as copy } from "@/lib/auth/content";
import { landingContent } from "@/lib/landing/content";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export const field =
  "h-10 w-full rounded-md border border-line-strong bg-well px-3 text-[14px] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)] aria-invalid:border-[var(--error)]";
export const label = "text-[13px] font-medium text-t2";
export const link =
  "text-t1 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm";
export const primary =
  "inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-lg bg-primary text-[14px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70";

/** The lit page with the brand row on top and one lifted card in the middle. */
export function AuthStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--page)] text-t1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[760px] bg-[image:var(--stage-light)]"
      />
      <a
        href="#auth-content"
        className="sr-only rounded-md focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-50 focus:bg-background focus:p-3 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copy.skipToContent}
      </a>
      <header className="relative z-10 flex items-center px-4 pt-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md text-[17px] font-semibold tracking-tight text-t1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <OparaxMark className="size-[22px]" />
          {landingContent.brand}
        </Link>
        <ThemeToggle className="ml-auto size-8 text-t3 desk:size-8" />
      </header>
      <main
        id="auth-content"
        tabIndex={-1}
        className="relative grid flex-1 place-items-center px-4 py-10"
      >
        <section className="relative z-10 w-full max-w-[420px] rounded-xl border border-line-strong bg-[var(--window)] p-7 shadow-[var(--window-shadow),var(--top-light)]">
          {children}
        </section>
      </main>
    </div>
  );
}

/** The card's heading, the same on every auth page. */
export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-[26px] leading-none font-semibold tracking-[-0.025em] text-t1">
      {children}
    </h1>
  );
}

/** An error or notice carried in the URL or returned by an action. */
export function CardNotice({
  tone,
  id,
  children,
}: {
  tone: "error" | "notice";
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      id={id}
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-[13px] leading-relaxed",
        tone === "error"
          ? "border-[var(--error)]/30 bg-[var(--error-soft)] text-[var(--error)]"
          : "border-line bg-well text-t1",
      )}
    >
      {children}
    </p>
  );
}

/** Height and opacity slide; the content stays mounted so it can animate, and is inert while closed. */
function Slide({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function OneAuthCard({
  initial,
  next,
  error,
  message,
}: {
  initial: Mode;
  next?: string;
  /** The error and notice carried in the URL (auth confirm, reset and link routes). */
  error?: string;
  message?: string;
}) {
  const [mode, setMode] = useState<Mode>(initial);
  const [loginState, loginFormAction, loginPending] = useActionState<AuthFormState, FormData>(
    loginAction,
    {},
  );
  const [signupState, signupFormAction, signupPending] = useActionState<AuthFormState, FormData>(
    signupAction,
    {},
  );
  const [linkState, linkAction, linkPending] = useActionState(emailSigninLink, {});
  // An error belongs to the mode that produced it; flipping modes hides it until the next submit.
  const [flipped, setFlipped] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmInput = useRef<HTMLInputElement>(null);

  const signup = mode === "signup";
  const state = signup ? signupState : loginState;
  const pending = signup ? signupPending : loginPending;
  const shown = flipped ? undefined : state.error;
  const emailError = shown === copy.emailRequired || shown === copy.emailInvalid;
  const passwordError =
    shown === copy.passwordRequired ||
    shown === copy.passwordLength ||
    shown === copy.invalidCredentials;
  const confirmError = shown === copy.passwordConfirmRequired || shown === copy.passwordMismatch;

  useEffect(() => {
    if (!shown) return;
    if (emailError) emailInput.current?.focus();
    else if (passwordError) passwordInput.current?.focus();
    else if (confirmError) confirmInput.current?.focus();
  }, [shown, emailError, passwordError, confirmError]);

  function flip() {
    const to: Mode = signup ? "login" : "signup";
    setMode(to);
    setFlipped(true);
    // Keep the address in step with the card so a reload opens the same mode.
    window.history.replaceState(null, "", `/${to}${window.location.search}`);
  }

  if (signup && signupState.signupComplete) {
    return (
      <div>
        <CardTitle>{copy.cardSignupTitle}</CardTitle>
        <p
          role="status"
          className="mt-6 rounded-lg border border-line bg-well px-3 py-2.5 text-[13.5px] leading-relaxed text-t1"
        >
          {copy.signupNotice(signupState.email ?? "")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <CardTitle>{signup ? copy.cardSignupTitle : copy.cardLoginTitle}</CardTitle>
      {error || message ? (
        <div className="mt-5 grid gap-2">
          {error ? <CardNotice tone="error">{error}</CardNotice> : null}
          {message ? <CardNotice tone="notice">{message}</CardNotice> : null}
        </div>
      ) : null}
      <form
        action={signup ? signupFormAction : loginFormAction}
        onSubmit={() => setFlipped(false)}
        className="mt-6"
        aria-busy={pending || linkPending}
      >
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="grid gap-3.5">
          <label className="grid gap-1.5">
            <span className={label}>{copy.email}</span>
            <input
              ref={emailInput}
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state.email ?? linkState.email}
              placeholder={copy.emailPlaceholder}
              className={field}
              aria-invalid={emailError || Boolean(linkState.error)}
              aria-describedby={
                emailError ? "auth-error" : linkState.error ? "link-status" : undefined
              }
            />
          </label>
          <label className="grid gap-1.5">
            <span className={label}>{copy.password}</span>
            <input
              ref={passwordInput}
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
              className={field}
              aria-invalid={passwordError}
              aria-describedby={passwordError ? "auth-error" : undefined}
            />
          </label>
        </div>
        <Slide open={signup}>
          <label className="mt-3.5 grid gap-1.5">
            <span className={label}>{copy.confirmPassword}</span>
            <input
              ref={confirmInput}
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required={signup}
              disabled={!signup}
              className={field}
              aria-invalid={confirmError}
              aria-describedby={confirmError ? "auth-error" : undefined}
            />
          </label>
        </Slide>
        <Slide open={!signup}>
          <div className="pt-2.5 text-right">
            <Link href="/forgot-password" className={cn("text-[13px]", link)}>
              {copy.forgotPassword}
            </Link>
          </div>
        </Slide>
        {shown ? (
          <p id="auth-error" role="alert" className="mt-3 text-[13px] text-[var(--error)]">
            {shown}
          </p>
        ) : null}
        <button type="submit" className={cn(primary, "mt-5")} disabled={pending}>
          {pending ? <Spinner /> : null}
          {signup
            ? pending
              ? copy.signingUp
              : copy.signup
            : pending
              ? copy.loggingIn
              : copy.login}
        </button>
        <p className="mt-3 text-center text-[13px] text-t3">
          {signup ? copy.existingAccount : copy.newToOparax}{" "}
          <button type="button" onClick={flip} className={cn("font-medium", link)}>
            {signup ? copy.login : copy.signup}
          </button>
        </p>
        {signup ? null : (
          <div className="mt-2 text-center text-[13px]">
            {/* The emailed sign-in link stays available, quietly; a resend goes through the link route. */}
            {linkState.message ? (
              <button
                type="submit"
                formAction="/api/auth/link"
                formMethod="post"
                formNoValidate
                className={cn(link, "text-t3")}
              >
                {copy.resend}
              </button>
            ) : (
              <button
                type="submit"
                formAction={linkAction}
                formNoValidate
                disabled={linkPending}
                className={cn(link, "text-t3")}
              >
                {linkPending ? copy.sending : copy.linkInstead}
              </button>
            )}
            {linkState.error || linkState.message ? (
              <p
                id="link-status"
                role={linkState.error ? "alert" : "status"}
                className={cn("mt-1.5", linkState.error ? "text-[var(--error)]" : "text-t2")}
              >
                {linkState.error ?? linkState.message}
              </p>
            ) : null}
          </div>
        )}
      </form>

      <div className="my-5 flex items-center gap-3 text-[12px] text-t3">
        <span className="h-px flex-1 bg-line" />
        {copy.or}
        <span className="h-px flex-1 bg-line" />
      </div>

      <ProviderButtons next={next} />
    </div>
  );
}
