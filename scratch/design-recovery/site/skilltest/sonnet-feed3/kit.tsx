"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, Globe, Layers, Rss } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { THEME_KEY } from "@/next/theme";
import { cn } from "@/lib/utils";
import { beat } from "@/next/data/onboarding";
import type { DigestEntry, FeedStory, ItemView } from "@/next/data/feed";
import { Quote } from "@/next/council/chrome";
import { accounts, digests, hostOf, HANDLE, newest, sites, status, storiesFor, week, weekTotal, when, type View } from "@/next/council/data";
import { Dot, GitHubMark, KindChip, ReportMark, Segments, SiteIcon, WeekBars, XAvatar } from "@/next/council/marks";

// Shared parts for the two sonnet-feed3 directions (A Margin edition, B Day plates), agreed in the three-way
// consensus in focus-review/consensus-sonnet. Everything is the council's own data and atoms: stories and
// reports from next/data/feed, sources from the recorded onboarding run, counts and the chart from stored
// publication dates. This file adds arrangement only: how entries are grouped, filtered and set out.

// ───────────── data ─────────────

export type Src = "x" | "rss" | "website" | "github";
export type Filter = Src | "all";

export const SRC: Record<Src, { label: string; one: string }> = {
  x: { label: "X accounts", one: "X account" },
  rss: { label: "RSS feeds", one: "RSS feed" },
  website: { label: "Websites", one: "Website" },
  github: { label: "GitHub", one: "GitHub" },
};
export const SRC_ORDER: Src[] = ["x", "rss", "website", "github"];

const siteKind = new Map(sites.map((s) => [s.id, s.kind]));

/** Which kind of source a report came from, when the recorded run says; older preview reports carry no kind. */
export function srcOf(item: ItemView): Src | null {
  if (item.kind === "post") return "x";
  const k = siteKind.get(item.source_id);
  return k === "rss" ? "rss" : k === "website" ? "website" : null;
}

export type Entry =
  | { type: "story"; id: string; at: string; story: FeedStory }
  | { type: "digest"; id: string; at: string; digest: DigestEntry };

/** Stories and the GitHub release in one newest-first stream: GitHub is a source like any other. */
export function entriesFor(view: View): Entry[] {
  const list: Entry[] = [
    ...storiesFor(view).map((story): Entry => ({ type: "story", id: story.id, at: newest(story).published_at, story })),
    ...digests.map((digest): Entry => ({ type: "digest", id: `gh-${digest.name}`, at: digest.released_at, digest })),
  ];
  return list.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function entrySrcs(e: Entry): Src[] {
  if (e.type === "digest") return ["github"];
  return [...new Set(e.story.items.map(srcOf).filter((s): s is Src => !!s))];
}

export function applyFilter(list: Entry[], f: Filter) {
  return f === "all" ? list : list.filter((e) => entrySrcs(e).includes(f));
}

export const kindsOf = (story: FeedStory) => [...new Set(story.items.map((i) => i.kind))];

/** Watched inputs per group, from the recorded onboarding run plus the one GitHub repository. */
export const watched: Record<Src, number> = {
  x: accounts.length,
  rss: sites.filter((s) => s.kind === "rss").length,
  website: sites.filter((s) => s.kind === "website").length,
  github: 1,
};
export const watchedTotal = SRC_ORDER.reduce((n, s) => n + watched[s], 0);

export type RosterItem = { id: string; name: string; sub: string; src: Src; host?: string; handle?: string };

/** Every configured input, grouped by kind. */
export const roster: RosterItem[] = [
  ...accounts.map((a): RosterItem => ({ id: a.id, name: a.name, sub: a.handle, src: "x", handle: a.handle })),
  ...sites
    .filter((s) => s.kind === "rss")
    .map((s): RosterItem => ({ id: s.id, name: s.name, sub: s.host, src: "rss", host: s.host })),
  ...sites
    .filter((s) => s.kind === "website")
    .map((s): RosterItem => ({ id: s.id, name: s.name, sub: s.host, src: "website", host: s.host })),
  { id: "gh-next", name: "vercel/next.js", sub: "github.com", src: "github" },
];

export const DIGEST_REPO = digests[0]?.name.split(" ")[0] ?? "vercel/next.js";

export const dayKey = (iso: string) => iso.slice(0, 10);
export const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const wd = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  return `${wd}, ${when(`${dayKey(iso)}T00:00:00Z`, false)}`;
};
export const storyTime = (story: FeedStory) => when(newest(story).published_at);

