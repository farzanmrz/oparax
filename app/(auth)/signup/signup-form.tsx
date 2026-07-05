"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, signupAction } from "@/lib/auth/actions";

// Client island: drives signupAction via useActionState. Field names (email,
// password, confirm-password) are the contract lib/validation.ts reads. When
// signup succeeds without a session (email confirmation pending) the form is
// swapped for a check-your-email notice, mirroring the action's state shape.
export function SignupForm() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(signupAction, {});

  if (state.signupComplete) {
    return (
      <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
        We sent a confirmation link to {state.email}. Check your email to finish signing up.
      </p>
    );
  }

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
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className="block text-sm font-medium">
          Confirm password
        </label>
        <Input
          id="confirm-password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm leading-relaxed text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner />
            Signing up…
          </>
        ) : (
          "Sign up"
        )}
      </Button>
    </form>
  );
}
