"use client";

import { useActionState } from "react";
import { CardNotice, field, label, primary } from "@/components/auth/one-card";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, resetPasswordAction } from "@/lib/auth/actions";
import { authContent } from "@/lib/auth/content";
import { cn } from "@/lib/utils";

// Client island: drives resetPasswordAction via useActionState. The email
// field name is the contract lib/validation.ts reads; success renders the
// action's neutral "if an account exists" message inline.
export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    resetPasswordAction,
    {},
  );

  return (
    <form action={formAction} className="mt-6" aria-busy={isPending}>
      <label className="grid gap-1.5">
        <span className={label}>{authContent.email}</span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          placeholder={authContent.emailPlaceholder}
          className={field}
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "forgot-error" : undefined}
        />
      </label>
      {state.error ? (
        <p id="forgot-error" role="alert" className="mt-3 text-[13px] text-[var(--error)]">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <div className="mt-3">
          <CardNotice tone="notice">{state.message}</CardNotice>
        </div>
      ) : null}
      <button type="submit" className={cn(primary, "mt-5")} disabled={isPending}>
        {isPending ? (
          <>
            <Spinner />
            {authContent.sending}
          </>
        ) : (
          authContent.sendReset
        )}
      </button>
    </form>
  );
}
