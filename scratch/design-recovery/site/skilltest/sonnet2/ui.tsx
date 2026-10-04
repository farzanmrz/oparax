"use client";

import { useRef, useState, useEffect } from "react";
import { Newspaper, Rss, Globe } from "lucide-react";

// Real marks, in their own colors where the product shows them: favicons for sites, avatars for X accounts.
// A colored initial sits under the image so a failed load still reads as an identity.

export function Logo({ host, size = 18, round = false, label }: { host: string; size?: number; round?: boolean; label?: string }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  const urls = [`https://www.google.com/s2/favicons?domain=${host}&sz=64`, `https://icons.duckduckgo.com/ip3/${host}.ico`];
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setI((n) => n + 1);
  }, [i]);
  const letter = (label ?? host).replace(/^@/, "").charAt(0).toUpperCase();
  return (
    <span className="s2-logo" style={{ width: size, height: size, borderRadius: round ? 999 : Math.max(3, size / 4.5), fontSize: size * 0.55 }}>
      <b>{letter}</b>
      {urls[i] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={ref} src={urls[i]} alt="" onError={() => setI((n) => n + 1)} loading="lazy" />
      ) : null}
    </span>
  );
}

export function Avatar({ handle, size = 18 }: { handle: string; size?: number }) {
  const [bad, setBad] = useState(false);
  const h = handle.replace("@", "");
  return (
    <span className="s2-logo" style={{ width: size, height: size, borderRadius: 999, fontSize: size * 0.55 }}>
      <b>{h.charAt(0).toUpperCase()}</b>
      {!bad ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://unavatar.io/x/${h}`} alt="" onError={() => setBad(true)} loading="lazy" style={{ borderRadius: 999 }} />
      ) : null}
    </span>
  );
}

export function Thumb({ src, className }: { src: string | null; className?: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <span className={`s2-thumb s2-thumb-empty ${className ?? ""}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={`s2-thumb ${className ?? ""}`} onError={() => setBad(true)} loading="lazy" />;
}

export function XMark({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
    </svg>
  );
}
export function GitHubMark({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
export function PHMark({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d="M13.604 8.4h-3.405V12h3.405c.995 0 1.801-.806 1.801-1.801 0-.993-.805-1.799-1.801-1.799zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H7.801V6h5.804c2.319 0 4.2 1.88 4.2 4.199 0 2.321-1.881 4.201-4.201 4.201z" />
    </svg>
  );
}
export function OparaxMark({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size} aria-hidden="true">
      <path d="M 431.77 811.44 A 310 310 0 0 1 431.77 212.56 M 592.23 212.56 A 310 310 0 0 1 592.23 811.44" fill="none" stroke="currentColor" strokeWidth="73" strokeLinecap="round" />
      <circle cx="512" cy="512" r="132" fill="currentColor" />
    </svg>
  );
}

export type Hue = "blue" | "green" | "violet" | "amber" | "red" | "cyan" | "orange";

export function KindIcon({ kind, size = 12 }: { kind: string; size?: number }) {
  if (kind === "x_account" || kind === "post") return <XMark size={size} />;
  if (kind === "github") return <GitHubMark size={size + 1} />;
  if (kind === "product_hunt") return <PHMark size={size + 1} />;
  if (kind === "rss") return <Rss size={size} strokeWidth={2.2} />;
  if (kind === "website") return <Globe size={size} strokeWidth={2} />;
  return <Newspaper size={size} strokeWidth={2} />;
}

const REPORT_HUE: Record<string, Hue> = { post: "blue", article: "green", github: "violet", product_hunt: "orange" };
const REPORT_WORD: Record<string, string> = { post: "Post", article: "Article", github: "GitHub", product_hunt: "Product Hunt" };

/** A report's kind as a colored chip: hue, glyph and word. */
export function ReportChip({ kind, n }: { kind: string; n?: number }) {
  return (
    <span className={`s2-chip h-${REPORT_HUE[kind]}`}>
      <KindIcon kind={kind} />
      {n && n > 1 ? `${n} ` : ""}
      {REPORT_WORD[kind]}
      {n && n > 1 ? "s" : ""}
    </span>
  );
}

export function SourcePill({ kind, hue, label }: { kind: string; hue: Hue; label: string }) {
  return (
    <span className={`s2-chip h-${hue}`}>
      <KindIcon kind={kind} />
      {label}
    </span>
  );
}

export function Stack({ items, size = 16 }: { items: { host?: string; handle?: string }[]; size?: number }) {
  return (
    <span className="s2-stack">
      {items.slice(0, 3).map((it, i) => (
        <span key={i} style={{ zIndex: 5 - i }}>
          {it.handle ? <Avatar handle={it.handle} size={size} /> : <Logo host={it.host!} size={size} round />}
        </span>
      ))}
    </span>
  );
}

export function Spinner() {
  return <span className="s2-spin" aria-hidden="true" />;
}
