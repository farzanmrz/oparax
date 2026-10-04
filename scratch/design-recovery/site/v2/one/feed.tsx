"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { CircleAlert, X as Close } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { AlertsButton, lift, liftStyle, Tile, ViewSwitch } from "@/v2/deck/chrome";
import {
  newestItem,
  PREVIEW_NOTE,
  sources,
  status,
  stories,
  storiesThisWeek,
  storyHasSource,
  week,
  when,
  type FeedStory,
  type Source,
  type View,
} from "@/v2/deck/data";
import { Arrive, useArrival } from "@/v2/deck/live";
import { Dot, Segments, SourceMark, WeekBars } from "@/v2/deck/marks";
import { BASE, StoryStack, type LabelMode } from "./card";
import { Expand, Shell } from "./rail";

// The One feed: the Deck feed (v2/deck/feed.tsx), copied, with the owner's changes only: outer margins halved and
// no width cap; the account and the theme toggle moved from the header into the sidebar; no checking row; one card
// per story with no plates, no kind chip and no publisher parentheses; the sidebar (rail.tsx) as the Deck's source
// list with his changes, which closes completely.

const IMAGE_H = 172;

function estimate(s: FeedStory) {
  return (s.card.image ? IMAGE_H : 0) + 128 + s.card.facts.length * 46 + 24;
}

/** Newest first, each story into the shorter column by estimated height. */
function toColumns(list: FeedStory[], n: number, lead = 0) {
  const cols: FeedStory[][] = Array.from({ length: n }, () => []);
  const h = Array.from({ length: n }, (_, i) => (i === 0 ? lead : 0));
  for (const s of list) {
    const c = h.indexOf(Math.min(...h));
    cols[c].push(s);
    h[c] += estimate(s) + 24;
  }
  return cols;
}

export function OneFeed({
  initialView,
  initialSource,
  initialMode,
  initialPanel,
  settled,
}: {
  initialView: View;
  initialSource: string | null;
  initialMode: LabelMode;
  initialPanel: boolean;
  settled: boolean;
}) {
  const [view, setView] = useState<View>(initialView);
  const [sourceId, setSourceId] = useState<string | null>(sources.some((s) => s.id === initialSource) ? initialSource : null);
  const mode = initialMode;
  useArrival(settled);

  // Keep the URL in step so each state has an address (and survives a reload).
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    q.set("view", view);
    if (sourceId) q.set("source", sourceId);
    else q.delete("source");
    history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
  }, [view, sourceId]);

  const all = stories[view];
  const selected = sources.find((s) => s.id === sourceId) ?? null;
  const list = selected ? all.filter((s) => storyHasSource(s, selected.id)) : all;
  const freshId = all[0].id;
  // The newest story is on the page from the start; only its New marker and edge light replay its arrival.
  const visible = (_: FeedStory) => true;

  return (
    <Shell
      sources={sources}
      onSource={setSourceId}
      activeSource={sourceId}
      initialOpen={initialPanel}
      ownExpand
      header={
        <Header
          title="Your Feed"
          controls={<ViewSwitch view={view} onChange={setView} />}
          actions={<AlertsButton />}
          sub={
            <p className="text-[13.5px] text-t3">
              {view === "clustered" ? "Articles and posts about the same event, stacked into one story." : "Each article, post and release on its own card, newest first."}
            </p>
          }
          note={`${PREVIEW_NOTE} The newest story's arrival is a replay.`}
        />
      }
    >
      <main className="min-w-0 pb-20">
        <Tiles />

        {selected ? <SourceHeader source={selected} mode={mode} onClear={() => setSourceId(null)} /> : null}

        {selected && list.length === 0 ? (
          <p className="mt-6 text-[13.5px] text-t2">
            Nothing from {mode === "name" ? selected.name : selected.handle} has matched your sentence yet. Everything else in your feed:
          </p>
        ) : null}

        <StackColumns list={selected && list.length === 0 ? all : list} mode={mode} freshId={selected ? null : freshId} visible={visible} />
      </main>
      <Expand />
    </Shell>
  );
}

