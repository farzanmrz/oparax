"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { PREVIEW_NOTE, weekTotal, when, type View } from "@/next/council/data";
import { AlertsButton, Facts, ViewSwitch } from "@/next/council/chrome";
import { Arrive, NewFlag } from "@/next/council/live";
import { ReportMark } from "@/next/council/marks";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { DigestEntry, FeedStory } from "@/next/data/feed";
import {
  applyFilter,
  Brand,
  CHECKING,
  CheckChip,
  DigestChip,
  EmptyBody,
  entriesFor,
  FailChip,
  FreeWeekBar,
  groupGlyph,
  GroupMarks,
  groupTone,
  Handle,
  LiveLine,
  PoolBar,
  ReportRows,
  ReleaseWell,
  roster,
  SRC,
  SRC_ORDER,
  StoryChips,
  StoryImage,
  storyTime,
  useHasImage,
  useThemeGuard,
  watched,
  watchedTotal,
  weekRange,
  WeekChart,
  Words,
  type Entry,
  type Filter,
  type Src,
} from "./kit";
import { status } from "@/next/council/data";

// Direction A, the margin edition. A column of separate lifted cards on the stage (the source cabinet, the status
// card, the chart) beside one lifted sheet that holds every story open, newest first: facts and citations on the
// left, the picture and the quoted words on the right. No top bar, no title row, no story list, no selected
// story. The task: read the whole beat in one scroll, or one source group, and trust it from the citations.

const BASE = "/skilltest/sonnet-feed3/a";
const card = { boxShadow: "var(--card-shadow), var(--top-light)" } as const;

export function Margin({ view, theme, source, empty }: { view: View; theme?: string; source: Filter; empty: boolean }) {
  useThemeGuard();
  const [filter, setFilter] = useState<Filter>(source);
  const list = empty ? [] : applyFilter(entriesFor(view), filter);
  return (
    <div className="palette-council relative min-h-screen overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[760px]" style={{ background: "var(--stage-light)" }} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{ backgroundImage: "var(--dot-grid)", backgroundSize: "22px 22px" }}
      />
      <main className="relative z-10 mx-auto flex w-[min(1368px,calc(100%-32px))] flex-col gap-4 py-5 lg:flex-row lg:items-start lg:gap-5 lg:py-6">
        {/* Left column: separate lifted cards, outside the sheet. */}
        <aside className="-m-3 w-auto shrink-0 space-y-3 p-3 lg:sticky lg:top-3 lg:max-h-[calc(100vh-24px)] lg:w-[276px] lg:overflow-y-auto lg:[scrollbar-width:none]">
          <Cabinet view={view} theme={theme} filter={filter} setFilter={setFilter} />
          <StatusStrip className="lg:hidden" />
          <StatusCard className="hidden lg:block" />
          <ChartCard className="hidden lg:block" />
          <p className="hidden px-1 text-center text-[11.5px] leading-snug text-t4 lg:block">{PREVIEW_NOTE}</p>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="rounded-[18px] p-2 lg:p-2.5" style={{ background: "var(--stage-frame)", boxShadow: "var(--window-shadow), var(--top-light)" }}>
            <article aria-label="Your stories" className="overflow-hidden rounded-[10px] bg-[var(--window)]" style={{ boxShadow: "var(--card-shadow)" }}>
              {list.length === 0 ? (
                <EmptyBody filter={filter} onReset={() => setFilter("all")} />
              ) : (
                list.map((e, i) => (
                  <Arrive key={e.id} index={i} className="border-b border-line last:border-b-0">
                    <Block entry={e} lead={i === 0} />
                  </Arrive>
                ))
              )}
            </article>
          </div>
          {/* Below the sheet on narrow screens: the rest of the status, so nothing delays the first story. */}
          <div className="mt-4 space-y-3 lg:hidden">
            <FreeWeekCard />
            <ChartCard />
            <p className="px-1 text-center text-[11.5px] leading-snug text-t4">{PREVIEW_NOTE}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ───────────── left column ─────────────

function Cabinet({ view, theme, filter, setFilter }: { view: View; theme?: string; filter: Filter; setFilter: (f: Filter) => void }) {
  return (
    <section aria-label="Account and sources" className="rounded-[10px] border border-line bg-[var(--window)] p-3.5" style={card}>
      <div className="flex items-center gap-2.5">
        <Brand />
        <Handle badge={false} className="min-w-0" />
        <ThemeToggle className="-my-1 -mr-1.5 ml-auto size-8 shrink-0 text-t3" />
      </div>
      <ViewSwitch base={BASE} view={view} theme={theme} className="mt-3.5 w-full [&>a]:flex-1 [&>a]:justify-center" />
      <nav aria-label="Sources" className="mt-3.5">
        {/* Wide: the index, one group per row with its real marks. */}
        <ul className="hidden space-y-0.5 lg:block">
          <li>
            <IndexRow active={filter === "all"} onClick={() => setFilter("all")}>
              <span className="grid size-[22px] place-items-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]">
                <Layers className="size-3.5" aria-hidden="true" />
              </span>
              <span className="text-[13px] font-medium text-t1">All sources</span>
              <span className="ml-auto text-[11.5px] tabular-nums text-t4">{watchedTotal}</span>
            </IndexRow>
          </li>
          {SRC_ORDER.map((g) => (
            <li key={g}>
              <IndexRow active={filter === g} onClick={() => setFilter(g)}>
                <span className={cn("grid size-[22px] place-items-center rounded-md", groupTone[g])}>{groupGlyph[g]}</span>
                <span className="font-mono text-[11px] tracking-[0.1em] text-t2">{SRC[g].label.toUpperCase()}</span>
                <span className="ml-auto text-[11.5px] tabular-nums text-t4">{watched[g]}</span>
              </IndexRow>
              <span className="mt-0.5 mb-1 block pl-[41px]">
                <GroupMarks src={g} size={18} max={g === "x" ? 6 : 7} />
              </span>
            </li>
          ))}
        </ul>
        {/* Narrow: the same groups as wrapping chips. */}
        <ul className="flex flex-wrap gap-1.5 lg:hidden">
          <li>
            <ChipButton active={filter === "all"} onClick={() => setFilter("all")}>
              <Layers className="size-3.5 text-[var(--brand)]" aria-hidden="true" />
              All sources
              <span className="tabular-nums text-t4">{watchedTotal}</span>
            </ChipButton>
          </li>
          {SRC_ORDER.map((g) => (
            <li key={g}>
              <ChipButton active={filter === g} onClick={() => setFilter(g)}>
                <span className={cn("grid size-[18px] place-items-center rounded", groupTone[g])}>{groupGlyph[g]}</span>
                {SRC[g].label}
                <span className="tabular-nums text-t4">{watched[g]}</span>
              </ChipButton>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

function IndexRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        active && "bg-[var(--brand-soft)] shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
      )}
    >
      {children}
    </button>
  );
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg border border-line bg-[var(--well)] px-2.5 text-[12.5px] text-t2 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        active && "border-[var(--brand-line)] bg-[var(--brand-soft)] text-t1",
      )}
    >
      {children}
    </button>
  );
}

