"use client";

import { useState } from "react";
import { PREVIEW_NOTE } from "@/next/council/data";
import { AlertsButton, Facts, ViewSwitch } from "@/next/council/chrome";
import { Checking, NewFlag, useArrival } from "@/next/council/live";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { DigestEntry, FeedStory } from "@/next/data/feed";
import { when, type View } from "@/next/council/data";
import {
  applyFilter,
  Brand,
  CheckStat,
  DigestChip,
  EmptySource,
  entriesFor,
  FailStat,
  FreeWeekStat,
  Handle,
  LiveStat,
  PoolStat,
  PublisherLine,
  Publishers,
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

// Direction A, the reading sheet. One lifted sheet on a lit page holds the stories as sections, newest first, each
// complete: headline, every fact with its citation, the picture when a source had one, the publishers in the
// margin. There is no top bar, no title row and no source rail: the controls and the status live in a dock under the
// sheet. The task: catch up on the beat by reading down one page, without opening anything.

const BASE = "/skilltest/sonnet-feed2/a";

export function Sheet({ view, theme }: { view: View; theme?: string }) {
  useThemeGuard();
  const [filter, setFilter] = useState<Filter>("all");
  const { pending } = useArrival();
  const list = applyFilter(entriesFor(view), filter);
  return (
    <div className="palette-council relative min-h-screen overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[720px]" style={{ background: "var(--stage-light)" }} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{ backgroundImage: "var(--dot-grid)", backgroundSize: "22px 22px" }}
      />
      <main className="relative z-10 mx-auto w-[min(1180px,calc(100%-32px))] pt-5 pb-[168px]">
        <div className="rounded-[18px] p-2.5" style={{ background: "var(--stage-frame)", boxShadow: "var(--window-shadow), var(--top-light)" }}>
        <article aria-label="Your feed" className="overflow-hidden rounded-[10px] bg-[var(--window)]" style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="flex h-12 items-center gap-3 border-b border-line bg-[var(--caution-soft)]/40 px-6">
            <Checking pending={pending} />
            <span className="ml-auto hidden rounded-full border border-line px-2.5 py-1 text-[11.5px] text-t3 md:inline">{PREVIEW_NOTE}</span>
          </div>
          {list.length === 0 && filter !== "all" ? (
            <EmptySource filter={filter} onReset={() => setFilter("all")} />
          ) : (
            list.map((e, i) =>
              i === 0 ? <Lead key={e.id} entry={e} /> : e.type === "story" ? <Section key={e.id} story={e.story} /> : <DigestSection key={e.id} digest={e.digest} />,
            )
          )}
        </article>
        </div>
      </main>
      <Dock view={view} theme={theme} filter={filter} setFilter={setFilter} pending={pending} />
    </div>
  );
}

function Lead({ entry }: { entry: Entry }) {
  if (entry.type === "digest") return <DigestSection digest={entry.digest} />;
  const { story } = entry;
  return (
    <section className="relative grid gap-8 border-b border-line px-6 py-8 lg:grid-cols-[minmax(0,1fr)_470px] lg:px-9">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StoryChips story={story} />
          <NewFlag />
          <span className="ml-auto font-mono text-[11px] tracking-wide text-t3">{storyTime(story)}</span>
        </div>
        <h1 className="mt-4 max-w-[560px] text-[32px] font-semibold leading-[1.12] tracking-[-0.025em] text-t1">{story.card.headline}</h1>
        <Facts story={story} className="mt-5 max-w-[580px]" />
        {story.card.image ? <Words story={story} max={1} className="mt-6 max-w-[580px]" /> : null}
      </div>
      <div className="min-w-0">
        {story.card.image ? (
          <StoryPic story={story} className="aspect-[4/3] w-full rounded-xl ring-1 ring-line-strong" />
        ) : (
          <Words story={story} />
        )}
        <ReportRows story={story} className="mt-3" />
      </div>
    </section>
  );
}

function Section({ story }: { story: FeedStory }) {
  return (
    <section className="grid gap-x-8 gap-y-4 border-b border-line px-6 py-7 last:border-b-0 lg:grid-cols-[148px_minmax(0,1fr)_340px] lg:px-9">
      <aside className="min-w-0 lg:pt-1">
        <p className="font-mono text-[11px] tracking-wide text-t3">{storyTime(story)}</p>
        <StoryChips story={story} className="mt-2.5 lg:flex-col lg:items-start" />
        <Publishers story={story} compact className="mt-4 hidden lg:block" />
      </aside>
      <div className="min-w-0">
        <h2 className="max-w-[560px] text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-t1">{story.card.headline}</h2>
        <Facts story={story} className="mt-3.5 max-w-[580px]" />
        <PublisherLine story={story} className="mt-4 lg:hidden" />
      </div>
      <div className="min-w-0">
        {story.card.image ? <StoryPic story={story} className="aspect-[16/10] w-full rounded-xl ring-1 ring-line-strong" /> : <Words story={story} />}
      </div>
    </section>
  );
}

function DigestSection({ digest }: { digest: DigestEntry }) {
  return (
    <section className="grid gap-x-8 gap-y-4 border-b border-line px-6 py-7 last:border-b-0 lg:grid-cols-[148px_minmax(0,1fr)_340px] lg:px-9">
      <aside className="min-w-0 lg:pt-1">
        <p className="font-mono text-[11px] tracking-wide text-t3">{when(digest.released_at, false)}</p>
        <DigestChip className="mt-2.5" />
      </aside>
      <div className="min-w-0">
        <h2 className="max-w-[560px] text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-t1">{digest.name}</h2>
        <p className="mt-1 text-[14.5px] text-t2">{digest.description}</p>
        <p className="mt-3.5 max-w-[580px] text-[14.5px] leading-[1.55] text-t2">{digest.detail}</p>
      </div>
      <ReleaseWell digest={digest} className="aspect-[16/10] w-full rounded-xl" />
    </section>
  );
}

function Dock({
  view,
  theme,
  filter,
  setFilter,
  pending,
}: {
  view: View;
  theme?: string;
  filter: Filter;
  setFilter: (f: Filter) => void;
  pending: number;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-4 pt-16" style={{ background: "linear-gradient(to top, var(--page) 55%, transparent)" }}>
      <div
        className="mx-auto w-[min(1180px,calc(100%-32px))] rounded-2xl border border-line-strong bg-[var(--window)]"
        style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
      >
        <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-1 border-b border-line px-5 py-1.5">
          <LiveStat />
          <CheckStat pending={pending} />
          <FailStat />
          <span className="ml-auto flex items-center gap-x-5">
            <FreeWeekStat className="hidden md:flex" />
            <PoolStat className="hidden lg:flex" />
            <WeekStat className="hidden xl:flex" height={22} />
          </span>
        </div>
        <div className="flex h-14 items-center gap-3 px-4">
          <Brand />
          <Handle className="hidden sm:flex" />
          <span className="mx-1 hidden h-5 w-px bg-line-strong sm:block" />
          <ViewSwitch base={BASE} view={view} theme={theme} />
          <SourceMenu view={view} value={filter} onChange={setFilter} />
          <AlertsButton className="ml-auto" />
          <ThemeToggle className="size-8 text-t3" />
        </div>
      </div>
    </div>
  );
}
