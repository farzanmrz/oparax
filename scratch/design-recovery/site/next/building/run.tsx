"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ChevronDown, RotateCcw, TriangleAlert } from "lucide-react";
import StatusMark, { type StatusMarkStatus } from "@/components/react-bits/StatusMark";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import { beat, postsRead, profile } from "../data/onboarding";
import { building } from "../copy";
import {
  partsAt,
  partsFailed,
  partsFrozen,
  REPLAY_MS,
  stageOf,
  stageTitles,
  type PartState,
  type StageId,
  type ToolPart,
} from "./model";
import { ScoreResult, ScoreRunning } from "./score-stage";
import {
  BriefBody,
  ChooseResult,
  ChooseRunning,
  PostsResult,
  PostsRunning,
  ProfileResult,
  ProfileRunning,
} from "./stage-bodies";

export type RunMode = { kind: "replay" } | { kind: "frozen"; at: number | "done" } | { kind: "failed" };

const markStatus: Record<PartState, StatusMarkStatus> = {
  queued: "pending",
  "input-available": "running",
  "output-available": "done",
  "output-error": "failed",
};

const stateLabel: Record<PartState, string> = {
  queued: "Queued",
  "input-available": "Running",
  "output-available": "Done",
  "output-error": "Stopped",
};

// Round 1 change 11: when the build is done, stages 1 and 2 collapse to these one-line summaries.
const SUMMARY_STAGES = 2;
const summaries: Partial<Record<StageId, string>> = {
  lookupProfile: `${profile.name}, ${profile.handle}`,
  readPosts: `${postsRead} newest posts and your pinned post`,
};

// Generative UI: switch on the part's type, then on its state, to pick the component.
function Body({ part }: { part: ToolPart }) {
  const running = part.state === "input-available";
  switch (stageOf(part)) {
    case "lookupProfile":
      return running ? <ProfileRunning /> : <ProfileResult />;
    case "readPosts":
      return running ? <PostsRunning /> : <PostsResult />;
    case "scoreSources":
      return running ? <ScoreRunning progress={part.progress} /> : <ScoreResult />;
    case "chooseSources":
      return running ? <ChooseRunning /> : <ChooseResult />;
    case "writeBrief":
      return <BriefBody streaming={running} />;
  }
}

function Stage({
  part,
  index,
  last,
  complete,
  failed,
}: {
  part: ToolPart;
  index: number;
  last: boolean;
  complete: boolean;
  failed: boolean;
}) {
  const stage = stageOf(part);
  const title = stageTitles[stage];
  const hasBody = part.state === "input-available" || part.state === "output-available";
  // null follows the run (summary stages close when the build is done); a click makes it the reader's choice.
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? !(complete && index < SUMMARY_STAGES);
  const summary = !open && part.state === "output-available" ? summaries[stage] : undefined;
  // Round 1 change 15: after a failure, later steps never ran.
  const label = failed && part.state === "queued" ? "Not started" : stateLabel[part.state];
  return (
    <li className="relative grid grid-cols-[28px_1fr] gap-x-4">
      {!last ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-8 bottom-0 left-[13.5px] w-px",
            part.state === "output-available" ? "bg-muted-foreground/50" : "bg-border",
          )}
        />
      ) : null}
      {/* Neutral marks: blue is kept for actions, the score state and the one done moment (change 24). */}
      <span className="relative z-10 grid size-7 place-items-center rounded-full bg-background text-foreground">
        <StatusMark
          status={markStatus[part.state]}
          size={22}
          color="var(--color-muted-foreground)"
          doneColor="var(--color-foreground)"
          errorColor="var(--color-destructive)"
        />
      </span>
      <Collapsible open={hasBody && open} onOpenChange={setChoice} className="min-w-0 pb-8">
        <CollapsibleTrigger
          disabled={!hasBody}
          className="group flex min-h-7 w-full items-center gap-3 text-left disabled:cursor-default"
        >
          <span className="text-xs text-muted-foreground tabular-nums">{index + 1}</span>
          <span
            className={cn(
              "flex-1 text-base",
              part.state === "queued" && "text-muted-foreground",
              part.state === "output-available" && "font-medium",
            )}
          >
            {part.state === "input-available" ? (
              <Shimmer as="span" className="font-medium">
                {title}
              </Shimmer>
            ) : (
              title
            )}
            {summary ? <span className="ml-2.5 text-sm font-normal text-muted-foreground">{summary}</span> : null}
          </span>
          <span
            className={cn(
              "text-xs",
              part.state === "output-error" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          {hasBody ? (
            <ChevronDown
              className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90"
              aria-hidden="true"
            />
          ) : null}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <Body part={part} />
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function useParts(mode: RunMode) {
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (mode.kind !== "replay") return;
    if (reduced) {
      setElapsed(REPLAY_MS);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(REPLAY_MS, now - start);
      setElapsed(t);
      if (t < REPLAY_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode.kind, reduced]);
  if (mode.kind === "failed") return partsFailed();
  if (mode.kind === "frozen") return partsFrozen(mode.at);
  return partsAt(elapsed);
}

export function BuildRun({ mode }: { mode: RunMode }) {
  const parts = useParts(mode);
  const done = parts.filter((p) => p.state === "output-available").length;
  const current = parts.find((p) => p.state === "input-available" || p.state === "output-error");
  const failed = mode.kind === "failed";
  const complete = done === parts.length;
  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-12">
      <header className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{building.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            For {profile.handle}, following
          </p>
          <p className="mt-1 text-lg leading-snug">{beat}</p>
        </div>
        {complete ? (
          // Round 1 change 11: the next action also sits beside the heading, not only below five stages.
          <div className="flex shrink-0 items-center gap-3 pb-1">
            <span className="text-sm font-medium">Your agent is ready.</span>
            <Button asChild className="h-9 px-4 text-sm">
              <Link href="/next/ready">Open your feed</Link>
            </Button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2.5 pb-1">
            <span className="h-1 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-muted-foreground/70 transition-[width] duration-300 ease-out"
                style={{ width: `${(done / parts.length) * 100}%` }}
              />
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {done} of {parts.length} done
            </span>
          </div>
        )}
      </header>
      <p className="mt-4 text-xs text-muted-foreground">Illustrative example, not a real run.</p>

      <p className="sr-only" aria-live="polite">
        {complete ? "Your agent is ready." : current ? stageTitles[stageOf(current)] : ""}
      </p>

      {failed ? (
        <div
          role="alert"
          className="mt-8 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm">{building.failed(stageTitles.readPosts)}</p>
            <Button variant="outline" className="mt-3 h-9 px-3 text-sm">
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {building.retry}
            </Button>
          </div>
        </div>
      ) : null}

      <ol className="mt-10">
        {parts.map((part, i) => (
          <Stage
            key={part.type}
            part={part}
            index={i}
            last={i === parts.length - 1}
            complete={complete}
            failed={failed}
          />
        ))}
      </ol>

      {complete ? (
        <div className="flex items-center justify-between gap-6 rounded-xl border border-primary/40 bg-accent/60 px-5 py-4">
          <div>
            <p className="font-medium">Your agent is ready.</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Your free week has started: 7 days and 300 watched X posts.
            </p>
          </div>
          <Button asChild className="h-10 px-4 text-sm">
            <Link href="/next/ready">Open your feed</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
