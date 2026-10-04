"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Newspaper, Rss } from "lucide-react";
import type { Kind } from "./data";

// Identity marks in their own colors. Runtime public images only: Google's favicon service (DuckDuckGo second),
// unavatar for X accounts, a neutral glyph last. Nothing is downloaded into the repo.

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

export function SiteIcon({ host, size = 16 }: { host: string; size?: number }) {
  const { src, ref, next } = useFallback([
    `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
  ]);
  if (!src)
    return (
      <span className="s-ico s-ico-fallback" style={{ width: size, height: size }} aria-hidden="true">
        <Globe size={size * 0.62} />
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt="" onError={next} loading="lazy" decoding="async" className="s-ico" style={{ width: size, height: size }} />
  );
}

export function XAvatar({ handle, size = 20 }: { handle: string; size?: number }) {
  const { src, ref, next } = useFallback([`https://unavatar.io/x/${handle.replace("@", "")}`]);
  if (!src)
    return (
      <span className="s-avatar s-avatar-fallback" style={{ width: size, height: size }} aria-hidden="true">
        <XGlyph size={size * 0.55} />
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt="" onError={next} loading="lazy" decoding="async" className="s-avatar" style={{ width: size, height: size }} />
  );
}

/** An image that disappears if it fails, so a missing cover never leaves a hole. */
export function Cover({ src, className }: { src: string; className?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setOk(false)} className={className} />;
}

export function XGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function GitHubGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.6-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function ProductHuntGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d="M13.604 8.4h-3.405V12h3.405c.995 0 1.801-.806 1.801-1.801 0-.993-.805-1.799-1.801-1.799zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H7.801V6h5.804c2.319 0 4.2 1.88 4.2 4.199 0 2.321-1.881 4.201-4.201 4.201z" />
    </svg>
  );
}

/** The Oparax mark: two brackets around a dot. */
export function OparaxMark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size} aria-hidden="true">
      <path
        d="M 431.77 811.44 A 310 310 0 0 1 431.77 212.56 M 592.23 212.56 A 310 310 0 0 1 592.23 811.44"
        fill="none"
        stroke="currentColor"
        strokeWidth="73"
        strokeLinecap="round"
      />
      <circle cx="512" cy="512" r="132" fill="currentColor" />
    </svg>
  );
}

export function KindGlyph({ kind, size = 14 }: { kind: Kind; size?: number }) {
  if (kind === "post") return <XGlyph size={size - 2} />;
  if (kind === "github") return <GitHubGlyph size={size} />;
  return <Newspaper size={size} strokeWidth={1.8} />;
}

/** Kind as a colored tile: the hue says post, article or release, and the glyph says it again. */
export function KindTile({ kind, size = 22 }: { kind: Kind; size?: number }) {
  return (
    <span className={`s-kind s-kind-${kind}`} style={{ width: size, height: size }} aria-hidden="true">
      <KindGlyph kind={kind} size={Math.round(size * 0.58)} />
    </span>
  );
}

export function FeedGlyph({ size = 14 }: { size?: number }) {
  return <Rss size={size} strokeWidth={1.9} />;
}
export function WebGlyph({ size = 14 }: { size?: number }) {
  return <Globe size={size} strokeWidth={1.8} />;
}
