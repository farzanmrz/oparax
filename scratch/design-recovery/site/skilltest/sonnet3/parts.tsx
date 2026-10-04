import { Globe, Layers, Rss } from "lucide-react";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { GitHubMark, KindChip, ReportMark } from "@/next/council/marks";
import { cn } from "@/lib/utils";
import type { ItemView } from "@/next/data/feed";
import { PREVIEW_NOTE } from "@/next/data/feed";

export function Nav() {
  return (
    <header className="s3-nav">
      <a className="s3-brand" href="#top">
        <OparaxMark className="size-[22px]" />
        Oparax
      </a>
      <nav className="s3-links" aria-label="Sections">
        <a href="#sources">Sources</a>
        <a href="#stories">Stories</a>
        <a href="#alerts">Alerts</a>
        <a href="#plans">Plans</a>
      </nav>
      <div className="s3-right">
        <span className="s3-note">{PREVIEW_NOTE}</span>
        <ThemeToggle className="size-8 text-t3" />
        <a className="s3-btn plain sm" href="#">Log in</a>
        <a className="s3-btn primary sm" href="#">Sign up</a>
      </div>
    </header>
  );
}

export function SignUpButton({ label = "Sign up with X", className }: { label?: string; className?: string }) {
  return (
    <a href="#" className={cn("s3-btn primary", className)}>
      <XLogo className="size-3.5" />
      {label}
    </a>
  );
}

export function Img({ src, alt = "", className, style }: { src: string; alt?: string; className?: string; style?: React.CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="eager" decoding="async" className={className} style={style} />;
}

export function PhMark({ size = 16 }: { size?: number }) {
  return <Img src="/brands/producthunt.svg" alt="" style={{ width: size, height: size, borderRadius: 4 }} />;
}

export type SourceKind = "x" | "rss" | "site" | "github" | "ph";
const kindMeta: Record<SourceKind, { cls: string; word: string }> = {
  x: { cls: "post", word: "X accounts" },
  rss: { cls: "rss", word: "RSS feeds" },
  site: { cls: "site", word: "Websites" },
  github: { cls: "github", word: "GitHub" },
  ph: { cls: "ph", word: "Product Hunt" },
};

export function SourceChip({ kind, count, word, large = false }: { kind: SourceKind; count?: number; word?: string; large?: boolean }) {
  const m = kindMeta[kind];
  return (
    <span className={cn("s3-chip", m.cls, large && "lg")}>
      {kind === "x" ? <XLogo className="size-3" /> : null}
      {kind === "rss" ? <Rss className="size-3.5" strokeWidth={2} /> : null}
      {kind === "site" ? <Globe className="size-3.5" strokeWidth={1.9} /> : null}
      {kind === "github" ? <GitHubMark className="size-3.5" /> : null}
      {kind === "ph" ? <PhMark size={14} /> : null}
      {count !== undefined ? <span className="s3-num">{count}</span> : null}
      {word ?? m.word}
    </span>
  );
}

export function Checking({ children }: { children: React.ReactNode }) {
  return (
    <div className="s3-row" style={{ background: "var(--caution-soft)", padding: "9px 14px", fontSize: 13, color: "var(--t1)", borderBottom: "1px solid var(--line)" }}>
      <span className="s3-spin" aria-hidden="true" />
      {children}
    </div>
  );
}

export function Joined({ n }: { n: number }) {
  return (
    <span className="s3-chip brand">
      <Layers className="size-3" />
      {n} reports
    </span>
  );
}

export function Mark({ item, size = 18 }: { item: ItemView; size?: number }) {
  return <ReportMark item={item} size={size} className={item.kind === "post" ? "" : "rounded-[5px]"} />;
}

export { KindChip };
