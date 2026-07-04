"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, resetPasswordAction } from "@/lib/auth/actions";

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
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          placeholder="you@newsroom.com"
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
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner />
            Sending…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>
    </form>
  );
}
