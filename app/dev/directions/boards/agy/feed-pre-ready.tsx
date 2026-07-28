"use client";

// kit mapping:
// - PageFrame from "@/app/dev/directions/chrome"
// - Button, Progress from "@/components/ui/*"
// -> bespoke: <ExpectationStrip>, <StepRow>, <GhostStoryPair>

import {
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  Loader2Icon,
  RefreshCcwIcon,
  SparklesIcon,
  XCircleIcon,
} from "lucide-react";
import { useState } from "react";
import { PageFrame } from "@/app/dev/directions/chrome";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function ExpectationStrip() {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-6 bg-muted/50 rounded-lg p-3 sm:p-4 text-sm">
      <div className="flex items-center gap-2 text-foreground font-medium">
        <ClockIcon className="size-4 text-muted-foreground" />
        <span>~5–6 minutes</span>
      </div>
      <div className="hidden sm:block w-px h-4 bg-border" />
      <div className="flex items-center gap-2 text-muted-foreground">
        <SparklesIcon className="size-4" />
        <span>Safe to leave and come back</span>
      </div>
      <div className="hidden sm:block w-px h-4 bg-border" />
      <div className="flex items-center gap-2 text-muted-foreground">
        <BookOpenIcon className="size-4" />
        <span>Voice & Setup fill in automatically</span>
      </div>
    </div>
  );
}

function GhostStoryPair() {
  return (
    <div className="grid gap-4 grid-cols-2">
      <div className="h-64 rounded-xl border-2 border-dashed border-border bg-card/30 flex items-center justify-center p-6 text-center">
        <span className="text-muted-foreground text-sm font-medium">Source story lands here</span>
      </div>
      <div className="h-64 rounded-xl border-2 border-dashed border-border bg-card/30 flex items-center justify-center p-6 text-center">
        <span className="text-muted-foreground text-sm font-medium">Draft lands here</span>
      </div>
    </div>
  );
}

type StepState = "pending" | "active" | "complete" | "failed";
type StepItem = {
  key: string;
  label: string;
  detail?: string | null;
  state: StepState;
  hasReasoning: boolean;
  reasoningContent?: React.ReactNode;
  defaultExpanded?: boolean;
};

