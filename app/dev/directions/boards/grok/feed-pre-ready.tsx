// kit mapping:
// page frame -> PageFrame chrome="desk" (Feed active)
// expectation chips -> Badge secondary strip -> bespoke (named pattern: expectation-chip-strip)
// stage rail -> ChainOfThought + ChainOfThoughtStep (ai-elements)
// inline reasoning -> ChainOfThoughtStep children + local open map -> bespoke (named pattern: inline-stream-step)
// live labels -> Shimmer (ai-elements/shimmer)
// evidence notes -> ChainOfThoughtSearchResult badges
// stage-rank bar (web only) -> Progress (ui) -> bespoke (named pattern: stage-rank-progress)
// ghost feed geometry (web only) -> dashed Cards -> bespoke (named pattern: ghost-story-pair)
// mobile surface -> one arrival Card (strip + rail only)
// ready empty -> dashed empty matching FeedEmptyState + Button to Voice
// failed -> Alert + Retry on Voice
// backlog note -> muted italic under active stream -> bespoke (named pattern: backlog-honesty-note)
// NEVER Reasoning / ReasoningTrigger in stage rows
// annotations -> PageFrame note only

"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertCircleIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  CrosshairIcon,
  ListChecksIcon,
  Loader2Icon,
  PenLineIcon,
  SparklesIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageFrame } from "@/app/dev/directions/chrome";
