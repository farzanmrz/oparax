"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpenIcon,
  CircleIcon,
  ListChecksIcon,
  ListFilterIcon,
  PenLineIcon,
} from "lucide-react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

export type ExtractionStep = {
  key: string;
  label: string;
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

export function ExtractionChain({ steps }: { readonly steps: ExtractionStep[] }) {
  return (
    <ChainOfThought className="w-full" defaultOpen>
      <ChainOfThoughtContent className="mt-0 space-y-4">
        {steps.map((step) => {
          const Icon = STEP_ICON[step.key] ?? CircleIcon;
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
                <span className="flex min-h-5 items-center">
                  <StageLabel step={step} />
                </span>
              }
              status={status}
            />
          );
        })}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
