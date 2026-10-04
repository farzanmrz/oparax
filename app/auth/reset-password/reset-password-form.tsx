"use client";

import { useActionState } from "react";
import { field, label, primary } from "@/components/auth/one-card";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, updatePasswordAction } from "@/lib/auth/actions";
import { authContent } from "@/lib/auth/content";
import { cn } from "@/lib/utils";

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
    <form action={formAction} className="mt-6" aria-busy={isPending}>
      {/* Replay's session_recording.blockSelector blocks every hidden input and slimDOMOptions
          drops script nodes, so token_hash cannot enter a snapshot through these fields or the
          tokenHash hydration payload. If either token is moved off type="hidden" or rendered
          visibly, that recording rule must follow it. */}
      {tokenHash && <input type="hidden" name="token_hash" value={tokenHash} />}
      {tokenType && <input type="hidden" name="type" value={tokenType} />}
      <div className="grid gap-3.5">
        <label className="grid gap-1.5">
          <span className={label}>{authContent.newPassword}</span>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className={field}
          />
        </label>
        <label className="grid gap-1.5">
          <span className={label}>{authContent.confirmNewPassword}</span>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            className={field}
          />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="mt-3 text-[13px] leading-relaxed text-[var(--error)]">
          {state.error}
        </p>
      )}
      <button type="submit" className={cn(primary, "mt-5")} disabled={isPending}>
        {isPending ? (
          <>
            <Spinner />
            {authContent.updating}
          </>
        ) : (
          authContent.updatePassword
        )}
      </button>
    </form>
  );
}
