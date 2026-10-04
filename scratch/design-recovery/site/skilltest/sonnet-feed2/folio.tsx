"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Layers, Rows3 } from "lucide-react";
import Link from "next/link";
import { PREVIEW_NOTE, counts, hrefWith, when, type View } from "@/next/council/data";
import { Facts } from "@/next/council/chrome";
import { NewFlag, useArrival } from "@/next/council/live";
import { XLogo } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { DigestEntry, FeedStory } from "@/next/data/feed";
import {
  applyFilter,
  Brand,
  CheckStat,
  DigestChip,
  EmptySource,
  entriesFor,
  FailStat,
  FreeWeekStat,
  LiveStat,
  PoolStat,
  ReleaseWell,
  ReportRows,
  Words,
  SourceMenu,
  StoryChips,
  StoryPic,
  storyTime,
  useThemeGuard,
  WeekStat,
  type Entry,
  type Filter,
} from "./kit";

// Direction B, the open folio. The feed is a book on a lit stage: two leaves face each other, each a whole story with
// its picture, every fact and its citation; the narrow gutter between them carries the controls; a base under both
// leaves carries the status. It is paginated by spread (arrow keys or the gutter), so the first screen is one
// complete composition and nothing is cut. The task: survey two stories at a glance, read both, turn the page.

const BASE = "/skilltest/sonnet-feed2/b";

export function Folio({ view, theme, page }: { view: View; theme?: string; page: number }) {
  useThemeGuard();
  const [filter, setFilter] = useState<Filter>("all");
  const [spread, setSpread] = useState(Math.max(1, page));
  const { pending } = useArrival();
  const list = applyFilter(entriesFor(view), filter);
  const spreads = Math.max(1, Math.ceil(list.length / 2));
  const at = Math.min(spread, spreads);
  const pair = list.slice((at - 1) * 2, at * 2);

  const turn = (d: number) => setSpread((s) => Math.min(spreads, Math.max(1, Math.min(s, spreads) + d)));
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") turn(1);
      if (e.key === "ArrowLeft") turn(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return (
    <div className="palette-council relative min-h-screen overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[760px]" style={{ background: "var(--stage-light)" }} />
      <main className="relative z-10 mx-auto flex min-h-screen w-[min(1320px,calc(100%-32px))] flex-col py-5">
        <div
          className="flex flex-1 flex-col rounded-[18px] p-3"
          style={{ background: "var(--stage-frame)", boxShadow: "var(--window-shadow), var(--top-light)" }}
        >
          <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_104px_minmax(0,1fr)]">
            {list.length === 0 && filter !== "all" ? (
              <div className="rounded-[14px] bg-[var(--window)] lg:col-span-3" style={{ boxShadow: "var(--card-shadow)" }}>
                <EmptySource filter={filter} onReset={() => setFilter("all")} />
              </div>
            ) : (
              <>
                <Leaf entry={pair[0]} fresh={at === 1} />
                <Gutter view={view} theme={theme} filter={filter} setFilter={setFilter} at={at} spreads={spreads} turn={turn} />
                {pair[1] ? <Leaf entry={pair[1]} /> : <div className="hidden rounded-[14px] border border-dashed border-line lg:block" aria-hidden="true" />}
              </>
            )}
          </div>
          <Base pending={pending} />
          <p className="pt-2.5 text-center text-[11.5px] text-t4">{PREVIEW_NOTE}</p>
        </div>
      </main>
    </div>
  );
}

function Leaf({ entry, fresh = false }: { entry: Entry; fresh?: boolean }) {
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[14px] bg-[var(--window)]" style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}>
      {entry.type === "story" ? <StoryLeaf story={entry.story} fresh={fresh} /> : <DigestLeaf digest={entry.digest} />}
    </article>
  );
}

function StoryLeaf({ story, fresh }: { story: FeedStory; fresh: boolean }) {
  return (
    <>
      {story.card.image ? (
        <StoryPic story={story} className="h-[236px] w-full shrink-0 border-b border-line" />
      ) : (
        <div className="flex h-[236px] w-full shrink-0 flex-col justify-center border-b border-line bg-[var(--well)] px-7">
          <Words story={story} />
        </div>
      )}
      <div className="flex flex-1 flex-col px-7 pb-5 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <StoryChips story={story} />
          {fresh ? <NewFlag /> : null}
          <span className="ml-auto font-mono text-[11px] tracking-wide text-t3">{storyTime(story)}</span>
        </div>
        <h2 className="mt-3.5 text-[25px] font-semibold leading-[1.15] tracking-[-0.025em] text-t1">{story.card.headline}</h2>
        <Facts story={story} className="mt-4" />
        {story.card.image ? <Words story={story} max={1} className="mt-5" /> : null}
        <ReportRows story={story} tight className="mt-auto pt-4" />
      </div>
    </>
  );
}

