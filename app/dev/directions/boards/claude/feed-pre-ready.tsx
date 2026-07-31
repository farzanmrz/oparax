"use client";

// kit mapping:
// page frame + chrome -> PageFrame (app/dev/directions/chrome — session-built)
// expectation strip -> bespoke (proposed pattern: Expectation strip) — icon rows, grok-r3 liked
// step rows -> ChainOfThoughtStep (ai-elements/chain-of-thought), status icons like
//   components/extraction-chain.tsx
// inline stage stream -> ChainOfThoughtStep children (proposed pattern: Inline stage stream) —
//   the row itself expands; NO nested Reasoning element
// live tail -> Shimmer (ai-elements/shimmer)
// step derivation -> pipelineSteps (lib/voice/extraction-steps) — the repo's real mapping
// ghost story pair (web) -> bespoke (proposed pattern: Ghost story pair) — grok-r3 liked
// ready/failed empty states -> FeedEmptyState's dashed treatment + Button
// icons -> lucide-react only

import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  ListChecksIcon,
  Loader2Icon,
  PenLineIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useState } from "react";
import { ChainOfThoughtStep } from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pipelineSteps, type RunSnapshot } from "@/lib/voice/extraction-steps";
import { PageFrame } from "../../chrome";

/**
 * Claude board r4 — "Arrival strip + one calm rail (+ ghost pair on web)".
 * Owner leanings applied: grok+claude for mobile (scannable expectation strip, single calm
 * rail), codex+grok narrative for web (strip + rail + the ghost story pair previewing the
 * populated feed's geometry). No invented progress percentages.
 */

const SCOPE_REASONING =
  "Looking at the last 100 posts, the recurring subjects are Arsenal team news, transfer sourcing, and match reaction. A cluster of 12 posts about gaming reads as personal content rather than the beat — setting those aside so they don't teach the guide";
const EXTRACT_REASONING =
  "Short declarative openers dominate — 62 of 88 posts start with the club name. Emoji: only the red circle, and only on confirmed transfers. Building the sourcing-language section next";

const STEP_ICON = {
  pending: CircleIcon,
  active: Loader2Icon,
  complete: CheckIcon,
  failed: AlertCircleIcon,
} as const;

const STEP_STATUS = {
  pending: "pending",
  active: "active",
  complete: "complete",
  failed: "active",
} as const;

const MODEL_STEPS = new Set(["scope", "extract"]);

