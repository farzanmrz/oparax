"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Packed columns, newest first (lab v2/one/feed.tsx Grid; owner, Oct 9: "why aren't they dynamically aligning?"):
// each card is measured once drawn and the next card goes under the shortest column (the leftmost on a tie), so each
// card ends after its own text and the one below it moves up. Until the cards are measured they are dealt in turn,
// which is the plain row order. One column under 620px, two under 980, three under 1860, four above.

export type GridItem = { key: string; node: React.ReactNode };

const GAP = 24;
const columnsFor = (width: number) => (width >= 1860 ? 4 : width >= 980 ? 3 : width >= 620 ? 2 : 1);

export function Grid({ items }: { items: GridItem[] }) {
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

  // After every draw, read each card's height straight from the page; the state changes only when a height did, so
  // this settles after one pass. A font or picture arriving later changes a height and the columns repack.
  const measure = () => {
    const el = frame.current;
    if (!el) return;
    setHeights((prev) => {
      let next = prev;
      for (const node of el.querySelectorAll<HTMLElement>("[data-story]")) {
        const id = node.dataset.story;
        const h = Math.round(node.getBoundingClientRect().height);
        if (id && prev[id] !== h)
          next = next === prev ? { ...prev, [id]: h } : { ...next, [id]: h };
      }
      return next;
    });
  };
  useLayoutEffect(measure);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const watch = new ResizeObserver(measure);
    for (const node of el.querySelectorAll<HTMLElement>("[data-story]")) watch.observe(node);
    return () => watch.disconnect();
  });

  const columns: GridItem[][] = Array.from({ length: cols }, () => []);
  const tall = new Array<number>(cols).fill(0);
  items.forEach((item, i) => {
    const h = heights[item.key];
    let at = i % cols;
    if (h !== undefined) {
      at = 0;
      for (let c = 1; c < cols; c += 1) if (tall[c] < tall[at]) at = c;
    }
    columns[at].push(item);
    tall[at] += (h ?? 0) + GAP;
  });

  return (
    <div ref={frame} className="flex items-start gap-6">
      {columns.map((col, c) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Columns are positions, rebuilt whenever the count changes.
        <div key={c} className="flex min-w-0 flex-1 flex-col gap-6">
          {col.map((item) => (
            <div key={item.key} data-story={item.key} className="min-w-0">
              {item.node}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
