"use client";

import { useActionState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, signInWithProvider } from "@/lib/auth/actions";
import { authContent } from "@/lib/auth/content";

// Providers are neutral, never blue: white in light, the raised surface in dark. Only the main action is blue.
const provider =
  "inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-line-strong bg-white text-[14px] font-medium text-[#14151a] transition-colors hover:bg-[#f3f4f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70 dark:bg-raised dark:text-t1 dark:hover:bg-[var(--tile-bg)]";

export function ProviderButtons({ next }: { next?: string }) {
  const [xState, xAction, xPending] = useActionState<AuthFormState, FormData>(
    signInWithProvider.bind(null, "x", next),
    {},
  );
  const [googleState, googleAction, googlePending] = useActionState<AuthFormState, FormData>(
    signInWithProvider.bind(null, "google", next),
    {},
  );

  return (
    <div className="grid gap-2.5">
      <form action={xAction} className="grid gap-2" aria-busy={xPending}>
        <button type="submit" className={provider} disabled={xPending}>
          {xPending ? <Spinner /> : <BrandIcon name="x" mono className="size-3.5" />}
          {authContent.x}
        </button>
        {xState.error && (
          <p role="alert" className="text-[13px] text-[var(--error)]">
            {xState.error}
          </p>
        )}
      </form>
      <form action={googleAction} className="grid gap-2" aria-busy={googlePending}>
        <button type="submit" className={provider} disabled={googlePending}>
          {googlePending ? <Spinner /> : <BrandIcon name="google" />}
          {authContent.google}
        </button>
        {googleState.error && (
          <p role="alert" className="text-[13px] text-[var(--error)]">
            {googleState.error}
          </p>
        )}
      </form>
    </div>
  );
}
