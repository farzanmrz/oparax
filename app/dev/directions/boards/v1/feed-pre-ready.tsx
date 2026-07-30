"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpenIcon,
  CheckCircle2Icon,
  InfoIcon,
  ListChecksIcon,
  ListFilterIcon,
  PenLineIcon,
} from "lucide-react";
import { useState } from "react";
import { PageFrame } from "@/app/dev/directions/chrome";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StageKey = "corpus" | "scope" | "extract" | "rules";
type StageState = "pending" | "active" | "complete" | "failed";

type StageDefinition = {
  key: StageKey;
  label: string;
  completeLabel: string;
  failedLabel: string;
  icon: LucideIcon;
};

type FeedFixture = {
  current: StageKey;
  status: "running" | "failed";
  reasoningByStage?: Partial<Record<StageKey, string>>;
  initiallyOpen?: Partial<Record<StageKey, boolean>>;
};

const STAGES: readonly StageDefinition[] = [
  {
    key: "corpus",
    label: "Reading recent posts",
    completeLabel: "Read 100 posts",
    failedLabel: "Couldn’t read recent posts",
    icon: BookOpenIcon,
  },
  {
    key: "scope",
    label: "Working out your beat",
    completeLabel: "Worked out your beat (Ignored 12 unrelated posts)",
    failedLabel: "Couldn’t work out your beat",
    icon: ListFilterIcon,
  },
  {
    key: "extract",
    label: "Learning how you write",
    completeLabel: "Learned how you write",
    failedLabel: "Couldn’t learn how you write",
    icon: PenLineIcon,
  },
  {
    key: "rules",
    label: "Saving your voice rules",
    completeLabel: "Saved your voice rules",
    failedLabel: "Couldn’t save your voice rules",
    icon: ListChecksIcon,
  },
];

const SCOPE_REASONING =
  "Looking at the last 100 posts, the recurring subjects are Arsenal team news, transfer sourcing, and match reaction. A cluster of gaming posts reads as personal content rather than the beat, so I’m setting those aside before they shape the voice guide.";

const EXTRACT_REASONING =
  "Short declarative openers dominate. Most posts begin with the club or the person involved, sourcing language stays cautious until confirmation, and emoji appears only on confirmed transfers. I’m building those patterns into the voice rules now.";

function stageState(fixture: FeedFixture, stage: StageDefinition): StageState {
  const currentIndex = STAGES.findIndex((item) => item.key === fixture.current);
  const stageIndex = STAGES.findIndex((item) => item.key === stage.key);
  if (stageIndex < currentIndex) return "complete";
  if (stageIndex > currentIndex) return "pending";
  return fixture.status === "failed" ? "failed" : "active";
}

