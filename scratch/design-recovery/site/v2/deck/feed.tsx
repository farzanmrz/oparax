"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { CircleAlert, Layers, X as Close } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertsButton, Header, lift, liftStyle, Stage, Tile } from "./chrome";
import {
  groups,
  itemsFrom,
  newestItem,
  PREVIEW_NOTE,
  sourceCount,
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
} from "./data";
import { Arrive, useArrival } from "./live";
import { Dot, GroupGlyph, GroupLabel, Segments, SourceMark, WeekBars } from "./marks";
import { StoryStack, PEEK, type LabelMode } from "./stack";

// Deck v2 feed. The accepted Deck's composition (a slim row of tiles, then stories as physical stacks on a lit
// page) with the owner's fixes: a source list on the left where Twitter accounts, RSS feeds, websites and GitHub sit as
// equal sources under small capitalized headers, each one selectable, shown by name (no name or handle switch, and
// the clustered view is the only view, owner Oct 8); every fact
// readable on arrival; counts only where they tell the person something, each with its unit, said once.

const IMAGE_H = 172;

function estimate(s: FeedStory) {
  return (s.card.image ? IMAGE_H : 0) + 128 + s.card.facts.length * 46 + Math.min(s.items.length - 1, 2) * PEEK + 24;
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

export function DeckFeed({
  initialSource,
  settled,
}: {
  initialView?: View;
  initialSource: string | null;
  initialMode?: LabelMode;
  settled: boolean;
}) {
  const view: View = "clustered";
  const [sourceId, setSourceId] = useState<string | null>(sources.some((s) => s.id === initialSource) ? initialSource : null);
  const mode: LabelMode = "name";
  const { arrived } = useArrival(settled);

  // Keep the URL in step so each state has an address (and survives a reload).
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    q.delete("view");
    if (sourceId) q.set("source", sourceId);
    else q.delete("source");
    q.delete("label");
    history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
  }, [sourceId]);

  const all = stories[view];
  const selected = sources.find((s) => s.id === sourceId) ?? null;
  const list = selected ? all.filter((s) => storyHasSource(s, selected.id)) : all;
  const freshId = all[0].id;
  // The newest story is on the page from the start; only its New marker and edge light replay its arrival.
  const visible = (_: FeedStory) => true;

  return (
    <Stage>
      <main className="relative mx-auto w-full max-w-[1400px] px-4 pt-8 pb-20 lg:px-8">
        <Header
          title="Your Feed"
          actions={<AlertsButton />}
          sub={
            <p className="text-[13.5px] text-t3">
              Articles and posts about the same event, stacked into one story.
            </p>
          }
          note={`${PREVIEW_NOTE} The newest story's arrival is a replay.`}
        />

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[264px_minmax(0,1fr)]">
          <SourceList selected={sourceId} onSelect={setSourceId} mode={mode} />
          <SourceStrip selected={sourceId} onSelect={setSourceId} mode={mode} />

          <div className="min-w-0">
            <Tiles />

            {selected ? <SourceHeader source={selected} mode={mode} onClear={() => setSourceId(null)} /> : null}

            {selected && list.length === 0 ? (
              <p className="mt-6 text-[13.5px] text-t2">
                Nothing from {mode === "name" ? selected.name : selected.handle} has matched your sentence yet. Everything else in your feed:
              </p>
            ) : null}

            <StackColumns
              list={selected && list.length === 0 ? all : list}
              mode={mode}
              freshId={selected ? null : freshId}
              visible={visible}
            />
          </div>
        </div>
      </main>
    </Stage>
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
          {status.poolUsed} of {status.poolLimit} watched Twitter posts used
        </p>
      </Tile>
    </div>
  );
}

function SourceList({
  selected,
  onSelect,
  mode,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
  mode: LabelMode;
}) {
  return (
    <aside aria-label="Sources" className={cn(lift, "hidden p-2.5 lg:sticky lg:top-4 lg:block")} style={liftStyle}>
      <div className="flex items-center justify-between gap-2 px-1.5 pt-1 pb-2.5">
        <p className="text-[13px] font-semibold text-t1">Sources</p>
      </div>
      <Row on={selected === null} onClick={() => onSelect(null)}>
        <span className="grid size-[18px] place-items-center rounded-[5px] bg-[var(--brand-soft)] text-[var(--brand)]">
          <Layers className="size-3" aria-hidden="true" />
        </span>
        <span className="flex-1 text-left text-[13px] text-t1">All sources</span>
      </Row>
      <div className="mt-1 grid gap-x-4 sm:grid-cols-2 lg:grid-cols-1">
        {groups.map((g) => {
          const members = sources.filter((s) => s.group === g.id);
          if (!members.length) return null;
          return (
            <div key={g.id} className="mt-3">
              <GroupLabel glyph={<GroupGlyph group={g.id} />} count={members.length} className="px-2 pb-1.5">
                {g.label}
              </GroupLabel>
              {members.map((s) => (
                <Row key={s.id} on={selected === s.id} onClick={() => onSelect(selected === s.id ? null : s.id)}>
                  <SourceMark source={s} size={18} />
                  <span className={cn("min-w-0 flex-1 text-left text-[13px] text-t2", mode === "handle" ? "[overflow-wrap:normal]" : "truncate")}>
                    {mode === "name" ? s.name : s.handle.replaceAll("/", "/\u200b")}
                  </span>
                  {sourceCount(s.id) ? <span className="shrink-0 text-[11px] text-t3 tabular-nums">{sourceCount(s.id)}</span> : null}
                </Row>
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/** Below the wide layout the source list becomes one scrolling row, so the first story stays in view. */
const kindTag = { x: "Twitter", rss: "RSS", website: "Web", github: "GitHub" } as const;

function SourceStrip({ selected, onSelect, mode }: { selected: string | null; onSelect: (id: string | null) => void; mode: LabelMode }) {
  const chip = "flex h-8 shrink-0 items-center gap-2 rounded-full border px-2.5 text-[12.5px] transition-colors";
  const on = "border-[var(--brand-line)] bg-[var(--brand-soft)] text-t1";
  const off = "border-line bg-[var(--window)] text-t2";
  return (
    <div className="flex min-w-0 items-center gap-2 lg:hidden">
    <nav aria-label="Sources" className="-mr-6 flex min-w-0 flex-1 gap-1.5 overflow-x-auto pr-6 pb-1">
      <button type="button" aria-pressed={selected === null} onClick={() => onSelect(null)} className={cn(chip, selected === null ? on : off)}>
        <Layers className="size-3.5 text-[var(--brand)]" aria-hidden="true" /> All sources
      </button>
      {sources.map((s) => (
        <button key={s.id} type="button" aria-pressed={selected === s.id} onClick={() => onSelect(selected === s.id ? null : s.id)} className={cn(chip, selected === s.id ? on : off)}>
          <SourceMark source={s} size={16} />
          {mode === "name" ? s.name : s.handle}
          <span className="font-mono text-[9.5px] tracking-[0.1em] text-t3 uppercase">{kindTag[s.group]}</span>
        </button>
      ))}
    </nav>
    </div>
  );
}

function Row({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex min-h-8 w-full items-center gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
        on && "bg-[var(--brand-soft)] shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
      )}
    >
      {children}
    </button>
  );
}

const groupWord = { x: "Twitter account", rss: "RSS feed", website: "Website", github: "GitHub repository" } as const;

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

export { itemsFrom };
