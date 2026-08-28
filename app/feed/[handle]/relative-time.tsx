"use client";

// A hydration-safe relative timestamp for the public feed, the pattern lives in
// app/agents/[id]/relative-time.tsx and is copied here because the public page never imports
// from the app shell's tree. The server (and the first client paint) render a short ABSOLUTE
// date, identical on both sides, so hydration never mismatches, and an effect swaps in the
// relative form ("12m ago", "3h ago") once mounted, re-ticking every minute.

import { useEffect, useState } from "react";

function shortDate(date: Date, now: Date): string {
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function relativeLabel(iso: string): { label: string; title: string } {
  const date = new Date(iso);
  const now = new Date();
  const seconds = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  let label: string;
  if (seconds < 60) label = "just now";
  else if (seconds < 3600) label = `${Math.floor(seconds / 60)}m ago`;
  else if (seconds < 86400) label = `${Math.floor(seconds / 3600)}h ago`;
  else if (seconds < 7 * 86400) label = `${Math.floor(seconds / 86400)}d ago`;
  else label = shortDate(date, now);
  return { label, title: date.toLocaleString() };
}

export function RelativeTime({ iso }: { iso: string }) {
  const [mounted, setMounted] = useState<{ label: string; title: string } | null>(null);

  useEffect(() => {
    const tick = () => setMounted(relativeLabel(iso));
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [iso]);

  // Pre-mount fallback: UTC-pinned so server HTML and first client paint agree byte-for-byte.
  const fallback = new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });

  const label = mounted?.label ?? fallback;
  return (
    <time dateTime={iso} suppressHydrationWarning title={mounted?.title}>
      {label}
    </time>
  );
}