/** Re-applies the pre-paint theme choice after mount; if hydration falls back to a client render. */
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

// ───────────── imagery ─────────────

/**
 * Remote story image that reports its own failure, so the block can drop the well and give the space to the quote.
 * "adaptive" sets the frame from the picture's own shape so text-bearing artwork is never cropped (wide pictures
 * 1.9:1, others 4:3, portrait pictures shown whole on the tint); "fixed" keeps one frame ratio for columns that must
 * line up, cropping photographs only and showing portrait pictures whole.
 */
export function StoryImage({
  src,
  onBad,
  className,
  fit = "adaptive",
  ratio = 2,
}: {
  src: string;
  onBad: () => void;
  className?: string;
  fit?: "adaptive" | "fixed";
  ratio?: number;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [shape, setShape] = useState<number | null>(null);
  const measure = useCallback(() => {
    const i = ref.current;
    if (i && i.naturalWidth > 0) setShape(i.naturalWidth / i.naturalHeight);
  }, []);
  useEffect(() => {
    const i = ref.current;
    if (i && i.complete) {
      if (i.naturalWidth === 0) onBad();
      else measure();
    }
  }, [onBad, measure]);
  const portrait = shape !== null && shape < 1;
  const frame = fit === "fixed" ? ratio : shape === null ? 1.6 : shape >= 1.7 ? 1.9 : 4 / 3;
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: "var(--kind-article-soft)", aspectRatio: String(frame) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt=""
        loading="eager"
        onLoad={measure}
        onError={onBad}
        className={cn("absolute inset-0 size-full", portrait ? "object-contain" : "object-cover")}
      />
    </div>
  );
}

/** True when the entry still has a picture to show (a story's image, or the release well), false once it failed. */
export function useHasImage(entry: Entry) {
  const [bad, setBad] = useState(false);
  const mark = useCallback(() => setBad(true), []);
  const src = entry.type === "story" ? entry.story.card.image : null;
  return { src, bad, setBad: mark, has: entry.type === "digest" || (!!src && !bad) };
}

/** The GitHub release written out: its mark, the repository and the tag. */
export function ReleaseWell({ digest, className }: { digest: DigestEntry; className?: string }) {
  const [repo, tag] = digest.name.split(" ");
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden border border-line bg-[var(--kind-github-soft)] text-[var(--kind-github)]",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <GitHubMark className="size-14" />
        <div>
          <p className="text-[15px] font-semibold text-t1">{repo}</p>
          <p className="mt-1 font-mono text-[26px] font-semibold tracking-tight text-t1">{tag}</p>
        </div>
        <span className="rounded-full border border-line bg-[var(--window)] px-2.5 py-0.5 font-mono text-[10.5px] tracking-[0.12em] text-t3">
          RELEASE
        </span>
      </div>
    </div>
  );
}

// ───────────── story parts ─────────────

/** The GitHub mark on its own soft tile, sized to sit beside a publisher mark. */
export function GitHubMarkSmall({ size = 18 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-[var(--kind-github-soft)] text-[var(--kind-github)]" style={{ width: size, height: size }}>
      <GitHubMark className="size-[62%]" />
    </span>
  );
}

export function DigestChip({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[var(--kind-github-soft)] px-2 text-[11.5px] font-medium text-[var(--kind-github)]", className)}>
      <GitHubMark className="size-3.5" />
      GitHub release
    </span>
  );
}

