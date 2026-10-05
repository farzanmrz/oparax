import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { stepIds } from "./mode";
import type { RunMode } from "./mode";
import {
  chosenAccounts,
  chosenSites,
  possibleCandidates,
  postsRead,
  profile,
  quotedCandidates,
  setAsideCount,
  strongCandidates,
  tableRows,
} from "../data/onboarding";

// The Building page's one step model: the eight steps of the onboarding run in order, each with a state
// (waiting, running, done, skipped, failed) and how far it has got while running. Three renderers (Window,
// Newsroom, Deck) read it. Timers serve the replay only; the real product reports each step itself.

export { stepIds };
export type { RunMode };
export type { StepId } from "./mode";
import type { StepId } from "./mode";
export type StepState = "waiting" | "running" | "done" | "skipped" | "failed";

export const stepTitle: Record<StepId, string> = {
  profile: "Find your X profile",
  posts: "Read your newest posts",
  gather: "Gather candidates",
  jev: "Jev checks relevance",
  choose: "Choose sources",
  search: "Search X for more accounts",
  brief: "Write your brief",
  save: "Save your agent",
};

const sitesAndFeeds = chosenSites.length;
const accounts = chosenAccounts.length;

/** What each step says once it has finished. Counts come from the recorded run, never from a timer. */
export const stepLine: Record<StepId, string> = {
  profile: `Found ${profile.name} on X.`,
  posts: `Read ${postsRead} newest posts. A thread counts as one. Replies and reposts are left out.`,
  gather: `${tableRows} from the source list, ${quotedCandidates.length} accounts you quoted.`,
  jev: `Jev kept ${strongCandidates.length} as strong and ${possibleCandidates.length} as possible, and set ${setAsideCount} aside.`,
  choose: `Chose ${sitesAndFeeds} sites and feeds and ${accounts} X accounts.`,
  search: "No X search. Enough accounts already fit.",
  brief: "Wrote your brief.",
  save: "Saved your agent.",
};

export const stepLabel: Record<StepState, string> = {
  waiting: "Waiting",
  running: "Running",
  done: "Done",
  skipped: "Skipped",
  failed: "Stopped",
};

export type Run = { states: StepState[]; progress: number[] };

export const SEARCH = stepIds.indexOf("search");
export const JEV = stepIds.indexOf("jev");

// Milliseconds each step runs in the replay (sums to 48 seconds, owner pass 14: "the loop is going so fast"). The
// search step is decided, not run: its 2 seconds keep the skip line on screen.
const durations = [4000, 8000, 6000, 12000, 6000, 2000, 7000, 3000];
export const REPLAY_MS = durations.reduce((a, b) => a + b, 0);

export function runAt(elapsed: number): Run {
  let start = 0;
  const states: StepState[] = [];
  const progress: number[] = [];
  durations.forEach((d, i) => {
    const end = start + d;
    if (i === SEARCH) {
      const decided = elapsed >= start;
      states.push(decided ? "skipped" : "waiting");
      progress.push(decided ? 1 : 0);
    } else {
      const s: StepState = elapsed >= end ? "done" : elapsed >= start ? "running" : "waiting";
      states.push(s);
      progress.push(s === "done" ? 1 : s === "running" ? (elapsed - start) / d : 0);
    }
    start = end;
  });
  return { states, progress };
}

/** ?at=1..8 freezes step N mid-run with the steps before it finished; ?at=6 is the moment the search is skipped. */
export function runFrozen(at: number | "done"): Run {
  const states = stepIds.map<StepState>((_, i) => {
    const n = i + 1;
    if (i === SEARCH) return at === "done" || at >= 6 ? "skipped" : "waiting";
    if (at === "done" || n < at) return "done";
    if (n === at) return "running";
    return "waiting";
  });
  return { states, progress: states.map((s) => (s === "done" || s === "skipped" ? 1 : s === "running" ? 0.5 : 0)) };
}

/** The recorded failure: the X timeline did not answer during step 2. Later steps never started. */
export function runFailed(): Run {
  const states = stepIds.map<StepState>((_, i) => (i === 0 ? "done" : i === 1 ? "failed" : "waiting"));
  return { states, progress: states.map((s) => (s === "done" ? 1 : 0)) };
}

export function useRun(mode: RunMode, replayKey = 0): Run {
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (mode.kind !== "replay") return;
    if (reduced) {
      setElapsed(REPLAY_MS);
      return;
    }
    setElapsed(0);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(REPLAY_MS, now - start);
      setElapsed(t);
      if (t < REPLAY_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode.kind, reduced, replayKey]);
  if (mode.kind === "failed") return runFailed();
  if (mode.kind === "frozen") return runFrozen(mode.at);
  return runAt(elapsed);
}

export const isDone = (r: Run) => r.states.every((s) => s === "done" || s === "skipped");
export const currentStep = (r: Run) => r.states.findIndex((s) => s === "running" || s === "failed");
/** The people-facing words a screen reader hears for the current step. */
export const announce = (r: Run) => {
  if (isDone(r)) return "Your agent is saved.";
  const i = currentStep(r);
  return i < 0 ? "" : r.states[i] === "failed" ? `${stepTitle[stepIds[i]]} stopped.` : `${stepTitle[stepIds[i]]}.`;
};

/** Brings the running step into view as the replay moves on, so the newest work is what the person sees. */
export function useFollow(run: Run, enabled: boolean) {
  const reduced = useReducedMotion();
  const cur = run.states.findIndex((s) => s === "running");
  useEffect(() => {
    if (!enabled || cur < 0) return;
    document.getElementById(`step-${stepIds[cur]}`)?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
  }, [cur, enabled, reduced]);
}
