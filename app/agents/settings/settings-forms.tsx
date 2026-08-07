"use client";

import { CheckIcon, PencilIcon } from "lucide-react";
import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AVATAR_KEYS, type AvatarKey } from "@/lib/user";
import { unlinkXAccount } from "@/lib/x/actions";
import { deleteAccount, type UpdateUsernameState, updateAvatar, updateUsername } from "./actions";

export function AvatarPicker({ initialAvatar }: { initialAvatar: AvatarKey }) {
  const [avatar, setAvatar] = useState(initialAvatar);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function chooseAvatar(nextAvatar: AvatarKey) {
    setError(null);
    startTransition(async () => {
      const result = await updateAvatar(nextAvatar);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAvatar(nextAvatar);
    });
  }

  return (
    <div className="flex w-full shrink-0 flex-col items-center gap-3 desk:w-52">
      <Avatar className="size-24">
        <AvatarImage alt="Selected profile avatar" src={`/avatars/${avatar}.png`} />
        <AvatarFallback>OP</AvatarFallback>
      </Avatar>
      <Button
        className="min-h-11 w-full desk:min-h-8"
        onClick={() => setOpen((current) => !current)}
        size="sm"
        type="button"
        variant="outline"
      >
        <PencilIcon />
        Edit
      </Button>
      {open ? (
        <div className="grid w-full grid-cols-4 gap-2 desk:grid-cols-3">
          {AVATAR_KEYS.map((key) => (
            <button
              aria-label={`Choose avatar ${key.slice(2)}`}
              aria-pressed={avatar === key}
              className="relative aspect-square rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-primary"
              disabled={isPending}
              key={key}
              onClick={() => chooseAvatar(key)}
              type="button"
            >
              <Image
                alt=""
                className="size-full rounded-md object-cover"
                height={160}
                src={`/avatars/${key}.png`}
                width={160}
              />
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function UsernameForm({ initialUsername }: { initialUsername: string }) {
  const [state, formAction, isPending] = useActionState<UpdateUsernameState, FormData>(
    updateUsername,
    {},
  );

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-2">
      <Label htmlFor="username">Username</Label>
      <div className="flex items-center gap-2">
        <Input
          autoComplete="name"
          className="h-11 rounded-md bg-[var(--input-bg)] desk:h-9"
          defaultValue={initialUsername}
          id="username"
          maxLength={60}
          name="username"
        />
        <Button className="h-11 desk:h-9" disabled={isPending} type="submit" variant="secondary">
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="flex items-center gap-1.5 text-sm text-text-muted" role="status">
          <CheckIcon aria-hidden="true" className="size-3.5 text-success" />
          Saved
        </p>
      ) : null}
    </form>
  );
}

export function XAccountField({ linked, handle }: { linked: boolean; handle: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function disconnect() {
    setError(null);
    startTransition(async () => {
      const result = await unlinkXAccount();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label>Connected X Account</Label>
      {linked && handle ? (
        <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-md border border-input bg-[var(--input-bg)] px-3 desk:min-h-9">
          <span
            aria-label="Connected"
            className="size-2 shrink-0 rounded-full bg-success"
            role="img"
          />
          <span className="min-w-0 flex-1 truncate text-sm">@{handle}</span>
          <Button
            className="min-h-11 shrink-0 desk:h-9 desk:min-h-0"
            disabled={isPending}
            onClick={disconnect}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isPending ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      ) : (
        <Button asChild className="h-11 w-full desk:h-9" variant="outline">
          <a href="/auth/x?returnTo=/agents/settings">Connect X</a>
        </Button>
      )}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DeleteAccountButton() {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function requestDelete() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 desk:items-end">
      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11 whitespace-nowrap desk:min-h-9"
          disabled={isPending}
          onClick={requestDelete}
          type="button"
          variant="destructive"
        >
          {isPending ? "Deleting…" : armed ? "Confirm Delete Account" : "Delete Account"}
        </Button>
        {armed && !isPending ? (
          <Button
            className="min-h-11 desk:min-h-9"
            onClick={() => setArmed(false)}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
        ) : null}
      </div>
      {armed && !isPending ? (
        <p className="text-sm text-danger-text" role="alert">
          Click Confirm Delete Account to permanently continue.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
