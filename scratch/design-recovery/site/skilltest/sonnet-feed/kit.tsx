"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, Layers, Newspaper } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import type { DigestEntry, FeedStory, ItemView, VerifiedFact } from "@/next/data/feed";
import { accounts, digests, hostOf, newest, sites, status, storiesFor, week, weekTotal, when, type View } from "@/next/council/data";
import { Dot, GitHubMark, ReportMark, Segments, SiteIcon, StepArea, XAvatar } from "@/next/council/marks";

// Shared parts for the three sonnet-feed directions. Everything is the council's own data and atoms: stories and
// reports from next/data/feed, sources from the recorded onboarding run, counts and the chart from stored
// publication dates. The only things added here are arrangements of that material.

export type Src = "x" | "rss" | "website" | "github" | "ph";

export const GROUPS: { id: Src; label: string; one: string }[] = [
  { id: "x", label: "X accounts", one: "X account" },
  { id: "rss", label: "RSS feeds", one: "RSS feed" },
  { id: "website", label: "Websites", one: "Website" },
  { id: "github", label: "GitHub", one: "GitHub" },
  { id: "ph", label: "Product Hunt", one: "Product Hunt" },
];

const siteKind = new Map(sites.map((s) => [s.id, s.kind]));

/** Which kind of source a report came from, when the recorded run says; older preview reports carry no kind. */
export function itemSrc(item: ItemView): Src | null {
  if (item.kind === "post") return "x";
  const k = siteKind.get(item.source_id);
  return k === "rss" ? "rss" : k === "website" ? "website" : null;
}

export const srcWord = (item: ItemView) => {
  const s = itemSrc(item);
  return s ? GROUPS.find((g) => g.id === s)!.one : null;
};

export const where = (item: ItemView) => (item.kind === "post" ? (item.author ?? "") : hostOf(item.url));

export type Entry = { type: "story"; id: string; at: string; story: FeedStory } | { type: "digest"; id: string; at: string; digest: DigestEntry };

/** Stories and GitHub digests in one newest-first stream: GitHub is a source like any other. */
export function entriesFor(view: View): Entry[] {
  const list: Entry[] = [
    ...storiesFor(view).map((story): Entry => ({ type: "story", id: story.id, at: newest(story).published_at, story })),
    ...digests.map((digest): Entry => ({ type: "digest", id: `gh-${digest.name}`, at: digest.released_at, digest })),
  ];
  return list.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function entrySrcs(e: Entry): Src[] {
  if (e.type === "digest") return [e.digest.kind === "github" ? "github" : "ph"];
  return [...new Set(e.story.items.map(itemSrc).filter((s): s is Src => !!s))];
}

/** The story with the most joined reports, then the most facts, leads. */
export function leadOf(list: Entry[]): Entry | undefined {
  return list
    .filter((e): e is Extract<Entry, { type: "story" }> => e.type === "story")
    .sort((a, b) => b.story.items.length - a.story.items.length || b.story.card.facts.length - a.story.card.facts.length || (a.at < b.at ? 1 : -1))[0];
}

export function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export const clockOf = (iso: string) => iso.slice(11, 16);

export function factSources(story: FeedStory, fact: VerifiedFact): ItemView[] {
  const byId = new Map(story.items.map((i) => [i.id, i]));
  return [...new Map(fact.evidence.map((e) => [e.item, byId.get(e.item)!])).values()];
}

export const unquote = (s: string) => s.replace(/^["“]|["”]$/g, "");

/** A remote image that quietly disappears when it fails, so the card around it still reads. */
export function Pic({ src, className }: { src: string | null; className?: string }) {
  const [bad, setBad] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const i = ref.current;
    if (i && i.complete && i.naturalWidth === 0) setBad(true);
  }, []);
  if (!src || bad) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt="" loading="eager" onError={() => setBad(true)} className={cn("object-cover", className)} />;
}

export function PHMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={cn("shrink-0", className)}>
      <path
        fill="#DA552F"
        d="M13.604 8.4h-3.405V12h3.405c.995 0 1.801-.806 1.801-1.801 0-.993-.805-1.799-1.801-1.799zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H7.801V6h5.804c2.319 0 4.2 1.88 4.2 4.199 0 2.321-1.881 4.201-4.201 4.201z"
      />
    </svg>
  );
}

