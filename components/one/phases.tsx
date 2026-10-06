import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { lift } from "@/components/one/stage";
import { monitorContent } from "@/lib/monitor/content";
import type { Phase, PhaseState } from "@/lib/onboarding/phases";
import { cn } from "@/lib/utils";

// The seven phases as records on one lifted card (design preview v2/one/onboarding.tsx Timeline): the mark, the
// name, and one line: what the phase does until its result is known, then the result. Before a run every ring is
// empty. A running phase sits on the amber wash.

const copy = monitorContent.onboarding;

function Mark({ state }: { state: PhaseState }) {
  const size = "size-5 shrink-0";
  if (state === "done")
    return <CircleCheck className={cn(size, "text-[var(--ok)]")} aria-hidden="true" />;
  if (state === "failed")
    return <CircleX className={cn(size, "text-[var(--error)]")} aria-hidden="true" />;
  if (state === "running")
    return (
      <LoaderCircle
        className={cn(size, "animate-spin text-[var(--caution)] motion-reduce:animate-none")}
        aria-hidden="true"
      />
    );
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={size}
      fill="none"
      stroke={state === "skipped" ? "var(--t3)" : "var(--line-strong)"}
      strokeWidth={2}
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

export function PhaseList({ phases }: { phases: Phase[] }) {
  return (
    <aside
      aria-label={copy.phasesLabel}
      className={cn(lift, "overflow-hidden desk:sticky desk:top-6")}
    >
      <ol className="px-3 py-3">
        {phases.map(({ id, state, result }) => {
          const { title, does } = copy.phases[id];
          const quiet = state === "waiting";
          return (
            <li
              key={id}
              className={cn(
                "grid grid-cols-[20px_1fr] gap-x-3 rounded-lg px-2 py-2.5",
                state === "running" && "bg-[var(--caution-soft)]",
              )}
            >
              <span className="pt-px">
                <Mark state={state} />
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[13px] leading-snug",
                    quiet ? "text-t3" : "font-medium text-t1",
                  )}
                >
                  {state === "running" ? (
                    <Shimmer as="span" duration={1.8} className="font-medium">
                      {title}
                    </Shimmer>
                  ) : (
                    title
                  )}
                  <span className="sr-only">, {stateWord[state]}</span>
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[12px] leading-snug",
                    state === "failed" ? "text-[var(--error)]" : "text-t3",
                  )}
                >
                  {result ?? does}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
