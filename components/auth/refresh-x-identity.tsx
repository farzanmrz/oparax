"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, refreshXIdentity } from "@/lib/auth/actions";
import { authContent } from "@/lib/auth/content";

export function RefreshXIdentityButton() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(refreshXIdentity, {});

  return (
    <form action={action} className="flex flex-col gap-2" aria-busy={pending}>
      <Button type="submit" variant="outline" className="min-h-11 desk:min-h-7" disabled={pending}>
        {pending && <Spinner data-icon="inline-start" />}
        {authContent.refreshX}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
