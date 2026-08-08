"use client";

import {
  ArrowUpRightIcon,
  BrainIcon,
  HistoryIcon,
  InfoIcon,
  MoreHorizontalIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import twitterText from "twitter-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { DraftHistoryDetail, HistoryVersion } from "@/lib/agent/council-query";
import type { DraftConstruction } from "@/lib/agent/draft-construction";
import { editDraft } from "./actions";
import { type DraftReasoningResult, fetchDraftHistory, getDraftReasoning } from "./council-actions";
import { relativeLabel } from "./relative-time";

type LoadState<T> = { status: "loading" } | { status: "error" } | { status: "ready"; detail: T };

export function DraftMenu({
  draftId,
  versionCount,
  sourceUrl,
  sourceGone,
  canRevert,
  onDraftReplaced,
}: {
  draftId: string;
  versionCount: number;
  sourceUrl: string | null;
  sourceGone: boolean;
  canRevert: boolean;
  onDraftReplaced: (draftId: string, text: string) => void;
}) {
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [history, setHistory] = useState<LoadState<DraftHistoryDetail>>({ status: "loading" });
  const [reasoning, setReasoning] = useState<LoadState<DraftReasoningResult>>({
    status: "loading",
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!historyOpen) return;
    let cancelled = false;
    setHistory({ status: "loading" });
    fetchDraftHistory(draftId)
      .then((detail) => {
        if (!cancelled) setHistory({ status: "ready", detail });
      })
      .catch(() => {
        if (!cancelled) setHistory({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [draftId, historyOpen]);

  useEffect(() => {
    if (!reasoningOpen) return;
    let cancelled = false;
    setReasoning({ status: "loading" });
    getDraftReasoning(draftId)
      .then((detail) => {
        if (!cancelled) setReasoning({ status: "ready", detail });
      })
      .catch(() => {
        if (!cancelled) setReasoning({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [draftId, reasoningOpen]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Draft menu"
            className="-my-1 flex size-11 shrink-0 items-center justify-center rounded-md text-text-muted outline-none hover:bg-white/9 focus-visible:ring-2 focus-visible:ring-ring desk:my-0 desk:size-[30px]"
            type="button"
          >
            <MoreHorizontalIcon aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[190px] rounded-[8px] bg-[var(--menu-bg)]">
          {sourceUrl && !sourceGone ? (
            <DropdownMenuItem asChild className="min-h-11 desk:min-h-7">
              <a href={sourceUrl} rel="noreferrer" target="_blank">
                <ArrowUpRightIcon />
                View source
              </a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="min-h-11 desk:min-h-7" disabled>
              <ArrowUpRightIcon />
              View source
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="min-h-11 desk:min-h-7"
            onSelect={() => setReasoningOpen(true)}
          >
            <BrainIcon />
            Reasoning
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 desk:min-h-7" onSelect={() => setHistoryOpen(true)}>
            <HistoryIcon />
            History{versionCount > 0 ? ` (${versionCount})` : ""}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet onOpenChange={setReasoningOpen} open={reasoningOpen}>
        <SheetContent
          className="w-full gap-0 bg-[var(--menu-bg)] p-0 desk:max-w-[420px]"
          showCloseButton={false}
        >
          <SheetClose asChild>
            <button
              aria-label="Close reasoning"
              className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-md text-text-muted outline-none hover:bg-white/9 focus-visible:ring-2 focus-visible:ring-ring desk:size-7"
              type="button"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          </SheetClose>
          <SheetHeader className="border-b border-[var(--band-border)] px-5 py-4">
            <SheetTitle className="flex items-center gap-2">
              <BrainIcon aria-hidden="true" className="size-4" />
              Reasoning
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <Alert className="border-primary/30 bg-primary/8 text-foreground">
              <InfoIcon aria-hidden="true" />
              <AlertDescription className="text-foreground/90">
                This shows why Oparax surfaced this post for your beat and, when recorded, how it
                shaped the original draft.
              </AlertDescription>
            </Alert>
            {reasoning.status === "loading" ? <Skeleton className="h-32 w-full" /> : null}
            {reasoning.status === "error" ? (
              <p className="text-sm text-destructive">Couldn&apos;t load the reasoning.</p>
            ) : null}
            {reasoning.status === "ready" && reasoning.detail.state === "found" ? (
              <section className="space-y-2" aria-labelledby="beat-reason-title">
                <h2
                  className="font-heading text-sm font-medium text-foreground"
                  id="beat-reason-title"
                >
                  Why this post matches your beat
                </h2>
                <p className="text-sm leading-relaxed text-text-body">
                  {reasoning.detail.onBeatReason}
                </p>
              </section>
            ) : null}
            {reasoning.status === "ready" &&
            reasoning.detail.state === "found" &&
            reasoning.detail.construction ? (
              <DraftConstructionBreakdown
                construction={reasoning.detail.construction}
                edited={reasoning.detail.edited}
              />
            ) : null}
            {reasoning.status === "ready" &&
            reasoning.detail.state === "found" &&
            !reasoning.detail.construction ? (
              <p className="text-sm leading-relaxed text-text-muted">
                Construction details were not recorded for this draft.
              </p>
            ) : null}
            {reasoning.status === "ready" && reasoning.detail.state === "withheld" ? (
              <p className="text-sm text-text-muted">Reasoning is unavailable for this draft.</p>
            ) : null}
            {reasoning.status === "ready" && reasoning.detail.state === "none" ? (
              <p className="text-sm text-text-muted">Reasoning is unavailable for this draft.</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet onOpenChange={setHistoryOpen} open={historyOpen}>
        <SheetContent
          className="w-full gap-0 bg-[var(--menu-bg)] p-0 desk:max-w-[420px]"
          showCloseButton={false}
        >
          <SheetClose asChild>
            <button
              aria-label="Close history"
              className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-md text-text-muted outline-none hover:bg-white/9 focus-visible:ring-2 focus-visible:ring-ring desk:size-7"
              type="button"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          </SheetClose>
          <SheetHeader className="border-b border-[var(--band-border)] px-5 py-4">
            <SheetTitle>History</SheetTitle>
            <SheetDescription>Earlier versions of this draft, newest first.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
            {history.status === "loading" ? (
              <>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : null}
            {history.status === "error" ? (
              <p className="text-sm text-destructive">
                Couldn&apos;t load this draft&apos;s history.
              </p>
            ) : null}
            {history.status === "ready" && history.detail.kind === "not_found" ? (
              <p className="text-sm text-text-muted">No history is available.</p>
            ) : null}
            {history.status === "ready" && history.detail.kind === "found" ? (
              <HistoryVersions
                canRevert={canRevert}
                isPending={isPending}
                onRevert={(version) => {
                  startTransition(async () => {
                    const result = await editDraft(draftId, version.text);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    onDraftReplaced(result.draftId, version.text);
                    setHistoryOpen(false);
                    router.refresh();
                    toast.success("Draft reverted");
                  });
                }}
                versions={history.detail.versions.slice(1)}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function DraftConstructionBreakdown({
  construction,
  edited,
}: {
  construction: DraftConstruction;
  edited: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby="draft-construction-title">
      <div className="space-y-1">
        <h2
          className="font-heading text-sm font-medium text-foreground"
          id="draft-construction-title"
        >
          How Oparax built the draft
        </h2>
        {edited ? (
          <p className="text-sm leading-relaxed text-text-muted">
            This breakdown describes the original model draft before your edit.
          </p>
        ) : null}
      </div>
      <ConstructionBlock title="Post mode">
        <p className="text-sm text-text-muted">{construction.postMode.name}</p>
        <p className="text-sm leading-relaxed text-text-body">
          {construction.postMode.description}
        </p>
        <p className="text-sm leading-relaxed text-text-muted">
          {construction.postMode.whyThisSourceFits}
        </p>
      </ConstructionBlock>
      <ConstructionBlock title="Guide rules applied">
        <ul className="space-y-3">
          {construction.appliedRules.map((rule) => (
            <li className="space-y-1" key={`${rule.rule}-${rule.why}`}>
              <p className="text-sm font-medium text-foreground">{rule.rule}</p>
              <p className="text-sm leading-relaxed text-text-muted">{rule.why}</p>
            </li>
          ))}
        </ul>
      </ConstructionBlock>
      <ConstructionBlock title="Formatting choices">
        <ul className="space-y-3">
          {construction.formattingChoices.map((choice) => (
            <li className="space-y-1" key={`${choice.choice}-${choice.why}`}>
              <p className="text-sm font-medium text-foreground">{choice.choice}</p>
              <p className="text-sm leading-relaxed text-text-muted">{choice.why}</p>
            </li>
          ))}
        </ul>
      </ConstructionBlock>
    </section>
  );
}

function ConstructionBlock({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="space-y-3 rounded-md border border-[var(--card-border)] bg-black/15 p-4">
      <h3 className="font-heading text-sm font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function HistoryVersions({
  versions,
  canRevert,
  isPending,
  onRevert,
}: {
  versions: HistoryVersion[];
  canRevert: boolean;
  isPending: boolean;
  onRevert: (version: HistoryVersion) => void;
}) {
  if (!versions.length) return <p className="text-sm text-text-muted">No earlier versions.</p>;

  return versions.map((version) => (
    <article
      className="rounded-md border border-[var(--card-border)] bg-black/15 p-4"
      key={version.draftId}
    >
      <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[11.5px] text-text-muted">
        <span>{relativeLabel(version.createdAt).label}</span>
        <span>{twitterText.parseTweet(version.text).weightedLength} chars</span>
      </div>
      <p className="whitespace-pre-wrap font-draft text-[15px] leading-[1.52] text-text-draft">
        {version.text}
      </p>
      <div className="mt-4 flex justify-end">
        <Button
          className="min-h-11 bg-warning px-4 text-background hover:bg-warning/85 desk:h-[30px] desk:min-h-0"
          disabled={!canRevert || isPending}
          onClick={() => onRevert(version)}
          size="sm"
        >
          Revert
        </Button>
      </div>
    </article>
  ));
}
