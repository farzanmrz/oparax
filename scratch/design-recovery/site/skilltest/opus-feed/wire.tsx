"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertsButton, Facts, TopBar, ViewSwitch } from "@/next/council/chrome";
import { clock, status, week, type View } from "@/next/council/data";
import { Arrive, Checking, useArrival } from "@/next/council/live";
import { GitHubMark, KindGlyph, ReportMark, Segments, WeekBars } from "@/next/council/marks";
import type { ItemView } from "@/next/data/feed";
import {
  Cover,
  FailedLine,
  feed,
  filterStories,
  GROUPS,
  groupOf,
  hostOf,
  LiveLine,
  newest,
  repo,
  SourceGlyph,
  sourceCount,
  StoryChips,
  when,
  watchingLine,
  type Story,
} from "./shared";

// Direction B, Convergence: the feed shown as what it is, many sources becoming few stories. Each new post,
// article or release arrives on a timed wire on the left; a line in its kind's color carries it into the story
// it joined on the right, so a story fed by three sources visibly draws three lines in. Stories grow with their
// sources: a single-source story is a slim row with its picture and two facts, a joined story is taller with its
// larger picture and more facts. A dock of every source's own mark sits on the page and narrows the wire.

const BASE = "/skilltest/opus-feed/b";
const TICKET = 54;
const GAP = 9;
const LINK_W = 72;

type Entry = { id: string; kind: "post" | "article" | "github"; publisher: string; sub: string; title: string; at: string; item?: ItemView };

function entries(story: Story): Entry[] {
  const list: Entry[] = story.items.map((i) => ({
    id: i.id,
    kind: i.kind,
    publisher: i.publisher,
    sub: i.kind === "post" ? (i.author ?? "") : hostOf(i.url),
    title: i.title,
    at: i.published_at,
    item: i,
  }));
  if (story.release)
    list.push({
      id: "release",
      kind: "github",
      publisher: repo.name,
      sub: "github.com",
      title: `Release ${repo.tag}, ${story.release.description}`,
      at: story.release.released_at,
    });
  return list.sort((a, b) => (a.at < b.at ? 1 : -1));
}

const rowHeight = (n: number) => (n <= 1 ? 136 : n === 2 ? 204 : 236);

export function Convergence({ view, theme }: { view: View; theme?: string }) {
  const [source, setSource] = useState<string | null>(null);
  const { pending } = useArrival();
  const list = filterStories(feed(view), source);

  return (
    <div className="palette-council relative flex min-h-svh flex-col">
      <TopBar title="Feed" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-12 h-[560px]" style={{ background: "var(--stage-light)" }} />
      <main className="relative flex gap-4 px-6 pt-6 pb-14">
        <Dock selected={source} onSelect={setSource} />
        <section
          aria-label="Feed"
          className="min-w-0 flex-1 overflow-hidden rounded-[14px] border border-line-strong bg-[var(--window)]"
          style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
        >
          <header className="flex items-end gap-6 px-7 pt-6 pb-5">
            <div>
              <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Your Feed</h1>
              <p className="mt-2.5 text-[13.5px] text-t3">Every arrival, and the story it joined.</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <ViewSwitch base={BASE} view={view} theme={theme} />
              <AlertsButton />
            </div>
          </header>

          <div className="flex h-11 items-center gap-6 border-y border-line bg-[var(--rail)] px-7 text-[12.5px]">
            <Checking pending={pending} compact />
            <FailedLine count={status.failed} />
            <span className="ml-auto flex items-center gap-2.5">
              <LiveLine />
              <span className="text-t3">{watchingLine()}</span>
            </span>
            <span className="h-5 w-px bg-line" />
            <span className="flex items-center gap-2.5">
              <span className="text-t3">Free week</span>
              <span className="w-24">
                <Segments total={status.trialDays} filled={status.daysLeft} />
              </span>
              <span className="text-t2">
                <span className="font-semibold tabular-nums text-t1">{status.daysLeft}</span> days left
              </span>
            </span>
          </div>

          <div className="grid grid-cols-[336px_72px_minmax(0,1fr)] items-center border-b border-line-soft px-7 py-2.5 font-mono text-[10.5px] tracking-[0.08em] text-t4 uppercase">
            <span className="flex items-center gap-3">
              Arrivals
              <WeekBars week={week} height={14} className="w-14" />
              <span className="normal-case tracking-normal">per day</span>
            </span>
            <span />
            <span>Stories</span>
          </div>

          <ol className="space-y-3 px-7 pt-4 pb-8">
            {list.map((s, i) => (
              <Arrive key={s.id} as="li" index={i}>
                <Row story={s} />
              </Arrive>
            ))}
            {list.length === 0 ? <li className="py-16 text-[14px] text-t3">Nothing from this source in the preview yet.</li> : null}
          </ol>
        </section>
      </main>
    </div>
  );
}

