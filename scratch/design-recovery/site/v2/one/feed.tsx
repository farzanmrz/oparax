"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X as CloseIcon } from "lucide-react";
import { sources, stories, storyHasSource, type FeedStory, type Source, type View } from "@/v2/deck/data";
import { ViewSwitch } from "@/v2/deck/chrome";
import { SourceMark } from "@/v2/deck/marks";
import { Arrive, useArrival } from "@/v2/deck/live";
import { StoryCard } from "./card";
import { AppShell, PageLine } from "./shell";

// The One feed inside the shell. The page line: Feed, and at its right end Deck's Clustered and Direct switch (owner,
// Oct 9: "make it a toggle on the right of our header"), kept in the URL as ?view= the way Deck kept it. Then the
// stories packed into columns (owner, Oct 9: "why aren't they dynamically aligning?"): newest first, each next card
// goes under the shortest column, so a short card never leaves a hole beside a tall one. Three columns at 1440, two
// narrower, four at 2560. Each card is as tall as its own content, the picture stays 172px on top, and every fact shows. The shell's
// source rail at the left filters the feed; the feed never moves. Nothing pressed means the whole feed; a pressed
// source shows only that source's stories (one line when it has none) and adds Window's "from {name}" chip beside
// the title, cleared by its x, by pressing the row again, or by Feed in the rail.

const IMAGE_H = 172;

export function OneFeed({
  initialView,
  initialSource,
  settled,
}: {
  initialView?: View;
  initialSource: string | null;
  initialPanel?: boolean;
  settled: boolean;
}) {
  const search = useSearchParams();
  const [view, setView] = useState<View>(search.get("view") === "direct" ? "direct" : (initialView ?? "clustered"));
  const [sourceId, setSourceId] = useState<string | null>(sources.some((s) => s.id === initialSource) ? initialSource : null);
  useArrival(settled);

  // Keep the URL in step so each state has an address (and survives a reload).
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    q.set("view", view);
    q.delete("panel");
    if (sourceId) q.set("source", sourceId);
    else q.delete("source");
    const query = q.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
  }, [view, sourceId]);

  const all = stories[view];
  const selected = sources.find((s) => s.id === sourceId) ?? null;
  const list = selected ? all.filter((s) => storyHasSource(s, selected.id)) : all;

  return (
    <AppShell selected={sourceId} onSelect={setSourceId}>
      <PageLine
        title="Feed"
        beside={selected ? <FilterChip source={selected} onClear={() => setSourceId(null)} /> : null}
        right={<ViewSwitch view={view} onChange={setView} />}
      />
      {selected && !list.length ? <p className="mt-6 text-[13.5px] text-t2">Nothing from {selected.name} this week.</p> : <Grid list={list} />}
    </AppShell>
  );
}

/** The columns the width allows: one under 620px, two under 980, three under 1860, four above. */
function columnsFor(width: number) {
  return width >= 1860 ? 4 : width >= 980 ? 3 : width >= 620 ? 2 : 1;
}

/** Packed columns, newest first: each card is measured once drawn and the next card goes under the shortest column
 * (the leftmost on a tie), so each card ends after its own text and the one below it moves up. Until the cards are
 * measured they are dealt in turn, which is the plain row order. */
function Grid({ list }: { list: FeedStory[] }) {
  const frame = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(3);
  const [heights, setHeights] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const width = new ResizeObserver(([entry]) => setCols(columnsFor(entry.contentRect.width)));
    width.observe(el);
    setCols(columnsFor(el.getBoundingClientRect().width));
    return () => width.disconnect();
  }, []);

  // After every draw, read each card's height straight from the page; the state changes only when a height did,
  // so this settles after one pass. A font or picture arriving later changes a height and the columns repack.
  const measure = () => {
    const el = frame.current;
    if (!el) return;
    setHeights((prev) => {
      let next = prev;
      el.querySelectorAll<HTMLElement>("[data-story]").forEach((node) => {
        const id = node.dataset.story;
        const h = Math.round(node.getBoundingClientRect().height);
        if (id && prev[id] !== h) next = next === prev ? { ...prev, [id]: h } : { ...next, [id]: h };
      });
      return next;
    });
  };
  useLayoutEffect(measure);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const watch = new ResizeObserver(measure);
    el.querySelectorAll<HTMLElement>("[data-story]").forEach((node) => watch.observe(node));
    return () => watch.disconnect();
  });

  const columns: FeedStory[][] = Array.from({ length: cols }, () => []);
  const tall = new Array<number>(cols).fill(0);
  const gap = 24;
  list.forEach((s, i) => {
    const h = heights[s.id];
    let at = i % cols;
    if (h !== undefined) {
      at = 0;
      for (let c = 1; c < cols; c += 1) if (tall[c] < tall[at]) at = c;
    }
    columns[at].push(s);
    tall[at] += (h ?? 0) + gap;
  });

  return (
    <div ref={frame} className="mt-6 flex items-start gap-6">
      {columns.map((col, c) => (
        <div key={c} className="flex min-w-0 flex-1 flex-col gap-6">
          {col.map((s) => (
            <Arrive key={s.id} index={list.indexOf(s)} className="min-w-0">
              <div data-story={s.id}>
                <StoryCard story={s} imageHeight={IMAGE_H} />
              </div>
            </Arrive>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Window's filter chip (v2/window/feed.tsx): the source's mark, "from" and its name, and an x that shows the whole
 * feed again. */
function FilterChip({ source, onClear }: { source: Source; onClear: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] pr-1 pl-2 text-[12.5px] text-t1">
      <SourceMark source={source} size={14} className={source.group === "x" ? "" : "rounded-[3px]"} />
      from {source.name}
      <button
        type="button"
        onClick={onClear}
        aria-label="Show the whole feed"
        className="grid size-5 place-items-center rounded-full text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <CloseIcon className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}
