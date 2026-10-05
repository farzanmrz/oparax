"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { setup } from "@/next/copy";
import { cn } from "@/lib/utils";
import { beat, HANDLE } from "@/v2/deck/data";
import { BASE } from "./card";

// One setup is the onboarding page before the run (owner, Oct 4: "the account name and what you want to follow all
// come in a straight line up top. There's no difference between the building page and the setup page. It comes up
// top. There's a button on the side."). These are the fields that line holds: the public X handle, the one sentence
// as one line, and Build my agent at the right. The onboarding page draws them in its top bar before the run
// (phase "setup"); Build my agent starts the run on the same page with both values in the query.

const field =
  "flex h-9 items-center gap-2 rounded-md border border-line-strong bg-[var(--well)] px-3 transition-shadow focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--brand-soft)]";
const HANDLE_REQUIRED = "Type the X handle your agent is built around.";
const PLACEHOLDER = "One sentence. Name the topics, people or products you care about.";

/** ?handle=typed leaves the handle for the person to type; ?error=blank opens with the sentence empty and its error. */
export function SetupFields({ typed, blank }: { typed: boolean; blank: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(blank ? "" : beat);
  const [handle, setHandle] = useState(typed ? "" : HANDLE);
  const [error, setError] = useState(blank);
  const [handleError, setHandleError] = useState(false);
  const message = [handleError ? HANDLE_REQUIRED : null, error ? setup.beatRequired : null].filter(Boolean).join(" ");
  return (
    <form
      className="min-w-0 flex-1"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const h = handle.trim();
        const t = text.trim();
        setHandleError(!h);
        setError(!t);
        if (!h || !t) return;
        router.push(`${BASE}/onboarding?${new URLSearchParams({ handle: h, sentence: t })}`);
      }}
    >
      <div className="flex items-center gap-3">
        <label className={cn(field, "w-[220px] shrink-0", handleError && "border-[var(--error)]")}>
          <span className="sr-only">{setup.handleLabel}</span>
          <span className="text-[14px] text-t3" aria-hidden="true">
            @
          </span>
          <input
            id="handle"
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value.replace(/^@/, ""));
              if (e.target.value.trim()) setHandleError(false);
            }}
            placeholder={setup.handlePlaceholder}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={handleError}
            aria-describedby={message ? "setup-error" : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-t1 outline-none placeholder:text-t3"
          />
          <XLogo className="size-3.5 shrink-0 text-t3" />
        </label>
        <label className={cn(field, "min-w-0 flex-1", error && "border-[var(--error)]")}>
          <span className="sr-only">{setup.beatLabel}</span>
          <input
            id="beat"
            value={text}
            maxLength={setup.beatMax}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim()) setError(false);
            }}
            placeholder={PLACEHOLDER}
            autoComplete="off"
            aria-invalid={error}
            aria-describedby={message ? "setup-error" : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-t1 outline-none placeholder:text-t3"
          />
          <span className="shrink-0 text-[11.5px] text-t3 tabular-nums" aria-hidden="true">
            {text.length}/{setup.beatMax}
          </span>
        </label>
        <button
          type="submit"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          {setup.submit}
        </button>
      </div>
      {message ? (
        <p id="setup-error" role="alert" className="mt-2 text-[12.5px] text-[var(--error)]">
          {message}
        </p>
      ) : null}
    </form>
  );
}