function Dock({ selected, onSelect }: { selected: string | null; onSelect: (k: string | null) => void }) {
  return (
    <nav
      aria-label="Sources"
      className="sticky top-6 flex h-fit w-[56px] shrink-0 flex-col items-center rounded-[14px] border border-line bg-[var(--rail)] py-2"
      style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      <button
        type="button"
        title="All sources"
        onClick={() => onSelect(null)}
        className={cn(
          "grid size-9 place-items-center rounded-lg text-t3 transition-colors hover:bg-raised",
          selected === null && "bg-[var(--brand-soft)] text-[var(--brand)] shadow-[inset_0_0_0_1px_var(--brand-line)]",
        )}
      >
        <Layers className="size-4" />
      </button>
      {GROUPS.map((g) => (
        <div key={g.kind} className="mt-2 flex w-full flex-col items-center border-t border-line-soft pt-2">
          <span className="mb-1 font-mono text-[9px] tracking-[0.08em] text-t4 uppercase">{g.short}</span>
          {groupOf(g.kind).map((s) => {
            const on = selected === s.key;
            return (
              <button
                key={s.key}
                type="button"
                title={`${s.name}, ${s.detail}`}
                onClick={() => onSelect(on ? null : s.key)}
                className={cn(
                  "grid size-[32px] place-items-center rounded-lg transition-colors hover:bg-raised",
                  on && "bg-[var(--brand-soft)] shadow-[inset_0_0_0_1px_var(--brand-line)]",
                )}
              >
                <SourceGlyph source={s} size={19} />
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

const kindColor = { post: "var(--kind-post)", article: "var(--kind-article)", github: "var(--kind-github)" } as const;

function Row({ story }: { story: Story }) {
  const list = entries(story);
  const n = list.length;
  const h = rowHeight(n);
  const stackH = n * TICKET + (n - 1) * GAP;
  const top = (h - stackH) / 2;
  const ys = list.map((_, i) => top + i * (TICKET + GAP) + TICKET / 2);
  return (
    <div className="grid grid-cols-[336px_72px_minmax(0,1fr)]" style={{ height: h }}>
      <div className="flex flex-col justify-center" style={{ gap: GAP }}>
        {list.map((e) => (
          <Ticket key={e.id} entry={e} />
        ))}
      </div>
      <svg width={LINK_W} height={h} viewBox={`0 0 ${LINK_W} ${h}`} aria-hidden="true" className="overflow-visible">
        {ys.map((y, i) => (
          <g key={list[i].id}>
            <path
              d={`M0 ${y} C ${LINK_W * 0.55} ${y}, ${LINK_W * 0.45} ${h / 2}, ${LINK_W} ${h / 2}`}
              fill="none"
              stroke={kindColor[list[i].kind]}
              strokeOpacity={0.75}
              strokeWidth={1.5}
            />
            <circle cx={1} cy={y} r={3} fill={kindColor[list[i].kind]} />
          </g>
        ))}
        <circle cx={LINK_W - 1} cy={h / 2} r={4} fill="var(--window)" stroke="var(--t3)" strokeWidth={1.5} />
      </svg>
      <StoryCard story={story} h={h} n={n} />
    </div>
  );
}

function Ticket({ entry }: { entry: Entry }) {
  return (
    <div
      className="relative flex items-center gap-2.5 overflow-hidden rounded-lg border border-line bg-[var(--raised)] pr-3 pl-3.5"
      style={{ height: TICKET, boxShadow: "var(--top-light)" }}
    >
      <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[2px] rounded-full" style={{ background: kindColor[entry.kind] }} />
      <span className="w-[42px] shrink-0 font-mono text-[10.5px] leading-tight text-t4 tabular-nums">
        {when(entry.at, false).replace(/, \d{4}$/, "")}
        <br />
        <span className="text-t3">{clock(entry.at)}</span>
      </span>
      {entry.item ? (
        <ReportMark item={entry.item} size={20} className={entry.kind === "post" ? "" : "rounded-[5px]"} />
      ) : (
        <span className="grid size-5 shrink-0 place-items-center rounded-[5px] bg-[var(--kind-github-soft)] text-[var(--kind-github)]">
          <GitHubMark className="size-3.5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[12.5px]">
          <span className="truncate font-medium text-t1">{entry.publisher}</span>
          <KindGlyph kind={entry.kind} className="size-3 shrink-0" />
        </span>
        <span className="block truncate text-[12px] text-t3">{entry.title}</span>
      </span>
    </div>
  );
}

function StoryCard({ story, h, n }: { story: Story; h: number; n: number }) {
  const last = newest(story);
  const joined = sourceCount(story) > 1;
  const max = n === 1 ? 1 : n === 2 ? 3 : 4;
  const more = story.card.facts.length - max;
  return (
    <article
      className={cn(
        "flex min-w-0 overflow-hidden rounded-xl border bg-[var(--window)]",
        joined ? "border-[var(--brand-line)]" : "border-line-strong",
      )}
      style={{ height: h, boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      <Cover image={story.card.image} item={story.items[0]} className={cn("h-full shrink-0", n === 1 ? "w-[236px]" : "w-[320px]")} />
      <div className="relative min-w-0 flex-1 px-5 py-4">
        <div className="flex items-center gap-1.5">
          <StoryChips story={story} />
          {joined ? (
            <span className="inline-flex h-[22px] items-center gap-1 rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 text-[11.5px] text-[var(--brand)]">
              <Layers className="size-3" /> {sourceCount(story)} sources
            </span>
          ) : null}
          <span className="ml-auto text-[11.5px] tabular-nums text-t4">{when(last.published_at)}</span>
        </div>
        <h2
          className={cn(
            "mt-2 font-semibold tracking-[-0.015em] text-t1",
            n === 1 ? "line-clamp-1 text-[17px] leading-[1.3]" : "text-[21px] leading-[1.22]",
          )}
        >
          {story.card.headline}
        </h2>
        <Facts story={story} max={max} size="sm" className="mt-2" />
        {more > 0 ? <p className="mt-1 pl-3.5 text-[12px] text-t4">{more} more {more === 1 ? "fact" : "facts"}</p> : null}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[var(--window)] to-transparent" />
      </div>
    </article>
  );
}
