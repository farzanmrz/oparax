"use client";

// Adapted from React Bits Pro app-shell-4 / app-shell-5 / agent-activity-2 (identical useScrollFade in each).
// Changes: extracted once so the three adapted blocks share it.
import { useCallback, useEffect, useRef, useState } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setEdges({
      start: scrollTop > 1,
      end: Math.ceil(scrollTop + clientHeight) < scrollHeight - 1,
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    const view = el?.ownerDocument.defaultView;
    if (!el || !view?.ResizeObserver) return;
    const observer = new view.ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  return { ref, edges, onScroll: update };
}

// Edge fades that tell the reader a pane scrolls; decorative, so hidden from assistive tech.
export function ScrollFades({ edges, from = "from-card" }: { edges: { start: boolean; end: boolean }; from?: string }) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b to-transparent transition-opacity duration-200 ease-out",
          from,
          edges.start ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t to-transparent transition-opacity duration-200 ease-out",
          from,
          edges.end ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}

// Stock App UI focus ring, keyed to the theme accent.
export const focusRing =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rb-accent)]";
export const focusInset =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rb-accent)]";
