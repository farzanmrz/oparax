"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { X as CloseIcon } from "lucide-react";
import { sources, stories, storyHasSource, type FeedStory, type Source, type View } from "@/v2/deck/data";
import { ViewSwitch } from "@/v2/deck/chrome";
import { SourceMark } from "@/v2/deck/marks";
import { Arrive, useArrival } from "@/v2/deck/live";
import { StoryCard } from "./card";
import { AppShell, PageLine } from "./shell";

// The One feed inside the shell. The page line: Feed, and at its right end Deck's Clustered and Direct switch (owner,
// Oct 9: "make it a toggle on the right of our header"), kept in the URL as ?view= the way Deck kept it. Then the
// stories in a grid read newest first across rows, left to right: three columns at 1440, two narrower, four at
// 2560. Each card is as tall as its own content, the picture stays 172px on top, and every fact shows. The shell's
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

/** Rows read left to right, newest first; each card ends after its own text. */
function Grid({ list }: { list: FeedStory[] }) {
  return (
    <div className="mt-6 grid grid-cols-1 items-start gap-6 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3 min-[2200px]:grid-cols-4">
      {list.map((s, i) => (
        <Arrive key={s.id} index={i} className="min-w-0">
          <StoryCard story={s} imageHeight={IMAGE_H} />
        </Arrive>
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
