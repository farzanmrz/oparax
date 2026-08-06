"use client";

// A hydration-safe relative timestamp. The server (and the first client paint) render a short
// ABSOLUTE date — identical on both sides, so hydration never mismatches — and an effect swaps
// in the relative form ("12m", "3h") once mounted, re-ticking every minute. Relative time can
// only ever be computed client-side: it is a function of "now", which the server render and the
// hydration pass disagree about by definition.
//
// Format follows the age, because the reader's question does: fresh posts get relative
// ("is this still live?"), older posts get the date ("which day was that?"). The exact
// local-time string rides in `title` for hover — precision is never lost, it just stops
// occupying the pixel.
import { useEffect, useState } from "react";

function shortDate(date: Date, now: Date): string {
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** The pure label/title computation — exported so other surfaces needing the same
 *  Xm/Xh/Xd-ago bucket logic can call it directly instead
 *  of reimplementing it. `RelativeTime` below is the hydration-safe client component that
 *  wraps this with the mount/interval dance; this function itself has no client-only
 *  concerns beyond reading `Date.now()`. */
export function relativeLabel(iso: string): { label: string; title: string } {
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

/** `prefix` names the ACTION the timestamp belongs to — "Posted" on a source card, "Drafted"
 *  on a draft card. Two cards sit side by side showing different events, and a bare "5m ago"
 *  on each made them look like the same one. */
export function RelativeTime({ iso, prefix }: { iso: string; prefix?: string }) {
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
      {prefix ? `${prefix} ${label}` : label}
    </time>
  );
}