function DigestLeaf({ digest }: { digest: DigestEntry }) {
  return (
    <>
      <ReleaseWell digest={digest} className="h-[236px] w-full shrink-0 border-0 border-b" />
      <div className="flex flex-1 flex-col px-7 pb-5 pt-5">
        <div className="flex items-center gap-2">
          <DigestChip />
          <span className="ml-auto font-mono text-[11px] tracking-wide text-t3">{when(digest.released_at, false)}</span>
        </div>
        <h2 className="mt-3.5 text-[25px] font-semibold leading-[1.15] tracking-[-0.025em] text-t1">{digest.name}</h2>
        <p className="mt-1.5 text-[14.5px] text-t2">{digest.description}</p>
        <p className="mt-4 text-[14.5px] leading-[1.55] text-t2">{digest.detail}</p>
      </div>
    </>
  );
}

/** The narrow gutter between the leaves: the account, the view, the source, the page and the alert action. */
function Gutter({
  view,
  theme,
  filter,
  setFilter,
  at,
  spreads,
  turn,
}: {
  view: View;
  theme?: string;
  filter: Filter;
  setFilter: (f: Filter) => void;
  at: number;
  spreads: number;
  turn: (d: number) => void;
}) {
  return (
    <nav aria-label="Feed controls" className="flex flex-row items-center justify-center gap-2 lg:flex-col lg:justify-start lg:gap-3 lg:py-3">
      <Brand className="size-5" />
      <span className="grid size-8 place-items-center rounded-full bg-[var(--brand)] text-[12px] font-semibold text-white" title="@farzanmrz">
        F
      </span>
      <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1 py-px font-mono text-[9px] tracking-wide text-[var(--caution)]">
        FREE WEEK
      </span>
      <span className="my-1 hidden h-px w-8 bg-line-strong lg:block" />
      {(["clustered", "direct"] as const).map((v) => {
        const Icon = v === "clustered" ? Layers : Rows3;
        const on = v === view;
        return (
          <Link
            key={v}
            href={hrefWith(BASE, { view: v, theme })}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex w-[84px] flex-col items-center gap-0.5 rounded-lg border border-transparent py-1.5 text-[11.5px] text-t3 transition-colors hover:text-t1",
              on && "border-[var(--brand-line)] bg-[var(--brand-soft)] text-t1",
            )}
          >
            <Icon className={cn("size-4", on && "text-[var(--brand)]")} aria-hidden="true" />
            {v === "clustered" ? "Clustered" : "Direct"}
            <span className="tabular-nums text-t4">{counts[v]}</span>
          </Link>
        );
      })}
      <SourceMenu view={view} value={filter} onChange={setFilter} popClass="left-1/2 top-full mt-2 -translate-x-1/2 lg:left-[calc(100%+8px)] lg:top-0 lg:mt-0 lg:translate-x-0" className="[&>button]:h-auto [&>button]:w-[84px] [&>button]:flex-col [&>button]:gap-1 [&>button]:py-2 [&>button]:text-[11.5px]" />
      <div className="flex flex-col items-center gap-1.5 lg:mt-auto">
        <span className="font-mono text-[11px] tabular-nums tracking-wide text-t3">
          {at} / {spreads}
        </span>
        <div className="flex items-center gap-1">
          <PageButton label="Previous spread" onClick={() => turn(-1)} disabled={at <= 1}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </PageButton>
          <PageButton label="Next spread" onClick={() => turn(1)} disabled={at >= spreads}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </PageButton>
        </div>
        <button
          type="button"
          aria-label="Get alerts on X"
          title="Get alerts on X"
          className="mt-2 grid size-9 place-items-center rounded-md bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <XLogo className="size-3.5" />
        </button>
        <ThemeToggle className="size-8 text-t3" />
      </div>
    </nav>
  );
}

function PageButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md border border-line-strong bg-[var(--well)] text-t2 transition-colors hover:bg-raised hover:text-t1 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** The base under both leaves: what the agent is doing, and what is left of the free week. */
function Base({ pending }: { pending: number }) {
  return (
    <div className="mt-3 flex min-h-12 flex-wrap items-center gap-x-6 gap-y-2 rounded-[14px] border border-line bg-[var(--rail)] px-5 py-2.5">
      <LiveStat />
      <CheckStat pending={pending} />
      <FailStat />
      <span className="flex items-center gap-2 whitespace-nowrap text-[12.5px] text-t3">
        <XLogo className="size-3 text-t3" />
        Alerts not connected
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2">
        <FreeWeekStat />
        <PoolStat />
        <WeekStat />
      </span>
    </div>
  );
}