function StatusCard({ className }: { className?: string }) {
  return (
    <section aria-label="Agent status" className={cn("space-y-3 rounded-[10px] border border-line bg-[var(--window)] p-3.5", className)} style={card}>
      <LiveLine />
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-line bg-[var(--well)] px-3 py-2">
          <p className="font-mono text-[10.5px] tracking-[0.12em] text-t4">CHECKING</p>
          <p className="mt-1 flex items-center gap-2 text-[22px] font-semibold leading-none text-t1">
            <StatusMark status="running" size={17} color="var(--caution)" strokeWidth={2} />
            {CHECKING}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-[var(--well)] px-3 py-2">
          <p className="font-mono text-[10.5px] tracking-[0.12em] text-t4">FAILED</p>
          <p className="mt-1 flex items-center gap-2 text-[22px] font-semibold leading-none text-t1">
            <span aria-hidden="true" className="size-2 rounded-full bg-[var(--error)]" />
            {status.failed}
          </p>
        </div>
      </div>
      <div className="border-t border-line pt-3">
        <p className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] tracking-[0.12em] text-t4">ALERTS ON X</span>
          <span className="flex items-center gap-2 text-[12.5px] text-t3">
            <span aria-hidden="true" className="size-2 rounded-full border border-t4" />
            Not connected
          </span>
        </p>
        <AlertsButton full className="mt-2.5 h-9" />
      </div>
      <div className="space-y-3 border-t border-line pt-3">
        <FreeWeekBar stacked />
        <PoolBar stacked />
      </div>
    </section>
  );
}

function FreeWeekCard() {
  return (
    <section className="space-y-3.5 rounded-[10px] border border-line bg-[var(--window)] p-3.5" style={card}>
      <FreeWeekBar stacked />
      <PoolBar stacked />
    </section>
  );
}

