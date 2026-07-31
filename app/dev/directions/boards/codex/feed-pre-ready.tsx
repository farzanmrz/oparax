"use client";

// kit mapping:
// Full-page viewport, shared header, and responsive tabs -> PageFrame.
// Stage rail -> ChainOfThought and ChainOfThoughtStep.
// Inline stage disclosure -> Collapsible and CollapsibleContent inside each step.
// Live stage language -> Shimmer.
// Tool evidence and compact state facts -> Badge.
// Future Feed geometry -> Skeleton.
// Recovery and Voice navigation -> Button.
// Scannable duration/safe-return/setup narrative -> bespoke (proposed pattern: Expectation strip).
// Clickable stage label with an inline stream slot -> bespoke (proposed pattern: Inline reasoning rail).
// Dashed source/draft silhouettes -> bespoke (proposed pattern: Source-to-draft ghosts).
// Feed-local retry -> bespoke (proposed pattern: Inline extraction recovery).

import type { LucideIcon } from "lucide-react";
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  Clock3Icon,
  DoorOpenIcon,
  FilePenLineIcon,
  InfoIcon,
  ListFilterIcon,
  PanelsTopLeftIcon,
  PenLineIcon,
  RadioIcon,
  RefreshCwIcon,
  SaveIcon,
} from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { PageFrame } from "@/app/dev/directions/chrome";
import { ChainOfThought, ChainOfThoughtStep } from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Viewport = "mobile" | "web";
type StepState = "pending" | "active" | "complete" | "failed";
type StageKey = "reading" | "scope" | "extract" | "save";
type FeedKind =
  | "starting"
  | "reading"
  | "scope"
  | "extract"
  | "saving"
  | "corpus_failed"
  | "extraction_failed"
  | "returned";

type StageSpec = {
  readonly key: StageKey;
  readonly label: string;
  readonly detail?: string;
  readonly state: StepState;
  readonly reasoning?: string;
  readonly initialOpen?: boolean;
  readonly toolNote?: string;
  readonly backlogNote?: string;
};

const SCOPE_REASONING =
  "Looking at the last 100 posts, the recurring subjects are Arsenal team news, transfer sourcing, and match reaction. A cluster of 12 posts about gaming reads as personal content rather than the beat — setting those aside so they don’t teach the guide.";

const EXTRACT_REASONING =
  "Short declarative openers dominate — 62 of 88 posts start with the club name. Emoji: only the red circle, and only on confirmed transfers. Building the sourcing-language section next.";

const STAGE_ICONS: Record<StageKey, LucideIcon> = {
  reading: BookOpenIcon,
  scope: ListFilterIcon,
  extract: PenLineIcon,
  save: SaveIcon,
};

const STEP_STATUS = {
  active: "active",
  complete: "complete",
  failed: "active",
  pending: "pending",
} as const;

const STEP_NUMBER: Record<FeedKind, number> = {
  starting: 1,
  reading: 1,
  scope: 2,
  extract: 3,
  saving: 4,
  corpus_failed: 1,
  extraction_failed: 3,
  returned: 3,
};

function stateLabel(state: StepState): string {
  if (state === "complete") return "Done";
  if (state === "active") return "Now";
  if (state === "failed") return "Stopped";
  return "Next";
}

