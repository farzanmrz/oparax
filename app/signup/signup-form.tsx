"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, signupAction } from "@/lib/auth/actions";
import { authContent } from "@/lib/auth/content";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(signupAction, {});

  if (state.signupComplete) {
    return (
      <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
        {authContent.signupNotice(state.email ?? "")}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">{authContent.email}</FieldLabel>
          <Input
            className="min-h-11 desk:min-h-7"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            placeholder={authContent.emailPlaceholder}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">{authContent.password}</FieldLabel>
          <Input
            className="min-h-11 desk:min-h-7"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">{authContent.confirmPassword}</FieldLabel>
          <Input
            className="min-h-11 desk:min-h-7"
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
      </FieldGroup>
      {state.error && (
        <p role="alert" className="text-sm leading-relaxed text-destructive">
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
