"use client";

import { ArrowUpRightIcon, BrainIcon, HistoryIcon, MoreHorizontalIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import twitterText from "twitter-text";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { DraftHistoryDetail, HistoryVersion } from "@/lib/agent/council-query";
import { editDraft } from "./actions";
import { type DraftReasoningResult, fetchDraftHistory, getDraftReasoning } from "./council-actions";
import { relativeLabel } from "./relative-time";

const DraftReasoning = dynamic(() => import("./draft-reasoning"), {
  loading: () => <Skeleton className="h-32 w-full" />,
});

type LoadState<T> = { status: "loading" } | { status: "error" } | { status: "ready"; detail: T };

export function DraftMenu({
  draftId,
  versionCount,
  sourceUrl,
  sourceGone,
  sourceLabel,
  canRevert,
  onDraftReplaced,
}: {
  draftId: string;
  versionCount: number;
  sourceUrl: string | null;
  sourceGone: boolean;
  sourceLabel: string;
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
            <DropdownMenuItem asChild>
              <a href={sourceUrl} rel="noreferrer" target="_blank">
                <ArrowUpRightIcon />
                View source
              </a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <ArrowUpRightIcon />
              View source
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setReasoningOpen(true)}>
            <BrainIcon />
            Reasoning
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setHistoryOpen(true)}>
            <HistoryIcon />
            History{versionCount > 0 ? ` (${versionCount})` : ""}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet onOpenChange={setReasoningOpen} open={reasoningOpen}>
        <SheetContent className="w-full gap-0 bg-[var(--menu-bg)] p-0 sm:max-w-[420px]">
          <SheetHeader className="border-b border-[var(--band-border)] px-5 py-4">
            <SheetTitle>Reasoning</SheetTitle>
            <SheetDescription>
              {reasoning.status === "ready" && reasoning.detail.edited
                ? "Original draft reasoning"
                : `Why Oparax drafted this post for ${sourceLabel}`}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {reasoning.status === "loading" ? <Skeleton className="h-32 w-full" /> : null}
            {reasoning.status === "error" ? (
              <p className="text-sm text-destructive">Couldn&apos;t load the reasoning.</p>
            ) : null}
            {reasoning.status === "ready" && reasoning.detail.state === "found" ? (
              <DraftReasoning content={reasoning.detail.reasoning} />
            ) : null}
            {reasoning.status === "ready" && reasoning.detail.state === "withheld" ? (
              <p className="text-sm text-text-muted">
                The model provider withheld this draft&apos;s reasoning trace.
              </p>
            ) : null}
            {reasoning.status === "ready" && reasoning.detail.state === "none" ? (
              <p className="text-sm text-text-muted">No reasoning trace was captured.</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet onOpenChange={setHistoryOpen} open={historyOpen}>
        <SheetContent className="w-full gap-0 bg-[var(--menu-bg)] p-0 sm:max-w-[420px]">
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
          className="h-[30px] bg-warning px-4 text-background hover:bg-warning/85"
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
