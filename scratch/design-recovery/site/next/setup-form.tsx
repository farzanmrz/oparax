"use client";

import { useState } from "react";
import { AtSign, FileText, Info, ListChecks, MessageSquareText, ScanSearch } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { HANDLE, setup } from "./copy";

// The five building stages, in the order the building screen shows them (preview copy, round 1 change 7).
const next = [
  { icon: AtSign, text: "Looks up your X account" },
  { icon: MessageSquareText, text: "Reads your newest posts" },
  { icon: ScanSearch, text: "Checks which sites, feeds and X accounts fit your sentence" },
  { icon: ListChecks, text: "Chooses what to watch, with a reason for each" },
  { icon: FileText, text: "Writes your brief" },
];

export function SetupForm({
  typed,
  error,
  waitlist,
  blank = false,
}: {
  typed: boolean;
  error: boolean;
  waitlist: boolean;
  /** ?error=blank: the state after submitting with no sentence, for review screenshots. */
  blank?: boolean;
}) {
  const [beat, setBeat] = useState("");
  const [missing, setMissing] = useState(blank);
  const typedValue = error ? "farzanmrzz" : "";
  return (
    <form
      action={waitlist ? undefined : "/next/building"}
      noValidate
      onSubmit={(e) => {
        if (waitlist) return e.preventDefault();
        if (!beat.trim()) {
          e.preventDefault();
          setMissing(true);
        }
      }}
    >
      <FieldGroup className="gap-7">
        {waitlist ? (
          <p role="status" className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {setup.waitlistStatus}
          </p>
        ) : null}

        {typed ? (
          <Field>
            <FieldLabel htmlFor="handle" className="text-sm">
              {setup.handleLabel}
            </FieldLabel>
            <div className={cn("flex h-11 items-center rounded-md border bg-transparent focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-input/30", error ? "border-destructive/60" : "border-input")}>
              <span className="pl-3 text-sm text-muted-foreground">@</span>
              <Input
                id="handle"
                name="handle"
                defaultValue={typedValue}
                placeholder={setup.handlePlaceholder}
                autoComplete="off"
                aria-invalid={error || undefined}
                className="h-full border-0 bg-transparent pl-0.5 text-sm shadow-none focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent"
              />
            </div>
            <FieldDescription>{setup.typedHelp}</FieldDescription>
            {error ? <FieldError className="text-sm">{setup.notFoundTyped(typedValue)}</FieldError> : null}
          </Field>
        ) : (
          <Field>
            <FieldTitle className="text-sm">{setup.handleLabel}</FieldTitle>
            <div className="flex h-11 items-center gap-2.5 rounded-md border border-border bg-muted/60 px-3">
              <XLogo className="size-3.5" />
              <span className="text-sm font-semibold">@{HANDLE}</span>
            </div>
            <FieldDescription>{setup.verifiedHelp}</FieldDescription>
            {error ? (
              <div className="flex flex-col items-start gap-2">
                <FieldError className="text-sm">{setup.notFoundVerified}</FieldError>
                <Button type="button" variant="outline" className="h-9 px-3 text-sm">
                  <XLogo className="size-3.5" />
                  {setup.refreshX}
                </Button>
              </div>
            ) : null}
          </Field>
        )}

        <Field>
          <div className="flex items-baseline justify-between">
            <FieldLabel htmlFor="beat" className="text-sm">
              {setup.beatLabel}
            </FieldLabel>
            <span aria-live="polite" className="text-xs text-muted-foreground tabular-nums">
              {beat.length}/{setup.beatMax}
            </span>
          </div>
          <Textarea
            id="beat"
            name="beat"
            value={beat}
            maxLength={setup.beatMax}
            onChange={(e) => {
              setBeat(e.target.value);
              if (e.target.value.trim()) setMissing(false);
            }}
            placeholder={setup.beatPlaceholder}
            aria-invalid={missing || undefined}
            aria-describedby={missing ? "beat-error" : undefined}
            className="min-h-28 resize-none text-base leading-relaxed md:text-base"
          />
          {missing ? (
            <FieldError id="beat-error" className="text-sm">
              {setup.beatRequired}
            </FieldError>
          ) : null}
        </Field>

        <Button type="submit" className="h-11 text-sm">
          {waitlist ? setup.waitlistSubmit : setup.submit}
        </Button>
      </FieldGroup>

      {waitlist ? null : (
        <section aria-label="What happens next" className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-semibold">What happens next</h2>
          <ol className="mt-3 space-y-2.5">
            {next.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            Your free week starts when your agent is ready and includes 300 watched X posts.
          </p>
        </section>
      )}
    </form>
  );
}