/** Kind chips for a story, and a "reports joined" chip when several were joined. */
export function StoryChips({ story, className }: { story: FeedStory; className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {kindsOf(story).map((k) => (
        <KindChip key={k} kind={k} count={story.items.filter((i) => i.kind === k).length} />
      ))}
      {story.items.length > 1 ? (
        <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-raised px-2 text-[11.5px] text-t2">
          <Layers className="size-3 text-t3" aria-hidden="true" />
          {story.items.length} reports joined
        </span>
      ) : null}
    </span>
  );
}

const handleOf = (item: ItemView) => (item.kind === "post" ? (item.author ?? "") : hostOf(item.url));

/** The publishers behind a story, each with its mark and the kind of source in words (websites and feeds stay apart). */
export function Publishers({ story, className }: { story: FeedStory; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-2", className)}>
      {story.items.map((item) => {
        const s = srcOf(item);
        return (
          <li key={item.id} className="flex items-center gap-2 text-[12.5px] leading-tight">
            <ReportMark item={item} size={18} className={item.kind === "post" ? "" : "rounded-[5px]"} />
            <span className="min-w-0">
              <span className="block truncate font-medium text-t1">{item.publisher}</span>
              <span className="block truncate text-[11.5px] text-t3">
                {s ? `${SRC[s].one} · ` : item.kind === "post" ? "X account · " : "Article · "}
                {handleOf(item)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Each report behind a story as its own small row (publisher mark, the report's own title, kind of source and time). */
export function ReportRows({ story, className }: { story: FeedStory; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {story.items.map((item) => {
        const s = srcOf(item);
        return (
          <li key={item.id} className="flex items-center gap-3 rounded-lg border border-line bg-[var(--well)] px-3 py-2.5">
            <ReportMark item={item} size={22} className={item.kind === "post" ? "" : "rounded-[5px]"} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] leading-tight text-t1">{item.title}</span>
              <span className="mt-0.5 block truncate text-[11.5px] text-t3">
                {item.publisher} · {s ? SRC[s].one : item.kind === "post" ? "X account" : "Article"} · {handleOf(item)}
              </span>
            </span>
            <span className="shrink-0 font-mono text-[10.5px] tracking-wide text-t4">{when(item.published_at)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** The verbatim words behind a story: one quote card per report, set apart by the kind's own hue. */
export function Words({ story, className, max }: { story: FeedStory; className?: string; max?: number }) {
    const cards = story.items
    .map((item) => {
      const spans: string[] = [];
      for (const f of story.card.facts) for (const e of f.evidence) if (e.item === item.id && !spans.includes(e.span)) spans.push(e.span);
      return { item, spans: max ? spans.slice(0, max) : spans };
    })
    .filter((c) => c.spans.length > 0);
  if (!cards.length) return null;
  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="font-mono text-[10.5px] tracking-[0.12em] text-t4">IN THEIR WORDS</p>
      {cards.map((c) => (
        <Quote key={c.item.id} item={c.item} spans={c.spans} className="mt-0" />
      ))}
    </div>
  );
}

// ───────────── status, the same real fixture states the accepted feeds show ─────────────

export const LIVE_LINE = `${sites.length} sites and feeds, ${accounts.length} X accounts, ${digests.length} GitHub release`;
/** The settled preview value shown in the accepted feeds (1 checking, 1 failed); status.pending is the replay's start value. */
export const CHECKING = 1;

export function LiveLine({ className, short = false }: { className?: string; short?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 text-[12.5px] leading-snug text-t3", className)}>
      <Dot tone="ok" pulse />
      <span>
        <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-[var(--ok)]">LIVE</span>
        {short ? null : <span className="ml-2">Watching {LIVE_LINE}</span>}
      </span>
    </span>
  );
}

export function CheckChip({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-t3", className)}>
      <StatusMark status="running" size={15} color="var(--caution)" strokeWidth={2} />
      <span className="tabular-nums text-t1">{CHECKING}</span> checking
    </span>
  );
}

export function FailChip({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-t3", className)}>
      <CircleAlert className="size-[15px] text-[var(--error)]" aria-hidden="true" />
      <span className="tabular-nums text-t1">{status.failed}</span> failed
    </span>
  );
}

export function FreeWeekBar({ className, stacked = false }: { className?: string; stacked?: boolean }) {
  return (
    <span className={cn(stacked ? "block" : "flex items-center gap-2.5 whitespace-nowrap text-[12.5px] text-t3", className)}>
      {stacked ? (
        <>
          <span className="flex items-baseline justify-between text-[12.5px] text-t3">
            <span className="font-mono text-[10.5px] tracking-[0.12em] text-t4">FREE WEEK</span>
            <span>
              <span className="tabular-nums text-t1">{status.daysLeft}</span> days left
            </span>
          </span>
          <span className="mt-2 block">
            <Segments total={status.trialDays} filled={status.daysLeft} />
          </span>
        </>
      ) : (
        <>
          <span className="w-[92px]">
            <Segments total={status.trialDays} filled={status.daysLeft} />
          </span>
          <span>
            <span className="tabular-nums text-t1">{status.daysLeft}</span> days left
          </span>
        </>
      )}
    </span>
  );
}

export function PoolBar({ className, stacked = false }: { className?: string; stacked?: boolean }) {
  const pct = Math.max(0, Math.min(100, (status.poolUsed / status.poolLimit) * 100));
  if (!stacked)
    return (
      <span className={cn("flex items-center gap-2 whitespace-nowrap text-[12.5px] text-t3", className)}>
        <XLogo className="size-3 text-t3" />
        <span className="tabular-nums text-t1">
          {status.poolUsed} of {status.poolLimit}
        </span>
        watched posts
      </span>
    );
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-[12.5px] text-t3">
        <span className="font-mono text-[10.5px] tracking-[0.12em] text-t4">WATCHED X POSTS</span>
        <span>
          <span className="tabular-nums text-t1">{status.poolUsed}</span> of {status.poolLimit}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-strong">
        <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const weekRange = `${week[0].label} to ${week[week.length - 1].label}`;

export function WeekChart({ height = 40, className }: { height?: number; className?: string }) {
  return <WeekBars week={week} height={height} className={className} />;
}

export function WeekInline({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 whitespace-nowrap text-[12.5px] text-t3", className)}>
      <WeekBars week={week} height={22} className="w-[72px]" />
      <span>
        <span className="tabular-nums text-t1">{weekTotal}</span> reports, {weekRange}, by publication date
      </span>
    </span>
  );
}

export function Handle({ className, badge = true }: { className?: string; badge?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 text-[13px] text-t1", className)}>
      <span className="grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>@{HANDLE}
      {badge ? (
        <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide text-[var(--caution)]">
          FREE WEEK
        </span>
      ) : null}
    </span>
  );
}

export function Brand({ className }: { className?: string }) {
  return <OparaxMark className={cn("size-[18px] text-t1", className)} />;
}

// ───────────── sources ─────────────

export const groupGlyph: Record<Src, React.ReactNode> = {
  x: <XLogo className="size-3.5" />,
  rss: <Rss className="size-3.5" aria-hidden="true" />,
  website: <Globe className="size-3.5" aria-hidden="true" />,
  github: <GitHubMark className="size-3.5" />,
};
export const groupTone: Record<Src, string> = {
  x: "text-[var(--kind-post)] bg-[var(--kind-post-soft)]",
  rss: "text-[var(--kind-article)] bg-[var(--kind-article-soft)]",
  website: "text-[var(--kind-article)] bg-[var(--kind-article-soft)]",
  github: "text-[var(--kind-github)] bg-[var(--kind-github-soft)]",
};

export function RosterMark({ item, size = 18 }: { item: RosterItem; size?: number }) {
  if (item.src === "x") return <XAvatar handle={item.handle!} size={size} />;
  if (item.src === "github") return <GitHubMark className="text-t1" />;
  return <SiteIcon host={item.host!} size={size} />;
}

/** The marks of one group, overlapping, for the source index. */
export function GroupMarks({ src, size = 18, max = 7 }: { src: Src; size?: number; max?: number }) {
  const items = roster.filter((r) => r.src === src).slice(0, max);
  return (
    <span className="flex items-center">
      {items.map((r, i) => (
        <span key={r.id} className="rounded-full ring-2 ring-[var(--window)]" style={{ marginLeft: i === 0 ? 0 : -size * 0.28, zIndex: items.length - i }}>
          {src === "github" ? (
            <span className="grid place-items-center rounded-full bg-[var(--kind-github-soft)] text-[var(--kind-github)]" style={{ width: size, height: size }}>
              <GitHubMark className="size-[70%]" />
            </span>
          ) : (
            <RosterMark item={r} size={size} />
          )}
        </span>
      ))}
    </span>
  );
}

/** Every configured input as a lifted grid, grouped by kind: what empty states show instead of a dead stage. */
export function Roster({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {SRC_ORDER.map((src) => (
        <div key={src}>
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-t3">
            <span className={cn("grid size-5 place-items-center rounded-md", groupTone[src])}>{groupGlyph[src]}</span>
            {SRC[src].label.toUpperCase()}
            <span className="text-t4">{watched[src]}</span>
          </div>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {roster
              .filter((r) => r.src === src)
              .map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-[10px] border border-line bg-[var(--card)] px-3 py-2.5"
                  style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
                >
                  <RosterMark item={r} size={26} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-t1">{r.name}</span>
                    <span className="block truncate text-[11.5px] text-t3">
                      {SRC[r.src].one} · {r.sub}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** What a feed with nothing to read says, honestly, with the way back and the whole roster beneath. */
export function EmptyBody({ filter, onReset, className }: { filter: Filter; onReset: () => void; className?: string }) {
  const single = filter !== "all" && watched[filter as Src] === 1 ? roster.find((r) => r.src === filter) : null;
  return (
    <div className={cn("px-6 py-9 lg:px-10", className)}>
      <div className="flex flex-wrap items-center gap-4">
        {single ? (
          <span className="grid size-12 place-items-center rounded-xl border border-line bg-[var(--well)]">
            <RosterMark item={single} size={28} />
          </span>
        ) : (
          <span className={cn("grid size-12 place-items-center rounded-xl", filter === "all" ? "bg-[var(--brand-soft)] text-[var(--brand)]" : groupTone[filter as Src])}>
            {filter === "all" ? <Layers className="size-5" aria-hidden="true" /> : groupGlyph[filter as Src]}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-t1">
            {filter === "all" ? "No stories in this feed yet" : single ? `Nothing from ${single.name} in this feed yet` : `Nothing from ${SRC[filter as Src].label} in this feed yet`}
          </h2>
          <p className="mt-1.5 max-w-[620px] text-[14px] leading-relaxed text-t3">
            {filter === "all" ? (
              <>
                Oparax is watching {LIVE_LINE} for <span className="text-t2">“{beat}”</span>. Stories appear here as reports arrive.
              </>
            ) : single ? (
              <>
                {SRC[single.src].one} · {single.sub}. It is one of the {watchedTotal} inputs below.
              </>
            ) : (
              <>
                {watched[filter as Src]} {SRC[filter as Src].label} watched. All {watchedTotal} inputs are listed below.
              </>
            )}
          </p>
        </div>
        {filter !== "all" ? (
          <button
            type="button"
            onClick={onReset}
            className="h-9 rounded-md border border-line-strong bg-[var(--well)] px-3.5 text-[13px] text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Show all sources
          </button>
        ) : null}
      </div>
      <div className="mt-8 border-t border-line pt-7">
        <Roster />
      </div>
    </div>
  );
}