function StageRow({ step }: { readonly step: StageSpec }): JSX.Element {
  const [open, setOpen] = useState(step.initialOpen ?? false);
  const Icon = STAGE_ICONS[step.key];
  const hasReasoning = step.reasoning !== undefined;
  const streaming = step.state === "active" && hasReasoning;
  const label = streaming ? (
    <Shimmer as="span" className="font-medium" duration={1.6}>
      {step.label}
    </Shimmer>
  ) : (
    <span className="font-medium">{step.label}</span>
  );
  const status = (
    <span
      className={cn(
        "shrink-0 text-xs",
        step.state === "failed" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {stateLabel(step.state)}
    </span>
  );

  return (
    <Collapsible onOpenChange={setOpen} open={hasReasoning ? open : false}>
      <ChainOfThoughtStep
        className={step.state === "failed" ? "text-destructive" : undefined}
        description={
          step.detail ? (
            <span
              className={step.state === "failed" ? "text-destructive" : "text-muted-foreground"}
            >
              {step.detail}
            </span>
          ) : undefined
        }
        icon={Icon}
        label={
          hasReasoning ? (
            <CollapsibleTrigger asChild>
              <button
                aria-label={`${open ? "Hide" : "Show"} details for ${step.label}`}
                className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md pr-1 text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
              >
                <span className="min-w-0 flex-1">{label}</span>
                {status}
                <ChevronDownIcon
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="flex min-h-11 items-center gap-2 pr-1">
              <span className="min-w-0 flex-1">{label}</span>
              {status}
            </div>
          )
        }
        status={STEP_STATUS[step.state]}
      >
        {hasReasoning ? (
          <CollapsibleContent className="pb-4 pr-2">
            <div className="space-y-3 border-primary/20 border-l-2 pl-3">
              {step.backlogNote ? (
                <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <InfoIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                  <span>{step.backlogNote}</span>
                </div>
              ) : null}
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {step.reasoning}
              </p>
              {streaming ? (
                <Shimmer as="p" className="text-xs" duration={1.5}>
                  Still learning…
                </Shimmer>
              ) : null}
              {step.toolNote ? (
                <Badge className="whitespace-normal font-normal" variant="secondary">
                  {step.toolNote}
                </Badge>
              ) : null}
            </div>
          </CollapsibleContent>
        ) : null}
      </ChainOfThoughtStep>
    </Collapsible>
  );
}

function stepsFor(kind: FeedKind): readonly StageSpec[] {
  switch (kind) {
    case "starting":
      return [
        {
          key: "reading",
          label: "Reading recent posts",
          detail: "Connecting to X…",
          state: "active",
        },
        { key: "scope", label: "Working out your beat", state: "pending" },
        { key: "extract", label: "Learning how you write", state: "pending" },
        { key: "save", label: "Saving your voice rules", state: "pending" },
      ];
    case "reading":
      return [
        {
          key: "reading",
          label: "Reading recent posts",
          detail: "Read 100 posts",
          state: "active",
        },
        { key: "scope", label: "Working out your beat", state: "pending" },
        { key: "extract", label: "Learning how you write", state: "pending" },
        { key: "save", label: "Saving your voice rules", state: "pending" },
      ];
    case "scope":
      return [
        {
          key: "reading",
          label: "Reading recent posts",
          detail: "Read 100 posts",
          state: "complete",
        },
        {
          key: "scope",
          label: "Working out your beat",
          state: "active",
          reasoning: SCOPE_REASONING,
          initialOpen: true,
          toolNote: "Set aside 12 off-beat posts — gaming content",
        },
        { key: "extract", label: "Learning how you write", state: "pending" },
        { key: "save", label: "Saving your voice rules", state: "pending" },
      ];
    case "extract":
      return [
        {
          key: "reading",
          label: "Reading recent posts",
          detail: "Read 100 posts",
          state: "complete",
        },
        {
          key: "scope",
          label: "Working out your beat",
          state: "complete",
          reasoning: SCOPE_REASONING,
          toolNote: "Set aside 12 off-beat posts — gaming content",
        },
        {
          key: "extract",
          label: "Learning how you write",
          detail: "4,812 chars generated",
          state: "active",
          reasoning: EXTRACT_REASONING,
          initialOpen: true,
        },
        { key: "save", label: "Saving your voice rules", state: "pending" },
      ];
    case "saving":
      return [
        {
          key: "reading",
          label: "Reading recent posts",
          detail: "Read 100 posts",
          state: "complete",
        },
        {
          key: "scope",
          label: "Working out your beat",
          state: "complete",
          reasoning: SCOPE_REASONING,
          toolNote: "Set aside 12 off-beat posts — gaming content",
        },
        {
          key: "extract",
          label: "Learning how you write",
          detail: "4,812 chars generated",
          state: "complete",
          reasoning: EXTRACT_REASONING,
        },
        {
          key: "save",
          label: "Saving your voice rules",
          detail: "Turning the guide into editable rules",
          state: "active",
        },
      ];
    case "corpus_failed":
      return [
        {
          key: "reading",
          label: "Reading recent posts",
          detail: "Couldn’t read posts for this handle.",
          state: "failed",
        },
        { key: "scope", label: "Working out your beat", state: "pending" },
        { key: "extract", label: "Learning how you write", state: "pending" },
        { key: "save", label: "Saving your voice rules", state: "pending" },
      ];
    case "extraction_failed":
      return [
        {
          key: "reading",
          label: "Reading recent posts",
          detail: "Read 100 posts",
          state: "complete",
        },
        {
          key: "scope",
          label: "Working out your beat",
          state: "complete",
          reasoning: SCOPE_REASONING,
          toolNote: "Set aside 12 off-beat posts — gaming content",
        },
        {
          key: "extract",
          label: "Learning how you write",
          detail: "The extraction call didn’t finish.",
          state: "failed",
          reasoning: EXTRACT_REASONING,
          initialOpen: true,
        },
        { key: "save", label: "Saving your voice rules", state: "pending" },
      ];
    case "returned":
      return [
        {
          key: "reading",
          label: "Reading recent posts",
          detail: "Read 100 posts",
          state: "complete",
        },
        { key: "scope", label: "Working out your beat", state: "complete" },
        {
          key: "extract",
          label: "Learning how you write",
          detail: "4,812 chars generated",
          state: "active",
          reasoning: `${SCOPE_REASONING}\n\n${EXTRACT_REASONING}`,
          initialOpen: true,
          backlogNote:
            "Reasoning accumulated before this reload can’t be split back into earlier stages, so it is shown here with the current stage.",
        },
        { key: "save", label: "Saving your voice rules", state: "pending" },
      ];
  }
}

function ExpectationItem({
  description,
  icon: Icon,
  title,
}: {
  readonly description: string;
  readonly icon: LucideIcon;
  readonly title: string;
}): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-2 p-3 sm:flex-row sm:items-start sm:p-4">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="font-medium text-xs sm:text-sm">{title}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground sm:text-xs">
          {description}
        </p>
      </div>
    </div>
  );
}

