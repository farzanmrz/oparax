"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { PREVIEW_NOTE, when, type View } from "@/next/council/data";
import { AlertsButton, Facts, ViewSwitch } from "@/next/council/chrome";
import { Arrive } from "@/next/council/live";
import { ReportMark } from "@/next/council/marks";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { DigestEntry, FeedStory } from "@/next/data/feed";
import {
  applyFilter,
  Brand,
  CheckChip,
  dayKey,
  dayLabel,
  DigestChip,
  EmptyBody,
  entriesFor,
  FailChip,
  FreeWeekBar,
  groupGlyph,
  GitHubMarkSmall,
  groupTone,
  Handle,
  LiveLine,
  PoolBar,
  Publishers,
  ReleaseWell,
  SRC,
  SRC_ORDER,
  StoryChips,
  StoryImage,
  storyTime,
  useHasImage,
  useThemeGuard,
  watched,
  watchedTotal,
  WeekInline,
  Words,
  type Entry,
  type Filter,
} from "./kit";

// Direction B, day plates. No side rails: one lifted utility shelf across the top (account, view, the source
// groups, status, alerts, the small chart), then a stack of equal-width lifted day plates, newest day first.
// Each plate holds that day's stories complete: two entries sit in two equal columns, one entry is one full-width
// block, three or more stack by timestamp. Heights follow the content. The task: read from today backward.

const BASE = "/skilltest/sonnet-feed3/b";
const card = { boxShadow: "var(--card-shadow), var(--top-light)" } as const;

type Day = { key: string; label: string; entries: Entry[] };

function groupByDay(list: Entry[]): Day[] {
  const days: Day[] = [];
  for (const e of list) {
    const key = dayKey(e.at);
    const last = days[days.length - 1];
    if (last && last.key === key) last.entries.push(e);
    else days.push({ key, label: dayLabel(e.at), entries: [e] });
  }
  return days;
}

export function Plates({ view, theme, source, empty }: { view: View; theme?: string; source: Filter; empty: boolean }) {
  useThemeGuard();
  const [filter, setFilter] = useState<Filter>(source);
  const list = empty ? [] : applyFilter(entriesFor(view), filter);
  const days = groupByDay(list);
  return (
    <div className="palette-council relative min-h-screen overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[760px]" style={{ background: "var(--stage-light)" }} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{ backgroundImage: "var(--dot-grid)", backgroundSize: "22px 22px" }}
      />
      <main className="relative z-10 mx-auto w-[min(1180px,calc(100%-32px))] space-y-5 py-5 lg:py-6">
        <Shelf view={view} theme={theme} filter={filter} setFilter={setFilter} />
        {days.length === 0 ? (
          <PlateFrame label={filter === "all" ? "NO STORIES YET" : `NO STORIES FROM ${SRC[filter].label.toUpperCase()}`}>
            <EmptyBody filter={filter} onReset={() => setFilter("all")} />
          </PlateFrame>
        ) : (
          days.map((d, i) => (
            <Arrive key={d.key} index={i}>
              <PlateFrame label={d.label.toUpperCase()} marks={d.entries}>
                <PlateBody entries={d.entries} />
              </PlateFrame>
            </Arrive>
          ))
        )}
        {/* Narrow screens: the rest of the status after the last plate, so the first story starts early. */}
        <section className="space-y-3 rounded-[14px] border border-line bg-[var(--window)] p-4 md:hidden" style={card}>
          <FreeWeekBar stacked />
          <PoolBar stacked />
          <WeekInline className="whitespace-normal" />
          <p className="text-[11.5px] text-t4">{PREVIEW_NOTE}</p>
        </section>
      </main>
    </div>
  );
}

// ───────────── the shelf ─────────────

