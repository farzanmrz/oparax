"use client";

import { useActionState } from "react";
import { type AuthFormState, loginAction } from "@/lib/auth/actions";

// Client island: drives loginAction via useActionState so validation and
// Supabase errors render inline. Field names (email, password) are the
// contract lib/validation.ts reads.
export function LoginForm() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(loginAction, {});

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
          autoComplete="current-password"
          required
          className="block w-full border px-2 py-1"
        />
      </div>
      {state.error && <p role="alert">{state.error}</p>}
      <button type="submit" className="border px-2 py-1" disabled={isPending}>
        {isPending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