function ExpectationStrip() {
  const items = [
    { icon: ClockIcon, text: "About 5–6 minutes — one pass over your recent posts" },
    { icon: ShieldCheckIcon, text: "Safe to leave and come back — it keeps running" },
    { icon: ListChecksIcon, text: "Voice and Setup fill in automatically when it finishes" },
    { icon: PenLineIcon, text: "Drafts land here when a tracked source posts on your beat" },
  ] as const;
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border p-4">
      <p className="font-medium text-sm">Your agent is learning your voice</p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li className="flex items-start gap-2 text-muted-foreground text-xs" key={item.text}>
            <item.icon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span className="text-pretty">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InlineStream({ text, streaming }: { readonly text: string; readonly streaming: boolean }) {
  return (
    <div className="mt-1 border-border border-l pl-3 text-muted-foreground text-xs leading-relaxed">
      <p className="whitespace-pre-wrap">{text}</p>
      {streaming ? (
        <Shimmer className="mt-1 text-xs" duration={1.5}>
          Thinking…
        </Shimmer>
      ) : null}
    </div>
  );
}

function Rail({
  run,
  reasoningByStep,
  streamingStep,
  backlogNote,
}: {
  readonly run: RunSnapshot;
  readonly reasoningByStep: Partial<Record<"scope" | "extract", string>>;
  readonly streamingStep: "scope" | "extract" | null;
  readonly backlogNote?: string;
}) {
  const [expanded, setExpanded] = useState<Partial<Record<string, boolean>>>({});
  const steps = pipelineSteps(run);
  const failed = run.status === "failed";

  return (
    <div className="flex flex-col rounded-xl border border-border p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        {steps.map((step) => {
          const Icon = STEP_ICON[step.state];
          const slice = reasoningByStep[step.key as "scope" | "extract"];
          const hasStream = MODEL_STEPS.has(step.key) && !!slice;
          const isOpen = hasStream && (expanded[step.key] ?? step.state === "active");
          return (
            <ChainOfThoughtStep
              className={cn(hasStream && "cursor-pointer select-none")}
              description={
                step.detail ? (
                  <span className={step.state === "failed" ? "text-destructive" : undefined}>
                    {step.detail}
                  </span>
                ) : undefined
              }
              icon={Icon}
              key={step.key}
              label={
                <span className="flex items-center gap-1.5">
                  {step.state === "active" && step.key === streamingStep ? (
                    <Shimmer className="font-medium text-sm" duration={2}>
                      {step.label}
                    </Shimmer>
                  ) : (
                    step.label
                  )}
                  {hasStream ? (
                    <ChevronDownIcon
                      className={cn(
                        "size-3.5 text-muted-foreground transition-transform",
                        isOpen ? "rotate-180" : "rotate-0",
                      )}
                    />
                  ) : null}
                </span>
              }
              onClick={
                hasStream
                  ? () => setExpanded((prev) => ({ ...prev, [step.key]: !isOpen }))
                  : undefined
              }
              status={STEP_STATUS[step.state]}
            >
              {isOpen ? (
                <>
                  {backlogNote && step.state === "active" ? (
                    <p className="mt-1 text-muted-foreground/70 text-xs italic">{backlogNote}</p>
                  ) : null}
                  <InlineStream streaming={step.key === streamingStep} text={slice ?? ""} />
                </>
              ) : null}
            </ChainOfThoughtStep>
          );
        })}
      </div>

      {failed ? (
        <div className="mt-4 flex flex-col items-start gap-2 border-border border-t pt-4">
          <p className="text-muted-foreground text-sm">
            Your agent is fine — you can retry from its Voice section anytime.
          </p>
          <Button size="sm" variant="outline">
            Retry on Voice
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Web-only forward-looking geometry: dashed silhouettes of the populated feed's card pair. */
function GhostStoryPair() {
  return (
    <div className="grid grid-cols-2 gap-7">
      {["A source story", "Your draft, in your voice"].map((label) => (
        <div
          className="flex h-44 flex-col items-center justify-center gap-1 rounded-xl border border-border border-dashed px-4 text-center"
          key={label}
        >
          <p className="font-medium text-muted-foreground text-sm">{label}</p>
          <p className="text-muted-foreground/60 text-xs">lands here once you're live</p>
        </div>
      ))}
    </div>
  );
}

function PreReadyPage({
  viewport,
  run,
  reasoningByStep,
  streamingStep,
  backlogNote,
}: {
  readonly viewport: "mobile" | "web";
  readonly run: RunSnapshot;
  readonly reasoningByStep: Partial<Record<"scope" | "extract", string>>;
  readonly streamingStep: "scope" | "extract" | null;
  readonly backlogNote?: string;
}) {
  const rail = (
    <Rail
      backlogNote={backlogNote}
      reasoningByStep={reasoningByStep}
      run={run}
      streamingStep={streamingStep}
    />
  );
  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <ExpectationStrip />
      {viewport === "web" ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-7">
          {rail}
          <GhostStoryPair />
        </div>
      ) : (
        rail
      )}
    </div>
  );
}

function ReadyPage() {
  return (
    <div className="flex flex-1 flex-col py-4">
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border border-dashed px-4 py-14 text-center">
        <CheckIcon aria-hidden="true" className="size-5 text-primary" />
        <h3 className="font-semibold text-sm">You're all set — drafts land here</h3>
        <p className="mx-auto max-w-sm text-muted-foreground text-sm text-pretty">
          Your agent learned your voice from your X posts. When a tracked source posts something on
          your beat, a draft in your voice appears here — nothing to do until then.
        </p>
        <Button className="mt-2" size="sm" variant="outline">
          See what it learned
        </Button>
      </div>
    </div>
  );
}

