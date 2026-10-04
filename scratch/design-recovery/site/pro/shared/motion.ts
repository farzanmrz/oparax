"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

// Decorative autoplay settles within five seconds (WCAG 2.2.2 needs no pause control below that),
// and never starts when the visitor asks for reduced motion. Content stays readable either way.
export function useSettledMotion(ms = 4800) {
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (reduced) return;
    setRunning(true);
    const timer = window.setTimeout(() => setRunning(false), ms);
    return () => window.clearTimeout(timer);
  }, [ms, reduced]);
  return { running, reduced: Boolean(reduced) };
}
