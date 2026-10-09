"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowUpDown, Layers, Rows3, X as Close } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertsButton, AlertsPreviewNote, AppFrame, Label, ShowProvider, TopBar, useShow } from "./chrome";
import {
  groups,
  PREVIEW_NOTE,
  sourceById,
  sources,
  status,
  storiesFrom,
  storyCounts,
  week,
  type Source,
  type View,
} from "./data";
import { Arrive, useArrival } from "./live";
import { Dot, KindBars, Segments, SourceMark } from "./marks";
import { StoryBlock } from "./story";

// Window feed, v2 (fixes from the owner's October 2 notes). The lit stage and the lifted app window stay; the
// story list and the one open story merge into a single reading column, so every story's facts are readable on
// arrival. The left rail is the source list, grouped by what each source is, and it filters the column. The right
// column keeps only the tiles a person acts on.

export function WindowFeed({ view, theme, source }: { view: View; theme?: string; source?: string | null }) {
  const initial = source && sourceById.has(source) ? source : null;
  const [selected, setSelected] = useState<string | null>(initial);
  return (
    <ShowProvider>
      <div className="palette-council flex min-h-svh flex-col">
        <AppFrame bar={<TopBar note={`${PREVIEW_NOTE}. The newest story replays its arrival.`} />} className="flex min-h-[760px] flex-col lg:flex-row">
          <Rail view={view} selected={selected} onSelect={setSelected} />
          <Column view={view} theme={theme} selected={selected} onClear={() => setSelected(null)} />
          <StatusColumn />
        </AppFrame>
      </div>
    </ShowProvider>
  );
}

/* ───────────── Source rail ───────────── */

