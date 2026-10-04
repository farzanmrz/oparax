"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import StatusMark from "@/components/react-bits/StatusMark";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import { ARRIVAL_DELAY_MS, status } from "./data";

// Arrival motion, copied from the accepted feeds (next/council/live.tsx): the entrance recipe is lifted from
// React Bits AnimatedList, the live checking mark is React Bits StatusMark and the moving label is AI Elements
// Shimmer. On load the newest story replays its arrival once (a replay of a stored item, labelled as such);
// reduced motion and ?settled=1 show the end state.

export const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

export function useArrival(settled = false) {
  const reduce = useReducedMotion();
  const [arrived, setArrived] = useState(settled);
  useEffect(() => {
    if (settled || reduce) {
      setArrived(true);
      return;
    }
    const t = setTimeout(() => setArrived(true), ARRIVAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [reduce, settled]);
  // The newest story is shown from the start, so the checking row counts only the item still being checked.
  return { arrived, pending: status.pending - 1 };
}

export function Arrive({ index = 0, fresh = false, className, children }: { index?: number; fresh?: boolean; className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      layout
      className={cn(fresh && "overflow-hidden", className)}
      initial={fresh ? { opacity: 0, height: 0, y: -16 } : { opacity: 0, y: 8 }}
      animate={fresh ? { opacity: 1, height: "auto", y: 0 } : { opacity: 1, y: 0 }}
      transition={{ duration: fresh ? 0.5 : 0.36, ease: EASE, delay: fresh ? 0 : 0.05 + index * 0.045 }}
    >
      {children}
    </motion.div>
  );
}

export function NewFlag({ className }: { className?: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <span className={cn("inline-flex h-[18px] items-center rounded-full bg-[var(--brand)] px-1.5 text-[10.5px] font-semibold text-white transition-opacity duration-700", on ? "opacity-100" : "opacity-0", className)}>
      New
    </span>
  );
}

/** A brand edge light on the newest card that fades after a few seconds (the arrival replay). */
export function FreshRing() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 3200);
    return () => clearTimeout(t);
  }, []);
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 z-20 rounded-xl ring-2 ring-[var(--brand)] ring-inset transition-opacity duration-1000", on ? "opacity-100" : "opacity-0")}
    />
  );
}

export function Checking({ pending, label, className }: { pending: number; label?: string; className?: string }) {
  if (pending <= 0) return null;
  const text = label ?? `Checking ${pending} ${pending === 1 ? "item" : "items"} against your sentence`;
  return (
    <span role="status" className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <StatusMark status="running" size={15} color="var(--caution)" strokeWidth={2} />
      <Shimmer as="span" duration={2.2} className="truncate text-[13px] font-medium [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
        {text}
      </Shimmer>
    </span>
  );
}
