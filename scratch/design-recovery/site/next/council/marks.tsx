"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Newspaper } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import type { ItemView } from "../data/feed";
import { hostOf, type Kind } from "./data";

// Native-color identity marks. Runtime public images only (nothing is downloaded into the repo): Google's
// favicon service for sites with DuckDuckGo as the second try, unavatar for X accounts, a glyph last.

function useFallback(sources: string[]) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // The error handler attaches only after hydration: an image that fails while the page hydrates would
  // otherwise update the tree mid-hydration. A failure before mount is caught by checking the settled image.
  useEffect(() => {
    setMounted(true);
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setIndex((i) => i + 1);
  }, [index]);
  return { src: sources[index], ref, next: mounted ? () => setIndex((i) => i + 1) : undefined };
}

export function SiteIcon({ host, size = 16, className }: { host: string; size?: number; className?: string }) {
  const { src, ref, next } = useFallback([
    `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
  ]);
  if (!src)
    return (
      <span
        aria-hidden="true"
        className={cn("grid shrink-0 place-items-center rounded-[4px] bg-raised text-t3", className)}
        style={{ width: size, height: size }}
      >
        <Globe style={{ width: size * 0.62, height: size * 0.62 }} />
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      onError={next}
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 rounded-[4px] bg-white object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function XAvatar({ handle, size = 18, className }: { handle: string; size?: number; className?: string }) {
  const { src, ref, next } = useFallback([`https://unavatar.io/x/${handle.replace("@", "")}`]);
  if (!src)
    return (
      <span
        aria-hidden="true"
        className={cn("grid shrink-0 place-items-center rounded-full bg-raised text-t3", className)}
        style={{ width: size, height: size }}
      >
        <XLogo className="size-[55%]" />
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      onError={next}
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** A report's publisher: round avatar for an X post, square favicon for an article. */
export function ReportMark({ item, size = 16, className }: { item: ItemView; size?: number; className?: string }) {
  return item.kind === "post" && item.author ? (
    <XAvatar handle={item.author} size={size} className={className} />
  ) : (
    <SiteIcon host={hostOf(item.url)} size={size} className={className} />
  );
}

export const kindWord: Record<Kind | "github", string> = { post: "Post", article: "Article", github: "GitHub" };

export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4 fill-current", className)}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const kindStyle: Record<Kind | "github", string> = {
  post: "text-[var(--kind-post)] bg-[var(--kind-post-soft)]",
  article: "text-[var(--kind-article)] bg-[var(--kind-article-soft)]",
  github: "text-[var(--kind-github)] bg-[var(--kind-github-soft)]",
};

export function KindGlyph({ kind, className }: { kind: Kind | "github"; className?: string }) {
  if (kind === "post") return <XLogo className={cn("size-3", className)} />;
  if (kind === "github") return <GitHubMark className={cn("size-3.5", className)} />;
  return <Newspaper className={cn("size-3.5", className)} strokeWidth={1.75} />;
}

/** Kind as a colored tile: the hue tells post from article from GitHub, the glyph and word say it too. */
export function KindTile({ kind, size = 24, className }: { kind: Kind | "github"; size?: number; className?: string }) {
  return (
    <span
      title={kindWord[kind]}
      className={cn("grid shrink-0 place-items-center rounded-md", kindStyle[kind], className)}
      style={{ width: size, height: size }}
    >
      <KindGlyph kind={kind} />
    </span>
  );
}

/** Kind as a small chip with its word. */
export function KindChip({ kind, count, className }: { kind: Kind | "github"; count?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium",
        kindStyle[kind],
        className,
      )}
    >
      <KindGlyph kind={kind} className="size-3" />
      {count !== undefined ? `${count} ` : ""}
      {kindWord[kind]}
      {count !== undefined && count !== 1 ? "s" : ""}
    </span>
  );
}

export type Tone = "ok" | "caution" | "error" | "brand" | "idle";

export function Dot({ tone, pulse = false, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  const color = {
    ok: "bg-[var(--ok)]",
    caution: "bg-[var(--caution)]",
    error: "bg-[var(--error)]",
    brand: "bg-[var(--brand)]",
    idle: "border border-t4",
  }[tone];
  return (
    <span aria-hidden="true" className={cn("relative inline-flex size-2 shrink-0", className)}>
      {pulse ? <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", color)} /> : null}
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  );
}

/** Overlapping identity marks for a story's reports. */
export function MarkStack({ items, size = 18 }: { items: ItemView[]; size?: number }) {
  return (
    <span className="flex items-center">
      {items.map((item, i) => (
        <span
          key={item.id}
          className="rounded-full ring-2 ring-[var(--window)]"
          style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: items.length - i, borderRadius: item.kind === "post" ? 999 : 5 }}
        >
          <ReportMark item={item} size={size} className={item.kind === "post" ? "" : "rounded-[5px]"} />
        </span>
      ))}
    </span>
  );
}

/** Seven-day bars from stored publication dates; the newest day is drawn in the brand blue. */
export function WeekBars({
  week,
  height = 40,
  className,
}: {
  week: { day: string; label: string; count: number }[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...week.map((d) => d.count));
  return (
    <div className={cn("flex items-end gap-1.5", className)} style={{ height }} aria-label="Reports per day by publication date">
      {week.map((d, i) => (
        <span key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.count}`}>
          <span
            className={cn(
              "w-full rounded-[3px]",
              d.count === 0 ? "bg-line-strong" : i === week.length - 1 ? "bg-[var(--brand)]" : "bg-[var(--brand)]/45",
            )}
            style={{ height: d.count === 0 ? 3 : `${(d.count / max) * 100}%` }}
          />
        </span>
      ))}
    </div>
  );
}

/** A stepped area line from the same per-day counts (Supabase metric-card idiom). */
export function StepArea({ values, width = 260, height = 56, className }: { values: number[]; width?: number; height?: number; className?: string }) {
  const max = Math.max(1, ...values);
  const step = width / values.length;
  const y = (v: number) => height - 4 - (v / max) * (height - 12);
  let d = `M0 ${y(values[0])}`;
  values.forEach((v, i) => {
    d += ` L${i * step} ${y(v)} L${(i + 1) * step} ${y(v)}`;
  });
  const area = `${d} L${width} ${height} L0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={cn("block w-full", className)} style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id="council-step" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--brand)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#council-step)" />
      <path d={d} fill="none" stroke="var(--brand)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A segmented meter, one segment per unit (free-week days). */
export function Segments({ total, filled, tone = "brand" }: { total: number; filled: number; tone?: Tone }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            i < filled ? (tone === "caution" ? "bg-[var(--caution)]" : "bg-[var(--brand)]") : "bg-line-strong",
          )}
        />
      ))}
    </div>
  );
}
