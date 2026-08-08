"use client";

import { CheckCircle2Icon, CircleXIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteFavicon } from "@/components/site-favicon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FeedDraft, FeedItem } from "@/lib/agent/feed-shared";
import { cn } from "@/lib/utils";
import type { ExtractionProgressState } from "@/lib/voice/use-extraction-progress";
import { DraftBox } from "./draft-box";
import { DraftMenu } from "./draft-menu";
import { RelativeTime } from "./relative-time";
import { SetupProgressCard } from "./setup-progress-card";

function getSourceLabel(source: FeedItem["source"]): string {
  return source.kind === "x"
    ? source.authorHandle
      ? `@${source.authorHandle}`
      : "X source"
    : (source.siteName ?? "News source");
}

function SourceIcon({ isX, siteDomain }: { isX: boolean; siteDomain: string | null }) {
  if (isX) {
    return (
      <svg aria-hidden="true" fill="currentColor" height="15" viewBox="0 0 24 24" width="15">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z" />
      </svg>
    );
  }
  return <SiteFavicon domain={siteDomain} />;
}

function SourceDeletedAlert() {
  return (
    <>
      <span className="hidden min-w-0 shrink-[3] items-center gap-1 rounded-sm bg-destructive/12 px-2 py-1 text-[11px] text-danger-text desk:flex">
        <CircleXIcon aria-hidden="true" className="size-3 shrink-0" />
        <span className="truncate">source deleted</span>
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Source deleted"
            className="-my-1 flex size-11 shrink-0 items-center justify-center rounded-md text-danger-text outline-none focus-visible:ring-2 focus-visible:ring-ring desk:hidden"
            type="button"
          >
            <CircleXIcon aria-hidden="true" className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end">
          <PopoverDescription>
            The original post was deleted by its author — you can still review and post this draft.
          </PopoverDescription>
        </PopoverContent>
      </Popover>
    </>
  );
}

function SourceStrip({
  source,
  createdAt,
  draft,
  onDraftReplaced,
  postPending,
}: {
  source: FeedItem["source"];
  createdAt: string;
  draft: FeedDraft;
  onDraftReplaced: (draftId: string, text: string) => void;
  postPending: boolean;
}) {
  const isX = source.kind === "x";
  const label = getSourceLabel(source);

  return (
    <div
      className={cn(
        "flex h-[var(--strip-h-mobile)] items-center gap-2 rounded-t-lg border-b border-[var(--band-border)] pr-[10px] pl-[18px] text-[13.5px] desk:h-[var(--strip-h-web)] desk:pr-[9px] desk:pl-[14px] desk:text-[12.5px]",
        isX ? "bg-[image:var(--strip-x-grad)]" : "bg-[image:var(--strip-news-grad)]",
      )}
    >
      {/* Fixed 15px source-icon slot: X logo, favicon, and globe fallback all render at
          exactly this size so the strip's leading edge never shifts between source kinds. */}
      <span className="flex size-[15px] shrink-0 items-center justify-center">
        <SourceIcon isX={isX} siteDomain={source.siteDomain} />
      </span>
      <span
        className={cn(
          "shrink-0 whitespace-nowrap text-[14.5px] font-medium desk:min-w-0 desk:shrink desk:truncate desk:text-[13.5px]",
          isX ? "text-text-handle-x" : "text-text-handle-news",
        )}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          source.fresh ? "animate-[op-pulse_2s_ease-in-out_infinite] bg-warning" : "bg-warn-stale",
        )}
      />
      <span className="shrink-0 whitespace-nowrap text-[14px] text-text-muted desk:min-w-0 desk:shrink-[2] desk:truncate desk:text-[13px]">
        <RelativeTime iso={source.postedAt ?? createdAt} />
      </span>
      <span className="min-w-0 flex-1" />
      {source.gone ? <SourceDeletedAlert /> : null}
      <DraftMenu
        canRevert={!postPending && !(draft.postedAt && draft.postedUrl)}
        draftId={draft.draftId}
        onDraftReplaced={onDraftReplaced}
        sourceGone={source.gone}
        sourceUrl={source.url}
        versionCount={draft.versionCount}
      />
    </div>
  );
}