function Shelf({ view, theme, filter, setFilter }: { view: View; theme?: string; filter: Filter; setFilter: (f: Filter) => void }) {
  return (
    <header className="overflow-hidden rounded-[14px] border border-line bg-[var(--window)]" style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-2.5">
        <Brand />
        <Handle />
        <ThemeToggle className="ml-auto size-8 text-t3 md:hidden" />
        <ViewSwitch base={BASE} view={view} theme={theme} />
        <nav aria-label="Sources" className="flex flex-wrap gap-0.5 rounded-lg border border-line bg-[var(--well)] p-0.5">
          <Segment active={filter === "all"} onClick={() => setFilter("all")}>
            <Layers className="size-3.5 text-[var(--brand)]" aria-hidden="true" />
            All sources
            <span className="tabular-nums text-t4">{watchedTotal}</span>
          </Segment>
          {SRC_ORDER.map((g) => (
            <Segment key={g} active={filter === g} onClick={() => setFilter(g)}>
              <span className={cn("grid size-[18px] place-items-center rounded", groupTone[g])}>{groupGlyph[g]}</span>
              {SRC[g].label}
              <span className="tabular-nums text-t4">{watched[g]}</span>
            </Segment>
          ))}
        </nav>
        <AlertsButton className="md:ml-auto" />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line bg-[var(--rail)] px-4 py-2.5">
        <LiveLine short className="md:hidden" />
        <LiveLine className="hidden md:flex" />
        <CheckChip />
        <FailChip />
        <span className="ml-auto hidden flex-wrap items-center gap-x-6 gap-y-2 md:flex">
          <FreeWeekBar />
          <PoolBar />
        </span>
      </div>
      <div className="hidden flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-t border-line px-4 py-2 md:flex">
        <WeekInline />
        <p className="flex items-center gap-2 text-[11.5px] text-t4">
          {PREVIEW_NOTE}
          <ThemeToggle className="-my-1.5 -mr-1.5 size-8 text-t3" />
        </p>
      </div>
    </header>
  );
}

function Segment({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md px-1.5 text-[12.5px] text-t2 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        active && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
      )}
    >
      {children}
    </button>
  );
}

// ───────────── plates ─────────────

function PlateFrame({ label, marks, children }: { label: string; marks?: Entry[]; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="rounded-[18px] p-1.5 sm:p-2" style={{ background: "var(--stage-frame)", boxShadow: "var(--window-shadow), var(--top-light)" }}>
      <div className="overflow-hidden rounded-[12px] bg-[var(--window)]" style={{ boxShadow: "var(--card-shadow)" }}>
        <header className="flex items-center gap-3 border-b border-line bg-[var(--rail)] px-5 py-3 sm:px-7">
          <h2 className="font-mono text-[12px] font-semibold tracking-[0.14em] text-t1">{label}</h2>
          {marks ? <PlateMarks entries={marks} /> : null}
        </header>
        {children}
      </div>
    </section>
  );
}

/** The identity marks of everything that arrived that day, overlapping. */
function PlateMarks({ entries }: { entries: Entry[] }) {
  const items = entries.flatMap((e) => (e.type === "story" ? e.story.items : []));
  const unique = items.filter((it, i) => items.findIndex((x) => x.source_id === it.source_id) === i).slice(0, 6);
  const hasDigest = entries.some((e) => e.type === "digest");
  return (
    <span className="ml-auto flex items-center">
      {unique.map((item, i) => (
        <span key={item.id} className="rounded-full ring-2 ring-[var(--rail)]" style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 10 - i, borderRadius: item.kind === "post" ? 999 : 6 }}>
          <ReportMark item={item} size={20} className={item.kind === "post" ? "" : "rounded-[5px]"} />
        </span>
      ))}
      {hasDigest ? (
        <span className="rounded-full ring-2 ring-[var(--rail)]" style={{ marginLeft: unique.length ? -6 : 0 }}>
          <GitHubMarkSmall size={20} />
        </span>
      ) : null}
    </span>
  );
}

function PlateBody({ entries }: { entries: Entry[] }) {
  if (entries.length === 2)
    return (
      <div className="grid md:grid-cols-2 md:divide-x md:divide-line max-md:divide-y max-md:divide-line">
        {entries.map((e) => (
          <Column key={e.id} entry={e} />
        ))}
      </div>
    );
  return (
    <div className="divide-y divide-line">
      {entries.map((e) => (
        <Row key={e.id} entry={e} />
      ))}
    </div>
  );
}

function Meta({ entry }: { entry: Entry }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {entry.type === "story" ? <StoryChips story={entry.story} /> : <DigestChip />}
      <span className="ml-auto font-mono text-[11px] tracking-wide text-t3">{entry.type === "story" ? storyTime(entry.story) : when(entry.at)}</span>
    </div>
  );
}

