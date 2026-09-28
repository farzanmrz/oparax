"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, resetPasswordAction } from "@/lib/auth/actions";
import { authContent } from "@/lib/auth/content";

// Client island: drives resetPasswordAction via useActionState. The email
// field name is the contract lib/validation.ts reads; success renders the
// action's neutral "if an account exists" message inline.
export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    resetPasswordAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">
          {authContent.email}
        </label>
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
      </div>
      {state.error && (
        <p role="alert" className="text-sm leading-relaxed text-destructive">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
          {state.message}
        </p>
      )}
      <Button type="submit" className="min-h-11 w-full desk:min-h-7" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner />
            {authContent.sending}
          </>
        ) : (
          authContent.sendReset
        )}
      </Button>
    </form>
  );
}