/** A story's picture, or, when its sources had none, the publisher's own mark on the kind's soft tint. */
export function Thumb({ item, image, className, markSize = 28 }: { item: ItemView; image: string | null; className?: string; markSize?: number }) {
  return (
    <div
      className={cn("relative grid shrink-0 place-items-center overflow-hidden", className)}
      style={{ background: item.kind === "post" ? "var(--kind-post-soft)" : "var(--kind-article-soft)" }}
    >
      <ReportMark item={item} size={markSize} className="opacity-90" />
      <Pic src={image} className="absolute inset-0 size-full" />
    </div>
  );
}

export function DigestThumb({ className }: { className?: string }) {
  return (
    <div className={cn("grid shrink-0 place-items-center bg-[var(--kind-github-soft)] text-[var(--kind-github)]", className)}>
      <GitHubMark className="size-8" />
    </div>
  );
}

/** Publisher chips: the mark and the name, inline. */
export function Cite({ items, className }: { items: ItemView[]; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1 align-middle", className)}>
      {items.map((i) => (
        <span key={i.id} className="inline-flex items-center gap-1.5 text-[12px] text-t3">
          <ReportMark item={i} size={13} className={i.kind === "post" ? "" : "rounded-[3px]"} />
          {i.publisher}
        </span>
      ))}
    </span>
  );
}

/** One verbatim span with its publisher, set apart by the kind's own hue. */
export function Quote({ item, span, className }: { item: ItemView; span: string; className?: string }) {
  return (
    <figure
      className={cn(
        "rounded-md border border-line bg-[var(--well)] px-3 py-2",
        item.kind === "post" ? "border-l-2 border-l-[var(--kind-post)]" : "border-l-2 border-l-[var(--kind-article)]",
        className,
      )}
    >
      <figcaption className="mb-1 flex items-center gap-1.5 text-[11.5px] text-t3">
        <ReportMark item={item} size={13} className={item.kind === "post" ? "" : "rounded-[3px]"} />
        {item.publisher}
        {srcWord(item) ? <span className="text-t4">{srcWord(item)}</span> : null}
      </figcaption>
      <blockquote className="text-[13px] leading-[1.5] text-t2">“{unquote(span)}”</blockquote>
    </figure>
  );
}

/** A kind chip that also says which kind of source: "Article" with its RSS feed or Website, "Post" with its X account. */
export function KindPill({ item }: { item: ItemView }) {
  const word = srcWord(item);
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium",
        item.kind === "post" ? "bg-[var(--kind-post-soft)] text-[var(--kind-post)]" : "bg-[var(--kind-article-soft)] text-[var(--kind-article)]",
      )}
    >
      {item.kind === "post" ? <XLogo className="size-3" /> : <Newspaper className="size-3.5" strokeWidth={1.75} />}
      {item.kind === "post" ? "Post" : "Article"}
      {word ? <span className="font-normal opacity-75">{word}</span> : null}
    </span>
  );
}

export function GitHubPill() {
  return (
    <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[var(--kind-github-soft)] px-2 text-[11.5px] font-medium text-[var(--kind-github)]">
      <GitHubMark className="size-3" /> GitHub release
    </span>
  );
}

export function JoinedPill({ n }: { n: number }) {
  if (n < 2) return null;
  return (
    <span className="inline-flex h-[22px] items-center gap-1 rounded-md border border-[var(--brand-line)] bg-[var(--brand-soft)] px-1.5 text-[11.5px] text-[var(--brand)]">
      <Layers className="size-3" /> {n} joined
    </span>
  );
}

/** Marks for a group of sources, as a row of small tiles. */
export function GroupMarks({ id, size = 18, max = 3 }: { id: Src; size?: number; max?: number }) {
  if (id === "x") return <MarkRow>{accounts.slice(0, max).map((a) => <XAvatar key={a.id} handle={a.handle} size={size} />)}</MarkRow>;
  if (id === "rss") return <MarkRow>{sites.filter((s) => s.kind === "rss").slice(0, max).map((s) => <SiteIcon key={s.id} host={s.host} size={size} />)}</MarkRow>;
  if (id === "website") return <MarkRow>{sites.filter((s) => s.kind === "website").slice(0, max).map((s) => <SiteIcon key={s.id} host={s.host} size={size} />)}</MarkRow>;
  if (id === "github") return <GitHubMark className="size-[18px] text-[var(--kind-github)]" />;
  return <PHMark size={size} />;
}