function Heading({ entry, className }: { entry: Entry; className?: string }) {
  if (entry.type === "story") return <h3 className={cn("text-[21px] font-semibold leading-[1.2] tracking-[-0.02em] text-t1", className)}>{entry.story.card.headline}</h3>;
  const [repo, tag] = entry.digest.name.split(" ");
  return (
    <h3 className={cn("text-[21px] font-semibold leading-[1.2] tracking-[-0.02em] text-t1", className)}>
      {repo} <span className="font-mono text-[19px]">{tag}</span>
    </h3>
  );
}

/** The facts of a story, or the stored detail of a release; never shortened. */
function Body({ entry, className }: { entry: Entry; className?: string }) {
  if (entry.type === "story") return <Facts story={entry.story} className={className} />;
  const d: DigestEntry = entry.digest;
  return (
    <div className={className}>
      <p className="text-[14.5px] text-t2">{d.description}</p>
      <ul className="mt-3 space-y-2 text-[14.5px] leading-[1.55] text-t2">
        <li className="flex gap-2.5">
          <span aria-hidden="true" className="mt-[0.62em] size-1 shrink-0 rounded-full bg-t4" />
          {d.detail}
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden="true" className="mt-[0.62em] size-1 shrink-0 rounded-full bg-t4" />
          Released {when(d.released_at, false)}.
        </li>
      </ul>
    </div>
  );
}

function Credits({ entry, className }: { entry: Entry; className?: string }) {
  if (entry.type === "story") return <Publishers story={entry.story} className={className} />;
  return (
    <p className={cn("flex items-center gap-2 text-[12.5px]", className)}>
      <GitHubMarkSmall size={18} />
      <span>
        <span className="block font-medium text-t1">{entry.digest.name.split(" ")[0]}</span>
        <span className="block text-[11.5px] text-t3">GitHub · github.com</span>
      </span>
    </p>
  );
}

function Media({ entry, img, aspect, fit }: { entry: Entry; img: ReturnType<typeof useHasImage>; aspect: string; fit: "adaptive" | "fixed" }) {
  if (entry.type === "digest") return <ReleaseWell digest={entry.digest} className={cn("w-full rounded-xl", aspect)} />;
  if (!img.has || !img.src) return null;
  return <StoryImage src={img.src} onBad={img.setBad} fit={fit} ratio={2} className="w-full rounded-xl ring-1 ring-line-strong" />;
}

/** Two entries share a plate as two equal columns: picture on top, then the whole story. On narrow screens the headline comes first. */
function Column({ entry }: { entry: Entry }) {
  const img = useHasImage(entry);
  const story: FeedStory | null = entry.type === "story" ? entry.story : null;
  return (
    <article className="flex min-w-0 flex-col gap-4 px-5 py-6 sm:px-7 sm:py-7">
      <div className="order-3 md:order-1">
        {img.has ? <Media entry={entry} img={img} aspect="aspect-[2/1]" fit="fixed" /> : story ? <Words story={story} /> : null}
      </div>
      <div className="order-1 md:order-2 md:mt-1">
        <Meta entry={entry} />
      </div>
      <Heading entry={entry} className="order-2 -mt-1 md:order-3" />
      <Body entry={entry} className="order-4" />
      {img.has && story ? <Words story={story} className="order-5 mt-1" /> : null}
      <Credits entry={entry} className="order-6 mt-1" />
    </article>
  );
}

/** One entry is one full-width block: picture left, the whole story right. Three or more stack as rows. */
function Row({ entry }: { entry: Entry }) {
  const img = useHasImage(entry);
  const story: FeedStory | null = entry.type === "story" ? entry.story : null;
  return (
    <article className="grid gap-x-9 gap-y-5 px-5 py-7 sm:px-8 md:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">{img.has ? <Media entry={entry} img={img} aspect="aspect-[4/3]" fit="adaptive" /> : story ? <Words story={story} /> : null}</div>
      <div className="min-w-0">
        <Meta entry={entry} />
        <Heading entry={entry} className="mt-3.5 max-w-[620px] text-[22px]" />
        <Body entry={entry} className="mt-4 max-w-[640px]" />
        {img.has && story ? <Words story={story} className="mt-5 max-w-[640px]" /> : null}
        <Credits entry={entry} className="mt-5" />
      </div>
    </article>
  );
}