const RUNS: Record<string, RunSnapshot> = {
  starting: { stage: "starting", progressNote: null, status: "running", errorCode: null },
  corpus: {
    stage: "corpus_ready",
    progressNote: "Read 100 posts",
    status: "running",
    errorCode: null,
  },
  scoping: {
    stage: "scoping",
    progressNote: "Set aside 12 off-beat posts — gaming content",
    status: "running",
    errorCode: null,
  },
  extracting: {
    stage: "extracting",
    progressNote: "4,812 chars generated",
    status: "running",
    errorCode: null,
  },
  rules: { stage: "materializing_rules", progressNote: null, status: "running", errorCode: null },
  corpusFailed: {
    stage: "failed",
    progressNote: null,
    status: "failed",
    errorCode: "corpus_failed",
  },
  extractFailed: {
    stage: "failed",
    progressNote: null,
    status: "failed",
    errorCode: "extraction_failed",
  },
};

export default function FeedPreReadyBoard({ viewport }: { readonly viewport: "mobile" | "web" }) {
  return (
    <div className="flex flex-col gap-10">
      <PageFrame
        chrome="desk"
        note="(1) just arrived — run starting; the strip owns the moment"
        viewport={viewport}
      >
        <PreReadyPage
          reasoningByStep={{}}
          run={RUNS.starting}
          streamingStep={null}
          viewport={viewport}
        />
      </PageFrame>
      <PageFrame
        chrome="desk"
        note="(2) reading posts — evidence line, no reasoning affordance"
        viewport={viewport}
      >
        <PreReadyPage
          reasoningByStep={{}}
          run={RUNS.corpus}
          streamingStep={null}
          viewport={viewport}
        />
      </PageFrame>
      <PageFrame
        chrome="desk"
        note="(3) working out the beat — inline stream in the row; click to collapse, it sticks"
        viewport={viewport}
      >
        <PreReadyPage
          reasoningByStep={{ scope: SCOPE_REASONING }}
          run={RUNS.scoping}
          streamingStep="scope"
          viewport={viewport}
        />
      </PageFrame>
      <PageFrame
        chrome="desk"
        note="(4) learning how you write — beat stage collapsed but re-expandable with its slice"
        viewport={viewport}
      >
        <PreReadyPage
          reasoningByStep={{ scope: SCOPE_REASONING, extract: EXTRACT_REASONING }}
          run={RUNS.extracting}
          streamingStep="extract"
          viewport={viewport}
        />
      </PageFrame>
      <PageFrame
        chrome="desk"
        note="(5) saving voice rules — brief, honest, no affordance"
        viewport={viewport}
      >
        <PreReadyPage
          reasoningByStep={{}}
          run={RUNS.rules}
          streamingStep={null}
          viewport={viewport}
        />
      </PageFrame>
      <PageFrame
        chrome="desk"
        note="(6) complete — the same spot resolves into the ready empty state"
        viewport={viewport}
      >
        <ReadyPage />
      </PageFrame>
      <PageFrame
        chrome="desk"
        note="(7a) failed reading posts — retry path named"
        viewport={viewport}
      >
        <PreReadyPage
          reasoningByStep={{}}
          run={RUNS.corpusFailed}
          streamingStep={null}
          viewport={viewport}
        />
      </PageFrame>
      <PageFrame
        chrome="desk"
        note="(7b) failed mid-extraction — captured reasoning stays readable"
        viewport={viewport}
      >
        <PreReadyPage
          reasoningByStep={{ scope: SCOPE_REASONING }}
          run={RUNS.extractFailed}
          streamingStep={null}
          viewport={viewport}
        />
      </PageFrame>
      <PageFrame
        chrome="desk"
        note="(8) returned mid-run — merged backlog attributed honestly"
        viewport={viewport}
      >
        <PreReadyPage
          backlogNote="Reasoning so far, shown together — stage boundaries weren't recorded while you were away."
          reasoningByStep={{ extract: `${SCOPE_REASONING}\n\n${EXTRACT_REASONING}` }}
          run={RUNS.extracting}
          streamingStep="extract"
          viewport={viewport}
        />
      </PageFrame>
    </div>
  );
}