/** Narrow screens: one compact line of status above the first story. */
function StatusStrip({ className }: { className?: string }) {
  return (
    <section aria-label="Agent status" className={cn("flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[10px] border border-line bg-[var(--window)] px-3.5 py-3", className)} style={card}>
      <LiveLine short />
      <CheckChip />
      <FailChip />
      <AlertsButton className="ml-auto" />
    </section>
  );
}

function ChartCard({ className }: { className?: string }) {
  return (
    <section aria-label="Reports published" className={cn("rounded-[10px] border border-line bg-[var(--window)] p-3.5", className)} style={card}>
      <p className="font-mono text-[10.5px] tracking-[0.12em] text-t4">REPORTS PUBLISHED</p>
      <div className="mt-2 flex items-end gap-4">
        <p className="shrink-0">
          <span className="block text-[26px] font-semibold leading-none text-t1">{weekTotal}</span>
          <span className="mt-1 block text-[12px] text-t3">in 7 days</span>
        </p>
        <WeekChart height={42} className="min-w-0 flex-1" />
      </div>
      <p className="mt-2.5 flex flex-wrap justify-between gap-x-2 text-[11.5px] leading-snug text-t3">
        <span>{weekRange}</span>
        <span className="text-t4">by publication date</span>
      </p>
    </section>
  );
}

// ───────────── the sheet ─────────────

function Block({ entry, lead }: { entry: Entry; lead: boolean }) {
  return entry.type === "story" ? <StoryBlock entry={entry} story={entry.story} lead={lead} /> : <DigestBlock digest={entry.digest} entry={entry} />;
}

const blockGrid =
  "grid gap-x-12 gap-y-5 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_370px] lg:px-10 lg:py-9";

function StoryBlock({ entry, story, lead }: { entry: Entry; story: FeedStory; lead: boolean }) {
  const img = useHasImage(entry);
  return (
    <section className={blockGrid}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StoryChips story={story} />
          {lead ? <NewFlag /> : null}
          <span className="ml-auto font-mono text-[11px] tracking-wide text-t3">{storyTime(story)}</span>
        </div>
        {lead ? (
          <h1 className="mt-4 max-w-[600px] text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-t1 lg:text-[32px]">{story.card.headline}</h1>
        ) : (
          <h2 className="mt-3.5 max-w-[620px] text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-t1">{story.card.headline}</h2>
        )}
        <Facts story={story} className="mt-5 max-w-[640px] space-y-3 [&>li]:text-[15.5px] [&>li]:leading-[1.6]" />
        <ReportRows story={story} className="mt-6 max-w-[640px]" />
      </div>
      <div className="min-w-0 space-y-4">
        {img.has && img.src ? <StoryImage src={img.src} onBad={img.setBad} className="w-full rounded-xl ring-1 ring-line-strong" /> : null}
        <Words story={story} />
      </div>
    </section>
  );
}

function DigestBlock({ digest, entry }: { digest: DigestEntry; entry: Entry }) {
  const [repo, tag] = digest.name.split(" ");
  return (
    <section className={blockGrid}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <DigestChip />
          <span className="ml-auto font-mono text-[11px] tracking-wide text-t3">{when(entry.at)}</span>
        </div>
        <h2 className="mt-3.5 max-w-[600px] text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-t1">
          {repo} <span className="font-mono text-[20px]">{tag}</span>
        </h2>
        <p className="mt-2 text-[14.5px] text-t2">{digest.description}</p>
        <ul className="mt-4 max-w-[620px] space-y-2 text-[14.5px] leading-[1.55] text-t2">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-[0.62em] size-1 shrink-0 rounded-full bg-t4" />
            {digest.detail}
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-[0.62em] size-1 shrink-0 rounded-full bg-t4" />
            Released {when(digest.released_at, false)}.
          </li>
        </ul>
        <ul className="mt-5">
          <li className="flex items-center gap-2 text-[12.5px] leading-tight">
            <span className="grid size-[18px] place-items-center rounded-full bg-[var(--kind-github-soft)] text-[var(--kind-github)]">
              <span className="size-3">{groupGlyph.github}</span>
            </span>
            <span>
              <span className="block font-medium text-t1">{repo}</span>
              <span className="block text-[11.5px] text-t3">GitHub · github.com</span>
            </span>
          </li>
        </ul>
      </div>
      <div className="min-w-0">
        <ReleaseWell digest={digest} className="aspect-[16/10] w-full rounded-xl" />
      </div>
    </section>
  );
}