function StepRow({
  label,
  state,
  detail,
  hasReasoning,
  reasoningContent,
  defaultExpanded = true,
}: StepItem) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const icon =
    state === "complete" ? (
      <CheckCircle2Icon className="size-5 text-primary" />
    ) : state === "failed" ? (
      <XCircleIcon className="size-5 text-destructive" />
    ) : state === "active" ? (
      <Loader2Icon className="size-5 text-primary animate-spin" />
    ) : (
      <CircleIcon className="size-5 text-muted-foreground/30" />
    );

  const isClickable = hasReasoning && (state === "active" || state === "complete");

  return (
    <div className="flex flex-col border-b border-border last:border-0">
      <button
        type="button"
        disabled={!isClickable}
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center justify-between py-4 text-left",
          isClickable
            ? "cursor-pointer hover:bg-muted/50 transition-colors px-2 -mx-2 rounded-md"
            : "",
        )}
      >
        <div className="flex items-center gap-3">
          {icon}
          <div className="flex flex-col">
            <span
              className={cn(
                "font-medium text-sm",
                state === "pending" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {label}
            </span>
            {detail && <span className="text-muted-foreground text-xs mt-0.5">{detail}</span>}
          </div>
        </div>
        {isClickable && (
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              expanded ? "rotate-180" : "",
            )}
          />
        )}
      </button>
      {isClickable && expanded && reasoningContent && (
        <div className="pb-4 pl-[2.25rem] pr-2">
          <div className="text-sm text-muted-foreground/90 font-mono bg-muted/30 p-3 rounded-md leading-relaxed whitespace-pre-wrap">
            {reasoningContent}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedPreReadyBoard({ viewport }: { viewport: "mobile" | "web" }) {
  const renderState = (note: string, stage: number, _subState: string = "") => {
    const progressMap = [0, 0, 25, 50, 75, 100, 100, 50, 50];
    const progress = stage === 71 ? 25 : stage === 72 ? 75 : progressMap[stage] || 0;

    const steps: StepItem[] = [
      {
        key: "reading",
        label: "Reading recent posts",
        state:
          stage > 2 || stage === 6 || stage === 72 || stage === 8
            ? "complete"
            : stage === 2
              ? "active"
              : stage === 71
                ? "failed"
                : "pending",
        detail:
          stage > 1 && stage !== 71
            ? "Read 100 posts"
            : stage === 71
              ? "Couldn't read posts for this handle."
              : null,
        hasReasoning: false,
      },
      {
        key: "beat",
        label: "Working out your beat",
        state:
          stage > 3 || stage === 6 || stage === 72 || stage === 8
            ? "complete"
            : stage === 3
              ? "active"
              : "pending",
        detail: stage > 3 || stage === 8 ? "Set aside 12 off-beat posts — gaming content" : null,
        hasReasoning: true,
        defaultExpanded: stage === 3,
        reasoningContent:
          "Looking at the last 100 posts, the recurring subjects are Arsenal team news, transfer sourcing, and match reaction. A cluster of 12 posts about gaming reads as personal content rather than the beat — setting those aside so they don't teach the guide",
      },
      {
        key: "learning",
        label: "Learning how you write",
        state:
          stage > 4 || stage === 6
            ? "complete"
            : stage === 4 || stage === 8
              ? "active"
              : stage === 72
                ? "failed"
                : "pending",
        detail:
          stage > 4 || stage === 8
            ? "4,812 chars generated"
            : stage === 4
              ? "4,812 chars generated"
              : stage === 72
                ? "The extraction call didn't finish."
                : null,
        hasReasoning: true,
        defaultExpanded: stage === 4 || stage === 8,
        reasoningContent:
          stage === 8
            ? "Picked up from earlier:\nLooking at the last 100 posts... (beat analysis)\n\nShort declarative openers dominate — 62 of 88 posts start with the club name. Emoji: only the red circle, and only on confirmed transfers. Building the sourcing-language section next"
            : "Short declarative openers dominate — 62 of 88 posts start with the club name. Emoji: only the red circle, and only on confirmed transfers. Building the sourcing-language section next",
      },
      {
        key: "saving",
        label: "Saving your voice rules",
        state: stage === 6 ? "complete" : stage === 5 ? "active" : "pending",
        hasReasoning: false,
      },
    ];

    const isComplete = stage === 6;

    return (
      <PageFrame viewport={viewport} chrome="desk" note={note}>
        <div className="py-6 sm:py-8 flex flex-col gap-8 w-full">
          {isComplete ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border px-4 py-20 text-center mt-10">
              <h3 className="text-base font-semibold">Nothing on the wire yet</h3>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">
                As your agent drafts posts on this beat, they'll appear here — a source story and
                its winning draft, side by side, newest first.
              </p>
              <Button variant="outline" className="mt-2">
                <BookOpenIcon className="mr-2 size-4" />
                See what it learned
              </Button>
            </div>
          ) : (
            <>
              <ExpectationStrip />

              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
                <div className="flex flex-col gap-6 lg:w-[28rem] shrink-0">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Extracting voice</span>
                      <span className="text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex flex-col rounded-xl border border-border bg-card p-2 sm:p-4">
                    {steps.map(({ key: stepKey, ...rest }) => (
                      <StepRow key={stepKey} {...rest} />
                    ))}
                  </div>

                  {(stage === 71 || stage === 72) && (
                    <div className="flex items-center justify-between bg-destructive/10 text-destructive text-sm p-4 rounded-lg">
                      <span className="font-medium">Something went wrong partway through.</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-destructive/20 hover:bg-destructive/10"
                      >
                        <RefreshCcwIcon className="mr-1.5 size-3" />
                        Retry
                      </Button>
                    </div>
                  )}
                </div>

                {viewport === "web" && (
                  <div className="flex-1 flex flex-col gap-4 opacity-50 pointer-events-none hidden lg:flex">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Feed Preview
                    </h3>
                    <GhostStoryPair />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </PageFrame>
    );
  };

  return (
    <div className="flex flex-col gap-12 py-12 items-center">
      {renderState("(1) just arrived — run starting", 1)}
      {renderState("(2) reading posts", 2)}
      {renderState("(3) working out the beat", 3)}
      {renderState("(4) learning how you write", 4)}
      {renderState("(5) saving voice rules", 5)}
      {renderState("(6) complete", 6)}
      {renderState("(7) failed — corpus_failed", 71)}
      {renderState("(7) failed — extraction_failed", 72)}
      {renderState("(8) returned mid-run — merged backlog", 8)}
    </div>
  );
}
