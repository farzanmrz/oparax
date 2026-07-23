// app/agents/[id]/draft-history-dialog.tsx
//
// Self-contained "Draft history" overlay: `DraftHistoryDialog` renders its own trigger
// icon-button AND owns its open state (mirrored to `?history=<winningPostDraftId>`,
// deep-link/reload-safe). The heavy body — the fetch + the version timeline + the
// corrections thread — is `next/dynamic({ ssr: false })`, mounted only once the dialog is
// actually opened; the trigger renders immediately. T4 drops
// `<DraftHistoryDialog winningPostDraftId=.. />` straight into the draft-card action row.
"use client";

import { HistoryIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { Correction, DraftHistoryDetail, HistoryVersion } from "@/lib/agent/council-query";
import { fetchDraftHistory } from "./council-actions";

/** Client-render-only, so it never diverges from the reader's own clock — this dialog
 *  fetches on open, not on the initial server render, so there's no hydration mismatch to
 *  guard against either way. */
function formatRelativeTime(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function VersionRow({ version }: { version: HistoryVersion }) {
  return (
    <div className="space-y-1.5 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          v{version.depth} ·{" "}
          {version.depth === 0
            ? "first draft"
            : `generated ${formatRelativeTime(version.createdAt)}`}
        </span>
        {version.isCurrent ? <Badge variant="secondary">Current</Badge> : null}
      </div>
      {version.appliedFeedback ? (
        <p className="text-xs text-muted-foreground">
          Applied your correction: &ldquo;{truncate(version.appliedFeedback, 96)}&rdquo;
        </p>
      ) : null}
      <div className="whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-sm">{version.text}</div>
    </div>
  );
}

function CorrectionsThread({ corrections }: { corrections: Correction[] }) {
  if (corrections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No corrections on this one. Reply to the delivery in Slack or email to correct a draft —
        your reply is applied and saved as a new version.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {corrections.map((correction) => (
        <div className="space-y-2" key={`${correction.reply}-${correction.applied}`}>
          <Message from="user">
            <MessageContent>
              <p className="text-xs font-medium text-muted-foreground">Reply</p>
              <p>{correction.reply}</p>
            </MessageContent>
          </Message>
          <Message from="assistant">
            <MessageContent>
              <p className="text-xs font-medium text-muted-foreground">Oparax · Applied</p>
              <p className="whitespace-pre-wrap">{correction.applied}</p>
            </MessageContent>
          </Message>
        </div>
      ))}
    </div>
  );
}

function DraftHistorySkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function DraftHistoryBodyImpl({ winningPostDraftId }: { winningPostDraftId: string }) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "ready"; detail: DraftHistoryDetail }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchDraftHistory(winningPostDraftId)
      .then((detail) => {
        if (!cancelled) setState({ status: "ready", detail });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [winningPostDraftId]);

  if (state.status === "loading") return <DraftHistorySkeleton />;
  if (state.status === "error") {
    return (
      <p className="text-sm text-destructive">Couldn't load this draft's history. Try again.</p>
    );
  }
  if (state.detail.kind === "not_found") {
    return <p className="text-sm text-muted-foreground">No history on record for this draft.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="font-mono text-xs text-muted-foreground">X draft · newest first</p>
        {state.detail.versions.map((version) => (
          <VersionRow key={version.postDraftId} version={version} />
        ))}
      </div>
      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-medium">Corrections you sent</p>
        <CorrectionsThread corrections={state.detail.corrections} />
      </div>
    </div>
  );
}

const DraftHistoryBody = dynamic(() => Promise.resolve(DraftHistoryBodyImpl), {
  ssr: false,
  loading: () => <DraftHistorySkeleton />,
});

/** No Dialog/Tooltip context requirement — used both inside the wired-up trigger below AND
 *  as the Suspense fallback, where no `<Dialog>` ancestor exists yet to satisfy Radix's
 *  `DialogTrigger`. */
function HistoryTriggerButton({ disabled }: { disabled?: boolean }) {
  return (
    <Button aria-label="Draft history" disabled={disabled} size="icon-sm" variant="ghost">
      <HistoryIcon />
    </Button>
  );
}

function HistoryTrigger() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <HistoryTriggerButton />
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Draft history</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DraftHistoryDialogInner({ winningPostDraftId }: { winningPostDraftId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = searchParams.get("history") === winningPostDraftId;

  function setOpen(next: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("history", winningPostDraftId);
    } else if (params.get("history") === winningPostDraftId) {
      params.delete("history");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <HistoryTrigger />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Draft history</DialogTitle>
          <DialogDescription>
            Every version of this draft, and the corrections behind them.
          </DialogDescription>
        </DialogHeader>
        <div aria-live="polite">
          {open ? <DraftHistoryBody winningPostDraftId={winningPostDraftId} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DraftHistoryDialog(props: { winningPostDraftId: string }) {
  return (
    <Suspense fallback={<HistoryTriggerButton disabled />}>
      <DraftHistoryDialogInner {...props} />
    </Suspense>
  );
}
