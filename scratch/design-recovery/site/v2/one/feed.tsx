"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X as Close } from "lucide-react";
import { ViewSwitch } from "@/v2/deck/chrome";
import { sources, stories, storyHasSource, type FeedStory, type View } from "@/v2/deck/data";
import { Arrive, useArrival } from "@/v2/deck/live";
import { SourceMark } from "@/v2/deck/marks";
import { OneCard, sourcesIn, type LabelMode } from "./card";
import { Reader } from "./drawer";
import { Expand, Shell } from "./rail";

// The One feed. No app header, no title and no tool row: the sidebar as a column of the page grid, one 36px top row
// with Expand (only while the sidebar is collapsed) and Clustered and Direct at the left and, while notifications
// are off and not dismissed, the X DMs line at the right ("Turn on" as a word, a plain x), the Checking line under
// it at the left, then the stories as text-first cards in columns from the content column's width (2 at 1440 with
// the sidebar open, 3 closed, 4 at 2560), newest first, packed into the shorter column by an estimate of each card's height. A
// source name on a clustered card opens the source reader, a fixed overlay at the right edge that never narrows
// the grid; a sidebar source filters the feed.

const GAP = 16;
// The picture on top of the card, as the Deck card had it (owner, Oct 4: the thumbnail "is weird now. I think it
// was better before, when it was just part of the thing").
const IMAGE_H = 150;
const DISMISS_KEY = "oparax-one-xdm-banner";

/** Estimated card height: source row and padding, headline lines beside the thumbnail, wrapped fact lines, the
 * plate below a joined story. */
function estimate(s: FeedStory, colWidth: number) {
  const textW = colWidth - 32;
  const headLines = Math.ceil((s.card.headline.length * 10.2) / textW);
  const factW = colWidth - 48;
  const factLines = s.card.facts.reduce((n, f) => n + Math.ceil((f.text.length * 7.1) / factW), 0);
  return (s.card.image ? IMAGE_H : 0) + 72 + headLines * 26 + 12 + factLines * 20 + s.card.facts.length * 8;
}

function toColumns(list: FeedStory[], n: number, colWidth: number) {
  const cols: FeedStory[][] = Array.from({ length: n }, () => []);
  const h = Array.from({ length: n }, () => 0);
  for (const s of list) {
    const c = h.indexOf(Math.min(...h));
    cols[c].push(s);
    h[c] += estimate(s, colWidth) + GAP;
  }
  return cols;
}

/** Column count from the content column's width: at a 1440 window 2 with the sidebar open, 3 closed; 4 at 2560. */
function useColumns() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1352);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = width >= 1900 ? 4 : width >= 1280 ? 3 : 2;
  return { ref, n, colWidth: (width - GAP * (n - 1)) / n };
}

