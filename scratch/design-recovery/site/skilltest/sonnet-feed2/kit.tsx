"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, CircleAlert, Globe, Layers, Rss } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { THEME_KEY } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { DigestEntry, FeedStory, ItemView } from "@/next/data/feed";
import { Quote } from "@/next/council/chrome";
import { accounts, digests, hostOf, HANDLE, newest, sites, status, storiesFor, week, weekTotal, when, type View } from "@/next/council/data";
import { Dot, GitHubMark, KindChip, ReportMark, Segments, SiteIcon, WeekBars, XAvatar } from "@/next/council/marks";

// Shared parts for the three sonnet-feed2 directions. Everything is the council's own data and atoms: stories
// and reports from next/data/feed, sources from the recorded onboarding run, counts and the chart from stored
// publication dates. What this file adds is arrangement only: how entries are filtered, grouped and set out.

export type Src = "x" | "rss" | "website" | "github";
export type Filter = Src | "all";

export const SRC: Record<Src, { label: string; one: string }> = {
  x: { label: "X accounts", one: "X account" },
  rss: { label: "RSS feeds", one: "RSS feed" },
  website: { label: "Websites", one: "Website" },
  github: { label: "GitHub", one: "GitHub" },
};

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

/** Stories and the GitHub digest in one newest-first stream: GitHub is a source like any other. */
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

/** Re-applies the pre-paint theme choice after mount (see chrome.tsx); if hydration falls back to a client render. */
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

/** A remote image that quietly disappears when it fails, so the surface around it still reads. */
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

/** The picture of a story, set on the kind's own soft tint so a failed load still leaves a surface. */
export function StoryPic({ story, className }: { story: FeedStory; className?: string }) {
  const item = story.items[0];
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background: item.kind === "post" ? "var(--kind-post-soft)" : "var(--kind-article-soft)" }}
    >
      <Pic src={story.card.image} className="absolute inset-0 size-full" />
    </div>
  );
}

/** Time of a story: its newest report. */
export const storyTime = (story: FeedStory) => when(newest(story).published_at);

/** Kind chips for a story, and a plain "reports" chip when several were joined. */
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

