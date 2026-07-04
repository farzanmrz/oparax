"use client";

import { useActionState } from "react";
import { type AuthFormState, signupAction } from "@/lib/auth/actions";

// Client island: drives signupAction via useActionState. Field names (email,
// password, confirm-password) are the contract lib/validation.ts reads. When
// signup succeeds without a session (email confirmation pending) the form is
// swapped for a check-your-email notice, mirroring the action's state shape.
export function SignupForm() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(signupAction, {});

  if (state.signupComplete) {
    return (
      <p>We sent a confirmation link to {state.email}. Check your email to finish signing up.</p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="block">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className="block w-full border px-2 py-1"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="block">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="block w-full border px-2 py-1"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="confirm-password" className="block">
          Confirm password
        </label>
        <input
          id="confirm-password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          className="block w-full border px-2 py-1"
        />
      </div>
      {state.error && <p role="alert">{state.error}</p>}
      <button type="submit" className="border px-2 py-1" disabled={isPending}>
        {isPending ? "Signing up…" : "Sign up"}
      </button>
    </form>
  );
}
