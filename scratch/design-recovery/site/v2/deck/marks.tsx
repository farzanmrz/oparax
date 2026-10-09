"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Newspaper, Rss } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { hostOf, kindCount, kindOf, sourceOf, type Group, type ItemView, type Kind, type Source } from "./data";

// Identity marks, copied from the accepted feeds (next/council/marks.tsx) and extended with GitHub releases and
// source groups. Runtime public images only: Google's favicon service for sites (DuckDuckGo second), unavatar for
// Twitter accounts, a glyph last. Real logos keep their own colors.

function useFallback(sources: string[]) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
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
      <span aria-hidden="true" className={cn("grid shrink-0 place-items-center rounded-[4px] bg-raised text-t3", className)} style={{ width: size, height: size }}>
        <Globe style={{ width: size * 0.62, height: size * 0.62 }} />
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt="" onError={next} loading="lazy" decoding="async" className={cn("shrink-0 rounded-[4px] bg-white object-contain", className)} style={{ width: size, height: size }} />
  );
}

export function XAvatar({ handle, size = 18, className }: { handle: string; size?: number; className?: string }) {
  const { src, ref, next } = useFallback([`https://unavatar.io/x/${handle.replace("@", "")}`]);
  if (!src)
    return (
      <span aria-hidden="true" className={cn("grid shrink-0 place-items-center rounded-full bg-raised text-t3", className)} style={{ width: size, height: size }}>
        <XLogo className="size-[55%]" />
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt="" onError={next} loading="lazy" decoding="async" className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />
  );
}

export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4 fill-current", className)}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/** A GitHub source mark: the octocat on its own neutral tile (GitHub's own mark color). */
export function GitHubTile({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-[5px] bg-[var(--kind-github-soft)] text-[var(--kind-github)]", className)} style={{ width: size, height: size }}>
      <GitHubMark className="size-[72%]" />
    </span>
  );
}

/** A source's mark: round avatar for X, square favicon for a site or feed, the GitHub tile for a repository. */
export function SourceMark({ source, size = 16, className }: { source: Source; size?: number; className?: string }) {
  if (source.group === "x") return <XAvatar handle={source.mark} size={size} className={className} />;
  if (source.group === "github") return <GitHubTile size={size} className={className} />;
  return <SiteIcon host={source.mark} size={size} className={className} />;
}

/** An item's publisher mark. */
export function ItemMark({ item, size = 16, className }: { item: ItemView; size?: number; className?: string }) {
  const src = sourceOf(item);
  if (src) return <SourceMark source={src} size={size} className={className} />;
  if (item.kind === "post" && item.author) return <XAvatar handle={item.author} size={size} className={className} />;
  return <SiteIcon host={hostOf(item.url)} size={size} className={className} />;
}

export const kindWord: Record<Kind, string> = { post: "Post", article: "Article", release: "Release" };

const kindStyle: Record<Kind, string> = {
  post: "text-[var(--kind-post)] bg-[var(--kind-post-soft)]",
  article: "text-[var(--kind-article)] bg-[var(--kind-article-soft)]",
  release: "text-[var(--kind-github)] bg-[var(--kind-github-soft)]",
};
export const kindColor: Record<Kind, string> = {
  post: "var(--kind-post)",
  article: "var(--kind-article)",
  release: "var(--kind-github)",
};
export const kindSoft: Record<Kind, string> = {
  post: "var(--kind-post-soft)",
  article: "var(--kind-article-soft)",
  release: "var(--kind-github-soft)",
};

export function KindGlyph({ kind, className }: { kind: Kind; className?: string }) {
  if (kind === "post") return <XLogo className={cn("size-3", className)} />;
  if (kind === "release") return <GitHubMark className={cn("size-3.5", className)} />;
  return <Newspaper className={cn("size-3.5", className)} strokeWidth={1.75} />;
}

/** Kind as a small chip: "2 Articles", "1 Post", "1 Release". The count always carries its unit. */
export function KindChip({ kind, count, className }: { kind: Kind; count?: number; className?: string }) {
  const word = count === undefined ? kindWord[kind] : kindCount(kind, count).replace(/^(\d+) (\w)/, (_, n, c) => `${n} ${c.toUpperCase()}`);
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium", kindStyle[kind], className)}>
      <KindGlyph kind={kind} className="size-3" />
      {word}
    </span>
  );
}

/** Group glyph for the small capitalized headers. */
export function GroupGlyph({ group, className }: { group: Group; className?: string }) {
  if (group === "x") return <XLogo className={cn("size-3", className)} />;
  if (group === "rss") return <Rss className={cn("size-3", className)} strokeWidth={2} />;
  if (group === "website") return <Globe className={cn("size-3", className)} strokeWidth={2} />;
  return <GitHubMark className={cn("size-3", className)} />;
}

/** The small capitalized group header: TWITTER ACCOUNTS, RSS FEEDS, WEBSITES, GITHUB. */
export function GroupLabel({ children, glyph, count, className }: { children: React.ReactNode; glyph?: React.ReactNode; count?: number; className?: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] text-t3 uppercase", className)}>
      {glyph}
      {children}
      {count !== undefined ? <span className="ml-auto tabular-nums tracking-normal">{count}</span> : null}
    </p>
  );
}

export type Tone = "ok" | "caution" | "error" | "brand" | "idle";

export function Dot({ tone, pulse = false, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  const color = { ok: "bg-[var(--ok)]", caution: "bg-[var(--caution)]", error: "bg-[var(--error)]", brand: "bg-[var(--brand)]", idle: "border border-t3" }[tone];
  return (
    <span aria-hidden="true" className={cn("relative inline-flex size-2 shrink-0", className)}>
      {pulse ? <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", color)} /> : null}
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  );
}

/** Overlapping marks for a story's items. */
export function MarkStack({ items, size = 18 }: { items: ItemView[]; size?: number }) {
  return (
    <span className="flex items-center">
      {items.map((item, i) => (
        <span key={item.id} className="rounded-full ring-2 ring-[var(--window)]" style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: items.length - i, borderRadius: item.kind === "post" ? 999 : 5 }}>
          <ItemMark item={item} size={size} className={item.kind === "post" ? "" : "rounded-[5px]"} />
        </span>
      ))}
    </span>
  );
}

/** Seven-day bars; the newest day in the brand blue. */
export function WeekBars({ week, height = 40, className }: { week: { day: string; label: string; count: number }[]; height?: number; className?: string }) {
  const max = Math.max(1, ...week.map((d) => d.count));
  return (
    <div className={cn("flex items-end gap-1.5", className)} style={{ height }} role="img" aria-label={week.map((d) => `${d.label}: ${d.count}`).join(", ")}>
      {week.map((d, i) => (
        <span key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.count} ${d.count === 1 ? "story" : "stories"}`}>
          <span
            className={cn("w-full rounded-[3px]", d.count === 0 ? "bg-line-strong" : i === week.length - 1 ? "bg-[var(--brand)]" : "bg-[var(--brand)]/45")}
            style={{ height: d.count === 0 ? 3 : `${(d.count / max) * 100}%` }}
          />
        </span>
      ))}
    </div>
  );
}

/** A segmented meter, one segment per unit. */
export function Segments({ total, filled, tone = "brand" }: { total: number; filled: number; tone?: Tone }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < filled ? (tone === "caution" ? "bg-[var(--caution)]" : "bg-[var(--brand)]") : "bg-line-strong")} />
      ))}
    </div>
  );
}

export { kindOf };
