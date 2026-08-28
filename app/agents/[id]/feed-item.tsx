"use client";

import { CheckCircle2Icon, CircleXIcon } from "lucide-react";
import Link from "next/link";
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
import { RelativeTime } from "./relative-time";

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
            The original post was deleted by its author — the story stays on your feed.
          </PopoverDescription>
        </PopoverContent>
      </Popover>
    </>
  );
}

function SourceStrip({ source, createdAt }: { source: FeedItem["source"]; createdAt: string }) {
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
      {source.url && !source.gone ? (
        <a
          className={cn(
            "shrink-0 whitespace-nowrap text-[14.5px] font-medium hover:underline desk:min-w-0 desk:shrink desk:truncate desk:text-[13.5px]",
            isX ? "text-text-handle-x" : "text-text-handle-news",
          )}
          href={source.url}
          rel="noreferrer"
          target="_blank"
        >
          {label}
        </a>
      ) : (
        <span
          className={cn(
            "shrink-0 whitespace-nowrap text-[14.5px] font-medium desk:min-w-0 desk:shrink desk:truncate desk:text-[13.5px]",
            isX ? "text-text-handle-x" : "text-text-handle-news",
          )}
        >
          {label}
        </span>
      )}
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
    </div>
  );
}

export function FeedItemCard({ item }: { item: FeedItem }) {
  const winner = item.winners.x ?? Object.values(item.winners)[0];
  if (!winner) return null;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))] shadow-[var(--card-shadow)]",
        item.source.gone && "border-dashed border-destructive",
      )}
    >
      <SourceStrip createdAt={item.createdAt} source={item.source} />
      <div className="px-[14px] pt-4 pb-[17px] desk:px-6 desk:pb-[19px]">
        <h2 className="text-pretty text-[17.5px] leading-[1.3] font-semibold tracking-[-0.017em] text-text-title desk:text-[20px]">
          {item.newsTitle}
        </h2>
        <StoryBody body={winner.body} />
      </div>
    </article>
  );
}

function StoryBody({ body }: { body: FeedDraft["body"] }) {
  const className =
    "mt-2.5 text-pretty text-[13.5px] leading-[1.6] text-text-body desk:mt-3 desk:text-[14.5px]";
  if (body.kind === "points") {
    return (
      <ul className={`${className} list-disc space-y-1.5 pl-5`}>
        {body.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    );
  }
  if (body.kind === "legacy") return <p className={className}>{body.synthesis}</p>;
  return (
    <p className={className}>
      {body.sourceAvailable
        ? "Key facts aren’t available for this story. Open the source link in the strip above to review the original."
        : "Key facts and the original source aren’t available for this story."}
    </p>
  );
}

export function FeedCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="op-skeleton min-h-[220px] animate-[op-skeleton_1.5s_ease-in-out_infinite] overflow-hidden rounded-lg border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))]"
    >
      <div className="h-[var(--strip-h-mobile)] border-b border-[var(--band-border)] bg-[image:var(--strip-x-grad)] desk:h-[var(--strip-h-web)]" />
      <div className="space-y-3 px-[14px] py-5 desk:px-6">
        <div className="h-5 w-4/5 rounded-md bg-white/10" />
        <div className="h-4 w-full rounded-md bg-white/6" />
        <div className="h-4 w-3/5 rounded-md bg-white/6" />
      </div>
    </div>
  );
}

export type FeedReadiness = { kind: "paused" } | { kind: "no_sources" } | { kind: "ready" };

const EMPTY: Record<
  FeedReadiness["kind"],
  { title: string; body: string; actionLabel?: string; actionHref?: string }
> = {
  ready: {
    title: "Your Agent Is Watching",
    body: "New stories will land here as soon as your agent finds something on-beat.",
  },
  paused: {
    title: "Your Agent Is Paused",
    body: "It won't land new stories until you resume it from the agent controls.",
  },
  no_sources: {
    title: "Add a Source to Get Stories",
    body: "Your agent needs at least one tracked X account before it can watch for on-beat posts.",
    actionLabel: "Add sources",
    actionHref: "/sources",
  },
};

export function FeedEmptyState({
  deskId,
  readiness,
}: {
  deskId: string;
  readonly readiness: FeedReadiness;
}) {
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
