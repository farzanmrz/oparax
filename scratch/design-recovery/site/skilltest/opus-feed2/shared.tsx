"use client";

import { useEffect, useState } from "react";
import { CircleAlert, ExternalLink } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { THEME_KEY } from "@/next/theme";
import type { FeedStory, ItemView } from "@/next/data/feed";
import { Facts, Quote } from "@/next/council/chrome";
import { accounts, digests, hostOf, newest, PREVIEW_NOTE, sites, status, storiesFor, week, when } from "@/next/council/data";
import { Dot, GitHubMark, KindChip, MarkStack, ReportMark, SiteIcon, XAvatar } from "@/next/council/marks";

// Shared atoms for the opus-feed2 directions (council gate, October 2: Spread and Board). Everything comes from
// next/data through next/council/data: verified stories, the recorded onboarding run's chosen sources, the
// verified GitHub release. Status values are the preview fixtures, labelled once with PREVIEW_NOTE.

/** Re-applies the pre-paint theme after mount, in case hydration rewrote <html>. */
export function useThemeGuard() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search).get("theme");
      const stored = localStorage.getItem(THEME_KEY);
      const t = q === "light" || q === "dark" ? q : stored === "light" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", t === "dark");
    } catch {}
  }, []);
}

/** Motion marks render after mount: their animated markup differs between server and client. */
export function AfterMount({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return <>{on ? children : fallback}</>;
}

// ───────────── Source kinds: every kind is the same input, and the person can narrow the feed to one ─────────────

export type KindKey = "all" | "x" | "rss" | "web" | "github" | "ph";

const rssIds = new Set(sites.filter((s) => s.kind === "rss").map((s) => s.id));
const webIds = new Set(sites.filter((s) => s.kind === "website").map((s) => s.id));

export const sourceGroups: { key: Exclude<KindKey, "all">; label: string; count: number }[] = [
  { key: "x", label: "X accounts", count: accounts.length },
  { key: "rss", label: "RSS feeds", count: rssIds.size },
  { key: "web", label: "Websites", count: webIds.size },
  { key: "github", label: "GitHub", count: digests.length },
  { key: "ph", label: "Product Hunt", count: 0 },
];

/** A story belongs to a kind when any of its items came from a source of that kind. */
export function storyMatches(story: FeedStory, kind: KindKey) {
  if (kind === "all") return true;
  if (kind === "x") return story.items.some((i) => i.kind === "post");
  if (kind === "rss") return story.items.some((i) => rssIds.has(i.source_id));
  if (kind === "web") return story.items.some((i) => webIds.has(i.source_id));
  return false;
}

export const showsGithub = (kind: KindKey) => kind === "all" || kind === "github";

/** Clustered stories, newest report first. */
export const feed: FeedStory[] = [...storiesFor("clustered")].sort((a, b) =>
  newest(a).published_at < newest(b).published_at ? 1 : -1,
);

export const weekStart = week[0].day;
export const inWeek = (s: FeedStory) => newest(s).published_at.slice(0, 10) >= weekStart;

export const github = digests[0];

/** The marks for one source kind, in their own colors. */
export function GroupMarks({ group, size = 16, max = 9 }: { group: KindKey; size?: number; max?: number }) {
  if (group === "x")
    return (
      <span className="flex items-center">
        {accounts.slice(0, max).map((a, i) => (
          <span key={a.id} className="rounded-full ring-2 ring-[var(--window)]" style={{ marginLeft: i ? -size * 0.32 : 0, zIndex: 20 - i }}>
            <XAvatar handle={a.handle} size={size} />
          </span>
        ))}
      </span>
    );
  if (group === "rss" || group === "web")
    return (
      <span className="flex items-center">
        {sites
          .filter((s) => (group === "rss" ? s.kind === "rss" : s.kind === "website"))
          .slice(0, max)
          .map((s, i) => (
            <span key={s.id} className="rounded-[5px] ring-2 ring-[var(--window)]" style={{ marginLeft: i ? -size * 0.28 : 0, zIndex: 20 - i }}>
              <SiteIcon host={s.host} size={size} />
            </span>
          ))}
      </span>
    );
  if (group === "github") return <GitHubMark className="text-[var(--kind-github)]" />;
  return null;
}

/** The kind index: one row of labelled groups with their real marks. Pressing a group narrows the feed. */
export function KindIndex({
  value,
  onChange,
  marks = 9,
  className,
}: {
  value: KindKey;
  onChange: (k: KindKey) => void;
  marks?: number;
  className?: string;
}) {
  const base =
    "group flex h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";
  return (
    <nav aria-label="Sources" className={cn("flex min-w-0 items-center gap-1", className)}>
      <button
        type="button"
        aria-pressed={value === "all"}
        onClick={() => onChange("all")}
        className={cn(base, value === "all" ? "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]" : "text-t3 hover:bg-raised hover:text-t1")}
      >
        <span className="font-mono text-[10.5px] tracking-[0.08em] uppercase">All sources</span>
        <span className="font-mono text-[10.5px] tabular-nums text-t4">{accounts.length + sites.length + digests.length}</span>
      </button>
      {sourceGroups.map((g) => {
        const on = value === g.key;
        return (
          <button
            key={g.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? "all" : g.key)}
            className={cn(base, on ? "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]" : "text-t3 hover:bg-raised hover:text-t1")}
          >
            <span className="font-mono text-[10.5px] tracking-[0.08em] whitespace-nowrap uppercase">{g.label}</span>
            {g.count ? <GroupMarks group={g.key} size={16} max={marks} /> : null}
            <span className="font-mono text-[10.5px] tabular-nums text-t4">{g.count}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Agent state in one line: live, checking, failed. */
export function AgentState({ pending, className }: { pending: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 text-[12.5px]", className)}>
      <span className="flex items-center gap-2">
        <Dot tone="ok" pulse />
        <span className="font-medium text-[var(--ok)]">Live</span>
        <span className="text-t3">{accounts.length + sites.length} sources</span>
      </span>
      {pending > 0 ? (
        <span className="flex items-center gap-1.5 text-t2" title={`Checking ${pending} ${pending === 1 ? "item" : "items"} against your sentence`}>
          <AfterMount fallback={<span className="size-3.5" />}>
            <StatusMark status="running" size={14} color="var(--caution)" strokeWidth={2} />
          </AfterMount>
          <span className="tabular-nums">{pending}</span> checking
        </span>
      ) : null}
      <span className="flex items-center gap-1.5 text-t2" title={`Could not process ${status.failed} item`}>
        <CircleAlert className="size-3.5 text-[var(--error)]" />
        <span className="tabular-nums">{status.failed}</span> failed
      </span>
    </div>
  );
}

export function FreeWeek({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-[12.5px]", className)}>
      <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide text-[var(--caution)]">
        FREE WEEK
      </span>
      <span className="text-t2">
        <span className="tabular-nums">{status.daysLeft}</span> days left
      </span>
      {compact ? null : (
        <span className="text-t4">
          <span className="tabular-nums">
            {status.poolUsed} of {status.poolLimit}
          </span>{" "}
          X posts
        </span>
      )}
    </span>
  );
}

export function Preview({ className }: { className?: string }) {
  return <span className={cn("rounded-full border border-line px-2.5 py-1 text-[11.5px] text-t3", className)}>{PREVIEW_NOTE}</span>;
}

/** Alerts are not connected yet: the product's primary action (bot-button.tsx copy). */
export function AlertsAction({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)]",
        "transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <XLogo className="size-3" />
      Get alerts on X
    </button>
  );
}

// ───────────── Story parts ─────────────

export function Img({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="eager" decoding="async" className={cn("size-full object-cover", className)} />
  );
}

/** For an item with no image: the same frame, filled with its publisher's own mark on its kind's tint. */
export function Cover({ item, className }: { item: ItemView; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-full flex-col items-center justify-center gap-2",
        item.kind === "post" ? "bg-[var(--kind-post-soft)]" : "bg-[var(--kind-article-soft)]",
        className,
      )}
    >
      <ReportMark item={item} size={34} />
      <span className="text-[11.5px] text-t3">{item.kind === "post" ? item.author : hostOf(item.url)}</span>
    </span>
  );
}

/** Kind chips and the time of the newest report. */
export function StoryMeta({ story, className }: { story: FeedStory; className?: string }) {
  const kinds = [...new Set(story.items.map((i) => i.kind))];
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {kinds.map((k) => (
        <KindChip key={k} kind={k} count={story.items.filter((i) => i.kind === k).length} />
      ))}
      <span className="ml-auto text-[11.5px] tabular-nums text-t4">{when(newest(story).published_at)}</span>
    </div>
  );
}

/** Who reported it: real marks, publisher names and where each lives. */
export function Publishers({ story, size = 18, className }: { story: FeedStory; size?: number; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <MarkStack items={story.items} size={size} />
      <span className="min-w-0 truncate text-[12px] text-t2">
        {story.items.map((i, n) => (
          <span key={i.id}>
            {n ? ", " : ""}
            {i.publisher} <span className="text-t4">{i.kind === "post" ? i.author : hostOf(i.url)}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

/** The first verbatim span from each item the story cites: the evidence, in the sources' own words. */
export function Evidence({ story, cols = 2, className }: { story: FeedStory; cols?: 1 | 2; className?: string }) {
  const byItem = story.items
    .map((item) => ({ item, span: story.card.facts.flatMap((f) => f.evidence).find((e) => e.item === item.id)?.span }))
    .filter((e): e is { item: ItemView; span: string } => Boolean(e.span));
  return (
    <section aria-label="In their words" className={className}>
      <p className="font-mono text-[10.5px] tracking-[0.08em] text-t4 uppercase">In their words</p>
      <div className={cn("mt-2 grid gap-3", cols === 2 && byItem.length > 1 && "sm:grid-cols-2")}>
        {byItem.map(({ item, span }) => (
          <Quote key={item.id} item={item} spans={[span]} className="mt-0" />
        ))}
      </div>
    </section>
  );
}

/** Facts, with the rest one press away. */
export function FactsMore({ story, first, size = "sm", className }: { story: FeedStory; first: number; size?: "sm" | "md"; className?: string }) {
  const [all, setAll] = useState(false);
  const more = story.card.facts.length - first;
  return (
    <div className={cn("max-sm:[&_.whitespace-nowrap]:whitespace-normal", className)}>
      <Facts story={story} max={all ? undefined : first} size={size} />
      {more > 0 ? (
        <button
          type="button"
          onClick={() => setAll(!all)}
          aria-expanded={all}
          className="mt-1.5 ml-3.5 rounded text-[12px] text-t4 transition-colors hover:text-t2 focus-visible:outline-2 focus-visible:outline-ring"
        >
          {all ? "Fewer facts" : `${more} more ${more === 1 ? "fact" : "facts"}`}
        </button>
      ) : null}
    </div>
  );
}

/** The GitHub release, explained in words so the person need not open the repository. */
export function GithubRelease({ compact = false, className }: { compact?: boolean; className?: string }) {
  const [repo, tag] = github.name.split(" ");
  return (
    <article className={cn("flex gap-4 max-sm:flex-col", className)} aria-label={`GitHub release ${github.name}`}>
      <span
        className={cn(
          "flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-[8px] bg-[var(--kind-github-soft)] text-[var(--kind-github)] ring-1 ring-line",
          compact ? "h-[96px] w-[148px]" : "h-[112px] w-[168px]",
        )}
      >
        <GitHubMark className="size-7" />
        <span className="font-mono text-[11px] tracking-wide">{tag}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[12px] text-t3">
          <GitHubMark className="size-3.5 text-[var(--kind-github)]" />
          <span className="text-t2">{repo}</span>
          <span className="rounded-full border border-line px-1.5 py-px text-[10.5px]">Release</span>
          <span className="ml-auto tabular-nums text-t4">{when(github.released_at)}</span>
        </p>
        <h3 className="mt-1.5 text-[16px] leading-snug font-semibold tracking-[-0.01em] text-t1">
          {repo} ships {tag}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-t2">
          {github.description}. {github.detail}
        </p>
        <a
          href={github.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 rounded text-[12px] text-t3 hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
        >
          Release notes on GitHub <ExternalLink className="size-3" />
        </a>
      </div>
    </article>
  );
}

/** What the person sees when a source kind has nothing on the page. */
export function EmptyKind({ kind, className }: { kind: KindKey; className?: string }) {
  const g = sourceGroups.find((x) => x.key === kind);
  const watched = kind === "web" ? sites.filter((s) => s.kind === "website") : [];
  return (
    <div className={cn("flex flex-col items-center justify-center px-8 py-16 text-center", className)}>
      <p className="font-mono text-[10.5px] tracking-[0.08em] text-t4 uppercase">{g?.label}</p>
      <p className="mt-2 text-[17px] font-semibold text-t1">
        {g?.count ? `No stories from ${g.label.toLowerCase()} yet` : `No ${g?.label} sources chosen`}
      </p>
      {watched.length ? (
        <ul className="mt-4 flex flex-col gap-2">
          {watched.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-[13px] text-t2">
              <SiteIcon host={s.host} size={16} /> {s.name} <span className="text-t4">{s.host}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
