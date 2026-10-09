"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Newspaper, Rss } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { hostOf, type FeedItem, type Group, type Kind, type Source } from "./data";

// Identity marks, copied from the accepted feed (next/council/marks.tsx) and adapted: GitHub is a kind like
// post and article. Runtime public images only: Google's favicon service with DuckDuckGo as the second try,
// unavatar for Twitter accounts, a glyph last.

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

export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4 fill-current", className)}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/** Google's G in its own colors (a real logo keeps its colors). */
export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4", className)}>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

/** A source's mark: round avatar for an Twitter account, the GitHub mark for a repository, a favicon otherwise. */
export function SourceMark({ source, size = 18, className }: { source: Source; size?: number; className?: string }) {
  if (source.group === "x") return <XAvatar handle={source.handle} size={size} className={className} />;
  if (source.group === "github")
    return (
      <span
        className={cn("grid shrink-0 place-items-center rounded-[5px] bg-[var(--kind-github-soft)] text-[var(--kind-github)]", className)}
        style={{ width: size, height: size }}
      >
        <GitHubMark className="size-[72%]" />
      </span>
    );
  return <SiteIcon host={source.host} size={size} className={className} />;
}

/** An item's publisher mark. */
export function ItemMark({ item, size = 16, className }: { item: FeedItem; size?: number; className?: string }) {
  if (item.kind === "post" && item.author) return <XAvatar handle={item.author} size={size} className={className} />;
  if (item.kind === "github")
    return (
      <span
        className={cn("grid shrink-0 place-items-center rounded-[5px] bg-[var(--kind-github-soft)] text-[var(--kind-github)]", className)}
        style={{ width: size, height: size }}
      >
        <GitHubMark className="size-[72%]" />
      </span>
    );
  return <SiteIcon host={hostOf(item.url)} size={size} className={className} />;
}

const kindStyle: Record<Kind, string> = {
  post: "text-[var(--kind-post)] bg-[var(--kind-post-soft)]",
  article: "text-[var(--kind-article)] bg-[var(--kind-article-soft)]",
  github: "text-[var(--kind-github)] bg-[var(--kind-github-soft)]",
};

const kindLabel: Record<Kind, string> = { post: "Post", article: "Article", github: "GitHub" };

export function KindGlyph({ kind, className }: { kind: Kind; className?: string }) {
  if (kind === "post") return <XLogo className={cn("size-3", className)} />;
  if (kind === "github") return <GitHubMark className={cn("size-3.5", className)} />;
  return <Newspaper className={cn("size-3.5", className)} strokeWidth={1.75} />;
}

export function GroupGlyph({ group, className }: { group: Group; className?: string }) {
  if (group === "x") return <XLogo className={cn("size-3", className)} />;
  if (group === "github") return <GitHubMark className={cn("size-3", className)} />;
  if (group === "rss") return <Rss className={cn("size-3", className)} strokeWidth={2} />;
  return <Globe className={cn("size-3", className)} strokeWidth={2} />;
}

export function KindTile({ kind, size = 24, className }: { kind: Kind; size?: number; className?: string }) {
  return (
    <span
      title={kindLabel[kind]}
      className={cn("grid shrink-0 place-items-center rounded-md", kindStyle[kind], className)}
      style={{ width: size, height: size }}
    >
      <KindGlyph kind={kind} />
    </span>
  );
}

/** Kind as a chip with its word, or with a count and a unit ("2 articles"). */
export function KindChip({ kind, label, className }: { kind: Kind; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium whitespace-nowrap", kindStyle[kind], className)}>
      <KindGlyph kind={kind} className="size-3" />
      {label ?? kindLabel[kind]}
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

/** A stepped area line (the accepted Newsroom metric card). */
export function StepArea({ values, width = 260, height = 56, id = "nr-step", className }: { values: number[]; width?: number; height?: number; id?: string; className?: string }) {
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
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--brand)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke="var(--brand)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A segmented meter, one segment per unit (free-week days). */
export function Segments({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < filled ? "bg-[var(--brand)]" : "bg-line-strong")} />
      ))}
    </div>
  );
}

/** An address or handle that may wrap only after a slash, never mid-token. */
export function Handle({ value }: { value: string }) {
  const parts = value.split("/");
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 ? (
            <>
              /<wbr />
            </>
          ) : null}
        </span>
      ))}
    </>
  );
}
