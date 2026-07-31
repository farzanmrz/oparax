"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpenIcon,
  CircleIcon,
  ListChecksIcon,
  ListFilterIcon,
  PenLineIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import { cn } from "@/lib/utils";
import type {
  ExtractionReasoningByStage,
  ExtractionReasoningStage,
  ExtractionTextByStage,
  ExtractionToolActivity,
} from "@/lib/voice/extraction-progress-reasoning";

export type ExtractionStep = {
  key: string;
  label: string;
  /** Legacy direction-board evidence; production completion evidence belongs in `label`. */
  detail?: string | null;
  state: "pending" | "active" | "complete" | "failed";
};

const STEP_ICON: Record<string, LucideIcon> = {
  corpus: BookOpenIcon,
  scope: ListFilterIcon,
  extract: PenLineIcon,
  rules: ListChecksIcon,
};

function StageLabel({ step }: { readonly step: ExtractionStep }) {
  if (step.state === "active") {
    return (
      <Shimmer className="font-medium text-sm" duration={1.7}>
        {step.label}
      </Shimmer>
    );
  }

  return (
    <span
      className={cn(
        "font-medium text-sm",
        step.state === "pending" ? "text-muted-foreground" : "text-foreground",
      )}
    >
      {step.label}
    </span>
  );
}

/** The ledger intentionally updates at human-scale intervals instead of writing on every model
 * token. Reveal each newly observed suffix across that interval so provider/DB batches read as
 * one continuous stream. Reduced-motion users receive each snapshot immediately. */
function useProgressiveText(text: string, isStreaming: boolean): string {
  const [visible, setVisible] = useState(isStreaming ? "" : text);
  const visibleRef = useRef(visible);

  useEffect(() => {
    const update = (next: string) => {
      visibleRef.current = next;
      setVisible(next);
    };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isStreaming || reducedMotion || !text.startsWith(visibleRef.current)) {
      update(text);
      return;
    }

    const startLength = visibleRef.current.length;
    const added = text.length - startLength;
    if (added <= 0) return;

    const duration = Math.min(1500, Math.max(300, added * 18));
    const startedAt = performance.now();
    let frame = 0;
    const reveal = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const nextLength = startLength + Math.max(1, Math.floor(added * progress));
      update(text.slice(0, nextLength));
      if (progress < 1) frame = requestAnimationFrame(reveal);
    };
    frame = requestAnimationFrame(reveal);
    return () => cancelAnimationFrame(frame);
  }, [isStreaming, text]);

  return visible;
}

function ProgressiveReasoningContent({
  text,
  isStreaming,
}: {
  readonly text: string;
  readonly isStreaming: boolean;
}) {
  const visible = useProgressiveText(text, isStreaming);

  return (
    <ReasoningContent className="mt-2 ml-3 pr-2 text-xs leading-relaxed">
      {visible}
    </ReasoningContent>
  );
}

function ProgressiveTextContent({
  text,
  isStreaming,
  label,
}: {
  readonly text: string;
  readonly isStreaming: boolean;
  readonly label?: string;
}) {
  const visible = useProgressiveText(text, isStreaming);
  return (
    <div className="mt-3 ml-3 border-border border-t pt-3 text-xs leading-relaxed">
      {label ? <p className="mb-2 font-medium text-foreground">{label}</p> : null}
      <MessageResponse isAnimating={isStreaming}>{visible}</MessageResponse>
    </div>
  );
}

function displayToolName(toolName: string): string {
  return toolName === "exclude_off_beat_posts"
    ? "Checking off-beat posts"
    : toolName.replaceAll("_", " ");
}

function displayToolValue(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2) ?? String(value);
}

function ToolActivity({ activity }: { readonly activity: ExtractionToolActivity }) {
  const input = displayToolValue(activity.input, activity.inputText);
  const output =
    activity.state === "output-error" ? activity.errorText : displayToolValue(activity.output, "");
  const active = activity.state === "input-streaming" || activity.state === "input-available";

  return (
    <Tool className="mt-3 ml-3" defaultOpen={active} key={`${activity.id}:${activity.state}`}>
      <ToolHeader
        state={activity.state}
        title={displayToolName(activity.toolName)}
        toolName={activity.toolName}
        type="dynamic-tool"
      />
      <ToolContent className="space-y-3">
        {input ? (
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-xs">Input</p>
            <CodeBlock code={input} language="json" />
          </div>
        ) : null}
        {output ? (
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-xs">
              {activity.state === "output-error" ? "Error" : "Result"}
            </p>
            <CodeBlock code={output} language="json" />
          </div>
        ) : null}
      </ToolContent>
    </Tool>
  );
}

function findScrollOwner(node: HTMLElement): HTMLElement | null {
  let parent = node.parentElement;
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
}

/** Follow a growing stream only while the reader is already following it. Wheel, touch, or
 * pointer input immediately releases control; scrolling back to the bottom opts in again. */
