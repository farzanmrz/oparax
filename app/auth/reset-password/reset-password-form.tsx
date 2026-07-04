"use client";

import { useActionState } from "react";
import { type AuthFormState, updatePasswordAction } from "@/lib/auth/actions";

// Client island: drives updatePasswordAction via useActionState. The one-time
// recovery token rides along as hidden fields (token_hash, type) so it is
// only consumed on submit; password/confirm-password are the field names
// lib/validation.ts reads. On success the action signs out and redirects to
// /login with a notice.
export function ResetPasswordForm({
  tokenHash,
  tokenType,
}: {
  tokenHash?: string;
  tokenType?: string;
}) {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    updatePasswordAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {tokenHash && <input type="hidden" name="token_hash" value={tokenHash} />}
      {tokenType && <input type="hidden" name="type" value={tokenType} />}
      <div className="space-y-1">
        <label htmlFor="password" className="block">
          New password
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
          Confirm new password
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
        {isPending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
