"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import StatusMark from "@/components/react-bits/StatusMark";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import { ARRIVAL_DELAY_MS, status } from "./data";

// Arrival motion, copied from next/council/live.tsx. The entrance recipe (opacity plus a short vertical slide, height
// opening from zero, ease [0.25, 0.46, 0.45, 0.94]) is lifted from React Bits AnimatedList; the live checking
// mark is React Bits StatusMark and the moving label is AI Elements Shimmer. On load the newest story replays
// its arrival once (a preview replay of a stored report, not live activity); reduced motion shows the end state.

export const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

/** false until the newest story has "arrived"; pending drops by one when it does. */
export function useArrival() {
  const reduce = useReducedMotion();
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    if (reduce) {
      setArrived(true);
      return;
    }
    const t = setTimeout(() => setArrived(true), ARRIVAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [reduce]);
  return { arrived, pending: arrived ? status.pending - 1 : status.pending };
}

/** Initial rows settle in with a short stagger; the arriving row opens its height and slides down. */
export function Arrive({
  index = 0,
  fresh = false,
  as = "div",
  className,
  children,
}: {
  index?: number;
  fresh?: boolean;
  as?: "div" | "li";
  className?: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const Tag = as === "li" ? motion.li : motion.div;
  if (reduce) return as === "li" ? <li className={className}>{children}</li> : <div className={className}>{children}</div>;
  return (
    <Tag
      layout
      className={cn(fresh && "overflow-hidden", className)}
      initial={fresh ? { opacity: 0, height: 0, y: -16 } : { opacity: 0, y: 8 }}
      animate={fresh ? { opacity: 1, height: "auto", y: 0 } : { opacity: 1, y: 0 }}
      transition={{ duration: fresh ? 0.5 : 0.36, ease: EASE, delay: fresh ? 0 : 0.05 + index * 0.045 }}
    >
      {children}
    </Tag>
  );
}

/** Temporary "New" marker on the arriving row, fading after a few seconds. */
export function NewFlag({ className }: { className?: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <span
      className={cn(
        "inline-flex h-[18px] items-center rounded-full bg-[var(--brand)] px-1.5 text-[10.5px] font-semibold text-white transition-opacity duration-700",
        on ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      New
    </span>
  );
}

/** The live checking line: amber in-progress mark, moving label, count from the pending value. */
export function Checking({ pending, compact = false, className }: { pending: number; compact?: boolean; className?: string }) {
  if (pending <= 0) return null;
  const label = `Checking ${pending} ${pending === 1 ? "item" : "items"} against your sentence`;
  return (
    <span role="status" className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <StatusMark status="running" size={compact ? 15 : 17} color="var(--caution)" strokeWidth={2} />
      <Shimmer as="span" duration={2.2} className="truncate text-[13px] font-medium [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
        {label}
      </Shimmer>
    </span>
  );
}
