"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">
          New password
        </label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className="block text-sm font-medium">
          Confirm new password
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
            Updating…
          </>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}