export function FeedItemCard({
  item,
  charLimit,
  xLinked,
}: {
  item: FeedItem;
  charLimit: number;
  xLinked: boolean;
}) {
  const winner = item.winners.x ?? Object.values(item.winners)[0];
  const [activeDraft, setActiveDraft] = useState<FeedDraft | null>(winner ?? null);
  const [postPending, setPostPending] = useState(false);

  useEffect(() => {
    setActiveDraft((current) => {
      const next = winner ?? null;
      if (!current || !next || current.draftId !== next.draftId) return next;
      return {
        ...current,
        postedAt: next.postedAt,
        postingClaimedAt: next.postingClaimedAt,
        postedUrl: next.postedUrl,
        newsSynthesis: next.newsSynthesis,
      };
    });
  }, [winner]);

  if (!activeDraft) return null;

  function replaceDraft(draftId: string, text: string) {
    setActiveDraft((current) =>
      current
        ? {
            ...current,
            draftId,
            draftText: text,
            postedAt: null,
            postingClaimedAt: null,
            postedUrl: null,
            versionCount: current.versionCount + 1,
          }
        : current,
    );
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))] shadow-[var(--card-shadow)]",
        item.source.gone && "border-dashed border-destructive",
      )}
    >
      <SourceStrip
        createdAt={item.createdAt}
        draft={activeDraft}
        onDraftReplaced={replaceDraft}
        postPending={postPending}
        source={item.source}
      />
      <div className="px-[14px] pt-4 pb-[17px] desk:px-6 desk:pb-[19px]">
        <h2 className="text-pretty text-[17.5px] leading-[1.3] font-semibold tracking-[-0.017em] text-text-title desk:text-[20px]">
          {item.newsTitle}
        </h2>
        <p className="mt-2.5 text-pretty text-[13.5px] leading-[1.6] text-text-body desk:mt-3 desk:text-[14.5px]">
          {activeDraft.newsSynthesis ?? "NO SYNTHESIS"}
        </p>
      </div>
      <DraftBox
        charLimit={charLimit}
        draft={activeDraft}
        edited={activeDraft.versionCount > 0}
        onDraftReplaced={replaceDraft}
        onPostPendingChange={setPostPending}
        postPending={postPending}
        xLinked={xLinked}
      />
    </article>
  );
}

export function FeedCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="op-skeleton min-h-[586px] animate-[op-skeleton_1.5s_ease-in-out_infinite] overflow-hidden rounded-lg border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))] desk:min-h-[382px]"
    >
      <div className="h-[var(--strip-h-mobile)] border-b border-[var(--band-border)] bg-[image:var(--strip-x-grad)] desk:h-[var(--strip-h-web)]" />
      <div className="space-y-3 px-[14px] py-5 desk:px-6">
        <div className="h-5 w-4/5 rounded-md bg-white/10" />
        <div className="h-4 w-full rounded-md bg-white/6" />
        <div className="h-4 w-3/5 rounded-md bg-white/6" />
      </div>
      <div className="space-y-3 border-t border-[var(--draft-border-top)] bg-draft-bg px-[14px] py-4 desk:px-6">
        <div className="h-4 w-11/12 rounded-md bg-white/10" />
        <div className="h-4 w-3/4 rounded-md bg-white/10" />
      </div>
    </div>
  );
}

export type FeedReadiness =
  | { kind: "paused" }
  | { kind: "no_sources" }
  | { kind: "extraction_running"; initial: ExtractionProgressState }
  | { kind: "extraction_failed"; initial: ExtractionProgressState }
  | { kind: "extraction_missing" }
  | { kind: "ready" };

const EMPTY: Record<
  Exclude<FeedReadiness["kind"], "extraction_running" | "extraction_failed">,
  { title: string; body: string; actionLabel?: string; actionHref?: string }
> = {
  ready: {
    title: "Your Voice Is Ready",
    body: "You can review it in Guide. New stories and drafts will appear here as soon as your agent finds something on-beat.",
  },
  paused: {
    title: "Your Agent Is Paused",
    body: "It won't create new drafts until you resume it from the agent controls.",
  },
  no_sources: {
    title: "Add a Source to Get Drafts",
    body: "Your agent needs at least one tracked X account before it can watch for on-beat posts.",
    actionLabel: "Add sources",
    actionHref: "/sources",
  },
  extraction_missing: {
    title: "Finish Setting Up Your Agent",
    body: "Your agent still needs to learn your voice before it can create drafts.",
    actionLabel: "Go to Guide",
    actionHref: "/voice",
  },
};

export function FeedEmptyState({
  deskId,
  readiness,
}: {
  deskId: string;
  readonly readiness: FeedReadiness;
}) {
  if (readiness.kind === "extraction_running" || readiness.kind === "extraction_failed") {
    return <SetupProgressCard deskId={deskId} initial={readiness.initial} />;
  }
  const content = EMPTY[readiness.kind];
  if (readiness.kind === "ready") {
    return (
      <Alert className="border-primary/30 bg-primary/8 text-foreground" role="status">
        <CheckCircle2Icon aria-hidden="true" />
        <AlertTitle>{content.title}</AlertTitle>
        <AlertDescription className="text-foreground/90">{content.body}</AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-14 text-center">
      <h3 className="text-sm font-semibold">{content.title}</h3>
      <p className="mx-auto max-w-sm text-pretty text-sm text-muted-foreground">{content.body}</p>
      {content.actionHref ? (
        <Button asChild className="min-h-11" size="sm">
          <Link href={`/agents/${deskId}${content.actionHref}`}>{content.actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
