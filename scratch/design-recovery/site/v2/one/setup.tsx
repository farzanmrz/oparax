"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { setup } from "@/next/copy";
import { cn } from "@/lib/utils";
import { lift } from "@/v2/deck/chrome";
import { beat, HANDLE } from "@/v2/deck/data";
import { BASE } from "./card";
import { Shell } from "./rail";

// One setup: the precursor to the onboarding page and nothing else (owner, Oct 4: "the setup page simply needs to be
// a precursor to the onboarding page"). The public X handle the agent is built around, the one sentence, and Build
// my agent. No sign-in with X is needed ("That doesn't mean they have to connect it"). The sample result and the
// sample source list moved to the onboarding page, where they are the real run.

const field =
  "w-full rounded-lg border border-line-strong bg-[var(--well)] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)]";

export function OneSetup({ typed, blank }: { typed: boolean; blank: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(blank ? "" : beat);
  const [handle, setHandle] = useState(typed ? "" : HANDLE);
  const [error, setError] = useState(blank);
  const [handleError, setHandleError] = useState(false);
  return (
    <Shell
      light={640}
      header={
        <header className="flex items-center gap-3">
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">{setup.title}</h1>
        </header>
      }
    >
      {/* Left aligned under the page title like every other One page (owner, Oct 4: "Setup, for some reason, you've
          centered it. Why? There just needs to be one visual UI."). */}
      <main className="relative pb-16">
        <div className="w-full max-w-[560px]">
          <form
            className={cn(lift, "p-6")}
            style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const noHandle = !handle.trim();
              const noText = !text.trim();
              setHandleError(noHandle);
              setError(noText);
              if (noHandle || noText) return;
              router.push(`${BASE}/onboarding`);
            }}
          >
            <label htmlFor="handle" className="block text-[13px] font-medium text-t2">
              {setup.handleLabel}
            </label>
            <div className={cn(field, "mt-2 flex h-11 items-center gap-2 px-3", handleError && "border-[var(--error)]")}>
              <span className="text-[15px] text-t3">@</span>
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
                aria-describedby={handleError ? "handle-error" : undefined}
                className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-t3"
              />
              <XLogo className="size-3.5 text-t3" />
            </div>
            {handleError ? (
              <p id="handle-error" role="alert" className="mt-2 text-[12.5px] text-[var(--error)]">
                Type the X handle your agent is built around.
              </p>
            ) : null}

            <label htmlFor="beat" className="mt-6 block text-[13px] font-medium text-t2">
              {setup.beatLabel}
            </label>
            <textarea
              id="beat"
              value={text}
              maxLength={setup.beatMax}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.trim()) setError(false);
              }}
              placeholder={setup.beatPlaceholder}
              rows={3}
              aria-invalid={error}
              aria-describedby="beat-help"
              className={cn(field, "mt-2 block resize-none px-3.5 py-3 text-[16px] leading-[1.5]", error && "border-[var(--error)]")}
            />
            <p id="beat-help" className="mt-2 flex justify-between gap-4 text-[12.5px]">
              {error ? (
                <span role="alert" className="text-[var(--error)]">
                  {setup.beatRequired}
                </span>
              ) : (
                <span className="text-t3">One sentence. Name the topics, people or products you care about.</span>
              )}
              <span className="shrink-0 text-t3 tabular-nums">
                {text.length}/{setup.beatMax}
              </span>
            </p>
            <button
              type="submit"
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {setup.submit}
            </button>
          </form>
          <p className="mt-3.5 text-[12.5px] text-t3">Your public X handle is enough. No sign-in with X needed.</p>
        </div>
      </main>
    </Shell>
  );
}