function MarkRow({ children }: { children: React.ReactNode }) {
  const kids = Array.isArray(children) ? children : [children];
  return (
    <span className="flex items-center">
      {kids.map((k, i) => (
        <span key={i} className="rounded-full ring-2 ring-[var(--window)]" style={{ marginLeft: i === 0 ? 0 : -6 }}>
          {k}
        </span>
      ))}
    </span>
  );
}

export const groupCount: Record<Src, number | null> = {
  x: accounts.length,
  rss: sites.filter((s) => s.kind === "rss").length,
  website: sites.filter((s) => s.kind === "website").length,
  github: digests.filter((d) => d.kind === "github").length,
  ph: null,
};

/** The GitHub digest as a source like any other: what the release is and what it changed, read in place. */
export function DigestBody({ d, className }: { d: DigestEntry; className?: string }) {
  return (
    <div className={className}>
      <p className="flex items-center gap-2 text-[15px] font-semibold text-t1">
        <GitHubMark className="size-4 text-[var(--kind-github)]" />
        {d.name}
      </p>
      <p className="mt-1.5 text-[13.5px] text-t2">{d.description}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-t3">{d.detail}</p>
      <p className="mt-2 text-[11.5px] text-t4">Released {when(d.released_at)}</p>
    </div>
  );
}

/* Status atoms: the same preview fixture values the accepted feeds show. */
export function StatusPills({ pending }: { pending: number }) {
  return (
    <div className="flex items-center gap-3 text-[12.5px] text-t2">
      <span className="flex items-center gap-1.5 text-[var(--ok)]">
        <Dot tone="ok" pulse /> Live
      </span>
      <span className="flex items-center gap-1.5">
        <StatusMark status="running" size={14} color="var(--caution)" strokeWidth={2} />
        <span className="tabular-nums">{pending}</span> checking
      </span>
      <span className="flex items-center gap-1.5">
        <CircleAlert className="size-3.5 text-[var(--error)]" />
        <span className="tabular-nums">{status.failed}</span> failed
      </span>
    </div>
  );
}

export function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section
      aria-label={label}
      className={cn("rounded-xl border border-line-strong bg-[var(--window)] px-4 py-3.5", className)}
      style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      <p className="text-[12px] font-medium text-t3">{label}</p>
      {children}
    </section>
  );
}

export function AgentTile({ pending, className }: { pending: number; className?: string }) {
  return (
    <Tile label="Agent" className={className}>
      <div className="mt-2 flex items-center gap-2 text-[14px] font-medium">
        <Dot tone="ok" pulse /> <span className="text-[var(--ok)]">Live</span>
      </div>
      <div className="mt-2.5 flex items-center gap-4 text-[12.5px] text-t2">
        <span className="flex items-center gap-1.5">
          <StatusMark status="running" size={14} color="var(--caution)" strokeWidth={2} />
          <span className="tabular-nums">{pending}</span> checking
        </span>
        <span className="flex items-center gap-1.5">
          <CircleAlert className="size-3.5 text-[var(--error)]" />
          <span className="tabular-nums">{status.failed}</span> failed
        </span>
        <span className="flex items-center gap-1.5">
          <XLogo className="size-3 text-t3" /> Alerts off
        </span>
      </div>
    </Tile>
  );
}

export function FreeWeekTile({ className }: { className?: string }) {
  return (
    <Tile label="Free week" className={className}>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[22px] leading-none font-semibold tabular-nums text-t1">{status.daysLeft}</span>
        <span className="text-[13px] text-t2">days left</span>
        <span className="ml-auto text-[12px] tabular-nums text-t3">
          {status.poolUsed} of {status.poolLimit} watched posts
        </span>
      </p>
      <div className="mt-3">
        <Segments total={status.trialDays} filled={status.daysLeft} />
      </div>
    </Tile>
  );
}

export function WeekTile({ className }: { className?: string }) {
  return (
    <Tile label="Published this week" className={className}>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-[26px] leading-none font-semibold tabular-nums text-t1">{weekTotal}</span>
        <span className="text-[12.5px] text-t3">by publication date</span>
      </p>
      <StepArea values={week.map((d) => d.count)} height={52} className="mt-2.5" />
      <p className="mt-1.5 flex justify-between text-[11px] text-t4">
        <span>{week[0].label}</span>
        <span>{week[week.length - 1].label}</span>
      </p>
    </Tile>
  );
}
