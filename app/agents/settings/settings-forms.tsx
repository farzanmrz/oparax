"use client";

import { CheckIcon } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAccount, type UpdateUsernameState, updateUsername } from "./actions";

// Username update — drives the existing updateUsername action; `username` is
// the field name the action reads. The action's revalidatePath already
// refreshes the layout header with the new name. Restyled with shadcn
// Input/Button; the form action wiring and field name are unchanged.
export function UsernameForm({ initialUsername }: { initialUsername: string }) {
  const [state, formAction, isPending] = useActionState<UpdateUsernameState, FormData>(
    updateUsername,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="username">
        Username
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          autoComplete="name"
          className="sm:max-w-xs"
          defaultValue={initialUsername}
          id="username"
          maxLength={60}
          name="username"
        />
        <Button disabled={isPending} type="submit" variant="secondary">
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
          <CheckIcon aria-hidden="true" className="size-3.5 text-primary" />
          Saved.
        </p>
      ) : null}
    </form>
  );
}

// Delete account — confirm, then run the existing deleteAccount action: the
// delete_account RPC (cascading removal), a local-scope sign-out, and a
// redirect to the landing page. On failure the action returns an error.
// Restyled only; the confirm + action flow is unchanged.
export function DeleteAccountButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!window.confirm("Permanently delete your account? This cannot be undone.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      // On success the action redirects to "/", unmounting this component.
      const result = await deleteAccount();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        className="w-fit"
        disabled={isPending}
        onClick={confirmDelete}
        type="button"
        variant="destructive"
      >
        {isPending ? "Deleting…" : "Delete account"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
