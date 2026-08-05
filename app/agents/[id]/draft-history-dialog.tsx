"use client";

import { XIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import twitterText from "twitter-text";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { DraftHistoryDetail, HistoryVersion } from "@/lib/agent/council-query";
import { editDraft } from "./actions";
import { fetchDraftHistory } from "./council-actions";
import { relativeLabel } from "./relative-time";

const historyDialogContentClass =
  "data-history-dialog-content fixed inset-x-0 bottom-0 top-auto mx-auto flex max-h-[78vh] w-full max-w-[393px] translate-x-0 translate-y-0 flex-col gap-0 rounded-t-[10px] rounded-b-none border-[color:#2a2a22] bg-[#111110] p-0 shadow-[0_30px_70px_rgba(0,0,0,0.6)] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[10px]";

function HistoryDialogContent({ children }: { children: React.ReactNode }) {
  return (
    <DialogContent className={historyDialogContentClass} showCloseButton={false}>
      {children}
      <style jsx global>{`
        body:has([data-history-dialog-content]) [data-slot="dialog-overlay"] {
          background: rgba(4, 4, 3, 0.72);
          backdrop-filter: blur(3px);
        }
      `}</style>
    </DialogContent>
  );
}

function HistoryHeader({ children }: { children: React.ReactNode }) {
  return (
    <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-[#23231d] px-[18px] pt-[15px] pb-[13px]">
      <div className="flex flex-col gap-0.5">
        <DialogTitle className="text-[15px] leading-normal font-semibold tracking-[-0.01em]">
          Version history
        </DialogTitle>
        <DialogDescription className="text-[12.5px]">{children}</DialogDescription>
      </div>
      <DialogClose asChild>
        <Button
          aria-label="Close version history"
          className="size-[30px] rounded-[4px] border-[#2e2e26] p-0 text-muted-foreground hover:border-warning hover:text-warning"
          size="icon"
          variant="ghost"
        >
          <XIcon aria-hidden="true" className="size-3.5" />
        </Button>
      </DialogClose>
    </DialogHeader>
  );
}

function VersionRow({
  version,
  onRevert,
  disabled,
  pending,
}: {
  version: HistoryVersion;
  onRevert: () => void;
  disabled: boolean;
  pending: boolean;
}) {
  return (
    <article className="relative rounded-[7px] border border-border bg-secondary px-4 pt-7 pb-2">
      <span className="absolute top-0 left-3.5 rounded-b-[5px] bg-[oklch(0.30_0.004_100)] px-2.5 pt-1 pb-[5px] text-[11px] text-foreground/62">
        {relativeLabel(version.createdAt).label}
      </span>
      <p className="whitespace-pre-wrap text-[15.5px] leading-[1.5]">{version.text}</p>
      <div className="mt-3 h-px bg-border" />
      <div className="flex items-center justify-end gap-3 pt-2">
        <span className="font-mono text-xs text-muted-foreground">
          {twitterText.parseTweet(version.text).weightedLength}
        </span>
        <Button
          className="h-[30px] rounded-[2px] bg-warning px-[15px] text-background hover:bg-warning/90"
          disabled={disabled || pending}
          onClick={onRevert}
          size="sm"
        >
          Revert
        </Button>
      </div>
    </article>
  );
}

function DraftHistorySkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

export function DraftHistoryDialog({
  open,
  onOpenChange,
  winningDraftId,
  canRevert,
  sourceLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winningDraftId: string;
  canRevert: boolean;
  sourceLabel?: string | null;
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "ready"; detail: DraftHistoryDetail }
  >({ status: "loading" });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    if (!open) return;

    setState({ status: "loading" });
    fetchDraftHistory(winningDraftId)
      .then((detail) => {
        if (!cancelled) setState({ status: "ready", detail });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [open, winningDraftId]);

  if (!open) {
    return null;
  }

  if (state.status === "loading") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <HistoryDialogContent>
          <HistoryHeader>Loading earlier versions…</HistoryHeader>
          <div className="overflow-y-auto px-[18px] pt-4 pb-5">
            <DraftHistorySkeleton />
          </div>
        </HistoryDialogContent>
      </Dialog>
    );
  }

  if (state.status === "error") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <HistoryDialogContent>
          <HistoryHeader>{"Couldn't load this draft's history. Try again."}</HistoryHeader>
        </HistoryDialogContent>
      </Dialog>
    );
  }

  if (state.detail.kind === "not_found") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <HistoryDialogContent>
          <HistoryHeader>No history on record for this draft.</HistoryHeader>
        </HistoryDialogContent>
      </Dialog>
    );
  }

  const versions = state.detail.versions.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <HistoryDialogContent>
        <HistoryHeader>
          {sourceLabel ? `${sourceLabel} · ` : null}
          {versions.length} earlier version{versions.length === 1 ? "" : "s"}
        </HistoryHeader>
        <div className="space-y-3 overflow-y-auto px-[18px] pt-4 pb-5">
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No earlier versions.</p>
          ) : null}
          {versions.map((version) => (
            <VersionRow
              disabled={!canRevert}
              key={version.draftId}
              onRevert={() => {
                startTransition(async () => {
                  const result = await editDraft(winningDraftId, version.text);
                  if (result.ok) {
                    toast.success("Reverted");
                    onOpenChange(false);
                    return;
                  }
                  toast.error(result.error);
                });
              }}
              pending={isPending}
              version={version}
            />
          ))}
        </div>
      </HistoryDialogContent>
    </Dialog>
  );
}