function ExpectationStrip(): JSX.Element {
  return (
    <div className="mt-5 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-card">
      <ExpectationItem description="for voice learning" icon={Clock3Icon} title="About 5–6 min" />
      <ExpectationItem description="come back anytime" icon={DoorOpenIcon} title="Safe to leave" />
      <ExpectationItem
        description="fill in automatically"
        icon={PanelsTopLeftIcon}
        title="Voice and Setup"
      />
    </div>
  );
}

function GhostCard({ kind }: { readonly kind: "source" | "draft" }): JSX.Element {
  const SourceIcon = kind === "source" ? RadioIcon : FilePenLineIcon;
  return (
    <div className="min-h-36 rounded-xl border border-border border-dashed bg-card/40 p-4 sm:min-h-44">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-muted">
          <SourceIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        </span>
        <p className="font-medium text-sm">
          {kind === "source" ? "Tracked source post" : "Draft in your voice"}
        </p>
      </div>
      <div className="mt-5 space-y-2.5" aria-hidden="true">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-10/12" />
        <Skeleton className="h-3 w-7/12" />
      </div>
    </div>
  );
}

function GhostPair({ viewport }: { readonly viewport: Viewport }): JSX.Element {
  return (
    <section>
      <h2 className="font-medium text-sm">What lands here</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        When a tracked source posts something on your beat, the Feed pairs the source with a draft.
      </p>
      <div
        className={cn(
          "mt-4 grid items-center gap-3",
          viewport === "mobile" ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
        )}
      >
        <GhostCard kind="source" />
        {viewport === "mobile" ? (
          <ArrowDownIcon aria-hidden="true" className="mx-auto size-4 text-muted-foreground" />
        ) : (
          <ArrowRightIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        )}
        <GhostCard kind="draft" />
      </div>
    </section>
  );
}

function StageRail({ kind }: { readonly kind: FeedKind }): JSX.Element {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-medium text-sm">Learning your voice</h2>
        <Badge className="font-normal" variant="secondary">
          Step {STEP_NUMBER[kind]} of 4
        </Badge>
      </div>
      <ChainOfThought className="space-y-1">
        {stepsFor(kind).map((step) => (
          <StageRow key={step.key} step={step} />
        ))}
      </ChainOfThought>
    </section>
  );
}

