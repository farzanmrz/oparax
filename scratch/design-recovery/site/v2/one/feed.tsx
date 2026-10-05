"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { X as Close } from "lucide-react";
import { cn } from "@/lib/utils";
import { lift, liftStyle, ViewSwitch } from "@/v2/deck/chrome";
import {
  sources,
  status,
  stories,
  storiesThisWeek,
  storyHasSource,
  week,
  type FeedStory,
  type View,
} from "@/v2/deck/data";
import { Arrive, useArrival } from "@/v2/deck/live";
import { Segments, WeekBars } from "@/v2/deck/marks";
import { BASE, StoryStack, type LabelMode } from "./card";
import { Shell } from "./rail";

// The One feed: the Deck feed (v2/deck/feed.tsx), copied, with the owner's changes only: a 1400px column; one
// header row (Feed at the left; Clustered and Direct, then the Deck's This week and Free week as two compact lifted
// tiles at the right); the DM line as a thin ribbon under it; no checking row; one card per story with no plates, no
// kind chip and no publisher parentheses; the source panel (rail.tsx) floats over the page and filters it.

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
  initialPanel = false,
  settled,
}: {
  initialView: View;
  initialSource: string | null;
  initialMode: LabelMode;
  initialPanel?: boolean;
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
      header={
        <Header
          title="Feed"
          actions={
            <>
              <ViewSwitch view={view} onChange={setView} />
              <WeekTile />
              <FreeWeekTile />
            </>
          }
        />
      }
    >
      <main className="min-w-0 pb-20">
        <Banner />

        <StackColumns list={selected && list.length === 0 ? all : list} mode={mode} freshId={selected ? null : freshId} visible={visible} />
      </main>
    </Shell>
  );
}

/** The page's one header row: the title at the left, the page's objects at the right end. */
function Header({ title, actions }: { title: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="relative z-20 flex flex-wrap items-center gap-x-5 gap-y-3">
      <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">{title}</h1>
      <div className="ml-auto flex flex-wrap items-center gap-3">{actions}</div>
    </header>
  );
}

/** A compact lifted tile for the header row: as tall as the switch row plus padding. */
const headerTile = cn(lift, "flex h-[52px] items-center gap-3.5 rounded-[10px] px-3.5");

/** The Deck's This week tile, compact: the story count and the day marks. */
function WeekTile() {
  return (
    <section aria-label="This week" className={headerTile} style={liftStyle}>
      <div className="leading-none">
        <p className="text-[11px] font-medium text-t3">This week</p>
        <p className="mt-1.5 flex items-baseline gap-1">
          <span className="text-[17px] leading-none font-semibold tabular-nums text-t1">{storiesThisWeek}</span>
          <span className="text-[12px] text-t2">stories</span>
        </p>
      </div>
      <WeekBars week={week} height={26} className="w-[92px]" />
    </section>
  );
}

/** The Deck's Free week tile, compact: days left, the day meter and the watched-posts line. */
function FreeWeekTile() {
  return (
    <section aria-label="Free week" className={headerTile} style={liftStyle}>
      <div className="leading-none">
        <p className="text-[11px] font-medium text-t3">Free week</p>
        <p className="mt-1.5 flex items-baseline gap-1">
          <span className="text-[17px] leading-none font-semibold tabular-nums text-t1">{status.daysLeft}</span>
          <span className="text-[12px] text-t2">days left</span>
        </p>
      </div>
      <div className="min-w-[132px]">
        <Segments total={status.trialDays} filled={status.daysLeft} />
        <p className="mt-1.5 text-[10.5px] leading-none tabular-nums whitespace-nowrap text-t3">
          {status.poolUsed} of {status.poolLimit} watched X posts used
        </p>
      </div>
    </section>
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
  const two = useMemo(() => toColumns(list, 3), [list]);
  const render = (col: FeedStory[], ci: number) => (
    <div key={ci} className="flex min-w-0 flex-col gap-6">
      <AnimatePresence initial={false}>
        {col.map((s, i) =>
          visible(s) ? (
            <Arrive key={s.id} index={ci + i * 3}>
              <StoryStack story={s} mode={mode} fresh={s.id === freshId} imageHeight={IMAGE_H} />
            </Arrive>
          ) : null,
        )}
      </AnimatePresence>
    </div>
  );
  return (
    <>
      <div className="mt-6 hidden items-start gap-5 md:grid md:grid-cols-3">{two.map((col, ci) => render(col, ci))}</div>
      <div className="mt-6 grid gap-6 md:hidden">{render(list, 0)}</div>
    </>
  );
}

/** The DM line as a thin ribbon under the header (owner, Oct 4: "The banner itself looks good, but maybe it can be
 * some other UI than the cards"): a hairline bar with no shadow, dismissable, remembered. */
const DISMISS_KEY = "oparax-one-dm-line";
function Banner() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setGone(true);
    } catch {}
  }, []);
  if (gone) return null;
  const dismiss = () => {
    setGone(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };
  return (
    <div role="region" aria-label="Notifications" className="mb-5 flex h-9 items-center gap-3 rounded-[8px] border border-line bg-[var(--raised)] pr-1.5 pl-3.5 text-[13px]">
      <p className="text-t2">Oparax can alert you on X DMs.</p>
      <Link
        href={`${BASE}/notifications`}
        className="rounded-sm font-medium text-[var(--brand)] underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Turn on notifications
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-auto grid size-6 place-items-center rounded-md text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Close className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