import {
  ChainOfThought,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type StepState = "pending" | "active" | "complete" | "failed";
type StepKey = "corpus" | "scope" | "extract" | "rules";

type StepFixture = {
  key: StepKey;
  label: string;
  detail?: string | null;
  state: StepState;
  hasReasoning: boolean;
  reasoning?: string | null;
  evidenceChips?: string[];
};

type RunView =
  | {
      kind: "running" | "reload";
      headline: string;
      isStreaming: boolean;
      steps: StepFixture[];
      openSeed?: Partial<Record<StepKey, boolean>>;
      backlogNote?: boolean;
    }
  | { kind: "complete" }
  | { kind: "failed"; variant: "corpus_failed" | "extraction_failed"; message: string };

const SCOPE_REASONING =
  "Looking at the last 100 posts, the recurring subjects are Arsenal team news, transfer sourcing, and match reaction. A cluster of 12 posts about gaming reads as personal content rather than the beat — setting those aside so they don't teach the guide";

const EXTRACT_REASONING =
  "Short declarative openers dominate — 62 of 88 posts start with the club name. Emoji: only the red circle, and only on confirmed transfers. Building the sourcing-language section next";

const STEP_ICON: Record<StepKey, LucideIcon> = {
  corpus: BookOpenIcon,
  scope: CrosshairIcon,
  extract: PenLineIcon,
  rules: ListChecksIcon,
};

const EXPECTATIONS = [
  { icon: ClockIcon, text: "About 5–6 minutes" },
  { icon: SparklesIcon, text: "Safe to leave and come back" },
  { icon: ListChecksIcon, text: "Voice and Setup fill in automatically" },
  { icon: PenLineIcon, text: "Drafts land here on-beat" },
] as const;

function statusIcon(state: StepState, fallback: LucideIcon): LucideIcon {
  if (state === "complete") return CheckIcon;
  if (state === "failed") return AlertCircleIcon;
  if (state === "active") return Loader2Icon;
  if (state === "pending") return CircleIcon;
  return fallback;
}

/** Honest stage-rank only: complete count / 4 → 0 | 25 | 50 | 75 | 100. */
function stageRankPercent(steps: StepFixture[]): number {
  const complete = steps.filter((s) => s.state === "complete").length;
  return Math.round((complete / steps.length) * 100);
}

function ExpectationChipStrip() {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-foreground text-sm">Learning your voice</p>
      <ul className="flex flex-wrap gap-1.5">
        {EXPECTATIONS.map((item) => (
          <li key={item.text}>
            <Badge className="gap-1.5 font-normal" variant="secondary">
              <item.icon aria-hidden className="size-3" />
              {item.text}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GhostStoryPair() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex min-h-40 flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/15 px-3 py-3">
        <div className="h-2.5 w-16 rounded bg-muted" />
        <div className="h-2 w-full rounded bg-muted/80" />
        <div className="h-2 w-4/5 max-w-[85%] rounded bg-muted/60" />
        <div className="mt-auto pt-2">
          <p className="font-medium text-muted-foreground text-xs">Source story</p>
          <p className="text-muted-foreground/80 text-[11px] text-pretty">
            When a tracked account posts on your beat
          </p>
        </div>
      </div>
      <div className="flex min-h-40 flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/15 px-3 py-3">
        <div className="h-2.5 w-20 rounded bg-muted" />
        <div className="h-2 w-full rounded bg-muted/80" />
        <div className="h-2 w-3/4 max-w-[75%] rounded bg-muted/60" />
        <div className="h-2 w-2/3 max-w-[66%] rounded bg-muted/50" />
        <div className="mt-auto pt-2">
          <p className="font-medium text-muted-foreground text-xs">Draft in your voice</p>
          <p className="text-muted-foreground/80 text-[11px] text-pretty">
            Lands beside the source, ready to post
          </p>
        </div>
      </div>
    </div>
  );
}

function InlineStreamStep({
  step,
  open,
  onToggle,
  backlogNote,
}: {
  step: StepFixture;
  open: boolean;
  onToggle: () => void;
  backlogNote?: boolean;
}) {
  const Fallback = STEP_ICON[step.key];
  const Icon = statusIcon(step.state, Fallback);
  const cotStatus =
    step.state === "failed"
      ? "active"
      : step.state === "complete"
        ? "complete"
        : step.state === "active"
          ? "active"
          : "pending";

  const canExpand = step.hasReasoning && Boolean(step.reasoning) && step.state !== "pending";

  const labelNode = canExpand ? (
    <button
      className="flex w-full min-w-0 items-center gap-2 text-left"
      onClick={onToggle}
      type="button"
    >
      <span className="min-w-0 flex-1">
        {step.state === "active" ? (
          <Shimmer as="span" className="font-medium" duration={1.6}>
            {step.label}
          </Shimmer>
        ) : (
          <span className="font-medium">{step.label}</span>
        )}
      </span>
      <ChevronDownIcon
        aria-hidden
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground transition-transform",
          open ? "rotate-180" : "rotate-0",
        )}
      />
    </button>
  ) : step.state === "active" ? (
    <Shimmer as="span" className="font-medium" duration={1.6}>
      {step.label}
    </Shimmer>
  ) : (
    <span className="font-medium">{step.label}</span>
  );

  return (
    <ChainOfThoughtStep
      description={
        step.detail ? (
          <span className={step.state === "failed" ? "text-destructive" : undefined}>
            {step.detail}
          </span>
        ) : undefined
      }
      icon={
        ((props: React.ComponentProps<LucideIcon>) => (
          <Icon
            {...props}
            className={cn(
              props.className,
              step.state === "active" && Icon === Loader2Icon && "animate-spin",
              step.state === "failed" && "text-destructive",
            )}
          />
        )) as unknown as LucideIcon
      }
      label={labelNode}
      status={cotStatus}
    >
      {step.evidenceChips && step.evidenceChips.length > 0 ? (
        <ChainOfThoughtSearchResults>
          {step.evidenceChips.map((chip) => (
            <ChainOfThoughtSearchResult key={chip}>{chip}</ChainOfThoughtSearchResult>
          ))}
        </ChainOfThoughtSearchResults>
      ) : null}

      {canExpand && open && step.reasoning ? (
        <div className="space-y-2">
          {backlogNote && step.state === "active" ? (
            <p className="text-muted-foreground/80 text-xs italic text-pretty">
              Accumulated since earlier stages — after a reload this backlog cannot be re-split, so
              it is attributed to the current stage.
            </p>
          ) : null}
          <div className="rounded-md border border-border/70 bg-muted/25 px-3 py-2 text-muted-foreground text-xs leading-relaxed text-pretty whitespace-pre-wrap">
            {step.reasoning}
          </div>
        </div>
      ) : null}
    </ChainOfThoughtStep>
  );
}

function StageRail({ view }: { view: Extract<RunView, { kind: "running" | "reload" }> }) {
  const defaults = useMemo(() => {
    const map: Partial<Record<StepKey, boolean>> = {};
    for (const step of view.steps) {
      if (view.openSeed && view.openSeed[step.key] !== undefined) {
        map[step.key] = view.openSeed[step.key];
      } else {
        map[step.key] = step.hasReasoning && step.state === "active" && Boolean(step.reasoning);
      }
    }
    return map;
  }, [view]);

  // User overrides stick for the life of this mount (collapse persistence across poll updates).
  const [userOpen, setUserOpen] = useState<Partial<Record<StepKey, boolean>>>({});

  function isOpen(key: StepKey): boolean {
    if (userOpen[key] !== undefined) return Boolean(userOpen[key]);
    return Boolean(defaults[key]);
  }

  function toggle(key: StepKey) {
    setUserOpen((prev) => ({
      ...prev,
      [key]: !isOpen(key),
    }));
  }

  return (
    <ChainOfThought className="w-full" defaultOpen>
      <div className="space-y-3">
        {view.steps.map((step) => (
          <InlineStreamStep
            backlogNote={Boolean(view.backlogNote) && step.state === "active"}
            key={step.key}
            onToggle={() => toggle(step.key)}
            open={isOpen(step.key)}
            step={step}
          />
        ))}
      </div>
    </ChainOfThought>
  );
}

function ReadyEmpty() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-4 py-14 text-center">
      <CheckIcon aria-hidden className="size-5 text-primary" />
      <h3 className="font-semibold text-sm">You're all set — drafts land here</h3>
      <p className="mx-auto max-w-sm text-muted-foreground text-sm text-pretty">
        Your agent learned your voice from your X posts. When a tracked source posts something on
        your beat, a draft appears here — nothing to do until then.
      </p>
      <Button className="mt-1" size="sm" type="button" variant="outline">
        See what it learned
      </Button>
      <p className="text-muted-foreground text-[11px]">
        Opens Voice — rules filled in automatically
      </p>
    </div>
  );
}