function useFollowExtractionStream(streamVersion: string, isStreaming: boolean) {
  const endRef = useRef<HTMLDivElement>(null);
  const scrollOwnerRef = useRef<HTMLElement | null>(null);
  const shouldFollowRef = useRef(true);
  const autoScrollingRef = useRef(false);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const end = endRef.current;
    if (!end) return;
    const owner = findScrollOwner(end);
    if (!owner) return;
    scrollOwnerRef.current = owner;

    const releaseAutoScroll = () => {
      autoScrollingRef.current = false;
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    };
    const handleUserIntent = () => {
      releaseAutoScroll();
      shouldFollowRef.current = false;
    };
    const handleScroll = () => {
      if (autoScrollingRef.current) return;
      const distanceFromBottom = owner.scrollHeight - owner.scrollTop - owner.clientHeight;
      shouldFollowRef.current = distanceFromBottom < 96;
    };

    owner.addEventListener("scroll", handleScroll, { passive: true });
    owner.addEventListener("wheel", handleUserIntent, { passive: true });
    owner.addEventListener("touchstart", handleUserIntent, { passive: true });
    owner.addEventListener("pointerdown", handleUserIntent, { passive: true });
    return () => {
      releaseAutoScroll();
      scrollOwnerRef.current = null;
      owner.removeEventListener("scroll", handleScroll);
      owner.removeEventListener("wheel", handleUserIntent);
      owner.removeEventListener("touchstart", handleUserIntent);
      owner.removeEventListener("pointerdown", handleUserIntent);
    };
  }, []);

  useEffect(() => {
    const owner = scrollOwnerRef.current;
    if (!streamVersion || !isStreaming || !owner || !shouldFollowRef.current) return;
    const frame = requestAnimationFrame(() => {
      autoScrollingRef.current = true;
      owner.scrollTo({ top: owner.scrollHeight, behavior: "smooth" });
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = setTimeout(() => {
        autoScrollingRef.current = false;
        releaseTimerRef.current = null;
      }, 1000);
    });
    return () => cancelAnimationFrame(frame);
  }, [isStreaming, streamVersion]);

  return endRef;
}

export function ExtractionChain({
  steps,
  reasoningByStage,
  textByStage = {},
  toolActivities = [],
  isStreaming = false,
}: {
  readonly steps: ExtractionStep[];
  readonly reasoningByStage?: ExtractionReasoningByStage;
  readonly textByStage?: ExtractionTextByStage;
  readonly toolActivities?: ExtractionToolActivity[];
  readonly isStreaming?: boolean;
}) {
  const [openByStage, setOpenByStage] = useState<
    Partial<Record<ExtractionReasoningStage, boolean>>
  >({});
  const [suppressNewStageAutoOpen, setSuppressNewStageAutoOpen] = useState(false);
  const toolStreamVersion = toolActivities
    .map((activity) => `${activity.id}:${activity.state}:${activity.inputText.length}`)
    .join("|");
  const streamEndRef = useFollowExtractionStream(
    `${reasoningByStage?.scope?.length ?? 0}:${reasoningByStage?.extract?.length ?? 0}:${textByStage.scope?.length ?? 0}:${textByStage.extract?.length ?? 0}:${toolStreamVersion}`,
    isStreaming,
  );

  return (
    <ChainOfThought className="w-full" defaultOpen>
      <ChainOfThoughtContent className="mt-0 space-y-4">
        {steps.map((step) => {
          const Icon = STEP_ICON[step.key] ?? CircleIcon;
          const reasoningStage = step.key as ExtractionReasoningStage;
          const reasoning = reasoningByStage?.[reasoningStage];
          const hasReasoning = Boolean(reasoning);
          const stageText = textByStage[reasoningStage] ?? "";
          const stageTools = toolActivities.filter((activity) => activity.stage === reasoningStage);
          const isStageStreaming = isStreaming && step.state === "active";
          const hasDisclosure =
            hasReasoning ||
            Boolean(stageText) ||
            stageTools.length > 0 ||
            (isStageStreaming && (reasoningStage === "scope" || reasoningStage === "extract"));
          const reasoningOpen =
            openByStage[reasoningStage] ?? (isStageStreaming && !suppressNewStageAutoOpen);
          const status =
            step.state === "pending"
              ? "pending"
              : step.state === "complete"
                ? "complete"
                : "active";

          return (
            <ChainOfThoughtStep
              className={cn(
                "items-start",
                step.state === "complete" && "text-success",
                step.state === "active" && "text-muted-foreground",
                step.state === "failed" && "text-destructive",
              )}
              icon={Icon}
              key={step.key}
              label={
                hasDisclosure ? (
                  <Reasoning
                    className="mb-0 w-full"
                    defaultOpen={false}
                    isStreaming={isStageStreaming}
                    onOpenChange={(open) => {
                      setOpenByStage((current) => ({ ...current, [reasoningStage]: open }));
                      if (isStageStreaming) setSuppressNewStageAutoOpen(!open);
                    }}
                    open={reasoningOpen}
                  >
                    <ReasoningTrigger className="w-full text-foreground">
                      <span className="flex min-w-0 flex-1 items-center text-left">
                        <StageLabel step={step} />
                      </span>
                    </ReasoningTrigger>
                    {reasoning ? (
                      <ProgressiveReasoningContent
                        isStreaming={isStageStreaming}
                        text={reasoning}
                      />
                    ) : null}
                    {stageTools.map((activity) => (
                      <ToolActivity activity={activity} key={activity.id} />
                    ))}
                    {stageText ? (
                      <ProgressiveTextContent
                        isStreaming={isStageStreaming}
                        label={
                          reasoningStage === "extract" ? "Writing your voice guide" : undefined
                        }
                        text={stageText}
                      />
                    ) : null}
                  </Reasoning>
                ) : (
                  <span className="flex min-h-5 items-center">
                    <StageLabel step={step} />
                  </span>
                )
              }
              status={status}
            />
          );
        })}
        <div aria-hidden="true" ref={streamEndRef} />
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