function ProgressSurface({
  kind,
  viewport,
}: {
  readonly kind: FeedKind;
  readonly viewport: Viewport;
}): JSX.Element {
  const failureCopy =
    kind === "corpus_failed"
      ? "Couldn’t read posts for this handle."
      : kind === "extraction_failed"
        ? "The extraction call didn’t finish."
        : null;

  return (
    <div className={cn("py-7", viewport === "web" && "py-10")}>
      <h1 className="text-2xl font-semibold tracking-tight">
        {failureCopy ? "Voice learning stopped" : "Your agent is getting ready"}
      </h1>

      {failureCopy ? (
        <div
          className={cn(
            "mt-5 flex gap-4",
            viewport === "mobile" ? "flex-col items-stretch" : "items-center justify-between",
          )}
        >
          <div className="flex items-start gap-2">
            <AlertCircleIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-destructive"
            />
            <div>
              <p className="font-medium text-sm text-destructive">{failureCopy}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Your agent and Feed are safe. Retry from here when you’re ready.
              </p>
            </div>
          </div>
          <Button
            className={cn("min-h-11", viewport === "mobile" && "w-full")}
            type="button"
            variant="outline"
          >
            <RefreshCwIcon aria-hidden="true" />
            Retry voice learning
          </Button>
        </div>
      ) : (
        <ExpectationStrip />
      )}

      <div
        className={cn(
          "mt-6 grid gap-6",
          viewport === "web" && "grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start",
        )}
      >
        <StageRail kind={kind} />
        <GhostPair viewport={viewport} />
      </div>
    </div>
  );
}

function ReadySurface({ viewport }: { readonly viewport: Viewport }): JSX.Element {
  return (
    <div className={cn("py-7", viewport === "web" && "py-10")}>
      <h1 className="text-2xl font-semibold tracking-tight">Your agent is ready</h1>
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-border border-dashed px-5 py-14 text-center">
        <CheckCircle2Icon aria-hidden="true" className="size-6 text-primary" />
        <h2 className="mt-4 font-semibold text-base">Drafts land here</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          When a tracked source posts something on your beat, the source story and a draft in your
          voice appear here together.
        </p>
      </div>
      <div className="mt-4 flex justify-center">
        <Button className="min-h-11" type="button" variant="outline">
          See what it learned
          <ArrowRightIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

const STATES: ReadonlyArray<{
  kind: FeedKind | "complete";
  note: string;
}> = [
  {
    kind: "starting",
    note: "(1) just arrived — run starting; expectation narrative leads",
  },
  {
    kind: "reading",
    note: "(2) reading posts — Read 100 posts; no model-reasoning affordance",
  },
  {
    kind: "scope",
    note: "(3) working out the beat — live reasoning and tool note inline",
  },
  {
    kind: "extract",
    note: "(4) learning how you write — char count; beat slice re-expandable",
  },
  {
    kind: "saving",
    note: "(5) saving voice rules — active non-model row never expands",
  },
  {
    kind: "complete",
    note: "(6) complete — resolves into the ready Feed empty state",
  },
  {
    kind: "corpus_failed",
    note: "(7a) failed reading posts — corpus_failed with an honest retry",
  },
  {
    kind: "extraction_failed",
    note: "(7b) failed extraction — partial stream retained; honest retry",
  },
  {
    kind: "returned",
    note: "(8) returned mid-run — merged backlog attributed to current stage",
  },
];

export default function FeedPreReadyDirection({
  viewport,
}: {
  readonly viewport: Viewport;
}): JSX.Element {
  return (
    <div className="space-y-12 py-8">
      {STATES.map((state) => (
        <PageFrame chrome="desk" key={state.kind} note={state.note} viewport={viewport}>
          {state.kind === "complete" ? (
            <ReadySurface viewport={viewport} />
          ) : (
            <ProgressSurface kind={state.kind} viewport={viewport} />
          )}
        </PageFrame>
      ))}
    </div>
  );
}
