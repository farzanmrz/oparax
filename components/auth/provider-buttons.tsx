"use client";

import { useActionState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, signInWithProvider } from "@/lib/auth/actions";
import { authContent } from "@/lib/auth/content";

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
    <div className="flex flex-col gap-2">
      <form action={xAction} className="flex flex-col gap-2" aria-busy={xPending}>
        <Button
          type="submit"
          variant="outline"
          className="min-h-11 w-full desk:min-h-7"
          disabled={xPending}
        >
          <span data-icon="inline-start">
            {xPending ? <Spinner /> : <BrandIcon name="x" mono />}
          </span>
          {authContent.x}
        </Button>
        {xState.error && (
          <p role="alert" className="text-sm text-destructive">
            {xState.error}
          </p>
        )}
      </form>
      <form action={googleAction} className="flex flex-col gap-2" aria-busy={googlePending}>
        <Button
          type="submit"
          variant="outline"
          className="min-h-11 w-full desk:min-h-7"
          disabled={googlePending}
        >
          <span data-icon="inline-start">
            {googlePending ? <Spinner /> : <BrandIcon name="google" />}
          </span>
          {authContent.google}
        </Button>
        {googleState.error && (
          <p role="alert" className="text-sm text-destructive">
            {googleState.error}
          </p>
        )}
      </form>
    </div>
  );
}
