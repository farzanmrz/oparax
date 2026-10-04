"use client";

// Adapted from React Bits Masonry, David Haz. License: ./LICENSE.md.
// Text cards need measured natural heights so facts never disappear into fixed photo tiles.
import { gsap } from "gsap";
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";

export type ReadingTile = { id: string; content: ReactNode };

export default function ReadingMasonry({ items }: { items: ReadingTile[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [reduced, setReduced] = useState(true);
  const columns = width >= 1200 ? 3 : width >= 750 ? 2 : 1;
  const gap = 24;

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduced(media.matches);
    updateMotion();
    media.addEventListener("change", updateMotion);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(root);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateMotion);
    };
  }, []);

  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setHeights((current) => {
        const next = { ...current };
        let changed = false;
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.key;
          if (!id) continue;
          const height = Math.ceil(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height);
          if (next[id] !== height) {
            next[id] = height;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    });
    for (const item of itemRefs.current.values()) observer.observe(item);
    return () => observer.disconnect();
  }, [items]);

  const { grid, totalHeight } = useMemo(() => {
    const colHeights = new Array<number>(columns).fill(0);
    const columnWidth = (width - gap * (columns - 1)) / columns;
    const grid = items.map((child) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = (columnWidth + gap) * col;
      const height = heights[child.id] ?? 400;
      const y = colHeights[col];
      colHeights[col] += height + gap;
      return { ...child, x, y, w: columnWidth, h: height };
    });
    return { grid, totalHeight: Math.max(...colHeights, 0) - gap };
  }, [columns, items, width, heights]);

  useLayoutEffect(() => {
    if (columns === 1 || !width) {
      for (const element of itemRefs.current.values())
        gsap.set(element, { clearProps: "transform,width" });
      return;
    }
    for (const item of grid) {
      const element = itemRefs.current.get(item.id);
      if (!element) continue;
      gsap.to(element, {
        x: item.x,
        y: item.y,
        width: item.w,
        duration: reduced ? 0 : 0.35,
        ease: "power3.out",
        overwrite: true,
      });
    }
    return () => {
      for (const element of itemRefs.current.values()) gsap.killTweensOf(element);
    };
  }, [grid, columns, width, reduced]);

  return (
    <div
      ref={containerRef}
      className={`d4-masonry d4-masonry-${columns} ${columns === 1 ? "d4-masonry-linear" : "d4-masonry-spatial"}`}
      style={columns === 1 ? undefined : { height: Math.max(0, totalHeight) }}
      data-catalog="React Bits Masonry, adapted for reading"
    >
      {items.map((item) => (
        <div
          key={item.id}
          data-key={item.id}
          ref={(element) => {
            if (element) itemRefs.current.set(item.id, element);
            else itemRefs.current.delete(item.id);
          }}
          className="d4-masonry-item"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