function StageLabel({
  stage,
  state,
}: {
  readonly stage: StageDefinition;
  readonly state: StageState;
}) {
  const label =
    state === "complete"
      ? stage.completeLabel
      : state === "failed"
        ? stage.failedLabel
        : stage.label;
  return (
    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-left">
      {state === "active" ? (
        <Shimmer className="font-medium text-sm" duration={1.7}>
          {label}
        </Shimmer>
      ) : (
        <span
          className={cn(
            "font-medium text-sm",
            state === "pending" ? "text-muted-foreground/55" : "text-foreground",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}

function StageRow({
  stage,
  state,
  reasoning,
  initiallyOpen,
}: {
  readonly stage: StageDefinition;
  readonly state: StageState;
  readonly reasoning?: string;
  readonly initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const hasReasoning = Boolean(reasoning);
  const stepStatus = state === "pending" ? "pending" : state === "complete" ? "complete" : "active";

  return (
    <ChainOfThoughtStep
      className={cn(
        state === "complete" && "text-success",
        state === "active" && "text-muted-foreground",
        state === "failed" && "text-destructive",
      )}
      icon={stage.icon}
      label={
        hasReasoning ? (
          <Reasoning
            className="mb-0 w-full"
            defaultOpen={false}
            isStreaming={state === "active"}
            onOpenChange={setOpen}
            open={open}
          >
            <ReasoningTrigger className="w-full text-foreground">
              <StageLabel stage={stage} state={state} />
            </ReasoningTrigger>
            <ReasoningContent className="mt-2 pr-2 text-xs leading-relaxed">
              {reasoning ?? ""}
            </ReasoningContent>
          </Reasoning>
        ) : (
          <span className="flex items-center">
            <StageLabel stage={stage} state={state} />
          </span>
        )
      }
      status={stepStatus}
    />
  );
}

function SetupAlert() {
  return (
    <Alert className="border-primary/30 bg-primary/8 text-foreground">
      <InfoIcon aria-hidden className="text-primary" />
      <AlertDescription className="text-foreground/90">
        Agent setup will take 5–6 minutes. You can safely leave and return to this page while Voice
        and Setup fill automatically.
      </AlertDescription>
    </Alert>
  );
}

function ExtractionPanel({ fixture }: { readonly fixture: FeedFixture }) {
  return (
    <div className="rounded-xl border border-border p-4 sm:p-5">
      <ChainOfThought defaultOpen>
        <ChainOfThoughtContent className="mt-0 space-y-4">
          {STAGES.map((stage) => (
            <StageRow
              initiallyOpen={fixture.initiallyOpen?.[stage.key] ?? false}
              key={stage.key}
              reasoning={fixture.reasoningByStage?.[stage.key]}
              stage={stage}
              state={stageState(fixture, stage)}
            />
          ))}
        </ChainOfThoughtContent>
      </ChainOfThought>

      {fixture.status === "failed" ? (
        <div className="mt-5 border-border border-t pt-4">
          <Button size="sm" variant="outline">
            Retry in Voice
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PreReadyPage({ fixture }: { readonly fixture: FeedFixture }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 py-4">
      <h1 className="sr-only">Setting up your agent</h1>
      <SetupAlert />
      <ExtractionPanel fixture={fixture} />
    </div>
  );
}

function ReadyPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col py-4">
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border border-dashed px-4 py-14 text-center">
        <CheckCircle2Icon aria-hidden className="size-5 text-success" />
        <h3 className="font-semibold text-sm">Your agent is ready</h3>
        <p className="mx-auto max-w-md text-muted-foreground text-sm text-pretty">
          It learned your voice and is watching your tracked sources. Drafts will appear here when a
          source posts something on-beat. There’s nothing you need to do right now.
        </p>
        <Button className="mt-2" size="sm" variant="outline">
          See what it learned
        </Button>
      </div>
    </div>
  );
}

const STATES: ReadonlyArray<
  | { id: string; note: string; kind: "ready" }
  | { id: string; note: string; kind: "progress"; fixture: FeedFixture }
> = [
  {
    id: "starting",
    note: "(1) Feed handoff — four expectations and the first semantic stage",
    kind: "progress",
    fixture: {
      current: "corpus",
      status: "running",
      reasoningByStage: { corpus: "Reading the latest original posts from @ReshadRahman…" },
      initiallyOpen: { corpus: true },
    },
  },
  {
    id: "corpus",
    note: "(2) Reading posts — factual evidence, no reasoning disclosure",
    kind: "progress",
    fixture: {
      current: "corpus",
      status: "running",
      reasoningByStage: { corpus: "Found 100 recent posts. Preparing them for Beat filtering…" },
      initiallyOpen: { corpus: true },
    },
  },
  {
    id: "scope",
    note: "(3) Working out the Beat — semantic icon and stage-owned reasoning stream",
    kind: "progress",
    fixture: {
      current: "scope",
      status: "running",
      reasoningByStage: { scope: SCOPE_REASONING },
      initiallyOpen: { scope: true },
    },
  },
  {
    id: "extract",
    note: "(4) Learning the voice — completed Beat remains re-expandable",
    kind: "progress",
    fixture: {
      current: "extract",
      status: "running",
      reasoningByStage: { scope: SCOPE_REASONING, extract: EXTRACT_REASONING },
      initiallyOpen: { extract: true },
    },
  },
  {
    id: "rules",
    note: "(5) Saving rules — semantic stage is active without fake reasoning",
    kind: "progress",
    fixture: {
      current: "rules",
      status: "running",
    },
  },
  {
    id: "ready",
    note: "(6) Complete — the same Feed resolves into the ready empty state",
    kind: "ready",
  },
  {
    id: "corpus-failed",
    note: "(7a) Couldn’t read posts — Feed points to the Voice-owned retry",
    kind: "progress",
    fixture: {
      current: "corpus",
      status: "failed",
    },
  },
  {
    id: "extraction-failed",
    note: "(7b) Voice learning failed — captured reasoning stays available",
    kind: "progress",
    fixture: {
      current: "extract",
      status: "failed",
      reasoningByStage: { scope: SCOPE_REASONING, extract: EXTRACT_REASONING },
      initiallyOpen: { extract: true },
    },
  },
  {
    id: "returned",
    note: "(8) Returned mid-run — merged reasoning is attributed to the active stage",
    kind: "progress",
    fixture: {
      current: "extract",
      status: "running",
      reasoningByStage: {
        extract: `Reasoning shown together because this page was reopened mid-run.\n\n${SCOPE_REASONING}\n\n${EXTRACT_REASONING}`,
      },
      initiallyOpen: { extract: true },
    },
  },
];

export default function V1FeedPreReadyBoard({ viewport }: { readonly viewport: "mobile" | "web" }) {
  return (
    <div className="flex w-full flex-col gap-10">
      {STATES.map((state) => (
        <PageFrame
          chrome="desk"
          headerVariant="v1"
          key={state.id}
          note={state.note}
          viewport={viewport}
        >
          {state.kind === "ready" ? <ReadyPage /> : <PreReadyPage fixture={state.fixture} />}
        </PageFrame>
      ))}
    </div>
  );
}