export function OneFeed({
  initialView,
  initialMode,
  initialPanel,
  initialSource,
  initialReader,
  bannerOff,
  settled,
}: {
  initialView: View;
  initialMode: LabelMode;
  initialPanel: boolean;
  initialSource: string | null;
  initialReader: { storyId: string; sourceId: string } | null;
  bannerOff: boolean;
  settled: boolean;
}) {
  const [view, setView] = useState<View>(initialView);
  const [mode, setMode] = useState<LabelMode>(initialMode);
  const [filter, setFilter] = useState<string | null>(sources.some((s) => s.id === initialSource) ? initialSource : null);
  const [xdm, setXdm] = useState(false);
  const [dismissed, setDismissed] = useState(bannerOff);
  const [reader, setReader] = useState(initialReader);
  const opener = useRef<HTMLElement | null>(null);
  useArrival(settled);
  const { ref, n, colWidth } = useColumns();

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {}
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    q.set("view", view);
    if (mode === "handle") q.set("label", "handle");
    else q.delete("label");
    if (filter) q.set("source", filter);
    else q.delete("source");
    q.delete("reader");
    history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
  }, [view, mode, filter]);

  // The reader belongs to one card in one view: switching Clustered and Direct, or the source filter, closes it.
  const scope = useRef({ view, filter });
  useEffect(() => {
    if (scope.current.view === view && scope.current.filter === filter) return;
    scope.current = { view, filter };
    setReader(null);
  }, [view, filter]);

  const all = stories[view];
  const list = filter ? all.filter((s) => storyHasSource(s, filter)) : all;
  const freshId = settled || filter ? null : all[0].id;
  const cols = useMemo(() => toColumns(list, n, colWidth), [list, n, colWidth]);
  const banner = !xdm && !dismissed;
  const selected = sources.find((s) => s.id === filter) ?? null;

  const closeReader = useCallback(() => {
    setReader(null);
    requestAnimationFrame(() => opener.current?.focus());
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <Shell
      sources={sources}
      mode={mode}
      onMode={setMode}
      initialOpen={initialPanel}
      onSource={(id) => setFilter(id)}
      activeSource={filter}
      xdm={xdm}
      onXdm={setXdm}
      ownExpand
    >
      <main className="relative pt-3 pb-16">
        <div className="flex h-9 items-center gap-4 px-1">
          <Expand className="-mr-2" />
          <ViewSwitch view={view} onChange={setView} className="shrink-0" />
          {banner ? <Banner onTurnOn={() => setXdm(true)} onDismiss={dismiss} /> : null}
        </div>
        {selected ? (
          <div className="flex min-h-9 items-center gap-4 px-1">
            {selected ? (
              <span className="flex min-w-0 items-center gap-2 text-[13px] text-t2">
                Only
                <span className="flex items-center gap-1.5 font-medium text-[var(--brand)]">
                  <SourceMark source={selected} size={18} className={selected.group === "x" ? "" : "rounded-[5px]"} />
                  {mode === "handle" && selected.group === "x" ? selected.handle : selected.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFilter(null)}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[12.5px] text-t3 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Close className="size-3" aria-hidden="true" /> All sources
                </button>
              </span>
            ) : null}
          </div>
        ) : null}

        {selected && list.length === 0 ? (
          <p className="mt-4 px-1 text-[13.5px] text-t2">Nothing from {selected.name} in this view yet.</p>
        ) : null}

        <div ref={ref} className="mt-3 grid items-start" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: GAP }}>
          {cols.map((col, ci) => (
            <div key={ci} className="flex min-w-0 flex-col" style={{ gap: GAP }}>
              {col.map((s, i) => (
                <Arrive key={`${view}:${s.id}`} index={ci + i * n}>
                  <OneCard
                    story={s}
                    mode={mode}
                    image="hero"
                    imageHeight={IMAGE_H}
                    fresh={s.id === freshId}
                    onSource={
                      view === "clustered"
                        ? (sourceId, storyId, trigger) => {
                            opener.current = trigger;
                            setReader({ storyId, sourceId });
                          }
                        : undefined
                    }
                    activeSource={reader?.storyId === s.id ? reader.sourceId : null}
                  />
                </Arrive>
              ))}
            </div>
          ))}
        </div>
      </main>
      {reader ? (
        <Reader
          storyId={reader.storyId}
          sourceId={reader.sourceId}
          mode={mode}
          onPick={(sourceId) => setReader((r) => (r ? { ...r, sourceId } : r))}
          onClose={closeReader}
        />
      ) : null}
    </Shell>
  );
}

/** The X DMs invitation: one quiet row of text, "Turn on" as a word in the brand blue, a plain x to dismiss. */
function Banner({ onTurnOn, onDismiss }: { onTurnOn: () => void; onDismiss: () => void }) {
  return (
    <div role="region" aria-label="Notifications" className="ml-auto flex h-9 min-w-0 items-center gap-3 text-[13px]">
      <p className="min-w-0 truncate text-t2">Oparax can DM you on X when something matters.</p>
      <button
        type="button"
        onClick={onTurnOn}
        className="shrink-0 rounded-sm font-medium text-[var(--brand)] underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Turn on
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        title="Dismiss"
        className="grid size-6 shrink-0 place-items-center rounded-md text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Close className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
