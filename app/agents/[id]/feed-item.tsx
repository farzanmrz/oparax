import { ArrowUpRightIcon, CheckCircle2Icon, GlobeIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FeedItem } from "@/lib/agent/feed-shared";
import { cn } from "@/lib/utils";
import type { ExtractionProgressState } from "@/lib/voice/use-extraction-progress";
import { DraftBox } from "./draft-box";
import { FeedSetupProgress } from "./feed-setup-progress";
import { RelativeTime } from "./relative-time";

function getSourceLabel(source: FeedItem["source"]) {
  return source.kind === "x"
    ? source.authorHandle
      ? `@${source.authorHandle}`
      : "source"
    : (source.siteName ?? "source");
}

function SourceNotch({ source, createdAt }: { source: FeedItem["source"]; createdAt: string }) {
  const isX = source.kind === "x";
  const target = source.url && !source.gone ? source.url : null;
  const sourceFill = isX
    ? "bg-[oklch(0.17_0.004_260)] text-foreground"
    : "bg-[oklch(0.44_0.05_55)] text-[#faf6ee]";
  const timeFill = isX
    ? "bg-[oklch(0.23_0.004_260)] text-[rgba(242,239,232,0.6)]"
    : "bg-[oklch(0.505_0.05_55)] text-[rgba(250,246,238,0.72)]";
  const icon = isX ? (
    <svg aria-hidden="true" fill="currentColor" height="11" viewBox="0 0 24 24" width="11">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z" />
    </svg>
  ) : (
    <GlobeIcon aria-hidden="true" className="size-[12px]" />
  );
  const label = getSourceLabel(source);

  const segment = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center gap-[7px] whitespace-nowrap px-2.5 py-1",
          sourceFill,
        )}
      >
        {icon}
        <span className="text-[12px] font-medium leading-none">{label}</span>
        {target ? <ArrowUpRightIcon aria-hidden="true" className="size-[9px] opacity-50" /> : null}
      </span>
      <span className={cn("shrink-0 whitespace-nowrap px-2.5 py-1 text-[11px]", timeFill)}>
        <RelativeTime iso={source.postedAt ?? createdAt} />
      </span>
    </>
  );

  const classes =
    "flex max-w-[min(60cqw,24rem)] items-stretch overflow-hidden rounded-b-[5px] transition hover:brightness-125";

  return (
    <div className="absolute top-0 left-[clamp(13px,1.9cqw,20px)] flex items-center">
      {target ? (
        <a
          className={cn(classes, "no-underline", "hover:no-underline", "text-inherit")}
          href={target}
          rel="noreferrer"
          target="_blank"
        >
          {segment}
        </a>
      ) : (
        <span className={classes}>{segment}</span>
      )}
      {source.gone ? (
        <span className="ml-2 flex items-center gap-1 rounded-b-[5px] bg-warning px-2.5 py-1 text-[11px] text-background">
          <TriangleAlertIcon aria-hidden="true" className="size-[11px]" />
          No longer on X
        </span>
      ) : null}
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
  if (!winner) return null;

  // ONE card, three stacked zones. Separation is done by surface, not border-on-dark:
  // the story zone (title + synthesis) sits on bg-card; the draft is a full-bleed lighter
  // plate rendered by DraftBox; the post control is the full-width footer of the ENTIRE
  // card (overflow-hidden clips it into the rounded corners).
  const cardClass = item.source.gone
    ? "@container relative overflow-hidden rounded-lg border border-dashed border-warning/60 bg-card shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
    : "@container relative overflow-hidden rounded-lg border border-border bg-card shadow-[0_12px_32px_rgba(0,0,0,0.35)]";

  return (
    <article className={cardClass} style={{ containerType: "inline-size" }}>
      <SourceNotch createdAt={item.createdAt} source={item.source} />
      <div className="px-[clamp(15px,2.1cqw,22px)] pt-[clamp(31px,3.4cqw,38px)] pb-[clamp(15px,1.8cqw,20px)]">
        <h2 className="text-[clamp(16px,1.9cqw,21px)] font-semibold leading-[1.28] tracking-[-0.015em] text-foreground text-pretty">
          {item.newsTitle}
        </h2>
        {/* Owner decision: no conditional omission — a null synthesis renders the literal
            placeholder. The 100-post replay backfills real syntheses for recent history. */}
        <p className="mt-[clamp(10px,1.2cqw,13px)] text-[clamp(13.5px,1.5cqw,15.5px)] leading-[1.6] text-muted-foreground text-pretty">
          {winner.newsSynthesis ?? "NO SYNTHESIS"}
        </p>
      </div>
      <DraftBox charLimit={charLimit} draft={winner} xLinked={xLinked} />
    </article>
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
    title: "Your voice is ready",
    body: "You can review it in Voice. New stories and drafts will appear here as soon as your agent finds something on-beat.",
  },
  paused: {
    title: "Your agent is paused",
    body: "It won't create new drafts until you resume it from the agent controls.",
  },
  no_sources: {
    title: "Add a source to get drafts",
    body: "Your agent needs at least one tracked X account before it can watch for on-beat posts.",
    actionLabel: "Add sources",
    actionHref: "/setup",
  },
  extraction_missing: {
    title: "Finish setting up your agent",
    body: "Your agent still needs to learn your voice before it can create drafts.",
    actionLabel: "Go to Voice",
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
  if (readiness.kind === "extraction_running" || readiness.kind === "extraction_failed")
    return <FeedSetupProgress deskId={deskId} initial={readiness.initial} />;
  const content = EMPTY[readiness.kind];
  if (readiness.kind === "ready")
    return (
      <Alert className="border-primary/30 bg-primary/8 text-foreground" role="status">
        <CheckCircle2Icon aria-hidden="true" />
        <AlertTitle>{content.title}</AlertTitle>
        <AlertDescription className="text-foreground/90">{content.body}</AlertDescription>
      </Alert>
    );
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-14 text-center">
      <h3 className="text-sm font-semibold">{content.title}</h3>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">{content.body}</p>
      {content.actionHref ? (
        <Button asChild className="min-h-11" size="sm">
          <Link href={`/agents/${deskId}${content.actionHref}`}>{content.actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