function Rail({ view, selected, onSelect }: { view: View; selected: string | null; onSelect: (id: string | null) => void }) {
  const counts = storyCounts(view);
  return (
    <aside aria-label="Sources" className="w-full shrink-0 border-b lg:w-[228px] lg:border-b-0 lg:border-r border-line bg-[var(--rail)]">
      <div className="sticky top-0 max-h-svh overflow-y-auto pb-6">
        <ul className="px-2 pt-3">
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-pressed={selected === null}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] text-t2 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
                selected === null && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
              )}
            >
              {view === "clustered" ? (
                <Layers className={cn("size-3.5 text-t3", selected === null && "text-[var(--brand)]")} />
              ) : (
                <Rows3 className={cn("size-3.5 text-t3", selected === null && "text-[var(--brand)]")} />
              )}
              All sources
            </button>
          </li>
        </ul>
        {groups.map((g) => {
          const list = sources.filter((s) => s.group === g.id);
          return (
            <section key={g.id} aria-label={g.label} className="pt-4">
              <Label className="px-4 pb-1.5">{g.label}</Label>
              <ul className="px-2">
                {list.map((s) => (
                  <SourceRow key={s.id} source={s} count={counts.get(s.id)} on={selected === s.id} onSelect={() => onSelect(selected === s.id ? null : s.id)} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function SourceRow({ source, count, on, onSelect }: { source: Source; count?: number; on: boolean; onSelect: () => void }) {
  const { show } = useShow();
  const primary = show === "name" ? source.name : source.handle;
  const other = show === "name" ? source.handle : source.name;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={on}
        title={`${other}${source.why ? `: ${source.why}` : source.focus ? `: ${source.focus}` : ""}`}
        className={cn(
          "flex h-[28px] w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] text-t2 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
          on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
        )}
      >
        <SourceMark source={source} size={15} />
        <span className="min-w-0 flex-1 break-all leading-tight">{primary}</span>
        {count ? (
          <span className="shrink-0 text-[11px] tabular-nums text-t3" title={`${count} ${count === 1 ? "story" : "stories"}`}>
            {count}
          </span>
        ) : null}
      </button>
    </li>
  );
}

/* ───────────── Reading column ───────────── */

function Column({ view, theme, selected, onClear }: { view: View; theme?: string; selected: string | null; onClear: () => void }) {
  const all = storiesFrom(view, null);
  const list = storiesFrom(view, selected);
  const { arrived } = useArrival();
  const newestId = all[0].id;
  const visible = arrived ? list : list.filter((s) => s.id !== newestId);
  const src = selected ? sourceById.get(selected) : null;
  return (
    <section aria-label={view === "clustered" ? "Stories" : "Articles, posts and releases"} className="@container min-w-0 flex-1">
      <div className="sticky top-0 z-10 border-b border-line bg-[var(--window)]/95 backdrop-blur">
        <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-6 py-2.5">
          <h1 className="mr-1 text-[22px] leading-none font-semibold tracking-[-0.02em] text-t1">Your Feed</h1>
          {src ? <FilterChip source={src} onClear={onClear} /> : null}
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-t3">
            <ArrowUpDown className="size-3" aria-hidden="true" /> Newest first
          </span>
        </div>
      </div>
      {visible.length === 0 && src ? <Empty source={src} onClear={onClear} /> : null}
      <ol>
        <AnimatePresence initial={false}>
          {(visible.length === 0 && src ? (arrived ? all : all.slice(1)) : visible).map((s, i, arr) => (
            <Arrive key={s.id} as="li" index={i} fresh={arrived && s.id === newestId}>
              <StoryBlock story={s} fresh={arrived && s.id === newestId} last={i === arr.length - 1} />
            </Arrive>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}

function FilterChip({ source, onClear }: { source: Source; onClear: () => void }) {
  const { show } = useShow();
  return (
    <span className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] pr-1 pl-2 text-[12px] text-t1">
      <SourceMark source={source} size={14} />
      from {show === "name" ? source.name : source.handle}
      <button type="button" onClick={onClear} aria-label="Show all sources" className="grid size-5 place-items-center rounded-full text-t3 hover:bg-raised hover:text-t1">
        <Close className="size-3" />
      </button>
    </span>
  );
}

function Empty({ source, onClear }: { source: Source; onClear: () => void }) {
  const group = source.group;
  const what = group === "x" ? "posts" : group === "github" ? "releases" : group === "producthunt" ? "launches" : "articles";
  return (
    <div className="px-6 py-8">
      <div className="flex items-start gap-4 rounded-xl border border-line bg-[var(--raised)] p-5" style={{ boxShadow: "var(--top-light)" }}>
        <SourceMark source={source} size={36} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-t1">
            {source.name} <span className="ml-1 font-normal text-t3">{source.handle}</span>
          </p>
          <p className="mt-1 text-[13.5px] text-t2">{source.why ?? source.focus}</p>
          <p className="mt-3 text-[13.5px] text-t3">
            No {what} from {source.name} matched your sentence in this preview yet. Your agent keeps checking.
          </p>
          <button type="button" onClick={onClear} className="mt-4 text-[13px] font-medium text-[var(--brand)] hover:underline">
            Show stories from all sources
          </button>
        </div>
      </div>
      <p className="mt-8 font-mono text-[10.5px] font-medium tracking-[0.12em] text-t3 uppercase">Newest from all your sources</p>
    </div>
  );
}

/* ───────────── Status column ───────────── */

function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cn("border-b border-line px-4 py-4", className)}>
      <p className="text-[11.5px] font-medium text-t3">{label}</p>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function watchingLine() {
  const n = (g: Source["group"]) => sources.filter((s) => s.group === g).length;
  const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  return `${plural(n("x"), "Twitter account", "Twitter accounts")}, ${plural(n("rss"), "RSS feed", "RSS feeds")}, ${plural(n("website"), "website", "websites")}, ${plural(n("github"), "GitHub repository", "GitHub repositories")} and Product Hunt`;
}

function StatusColumn() {
  return (
    <aside aria-label="Your agent" className="w-full shrink-0 border-t lg:w-[236px] lg:border-t-0 lg:border-l border-line bg-[var(--rail)]">
      <div className="sticky top-0">
        <Tile label="Alerts on Twitter">
          <p className="flex items-center gap-2 text-[13px] text-t2">
            <Dot tone="idle" /> Not connected
          </p>
          <AlertsButton full className="mt-2.5" />
          <AlertsPreviewNote className="mt-2" />
        </Tile>
        <Tile label="Agent">
          <p className="flex items-center gap-2 text-[13px] font-medium">
            <Dot tone="ok" pulse /> <span className="text-[var(--ok)]">Live</span>
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-t2">Watching {watchingLine()}</p>
          <p className="mt-2.5 flex items-center gap-2 text-[12.5px] text-t2">
            <Dot tone="error" />
            <span>
              Could not process <span className="font-semibold text-[var(--error)] tabular-nums">{status.failed}</span> item
            </span>
          </p>
        </Tile>
        <Tile label="Free week">
          <p className="text-[13px] text-t1">
            <span className="font-semibold tabular-nums">{status.daysLeft}</span> days left
          </p>
          <div className="mt-2">
            <Segments total={status.trialDays} filled={status.daysLeft} />
          </div>
          <p className="mt-2 text-[12px] text-t3">Plans from $5 a month.</p>
        </Tile>
        <Tile label="Watched Twitter posts">
          <p className="text-[13px] tabular-nums text-t1">
            {status.poolUsed} <span className="text-t3">of {status.poolLimit} in your free week</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-strong">
            <span className="block h-full rounded-full bg-[var(--brand)]" style={{ width: `${(status.poolUsed / status.poolLimit) * 100}%` }} />
          </div>
        </Tile>
        <Tile label="Published this week" className="border-b-0">
          <p className="text-[12.5px] text-t2">Articles and posts per day, by publication date</p>
          <KindBars week={week} height={46} className="mt-3" />
          <p className="mt-1.5 flex justify-between text-[11px] tabular-nums text-t3">
            <span>{week[0].label}</span>
            <span>{week[week.length - 1].label}</span>
          </p>
        </Tile>
      </div>
    </aside>
  );
}
