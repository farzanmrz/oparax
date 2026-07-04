"use client";

import { useActionState, useState, useTransition } from "react";
import {
  deleteAccount,
  type UpdateUsernameState,
  updateUsername,
} from "@/app/dashboard/settings/actions";

// Username update — drives the existing updateUsername action; `username` is
// the field name the action reads. The action's revalidatePath already
// refreshes the layout header with the new name.
export function UsernameForm({ initialUsername }: { initialUsername: string }) {
  const [state, formAction, isPending] = useActionState<UpdateUsernameState, FormData>(
    updateUsername,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="username" className="block">
        Username
      </label>
      <input
        id="username"
        name="username"
        defaultValue={initialUsername}
        maxLength={60}
        autoComplete="name"
        className="block w-full border px-2 py-1"
      />
      <button type="submit" className="border px-2 py-1" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p>Saved.</p>}
    </form>
  );
}

// Delete account — confirm, then run the existing deleteAccount action: the
// delete_account RPC (cascading removal), a local-scope sign-out, and a
// redirect to the landing page. On failure the action returns an error.
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
    <div className="space-y-2">
      <button
        type="button"
        className="border px-2 py-1"
        disabled={isPending}
        onClick={confirmDelete}
      >
        {isPending ? "Deleting…" : "Delete account"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