function FailedState({
  message,
  variant,
}: {
  message: string;
  variant: "corpus_failed" | "extraction_failed";
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>
          {variant === "corpus_failed" ? "Couldn't read posts" : "Extraction didn't finish"}
        </AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <div className="flex flex-col items-start gap-2 rounded-xl border border-border px-4 py-4">
        <p className="text-muted-foreground text-sm text-pretty">
          Your agent is fine — retry from Voice anytime. The same extraction ledger picks up a new
          run.
        </p>
        <Button size="sm" type="button" variant="outline">
          Retry on Voice
        </Button>
      </div>
    </div>
  );
}

function PreReadySurface({
  view,
  viewport,
  showExpectation,
}: {
  view: RunView;
  viewport: "mobile" | "web";
  showExpectation: boolean;
}) {
  if (view.kind === "complete") {
    return (
      <div className="py-4">
        <ReadyEmpty />
      </div>
    );
  }
  if (view.kind === "failed") {
    return (
      <div className="py-4">
        <FailedState message={view.message} variant={view.variant} />
      </div>
    );
  }

  const percent = stageRankPercent(view.steps);

  // mobile: one calm arrival card — strip + rail only
  if (viewport === "mobile") {
    return (
      <div className="py-4">
        <Card className="shadow-none">
          <CardContent className="flex flex-col gap-5 p-4">
            <div>
              <h2 className="font-semibold text-base">{view.headline}</h2>
            </div>
            {showExpectation ? <ExpectationChipStrip /> : null}
            <StageRail view={view} />
            <p className="text-muted-foreground text-xs">
              You can leave this page — it keeps running in the background.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // web: strip + stage-rank progress + rail + ghost story pair
  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg">{view.headline}</h2>
      </div>

      {showExpectation ? <ExpectationChipStrip /> : null}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>Stage progress</span>
          <span>{percent}%</span>
        </div>
        <Progress value={percent} />
      </div>

      <div className="grid grid-cols-5 gap-6">
        <Card className="col-span-3 shadow-none">
          <CardContent className="p-5">
            <StageRail view={view} />
          </CardContent>
        </Card>
        <div className="col-span-2 flex flex-col gap-3">
          <p className="font-medium text-muted-foreground text-xs">What lands here</p>
          <GhostStoryPair />
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        You can leave this page — it keeps running in the background.
      </p>
    </div>
  );
}

const STATES: {
  id: string;
  note: string;
  showExpectation: boolean;
  view: RunView;
}[] = [
  {
    id: "1",
    note: "(1) Just arrived — run starting, expectation narrative front and center",
    showExpectation: true,
    view: {
      kind: "running",
      headline: "Your agent is learning your voice",
      isStreaming: true,
      steps: [
        {
          key: "corpus",
          label: "Reading recent posts",
          state: "active",
          detail: "Starting…",
          hasReasoning: false,
        },
        {
          key: "scope",
          label: "Working out your beat",
          state: "pending",
          hasReasoning: true,
        },
        {
          key: "extract",
          label: "Learning how you write",
          state: "pending",
          hasReasoning: true,
        },
        {
          key: "rules",
          label: "Saving your voice rules",
          state: "pending",
          hasReasoning: false,
        },
      ],
    },
  },
  {
    id: "2",
    note: "(2) Reading posts — evidence ‘Read 100 posts’, no reasoning affordance",
    showExpectation: true,
    view: {
      kind: "running",
      headline: "Your agent is learning your voice",
      isStreaming: true,
      steps: [
        {
          key: "corpus",
          label: "Reading recent posts",
          state: "active",
          detail: "Read 100 posts",
          hasReasoning: false,
          evidenceChips: ["100 posts", "Originals only"],
        },
        {
          key: "scope",
          label: "Working out your beat",
          state: "pending",
          hasReasoning: true,
        },
        {
          key: "extract",
          label: "Learning how you write",
          state: "pending",
          hasReasoning: true,
        },
        {
          key: "rules",
          label: "Saving your voice rules",
          state: "pending",
          hasReasoning: false,
        },
      ],
    },
  },
  {
    id: "3",
    note: "(3) Working out the beat — reasoning streams inline + off-beat note",
    showExpectation: true,
    view: {
      kind: "running",
      headline: "Your agent is learning your voice",
      isStreaming: true,
      steps: [
        {
          key: "corpus",
          label: "Reading recent posts",
          state: "complete",
          detail: "Read 100 posts",
          hasReasoning: false,
        },
        {
          key: "scope",
          label: "Working out your beat",
          state: "active",
          detail: "Set aside 12 off-beat posts — gaming content",
          hasReasoning: true,
          reasoning: SCOPE_REASONING,
          evidenceChips: ["12 off-beat", "Gaming set aside"],
        },
        {
          key: "extract",
          label: "Learning how you write",
          state: "pending",
          hasReasoning: true,
        },
        {
          key: "rules",
          label: "Saving your voice rules",
          state: "pending",
          hasReasoning: false,
        },
      ],
    },
  },
  {
    id: "4",
    note: "(4) Learning how you write — char count; beat collapsed, re-expandable with its own slice",
    showExpectation: true,
    view: {
      kind: "running",
      headline: "Your agent is learning your voice",
      isStreaming: true,
      openSeed: { scope: false, extract: true },
      steps: [
        {
          key: "corpus",
          label: "Reading recent posts",
          state: "complete",
          detail: "Read 100 posts",
          hasReasoning: false,
        },
        {
          key: "scope",
          label: "Working out your beat",
          state: "complete",
          detail: "Set aside 12 off-beat posts — gaming content",
          hasReasoning: true,
          reasoning: SCOPE_REASONING,
          evidenceChips: ["12 off-beat"],
        },
        {
          key: "extract",
          label: "Learning how you write",
          state: "active",
          detail: "4,812 chars generated",
          hasReasoning: true,
          reasoning: EXTRACT_REASONING,
          evidenceChips: ["4,812 chars"],
        },
        {
          key: "rules",
          label: "Saving your voice rules",
          state: "pending",
          hasReasoning: false,
        },
      ],
    },
  },
  {
    id: "5",
    note: "(5) Saving voice rules — active, no reasoning affordance",
    showExpectation: true,
    view: {
      kind: "running",
      headline: "Your agent is learning your voice",
      isStreaming: false,
      steps: [
        {
          key: "corpus",
          label: "Reading recent posts",
          state: "complete",
          detail: "Read 100 posts",
          hasReasoning: false,
        },
        {
          key: "scope",
          label: "Working out your beat",
          state: "complete",
          hasReasoning: true,
          reasoning: SCOPE_REASONING,
        },
        {
          key: "extract",
          label: "Learning how you write",
          state: "complete",
          detail: "Guide complete",
          hasReasoning: true,
          reasoning: EXTRACT_REASONING,
        },
        {
          key: "rules",
          label: "Saving your voice rules",
          state: "active",
          detail: "Writing rules…",
          hasReasoning: false,
        },
      ],
    },
  },
  {
    id: "6",
    note: "(6) Complete — resolves into ready empty + path to Voice",
    showExpectation: false,
    view: { kind: "complete" },
  },
  {
    id: "7a",
    note: "(7a) Failed — corpus_failed + honest retry on Voice",
    showExpectation: false,
    view: {
      kind: "failed",
      variant: "corpus_failed",
      message: "Couldn't read posts for this handle.",
    },
  },
  {
    id: "7b",
    note: "(7b) Failed — extraction_failed + honest retry on Voice",
    showExpectation: false,
    view: {
      kind: "failed",
      variant: "extraction_failed",
      message: "The extraction call didn't finish.",
    },
  },
  {
    id: "8",
    note: "(8) Returned mid-run — merged backlog attributed to current stage; collapse sticky",
    showExpectation: true,
    view: {
      kind: "reload",
      headline: "Your agent is learning your voice",
      isStreaming: true,
      backlogNote: true,
      openSeed: { extract: false },
      steps: [
        {
          key: "corpus",
          label: "Reading recent posts",
          state: "complete",
          detail: "Read 100 posts",
          hasReasoning: false,
        },
        {
          key: "scope",
          label: "Working out your beat",
          state: "complete",
          detail: "Set aside 12 off-beat posts — gaming content",
          hasReasoning: true,
          reasoning: null,
        },
        {
          key: "extract",
          label: "Learning how you write",
          state: "active",
          detail: "4,812 chars generated",
          hasReasoning: true,
          reasoning: `${SCOPE_REASONING}\n\n—\n\n${EXTRACT_REASONING}`,
          evidenceChips: ["4,812 chars", "Accumulated since start"],
        },
        {
          key: "rules",
          label: "Saving your voice rules",
          state: "pending",
          hasReasoning: false,
        },
      ],
    },
  },
];

export default function FeedPreReadyBoard({ viewport }: { viewport: "mobile" | "web" }) {
  return (
    <div className="flex w-full flex-col gap-12">
      {STATES.map((s) => (
        <PageFrame chrome="desk" key={s.id} note={s.note} viewport={viewport}>
          <PreReadySurface showExpectation={s.showExpectation} view={s.view} viewport={viewport} />
        </PageFrame>
      ))}
    </div>
  );
}
