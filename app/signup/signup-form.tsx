"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, signupAction } from "@/lib/auth/actions";
import { authContent } from "@/lib/auth/content";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(signupAction, {});
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmationInput = useRef<HTMLInputElement>(null);
  const emailError =
    state.error === authContent.emailRequired || state.error === authContent.emailInvalid;
  const passwordError =
    state.error === authContent.passwordRequired || state.error === authContent.passwordLength;
  const confirmationError =
    state.error === authContent.passwordConfirmRequired ||
    state.error === authContent.passwordMismatch;

  useEffect(() => {
    if (emailError) emailInput.current?.focus();
    else if (passwordError) passwordInput.current?.focus();
    else if (confirmationError) confirmationInput.current?.focus();
  }, [state, emailError, passwordError, confirmationError]);

  if (state.signupComplete) {
    return (
      <p
        role="status"
        className="rounded-lg border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-foreground"
      >
        {authContent.signupNotice(state.email ?? "")}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" aria-busy={isPending}>
      <FieldGroup>
        <Field data-invalid={emailError || undefined}>
          <FieldLabel htmlFor="email">{authContent.email}</FieldLabel>
          <Input
            className="min-h-11 desk:min-h-7"
            ref={emailInput}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            placeholder={authContent.emailPlaceholder}
            aria-invalid={emailError}
            aria-describedby={emailError ? "signup-error" : undefined}
          />
        </Field>
        <Field data-invalid={passwordError || undefined}>
          <FieldLabel htmlFor="password">{authContent.password}</FieldLabel>
          <Input
            className="min-h-11 desk:min-h-7"
            ref={passwordInput}
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={passwordError}
            aria-describedby={passwordError ? "signup-error" : undefined}
          />
        </Field>
        <Field data-invalid={confirmationError || undefined}>
          <FieldLabel htmlFor="confirm-password">{authContent.confirmPassword}</FieldLabel>
          <Input
            className="min-h-11 desk:min-h-7"
            ref={confirmationInput}
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={confirmationError}
            aria-describedby={confirmationError ? "signup-error" : undefined}
          />
        </Field>
      </FieldGroup>
      {state.error && (
        <p id="signup-error" role="alert" className="text-sm leading-relaxed text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" className="min-h-11 w-full desk:min-h-7" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner />
            {authContent.signingUp}
          </>
        ) : (
          authContent.signup
        )}
      </Button>
    </form>
  );
}