/** The publishers behind a story: mark, name, and the kind of source in words (websites and feeds stay apart). */
export function Publishers({ story, className, compact = false }: { story: FeedStory; className?: string; compact?: boolean }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {story.items.map((item) => {
        const s = srcOf(item);
        return (
          <li key={item.id} className="flex items-center gap-2 text-[12.5px] leading-tight">
            <ReportMark item={item} size={compact ? 16 : 18} className={item.kind === "post" ? "" : "rounded-[5px]"} />
            <span className="min-w-0">
              <span className="block truncate font-medium text-t1">{item.publisher}</span>
              <span className="block truncate text-[11.5px] text-t4">
                {s ? `${SRC[s].one} · ` : ""}
                {handleOf(item)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** One line of overlapping marks and names, for tight footers. */
export function PublisherLine({ story, className }: { story: FeedStory; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2 text-[12px] text-t3", className)}>
      <span className="flex items-center">
        {story.items.map((item, i) => (
          <span
            key={item.id}
            className="rounded-full ring-2 ring-[var(--window)]"
            style={{ marginLeft: i === 0 ? 0 : -5, zIndex: story.items.length - i, borderRadius: item.kind === "post" ? 999 : 5 }}
          >
            <ReportMark item={item} size={16} className={item.kind === "post" ? "" : "rounded-[5px]"} />
          </span>
        ))}
      </span>
      <span className="truncate">{story.items.map((i) => i.publisher).join(", ")}</span>
    </span>
  );
}

/** The GitHub release written out: its mark, the repository, the tag and the synthesized line. */
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

export function DigestChip({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[var(--kind-github-soft)] px-2 text-[11.5px] font-medium text-[var(--kind-github)]", className)}>
      <GitHubMark className="size-3.5" />
      GitHub digest
    </span>
  );
}

// ───────────── status stamps: the same real fixture states the accepted feeds show ─────────────

export function LiveStat({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 whitespace-nowrap text-[12.5px] text-t3", className)}>
      <Dot tone="ok" pulse />
      <span className="font-medium text-[var(--ok)]">Live</span>
      watching {sites.length + accounts.length} sources
    </span>
  );
}

export function CheckStat({ pending, className }: { pending: number; className?: string }) {
  if (pending <= 0) return null;
  return (
    <span className={cn("flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-t3", className)}>
      <StatusMark status="running" size={15} color="var(--caution)" strokeWidth={2} />
      <span className="tabular-nums text-t1">{pending}</span> checking
    </span>
  );
}

export function FailStat({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-t3", className)}>
      <CircleAlert className="size-[15px] text-[var(--error)]" aria-hidden="true" />
      <span className="tabular-nums text-t1">{status.failed}</span> failed
    </span>
  );
}

export function FreeWeekStat({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 whitespace-nowrap text-[12.5px] text-t3", className)}>
      <span className="w-[92px]">
        <Segments total={status.trialDays} filled={status.daysLeft} />
      </span>
      <span>
        <span className="tabular-nums text-t1">{status.daysLeft}</span> days left
      </span>
    </span>
  );
}

export function PoolStat({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 whitespace-nowrap text-[12.5px] text-t3", className)}>
      <XLogo className="size-3 text-t3" />
      <span className="tabular-nums text-t1">
        {status.poolUsed} of {status.poolLimit}
      </span>
      watched posts
    </span>
  );
}

export function WeekStat({ className, height = 28 }: { className?: string; height?: number }) {
  return (
    <span className={cn("flex items-center gap-2.5 whitespace-nowrap text-[12.5px] text-t3", className)}>
      <WeekBars week={week} height={height} className="w-[78px]" />
      <span>
        <span className="tabular-nums text-t1">{weekTotal}</span> reports in 7 days
      </span>
    </span>
  );
}

// ───────────── controls ─────────────

export function Handle({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-[13px] text-t1", className)}>
      <span className="grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>@{HANDLE}
      <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide text-[var(--caution)]">
        FREE WEEK
      </span>
    </span>
  );
}

export function Brand({ className }: { className?: string }) {
  return <OparaxMark className={cn("size-[18px] text-t1", className)} />;
}

const groupIcon: Record<Src, React.ReactNode> = {
  x: <XLogo className="size-3.5" />,
  rss: <Rss className="size-3.5" aria-hidden="true" />,
  website: <Globe className="size-3.5" aria-hidden="true" />,
  github: <GitHubMark className="size-3.5" />,
};
const groupTone: Record<Src, string> = {
  x: "text-[var(--kind-post)] bg-[var(--kind-post-soft)]",
  rss: "text-[var(--kind-article)] bg-[var(--kind-article-soft)]",
  website: "text-[var(--kind-article)] bg-[var(--kind-article-soft)]",
  github: "text-[var(--kind-github)] bg-[var(--kind-github-soft)]",
};

const watched: Record<Src, number> = {
  x: accounts.length,
  rss: sites.filter((s) => s.kind === "rss").length,
  website: sites.filter((s) => s.kind === "website").length,
  github: 1,
};
const watchedWord: Record<Src, [string, string]> = {
  x: ["account", "accounts"],
  rss: ["feed", "feeds"],
  website: ["site", "sites"],
  github: ["repository", "repositories"],
};

function groupMarks(src: Src) {
  if (src === "x") return accounts.slice(0, 6).map((a) => <XAvatar key={a.id} handle={a.handle} size={18} />);
  if (src === "github") return [<GitHubMark key="gh" className="size-[18px] text-t2" />];
  return sites
    .filter((s) => s.kind === src)
    .slice(0, 7)
    .map((s) => <SiteIcon key={s.id} host={s.host} size={18} />);
}

/** Swap between sources: every kind of source is weighed the same, and a pick filters the reading. */
export function SourceMenu({
  view,
  value,
  onChange,
  popClass = "bottom-full left-0 mb-2",
  className,
}: {
  view: View;
  value: Filter;
  onChange: (f: Filter) => void;
  popClass?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const all = entriesFor(view);
  const label = value === "all" ? "All sources" : SRC[value].label;
  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex h-8 items-center gap-2 rounded-lg border border-line bg-[var(--well)] px-2.5 text-[12.5px] text-t2 transition-colors hover:text-t1",
          value !== "all" && "border-[var(--brand-line)] bg-[var(--brand-soft)] text-t1",
        )}
      >
        <span className="flex items-center -space-x-1.5">
          <SiteIcon host={sites[1].host} size={16} className="ring-2 ring-[var(--well)]" />
          <SiteIcon host={sites[2].host} size={16} className="ring-2 ring-[var(--well)]" />
          <SiteIcon host={sites[4].host} size={16} className="ring-2 ring-[var(--well)]" />
        </span>
        {label}
        <ChevronDown className={cn("size-3.5 text-t4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          className={cn("absolute z-50 w-[320px] overflow-hidden rounded-xl border border-line-strong bg-[var(--popover)] p-1.5", popClass)}
          style={{ boxShadow: "var(--window-shadow)" }}
        >
          <MenuRow active={value === "all"} onClick={() => (onChange("all"), setOpen(false))}>
            <span className="grid size-6 place-items-center rounded-md bg-raised text-t2">
              <Layers className="size-3.5" aria-hidden="true" />
            </span>
            <span className="font-medium text-t1">All sources</span>
            <span className="ml-auto text-[12px] tabular-nums text-t4">{all.length}</span>
          </MenuRow>
          {(Object.keys(SRC) as Src[]).map((g) => (
            <MenuRow key={g} active={value === g} onClick={() => (onChange(g), setOpen(false))} tall>
              <span className={cn("grid size-6 place-items-center rounded-md", groupTone[g])}>{groupIcon[g]}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="font-medium text-t1">{SRC[g].label}</span>
                  <span className="text-[11.5px] text-t4">
                    {watched[g]} {watchedWord[g][watched[g] === 1 ? 0 : 1]}
                  </span>
                </span>
                <span className="mt-1.5 flex items-center gap-1">{groupMarks(g)}</span>
              </span>
              <span className="self-start pt-0.5 text-[12px] tabular-nums text-t4">{applyFilter(all, g).length}</span>
            </MenuRow>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuRow({ active, onClick, children, tall = false }: { active: boolean; onClick: () => void; children: React.ReactNode; tall?: boolean }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] transition-colors hover:bg-raised",
        tall ? "py-2" : "h-9",
        active && "bg-[var(--brand-soft)] shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
      )}
    >
      {children}
      {active ? <Check className="size-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" /> : null}
    </button>
  );
}

/** When a source has nothing yet: say so and offer the way back. */
export function EmptySource({ filter, onReset, className }: { filter: Src; onReset: () => void; className?: string }) {
  return (
    <div className={cn("grid place-items-center px-6 py-16 text-center", className)}>
      <div className="max-w-sm">
        <span className={cn("mx-auto grid size-10 place-items-center rounded-xl", groupTone[filter])}>{groupIcon[filter]}</span>
        <p className="mt-4 text-[15px] font-medium text-t1">No reports from {SRC[filter].label} yet</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-t3">
          {watched[filter]} {watchedWord[filter][watched[filter] === 1 ? 0 : 1]} watched. Nothing from {watched[filter] === 1 ? "it" : "them"} has reached your feed yet.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-4 h-8 rounded-md border border-line-strong bg-[var(--well)] px-3 text-[12.5px] text-t1 transition-colors hover:bg-raised"
        >
          Show all sources
        </button>
      </div>
    </div>
  );
}

/** Each report behind a story as its own small row, as the accepted Window lists its sources. */
export function ReportRows({ story, className, tight = false }: { story: FeedStory; className?: string; tight?: boolean }) {
  return (
    <ul className={cn("space-y-1.5", className)}>
      {story.items.map((item) => {
        const s = srcOf(item);
        return (
          <li key={item.id} className={cn("flex items-center gap-2.5 rounded-lg border border-line bg-[var(--well)] px-3", tight ? "h-10" : "py-2")}>
            <ReportMark item={item} size={tight ? 18 : 20} className={item.kind === "post" ? "" : "rounded-[5px]"} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] leading-tight text-t1">{item.title}</span>
              {tight ? null : (
                <span className="block truncate text-[11.5px] text-t4">
                  {item.publisher} · {s ? `${SRC[s].one} · ` : ""}
                  {when(item.published_at)}
                </span>
              )}
            </span>
            {tight ? (
              <span className="shrink-0 text-[11.5px] text-t4">
                {s ? `${SRC[s].one} · ` : ""}
                {when(item.published_at)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** The verbatim words behind a story's first fact, set apart by the kind's own hue. */
export function Words({ story, max = 2, className }: { story: FeedStory; max?: number; className?: string }) {
  const byId = new Map(story.items.map((i) => [i.id, i]));
  const first = story.card.facts[0];
  const seen = new Set<string>();
  const quotes = first.evidence.filter((e) => (seen.has(e.item) ? false : (seen.add(e.item), true)));
  return (
    <div className={cn("space-y-2", className)}>
      <p className="font-mono text-[10.5px] tracking-[0.12em] text-t4">IN THEIR WORDS</p>
      {quotes.slice(0, max).map((e) => (
        <Quote key={e.item} item={byId.get(e.item)!} spans={first.evidence.filter((x) => x.item === e.item).map((x) => x.span)} className="mt-0" />
      ))}
    </div>
  );
}
