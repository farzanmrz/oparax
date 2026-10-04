"use client";

import StatusMark, { type StatusMarkStatus } from "@/components/react-bits/StatusMark";
import type { StepState } from "./steps";

const status: Record<Exclude<StepState, "skipped">, StatusMarkStatus> = {
  waiting: "pending",
  running: "running",
  done: "done",
  failed: "failed",
};

/** React Bits StatusMark for waiting, running, done and failed; a quiet dashed ring with a dash for a skipped step.
 * Green is done, amber running, red failed. */
export function StepMark({ state, size = 20, className }: { state: StepState; size?: number; className?: string }) {
  if (state === "skipped")
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className} fill="none" stroke="var(--t3)" strokeWidth={2} strokeLinecap="round">
        <circle cx="12" cy="12" r="9" strokeDasharray="2.5 3" />
        <path d="M8.5 12h7" />
      </svg>
    );
  return <StatusMark status={status[state]} size={size} color="var(--caution)" doneColor="var(--ok)" errorColor="var(--error)" strokeWidth={2} className={className} />;
}
