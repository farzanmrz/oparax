"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import StatusMark from "@/components/react-bits/StatusMark";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import { ARRIVAL_DELAY_MS, status } from "./data";

// Arrival motion, copied from the accepted feed (next/council/live.tsx): React Bits AnimatedList's entrance
// recipe, React Bits StatusMark for the live mark, AI Elements Shimmer for the moving label. On load the
// newest story replays its arrival once (labelled REPLAY where it shows); reduced motion shows the end state.

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
  return { arrived, pending: arrived ? status.pending - 1 : status.pending };
}

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
      layout="position"
      className={cn(fresh && "overflow-hidden", className)}
      initial={fresh ? { opacity: 0, height: 0, y: -16 } : { opacity: 0, y: 8 }}
      animate={fresh ? { opacity: 1, height: "auto", y: 0 } : { opacity: 1, y: 0 }}
      transition={{ duration: fresh ? 0.5 : 0.36, ease: EASE, delay: fresh ? 0 : 0.05 + index * 0.045 }}
    >
      {children}
    </Tag>
  );
}

export function NewFlag({ className }: { className?: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <span
      className={cn(
        "inline-flex h-[18px] shrink-0 items-center rounded-full bg-[var(--brand)] px-1.5 text-[10.5px] font-semibold text-white transition-opacity duration-700",
        on ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      New
    </span>
  );
}

/** A live line: amber in-progress mark and a moving label. */
export function LiveLine({ label, size = 15, className }: { label: string; size?: number; className?: string }) {
  return (
    <span role="status" className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <StatusMark status="running" size={size} color="var(--caution)" strokeWidth={2} />
      <Shimmer as="span" duration={2.2} className="truncate text-[13px] font-medium [--color-background:var(--t1)] [--color-muted-foreground:var(--t2)]">
        {label}
      </Shimmer>
    </span>
  );
}

export function Checking({ pending, className }: { pending: number; className?: string }) {
  if (pending <= 0) return null;
  return <LiveLine className={className} label={`Checking ${pending} ${pending === 1 ? "item" : "items"} against your sentence`} />;
}
