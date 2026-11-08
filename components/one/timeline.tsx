"use client";

import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { railRow } from "@/components/one/app-shell";
import { ProfileAvatar } from "@/components/one/profile-avatar";
import { monitorContent } from "@/lib/monitor/content";
import type { Phase, PhaseState } from "@/lib/onboarding/phases";
import type { Onboarding } from "@/lib/onboarding/read";
import { cn } from "@/lib/utils";

// The seven steps alone in the rail's middle (owner, Oct 10: "The onboarding sidebar at rest is locked"; lab
// v2/one/onboarding.tsx Timeline), each in the rail's row: the status mark in the icon slot (an empty ring while
// waiting, the --ok check once done, the --caution ring on the current step, --error when it stopped) and the step's
// name, at most four words. Once step 1 finds the person, their picture, name, handle and bio sit under the steps
// after a divider, set straight on the rail, no block (owner, Nov 8).

const copy = monitorContent.onboarding;

/** The shimmer in the rail's own colours: the text tier for the bright band, the quiet tier around it. */
export const shimmerClass =
  "font-medium [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]";

function Mark({ state }: { state: PhaseState }) {
  if (state === "done")
    return <CircleCheck className="size-[15px] text-[var(--ok)]" aria-hidden="true" />;
  if (state === "failed")
    return <CircleX className="size-[15px] text-[var(--error)]" aria-hidden="true" />;
  if (state === "running")
    return (
      <LoaderCircle
        className="size-[15px] animate-spin text-[var(--caution)] motion-reduce:animate-none"
        aria-hidden="true"
      />
    );
  return (
    <svg
      viewBox="0 0 24 24"
      width={15}
      height={15}
      aria-hidden="true"
      fill="none"
      stroke={state === "skipped" ? "var(--t3)" : "var(--line-strong)"}
      strokeWidth={state === "skipped" ? 2 : 2.4}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" strokeDasharray={state === "skipped" ? "2.5 3" : undefined} />
      {state === "skipped" ? <path d="M8.5 12h7" /> : null}
    </svg>
  );
}

const stateWord: Record<PhaseState, string> = {
  waiting: "waiting",
  running: "running",
  done: "done",
  skipped: "skipped",
  failed: "stopped",
};

export function Timeline({ phases }: { phases: Phase[] }) {
  return (
    <section aria-label={copy.phasesLabel} className="pb-3">
      <ol className="flex flex-col gap-[2px]">
        {phases.map(({ id, state }) => (
          <li
            key={id}
            id={`step-${id}`}
            className={cn(
              railRow,
              "h-auto min-h-8 items-start py-[7px] leading-[18px]",
              (state === "running" || state === "failed") && "bg-raised",
            )}
          >
            <span className="grid h-[18px] w-[15px] shrink-0 place-items-center">
              <Mark state={state} />
            </span>
            <span
              className={cn(
                "min-w-0 flex-1",
                state === "waiting"
                  ? "text-t3"
                  : state === "running"
                    ? "font-medium text-t1"
                    : state === "failed"
                      ? "text-[var(--error)]"
                      : "text-t2",
              )}
            >
              {state === "running" ? (
                <Shimmer as="span" duration={1.8} className={shimmerClass}>
                  {copy.phases[id].title}
                </Shimmer>
              ) : (
                copy.phases[id].title
              )}
              <span className="sr-only">, {stateWord[state]}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The person step 1 found, under the steps in the rail: a divider, then picture, name, handle and their Twitter bio. */
export function RailProfile({ profile }: { profile: NonNullable<Onboarding["profile"]> }) {
  return (
    <section aria-label={copy.profileLabel} className="mx-2 mb-3 border-t border-line px-2 pt-4">
      <div className="flex items-center gap-2.5">
        <ProfileAvatar profile={{ name: profile.name, image: profile.image }} size={32} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-t1">{profile.name}</p>
          <p className="truncate text-[12px] text-t3">@{profile.handle.replace(/^@/, "")}</p>
        </div>
      </div>
      {profile.bio ? (
        <p className="mt-2.5 text-[12.5px] leading-[1.5] text-t2">{profile.bio}</p>
      ) : null}
    </section>
  );
}
