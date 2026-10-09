"use client";

// Identity marks from the One design (preview v2/deck/marks.tsx): a site's favicon from Google's favicon service
// (DuckDuckGo second), an X account's avatar from unavatar, a glyph last. Real logos keep their own colors.

import { Globe, Newspaper, Rss } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { cn } from "@/lib/utils";

/** Walks the candidate images in order; an image that already failed before hydration moves on at mount. */
function useFallback(sources: string[]) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setIndex((i) => i + 1);
  });
  return { src: sources[index], ref, next: () => setIndex((i) => i + 1) };
}

export function SiteIcon({
  host,
  size = 16,
  className,
}: {
  host: string;
  size?: number;
  className?: string;
}) {
  const { src, ref, next } = useFallback([
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
  ]);
  if (!src)
    return (
      <span
        aria-hidden="true"
        className={cn(
          "grid shrink-0 place-items-center rounded-[4px] bg-raised text-t3",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <Globe style={{ width: size * 0.62, height: size * 0.62 }} />
      </span>
    );
  return (
    // biome-ignore lint/performance/noImgElement: Third-party favicons load in the browser with no referrer.
    <img
      ref={ref}
      src={src}
      alt=""
      onError={next}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-[4px] bg-white object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function XAvatar({
  handle,
  size = 18,
  className,
}: {
  handle: string;
  size?: number;
  className?: string;
}) {
  const { src, ref, next } = useFallback([
    `https://unavatar.io/x/${encodeURIComponent(handle.replace(/^@/, ""))}`,
  ]);
  if (!src)
    return (
      <span
        aria-hidden="true"
        className={cn("grid shrink-0 place-items-center rounded-full bg-raised text-t3", className)}
        style={{ width: size, height: size }}
      >
        <BrandIcon name="x" className="size-[55%]" />
      </span>
    );
  return (
    // biome-ignore lint/performance/noImgElement: Third-party avatars load in the browser with no referrer.
    <img
      ref={ref}
      src={src}
      alt=""
      onError={next}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** A GitHub source: the octocat on its own neutral tile. */
export function GitHubTile({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-[5px] bg-[var(--kind-github-soft)] text-[var(--kind-github)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <BrandIcon name="github" className="size-[72%]" />
    </span>
  );
}

export type MarkKind = "x" | "site" | "github";

/** A source's mark: round avatar for X, square favicon for a site or feed, the GitHub tile for a repository. */
export function SourceMark({
  kind,
  mark,
  size = 16,
  className,
}: {
  kind: MarkKind;
  /** The X handle for an account, the host for a site. */
  mark: string;
  size?: number;
  className?: string;
}) {
  if (kind === "x") return <XAvatar handle={mark} size={size} className={className} />;
  if (kind === "github") return <GitHubTile size={size} className={className} />;
  return <SiteIcon host={mark} size={size} className={cn("rounded-[5px]", className)} />;
}

/** A kind's glyph beside its group label: X, RSS, GitHub, or the globe for a website. */
export function GroupGlyph({ kind, className }: { kind: string; className?: string }) {
  if (kind === "x_account" || kind === "x") return <BrandIcon name="x" className={className} />;
  if (kind === "rss") return <Rss className={className} strokeWidth={2} aria-hidden="true" />;
  if (kind === "github") return <BrandIcon name="github" className={className} />;
  return <Globe className={className} strokeWidth={2} aria-hidden="true" />;
}

/** What an item or a source carries: a Twitter post, an article from a site or feed, or a GitHub repository. */
export type Kind = "post" | "article" | "github";

const kindStyle: Record<Kind, string> = {
  post: "bg-[var(--kind-post-soft)] text-[var(--kind-post)]",
  article: "bg-[var(--kind-article-soft)] text-[var(--kind-article)]",
  github: "bg-[var(--kind-github-soft)] text-[var(--kind-github)]",
};

export function KindGlyph({ kind, className }: { kind: Kind; className?: string }) {
  if (kind === "post") return <BrandIcon name="x" className={cn("size-2.5", className)} />;
  if (kind === "github") return <BrandIcon name="github" className={cn("size-3", className)} />;
  return <Newspaper className={cn("size-3", className)} strokeWidth={1.75} aria-hidden="true" />;
}

/** A kind as a coloured chip: its glyph and, when given, its word or count ("Post", "2 articles"). */
export function KindChip({
  kind,
  children,
  className,
}: {
  kind: Kind;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-medium whitespace-nowrap",
        children ? "h-[22px] px-2 text-[11.5px]" : "size-[18px] justify-center",
        kindStyle[kind],
        className,
      )}
    >
      <KindGlyph kind={kind} />
      {children}
    </span>
  );
}
