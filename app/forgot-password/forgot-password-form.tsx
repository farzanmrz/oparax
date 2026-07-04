"use client";

import { useActionState } from "react";
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
      {state.error && <p role="alert">{state.error}</p>}
      {state.message && <p>{state.message}</p>}
      <button type="submit" className="border px-2 py-1" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
