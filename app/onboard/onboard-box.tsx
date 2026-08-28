"use client";

// The landing page's handle box (#131 Part F): one input, one button, and the full pilot
// onboarding awaited behind a pending state. Errors keep the form retryable; an existing feed
// links out instead of rebuilding.

import Link from "next/link";
import { useState, useTransition } from "react";
import { startPilotOnboarding } from "@/app/onboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Phase =
  | { state: "idle" }
  | { state: "ready"; handle: string; existing: boolean }
  | { state: "error"; message: string };

export function OnboardBox({ className }: { className?: string }) {
  const [handle, setHandle] = useState("");
  const [phase, setPhase] = useState<Phase>({ state: "idle" });
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !handle.trim()) return;
    setPhase({ state: "idle" });
    startTransition(async () => {
      try {
        const result = await startPilotOnboarding(handle);
        if (result.ok) {
          setPhase({ state: "ready", handle: result.handle, existing: result.existing === true });
        } else {
          setPhase({ state: "error", message: result.error });
        }
      } catch {
        setPhase({
          state: "error",
          message: "We couldn't build this feed. Try again, or try later.",
        });
      }
    });
  }

  if (phase.state === "ready") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Link
          href={`/feed/${phase.handle.toLowerCase()}`}
          className="inline-flex min-h-11 items-center gap-2 text-base font-medium text-accent underline underline-offset-4 desk:min-h-0"
        >
          {phase.existing ? "This feed already exists. Open it" : "Your feed is ready. Open it"}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cn("flex w-full max-w-md flex-col gap-3", className)}>
      <label htmlFor="onboard-handle" className="text-sm font-medium">
        Your X handle
      </label>
      <div className="flex flex-col gap-2 desk:flex-row">
        <Input
          id="onboard-handle"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          placeholder="@jane_reports"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={16}
          disabled={pending}
          className="h-11 flex-1 text-base desk:h-9"
        />
        <Button type="submit" disabled={pending || !handle.trim()} className="h-11 px-4 desk:h-9">
          {pending ? <Spinner className="size-4" /> : null}
          Build my feed
        </Button>
      </div>
      {pending ? (
        <p className="text-sm text-muted-foreground" role="status">
          Reading your profile and building your desk. This takes a minute or two.
        </p>
      ) : null}
      {phase.state === "error" && !pending ? (
        <p className="text-sm text-danger-text" role="alert">
          {phase.message}
        </p>
      ) : null}
    </form>
  );
}
