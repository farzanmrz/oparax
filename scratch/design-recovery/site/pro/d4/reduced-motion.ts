"use client";

import { useSyncExternalStore } from "react";

// motion's useReducedMotion reads the preference once; this one follows changes after load, so a reader
// who switches the setting (or a page whose preference arrives late) still gets the settled, static view.
const query = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(query);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Entrance reveal that is skipped, or finished at once, whenever reduced motion is on.
export function reveal(reduce: boolean, delay = 0) {
  return reduce
    ? { initial: false as const, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-15%" },
        transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
      };
}
