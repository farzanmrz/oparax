"use client";

// Content-sized cards in columns (the Deck's toColumns, design preview v2/deck/feed.tsx): newest first, each card into
// the column that is shortest so far by its estimated height, so reading runs across the top and no card is stretched.
// The column count follows the work column's own width: three at 1440 with the aside open, four at 2560.

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type MasonryItem = { key: string; height: number; node: React.ReactNode };

const GAP = 24;
const columnsClass = ["grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"];

const columnsFor = (width: number) => (width >= 1500 ? 4 : width >= 860 ? 3 : width >= 540 ? 2 : 1);

export function Masonry({ items }: { items: MasonryItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // The server cannot measure; three is the column at 1440, the common case.
  const [count, setCount] = useState(3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setCount(columnsFor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const columns = useMemo(() => {
    const cols: MasonryItem[][] = Array.from({ length: count }, () => []);
    const heights: number[] = Array(count).fill(0);
    for (const item of items) {
      const c = heights.indexOf(Math.min(...heights));
      cols[c].push(item);
      heights[c] += item.height + GAP;
    }
    return cols;
  }, [items, count]);
  return (
    <div ref={ref} className={cn("grid items-start gap-6", columnsClass[count - 1])}>
      {columns.map((col, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Columns are positions, rebuilt whenever the count changes.
        <div key={i} className="grid min-w-0 gap-6">
          {col.map((item) => (
            <Fragment key={item.key}>{item.node}</Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