/** The Deck member header (v2/deck/chrome.tsx) without the account and the theme toggle, which are in the sidebar. */
function Header({
  title,
  sub,
  note,
  controls,
  actions,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  note?: string;
  controls?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="relative z-20">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`${BASE}/landing`} aria-label="Oparax home" className="shrink-0 rounded-sm text-t1">
            <OparaxMark className="size-[22px]" />
          </Link>
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">{title}</h1>
        </div>
        {controls}
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">{actions}</div>
      </div>
      {sub || note ? (
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1.5">
          <div className="min-w-0">{sub}</div>
          {note ? <p className="text-[11.5px] text-t3">{note}</p> : null}
        </div>
      ) : null}
    </header>
  );
}

function StackColumns({
  list,
  mode,
  freshId,
  visible,
}: {
  list: FeedStory[];
  mode: LabelMode;
  freshId: string | null;
  visible: (s: FeedStory) => boolean;
}) {
  const two = useMemo(() => toColumns(list, 2), [list]);
  const render = (col: FeedStory[], ci: number) => (
    <div key={ci} className="flex min-w-0 flex-col gap-6">
      <AnimatePresence initial={false}>
        {col.map((s, i) =>
          visible(s) ? (
            <Arrive key={s.id} index={ci + i * 2}>
              <StoryStack story={s} mode={mode} fresh={s.id === freshId} imageHeight={IMAGE_H} />
            </Arrive>
          ) : null,
        )}
      </AnimatePresence>
    </div>
  );
  return (
    <>
      <div className="mt-6 hidden items-start gap-6 md:grid md:grid-cols-2">{two.map((col, ci) => render(col, ci))}</div>
      <div className="mt-6 grid gap-6 md:hidden">{render(list, 0)}</div>
    </>
  );
}

function Tiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Tile label="This week">
        <div className="mt-1 flex items-end justify-between gap-4">
          <p className="flex items-baseline gap-1.5">
            <span className="text-[28px] leading-none font-semibold tabular-nums text-t1">{storiesThisWeek}</span>
            <span className="text-[13px] text-t2">stories</span>
          </p>
          <WeekBars week={week} height={36} className="w-[136px]" />
        </div>
        <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-[11px] text-t3">
          <span>Per day, by newest article</span>
          <span>
            {week[0].label} to {week[week.length - 1].label}
          </span>
        </p>
      </Tile>
      <Tile label="Agent">
        <p className="mt-1.5 flex items-center gap-2 text-[14px] font-medium">
          <Dot tone="ok" pulse /> <span className="text-[var(--ok)]">Live</span>
          <span className="text-[12.5px] font-normal text-t3">newest article {when(newestItem.published_at)}</span>
        </p>
        <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-t2">
          <CircleAlert className="size-3.5 text-[var(--error)]" aria-hidden="true" />
          {status.failed} item could not be read
        </p>
      </Tile>
      <Tile label="Free week">
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[22px] leading-none font-semibold tabular-nums text-t1">{status.daysLeft}</span>
          <span className="text-[13px] text-t2">days left</span>
        </p>
        <div className="mt-2.5">
          <Segments total={status.trialDays} filled={status.daysLeft} />
        </div>
        <p className="mt-2 text-[11.5px] tabular-nums text-t3">
          {status.poolUsed} of {status.poolLimit} watched X posts used
        </p>
      </Tile>
    </div>
  );
}

const groupWord = { x: "X account", rss: "RSS feed", website: "Website", github: "GitHub repository" } as const;

function SourceHeader({ source, mode, onClear }: { source: Source; mode: LabelMode; onClear: () => void }) {
  return (
    <section className={cn(lift, "mt-6 flex items-start gap-4 p-4")} style={liftStyle}>
      <SourceMark source={source} size={40} className={source.group === "x" ? "" : "rounded-[8px]"} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[17px] font-semibold text-t1">{mode === "name" ? source.name : source.handle}</span>
          <span className="text-[12.5px] text-t3">
            {groupWord[source.group]}, {mode === "name" ? source.handle : source.name}
          </span>
        </p>
        {source.focus ? <p className="mt-1 text-[13px] text-t2">{source.focus}</p> : null}
        {source.why ? <p className="mt-1.5 text-[13px] text-t3">Chosen because: {source.why}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-[12px] text-t2 transition-colors hover:bg-raised hover:text-t1"
        >
          <Close className="size-3" aria-hidden="true" /> All sources
        </button>
      </div>
    </section>
  );
}
