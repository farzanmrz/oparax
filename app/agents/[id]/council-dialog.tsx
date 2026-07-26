// app/agents/[id]/council-dialog.tsx
//
// Self-contained "Why this draft" overlay: `CouncilDialog` renders its own trigger
// icon-button AND owns its open state — plain local `useState`, mirroring
// `draft-edit-dialog.tsx`'s pattern. This dialog used to mirror its open state to
// `?why=<sourcePostId>` for deep-linkability, but the page is fully dynamic, so every
// open/close forced a full server round trip (re-running the feed query) before the dialog
// visibly opened — it felt dead. Deep-linkability is deliberately sacrificed for an instant
// open. The heavy body — the fetch + the per-model cards + Reasoning toggles — is
// `next/dynamic({ ssr: false })`, so it never renders server-side and only mounts once the
// dialog has actually been opened; the trigger button itself renders immediately. T4 drops
// `<CouncilDialog sourcePostId=.. experimentId=.. />` straight into the draft-card action row.
"use client";

import { BrainIcon, InfoIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CouncilDetail, CouncilGroup, CouncilMember } from "@/lib/agent/council-query";
import type { ReasoningTraceState } from "@/lib/agent/reasoning-trace";
import { formatCost } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchCouncilDetail } from "./council-actions";

const CRITERIA = [
  {
    name: "Voice match",
    description:
      "Wording tracks the reporter's own posts — lede shape, attribution style, no hype/emoji.",
  },
  {
    name: "Accuracy",
    description:
      "Every figure, name, and claim is faithful to the source — nothing asserted beyond it.",
  },
  {
    name: "Hook",
    description: "The first line earns the read — it leads with the development.",
  },
] as const;

// Why a call carries no reasoning trace, in the reporter's words. The three causes are NOT the
// same claim and the dialog used to make the harshest one for all of them: the judge runs at
// `reasoning: "none"` (leg 1 of .claude/rules/agent.md's generateObject recipe) and has no trace
// BY DESIGN, so calling it a model that can't expose reasoning was simply wrong. The state is
// classified in `lib/agent/reasoning-trace.ts` off the reasoning-token count.
const NO_TRACE_COPY = {
  withheld: "Reasoning not exposed by this model.",
  none: {
    member: "Ran without reasoning.",
    judge: "Ran without reasoning (structured verdict).",
  },
  unknown: "No reasoning trace recorded for this call.",
} as const;

function ReasoningNote({
  call,
  slot = "member",
}: {
  call: { reasoning: string | null; reasoningState: ReasoningTraceState };
  slot?: "member" | "judge";
}) {
  if (call.reasoningState === "present" && call.reasoning) {
    return (
      <Reasoning defaultOpen={false}>
        <ReasoningTrigger getThinkingMessage={() => <p>Reasoning</p>} />
        <ReasoningContent>{call.reasoning}</ReasoningContent>
      </Reasoning>
    );
  }
  const note =
    call.reasoningState === "withheld"
      ? NO_TRACE_COPY.withheld
      : call.reasoningState === "none"
        ? NO_TRACE_COPY.none[slot]
        : NO_TRACE_COPY.unknown;
  return <p className="text-xs text-muted-foreground">{note}</p>;
}

function MemberCard({ member }: { member: CouncilMember }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3",
        member.isWinner && "border-primary ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
          {member.model}
        </span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {formatCost(member.costUsd)}
        </span>
      </div>
      <div className="whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-sm">{member.output}</div>
      <ReasoningNote call={member} />
    </div>
  );
}

function GroupView({ group }: { group: CouncilGroup }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {group.members.map((member) => (
          <MemberCard key={member.postDraftId} member={member} />
        ))}
      </div>
      {group.judge ? (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-xs text-muted-foreground">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-success" />
              Judge · {group.judge.model}
            </span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {formatCost(group.judge.costUsd)}
            </span>
          </div>
          <p className="text-sm">
            {group.judge.winnerModel ? (
              <>
                Picked <span className="font-medium">{group.judge.winnerModel}</span>
                {group.judge.rationale ? ` — ${group.judge.rationale}` : "."}
              </>
            ) : (
              (group.judge.rationale ?? "No verdict recorded for this call.")
            )}
          </p>
          <ReasoningNote call={group.judge} slot="judge" />
        </div>
      ) : null}
      <div className="flex items-center justify-between border-t pt-3 text-sm">
        <span className="text-muted-foreground">Total for this story</span>
        <span className="font-mono">{formatCost(group.totalCostUsd)}</span>
      </div>
    </div>
  );
}

function RevisionView({
  revision,
  originalCouncil,
}: {
  revision: CouncilMember;
  originalCouncil: CouncilGroup | null;
}) {
  return (
    <div className="space-y-4">
      <MemberCard member={revision} />
      {originalCouncil ? (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <BrainIcon aria-hidden className="size-4" />
            View original council
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <GroupView group={originalCouncil} />
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <p className="text-xs text-muted-foreground">
          The original council for this story isn't on record.
        </p>
      )}
    </div>
  );
}

function CouncilOverlaySkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function CouncilOverlayBodyImpl({
  sourcePostId,
  experimentId,
}: {
  sourcePostId: string;
  experimentId: string;
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "ready"; detail: CouncilDetail }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchCouncilDetail(sourcePostId, experimentId)
      .then((detail: CouncilDetail) => {
        if (!cancelled) setState({ status: "ready", detail });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [sourcePostId, experimentId]);

  if (state.status === "loading") return <CouncilOverlaySkeleton />;
  if (state.status === "error") {
    return (
      <p className="text-sm text-destructive">Couldn't load this draft's council. Try again.</p>
    );
  }
  if (state.detail.kind === "not_found") {
    return <p className="text-sm text-muted-foreground">No council on record for this draft.</p>;
  }
  return state.detail.kind === "original" ? (
    <GroupView group={state.detail.council} />
  ) : (
    <RevisionView originalCouncil={state.detail.originalCouncil} revision={state.detail.revision} />
  );
}

const CouncilOverlayBody = dynamic(() => Promise.resolve(CouncilOverlayBodyImpl), {
  ssr: false,
  loading: () => <CouncilOverlaySkeleton />,
});

function CouncilTrigger() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button aria-label="How this draft was made" size="icon-sm" variant="ghost">
              <InfoIcon />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>How this draft was made</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CouncilDialog({
  sourcePostId,
  experimentId,
}: {
  sourcePostId: string;
  experimentId: string;
}) {
  // Plain local state, not URL-synced — see the file header comment for why.
  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <CouncilTrigger />
      {/* Width is set here, never in the vendored primitive (which ships `sm:max-w-sm`): three
          model columns each need room for an EXPANDED reasoning trace, and at the old 860px a
          column was a strip too thin to read a trace in. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Why this draft</DialogTitle>
          <DialogDescription>
            Multiple models draft this post from the same source, each in your voice. A judge scores
            every attempt against three tests and picks the strongest — you see all of them, what
            each cost, and the reasoning, so you can trust the pick or take it back.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-3">
          {CRITERIA.map((criterion) => (
            <div className="rounded-md bg-muted/40 p-2" key={criterion.name}>
              <p className="text-xs font-medium">{criterion.name}</p>
              <p className="text-xs text-muted-foreground">{criterion.description}</p>
            </div>
          ))}
        </div>
        <div aria-live="polite">
          {open ? (
            <CouncilOverlayBody experimentId={experimentId} sourcePostId={sourcePostId} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
