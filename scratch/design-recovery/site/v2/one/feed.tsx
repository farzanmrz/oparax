"use client";

import { useEffect, useState } from "react";
import { sources, stories, storyHasSource, type FeedStory, type View } from "@/v2/deck/data";
import { Arrive, Checking, useArrival } from "@/v2/deck/live";
import { StoryCard } from "./card";
import { AppShell, PageLine } from "./shell";

// The One feed inside the shell. The page line: Feed, and Deck's amber checking line at the right while a check
// runs. The clustered view is the only view (owner, Oct 8: the Clustered and Direct switch is removed). Then the
// stories in a grid read newest first across rows, left to right: three columns at 1440, two narrower, four at
// 2560. Cards in a row share the row's height (the grid stretches them), the picture stays 172px on top, and every
// fact shows. The shell's source rail at the left filters the feed; the feed never moves.

const IMAGE_H = 172;

export function OneFeed({
  initialSource,
  settled,
}: {
  initialView?: View;
  initialSource: string | null;
  initialPanel?: boolean;
  settled: boolean;
}) {
  const [sourceId, setSourceId] = useState<string | null>(sources.some((s) => s.id === initialSource) ? initialSource : null);
  const { pending } = useArrival(settled);

  // Keep the URL in step so each state has an address (and survives a reload).
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    q.delete("view");
    q.delete("panel");
    if (sourceId) q.set("source", sourceId);
    else q.delete("source");
    const query = q.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
  }, [sourceId]);

  const all = stories.clustered;
  const selected = sources.find((s) => s.id === sourceId) ?? null;
  const filtered = selected ? all.filter((s) => storyHasSource(s, selected.id)) : all;
  const list = filtered.length ? filtered : all;
  const freshId = selected ? null : all[0].id;

  return (
    <AppShell selected={sourceId} onSelect={setSourceId}>
      <PageLine title="Feed" right={!selected && pending > 0 ? <Checking pending={pending} /> : null} />
      <Grid list={list} freshId={freshId} />
    </AppShell>
  );
}

/** Rows read left to right, newest first; a row is as tall as its tallest card and every card stretches to it. */
function Grid({ list, freshId }: { list: FeedStory[]; freshId: string | null }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3 min-[2200px]:grid-cols-4">
      {list.map((s, i) => (
        <Arrive key={s.id} index={i} className="h-full min-w-0">
          <StoryCard story={s} fresh={s.id === freshId} imageHeight={IMAGE_H} className="h-full" />
        </Arrive>
      ))}
    </div>
  );
}
