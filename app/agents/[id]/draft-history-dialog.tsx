"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

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
      <span className="absolute top-0 left-3.5 rounded-b-[5px] bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
        {relativeLabel(version.createdAt).label}
      </span>
      <p className="whitespace-pre-wrap text-[15.5px] leading-[1.5]">{version.text}</p>
      <div className="mt-3 h-px bg-border" />
      <div className="flex items-center justify-end gap-3 pt-2">
        <span className="font-mono text-xs">{version.text.length}</span>
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winningDraftId: string;
  canRevert: boolean;
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>Loading earlier versions…</DialogDescription>
          </DialogHeader>
          <DraftHistorySkeleton />
        </DialogContent>
      </Dialog>
    );
  }

  if (state.status === "error") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>
              {"Couldn't load this draft's history. Try again."}
            </DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button size="sm">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );
  }

  if (state.detail.kind === "not_found") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>No history on record for this draft.</DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button size="sm">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );
  }

  const versions = state.detail.versions.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            {state.detail.versions.length - 1} earlier version(s)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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
      </DialogContent>
    </Dialog>
  );
}
