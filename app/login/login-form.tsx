"use client";

import { useActionState, useEffect, useRef } from "react";
import { ProviderButtons } from "@/components/auth/provider-buttons";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, emailSigninLink, loginAction } from "@/lib/auth/actions";
import { authContent } from "@/lib/auth/content";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(loginAction, {});
  const [linkState, linkAction, linkPending] = useActionState(emailSigninLink, {});
  const linkEmailInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const emailError =
    state.error === authContent.emailRequired || state.error === authContent.emailInvalid;
  const passwordError =
    state.error === authContent.passwordRequired || state.error === authContent.invalidCredentials;

  useEffect(() => {
    if (linkState.error) linkEmailInput.current?.focus();
  }, [linkState]);
  useEffect(() => {
    if (!state.error) return;
    if (emailError) emailInput.current?.focus();
    else if (passwordError) passwordInput.current?.focus();
  }, [state, emailError, passwordError]);

  return (
    <div className="flex flex-col gap-4">
      <form
        action={linkState.message ? "/api/auth/link" : linkAction}
        method={linkState.message ? "post" : undefined}
        className="flex flex-col gap-4"
        aria-busy={linkPending}
      >
        <input type="hidden" name="next" value={next ?? ""} />
        <FieldGroup>
          <Field data-invalid={Boolean(linkState.error) || undefined}>
            <FieldLabel htmlFor="link-email">{authContent.email}</FieldLabel>
            <Input
              ref={linkEmailInput}
              id="link-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={linkState.email}
              placeholder={authContent.emailPlaceholder}
              className="min-h-11 desk:min-h-7"
              aria-invalid={Boolean(linkState.error)}
              aria-describedby="link-status"
            />
          </Field>
        </FieldGroup>
        <p id="link-status" role={linkState.error ? "alert" : "status"} className="text-sm">
          {linkState.error ?? linkState.message}
        </p>
        <Button className="min-h-11 w-full desk:min-h-7" disabled={linkPending}>
          {linkPending
            ? authContent.sending
            : linkState.message
              ? authContent.resend
              : authContent.magicLink}
        </Button>
      </form>
      <Separator />
      <ProviderButtons next={next} />
      <Separator />
      <form action={formAction} className="flex flex-col gap-4" aria-busy={isPending}>
        <input type="hidden" name="next" value={next ?? ""} />
        <FieldGroup>
          <Field data-invalid={emailError || undefined}>
            <FieldLabel htmlFor="email">{authContent.email}</FieldLabel>
            <Input
              ref={emailInput}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state.email}
              placeholder={authContent.emailPlaceholder}
              className="min-h-11 desk:min-h-7"
              aria-invalid={emailError}
              aria-describedby={emailError ? "login-error" : undefined}
            />
          </Field>
          <Field data-invalid={passwordError || undefined}>
            <FieldLabel htmlFor="password">{authContent.password}</FieldLabel>
            <Input
              ref={passwordInput}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="min-h-11 desk:min-h-7"
              aria-invalid={passwordError}
              aria-describedby={passwordError ? "login-error" : undefined}
            />
          </Field>
        </FieldGroup>
        {state.error && (
          <p id="login-error" role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" className="min-h-11 w-full desk:min-h-7" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner />
              {authContent.loggingIn}
            </>
          ) : (
            authContent.login
          )}
        </Button>
      </form>
    </div>
  );
}
