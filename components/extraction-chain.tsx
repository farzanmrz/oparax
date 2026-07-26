"use client";

// components/extraction-chain.tsx
//
// The shared step display for voice extraction, used by BOTH surfaces that watch a run: the
// create-agent screen (app/agents/new/extraction-progress.tsx, which drives the pre-flight gates
// itself and then polls) and the Voice tab (app/agents/[id]/voice/extraction-progress.tsx, which
// only polls a run someone else started). One component so the two can never drift into
// describing the same pipeline differently.
//
// Presentational only — it holds no timers, calls no actions, and knows nothing about the
// pipeline's stages. Its callers own all of that and hand it a settled list of steps. That split
// is what lets the create screen show steps the polled run row cannot express (the pre-flight
// gates run before a run row exists) while the Voice tab shows only what polling can see.
//
// Built on the vendored components/ai-elements/chain-of-thought.tsx primitive rather than a
// bespoke list: it already carries the connector rail, the per-step status styling, and the
// fade/slide-in animation for a step that has just appeared.

import { AlertCircleIcon, CheckIcon, CircleIcon, Loader2Icon } from "lucide-react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";

type StepState = "pending" | "active" | "complete" | "failed";

export type ExtractionStep = {
  /** Stable identity for React's key — never the label, which changes as a step progresses. */
  key: string;
  label: string;
  /** The one line of evidence under the label: "@reshadrahman — 3,412 posts", "Read 100 posts",
   *  or the reason a step failed. Null renders nothing rather than an empty row. */
  detail?: string | null;
  state: StepState;
};

/** `ChainOfThoughtStep` only knows "complete" | "active" | "pending", so a failed step maps onto
 *  "active" (full-strength foreground text) and is distinguished by its icon and detail colour
 *  instead. Mapping it to "complete" would grey out the one step the reporter most needs to read. */
const STEP_STATUS = {
  pending: "pending",
  active: "active",
  complete: "complete",
  failed: "active",
} as const;

const STEP_ICON = {
  pending: CircleIcon,
  active: Loader2Icon,
  complete: CheckIcon,
  failed: AlertCircleIcon,
} as const;

export function ExtractionChain({
  steps,
  title,
  reasoning,
  isStreaming = false,
}: {
  readonly steps: ExtractionStep[];
  readonly title: string;
  /** The extractor's live reasoning trace. Rendered inside its own collapsible block below the
   *  steps, not as a step: it is a continuous stream, not a discrete stage. */
  readonly reasoning?: string | null;
  readonly isStreaming?: boolean;
}) {
  return (
    <ChainOfThought className="w-full" defaultOpen>
      <ChainOfThoughtHeader>{title}</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {steps.map((step) => {
          const Icon = STEP_ICON[step.state];
          return (
            <ChainOfThoughtStep
              description={
                step.detail ? (
                  <span className={step.state === "failed" ? "text-destructive" : undefined}>
                    {step.detail}
                  </span>
                ) : undefined
              }
              icon={Icon}
              key={step.key}
              label={step.label}
              status={STEP_STATUS[step.state]}
            />
          );
        })}
        {reasoning ? (
          <Reasoning defaultOpen isStreaming={isStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{reasoning}</ReasoningContent>
          </Reasoning>
        ) : null}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
