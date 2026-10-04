"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Newspaper, Rss } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { kindWord, type Group, type Item, type Kind, type Source } from "./data";

// Native-color identity marks, copied from next/council/marks.tsx and extended for the v2 source groups.
// Runtime public images only: Google's favicon service for sites (DuckDuckGo second), unavatar for X accounts.

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
      decoding="async"
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function GitHubMark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4 fill-current", className)} style={style}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function ProductHuntMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/roadmap-brands/producthunt.png" alt="" className={cn("shrink-0 rounded-full", className)} style={{ width: size, height: size }} />
  );
}

/** A source's identity: round avatar for an X account, favicon for a feed or website, the brand mark otherwise. */
export function SourceMark({ source, size = 16, className }: { source: Source; size?: number; className?: string }) {
  if (source.group === "x") return <XAvatar handle={source.handle} size={size} className={className} />;
  if (source.group === "github")
    return (
      <span
        className={cn("grid shrink-0 place-items-center rounded-full bg-[var(--kind-github)] text-[var(--window)]", className)}
        style={{ width: size, height: size }}
      >
        <GitHubMark style={{ width: size * 0.78, height: size * 0.78 }} />
      </span>
    );
  if (source.group === "producthunt") return <ProductHuntMark size={size} className={className} />;
  return <SiteIcon host={source.host!} size={size} className={className} />;
}

/** An item's publisher mark. */
export function ItemMark({ item, size = 16, className }: { item: Item; size?: number; className?: string }) {
  if (item.kind === "post" && item.author) return <XAvatar handle={item.author} size={size} className={className} />;
  if (item.kind === "github")
    return (
      <span
        className={cn("grid shrink-0 place-items-center rounded-full bg-[var(--kind-github)] text-[var(--window)]", className)}
        style={{ width: size, height: size }}
      >
        <GitHubMark style={{ width: size * 0.78, height: size * 0.78 }} />
      </span>
    );
  return <SiteIcon host={new URL(item.url).hostname.replace(/^www\./, "")} size={size} className={className} />;
}

export function GroupGlyph({ group, className }: { group: Group; className?: string }) {
  if (group === "x") return <XLogo className={cn("size-3", className)} />;
  if (group === "rss") return <Rss className={cn("size-3", className)} strokeWidth={2} />;
  if (group === "website") return <Globe className={cn("size-3", className)} strokeWidth={2} />;
  if (group === "github") return <GitHubMark className={cn("size-3", className)} />;
  return <ProductHuntMark size={12} className={className} />;
}

const kindStyle: Record<Kind, string> = {
  post: "text-[var(--kind-post)] bg-[var(--kind-post-soft)]",
  article: "text-[var(--kind-article)] bg-[var(--kind-article-soft)]",
  github: "text-[var(--kind-github)] bg-[var(--kind-github-soft)]",
};

export function KindGlyph({ kind, className }: { kind: Kind; className?: string }) {
  if (kind === "post") return <XLogo className={cn("size-3", className)} />;
  if (kind === "github") return <GitHubMark className={cn("size-3.5", className)} />;
  return <Newspaper className={cn("size-3.5", className)} strokeWidth={1.75} />;
}

/** Kind as a chip with its word and, when given, the count of that kind in the story. */
export function KindChip({ kind, count, className }: { kind: Kind; count?: number; className?: string }) {
  const [one, many] = kindWord[kind];
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium", kindStyle[kind], className)}>
      <KindGlyph kind={kind} className="size-3" />
      {count !== undefined ? `${count} ${count === 1 ? one : many}` : one}
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
    idle: "border border-t3",
  }[tone];
  return (
    <span aria-hidden="true" className={cn("relative inline-flex size-2 shrink-0", className)}>
      {pulse ? <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", color)} /> : null}
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  );
}

/** Overlapping identity marks for a story's sources. */
export function MarkStack({ items, size = 18 }: { items: Item[]; size?: number }) {
  return (
    <span className="flex items-center">
      {items.map((item, i) => (
        <span key={item.id} className="rounded-full ring-2 ring-[var(--window)]" style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: items.length - i }}>
          <ItemMark item={item} size={size} />
        </span>
      ))}
    </span>
  );
}

/** A segmented meter, one segment per unit (free-week days). */
export function Segments({ total, filled, tone = "brand" }: { total: number; filled: number; tone?: Tone }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn("h-1.5 flex-1 rounded-full", i < filled ? (tone === "caution" ? "bg-[var(--caution)]" : "bg-[var(--brand)]") : "bg-line-strong")}
        />
      ))}
    </div>
  );
}

/** Seven-day bars from stored publication dates, stacked by kind in the kind colors. */
export function KindBars({
  week,
  height = 44,
  className,
}: {
  week: { day: string; label: string; article: number; post: number; github: number }[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...week.map((d) => d.article + d.post + d.github));
  return (
    <div className={cn("flex items-end gap-1.5", className)} style={{ height }} role="img" aria-label="Articles and posts per day, by publication date">
      {week.map((d) => {
        const total = d.article + d.post + d.github;
        return (
          <span key={d.day} className="flex h-full flex-1 flex-col justify-end gap-px" title={`${d.label}: ${total}`}>
            {total === 0 ? <span className="h-[3px] w-full rounded-[3px] bg-line-strong" /> : null}
            {d.post ? <span className="w-full rounded-[3px] bg-[var(--kind-post)]" style={{ height: `${(d.post / max) * 100}%` }} /> : null}
            {d.github ? <span className="w-full rounded-[3px] bg-[var(--kind-github)]" style={{ height: `${(d.github / max) * 100}%` }} /> : null}
            {d.article ? <span className="w-full rounded-[3px] bg-[var(--kind-article)]" style={{ height: `${(d.article / max) * 100}%` }} /> : null}
          </span>
        );
      })}
    </div>
  );
}
