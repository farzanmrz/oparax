"use client";

import { useEffect } from "react";
import { Globe, Moon, Rss, Sun } from "lucide-react";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { GitHubMark, SiteIcon, XAvatar } from "@/next/council/marks";
import { THEME_KEY, toggleTheme } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { SourceKind } from "./data";

// Shared skin for the landing: source-kind badges with one hue each, source logos in their own colors,
// the slim top bar, and the compact section heading that sits inside the screen rather than above it.

export const kindMeta: Record<SourceKind, { word: string; plural: string; color: string; soft: string }> = {
  x: { word: "X account", plural: "X accounts", color: "var(--kind-post)", soft: "var(--kind-post-soft)" },
  website: { word: "Website", plural: "Websites", color: "var(--web)", soft: "var(--web-soft)" },
  rss: { word: "RSS feed", plural: "RSS feeds", color: "var(--rss)", soft: "var(--rss-soft)" },
  github: { word: "GitHub", plural: "GitHub", color: "var(--kind-github)", soft: "var(--kind-github-soft)" },
  producthunt: { word: "Product Hunt", plural: "Product Hunt", color: "var(--ph)", soft: "var(--ph-soft)" },
};

export function PhMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("size-4", className)}>
      <circle cx="20" cy="20" r="20" fill="currentColor" />
      <path d="M22.7 20H17v-6h5.7a3 3 0 1 1 0 6Zm0-10H13v20h4v-6h5.7a7 7 0 0 0 0-14Z" fill="#fff" />
    </svg>
  );
}

export function KindGlyph({ kind, className }: { kind: SourceKind; className?: string }) {
  if (kind === "x") return <XLogo className={cn("size-3", className)} />;
  if (kind === "github") return <GitHubMark className={cn("size-3.5", className)} />;
  if (kind === "rss") return <Rss className={cn("size-3.5", className)} strokeWidth={2.2} />;
  if (kind === "producthunt") return <PhMark className={cn("size-3.5", className)} />;
  return <Globe className={cn("size-3.5", className)} strokeWidth={2} />;
}

export function KindBadge({ kind, count, className, plural }: { kind: SourceKind; count?: number; className?: string; plural?: boolean }) {
  const m = kindMeta[kind];
  return (
    <span
      className={cn("inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium", className)}
      style={{ color: m.color, background: m.soft }}
    >
      <KindGlyph kind={kind} className="size-3" />
      {count !== undefined ? <span className="tabular-nums">{count}</span> : null}
      {plural ? m.plural : m.word}
    </span>
  );
}

/** A source's own mark: favicon for sites and feeds, avatar for X accounts, the GitHub mark, Product Hunt's. */
export function SourceLogo({ kind, host, handle, size = 18 }: { kind: SourceKind; host?: string; handle?: string; size?: number }) {
  if (kind === "x" && handle) return <XAvatar handle={handle} size={size} />;
  if (kind === "github")
    return (
      <span className="grid shrink-0 place-items-center rounded-[5px] bg-[#1f2328] text-white" style={{ width: size, height: size }}>
        <GitHubMark className="size-[70%]" />
      </span>
    );
  if (kind === "producthunt") return <PhMark className="text-[#da552f]" />;
  return <SiteIcon host={host ?? ""} size={size} />;
}

export function ThemeButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Switch light or dark mode"
      className={cn("grid size-8 place-items-center rounded-md text-t3 transition-colors hover:bg-raised hover:text-t1", className)}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </button>
  );
}

/** Re-applies the pre-paint theme after mount, in case a client render rewrote <html> without its class. */
function useThemeGuard() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search).get("theme");
      const stored = localStorage.getItem(THEME_KEY);
      const t = q === "light" || q === "dark" ? q : stored === "light" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", t === "dark");
    } catch {}
  }, []);
}

export function Nav() {
  useThemeGuard();
  const links = [
    ["Sources", "#sources"],
    ["Stories", "#stories"],
    ["Alerts and plans", "#alerts"],
    ["Start", "#start"],
  ];
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-line bg-[color-mix(in_oklab,var(--page)_82%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1360px] items-center gap-8 px-8">
        <a href="#top" className="flex items-center gap-2 text-[15px] font-semibold text-t1">
          <OparaxMark className="size-[18px]" />
          Oparax
        </a>
        <nav className="flex items-center gap-6 text-[13px] text-t3">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="transition-colors hover:text-t1">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeButton />
          <a href="#start" className="px-3 text-[13px] text-t2 hover:text-t1">
            Log in
          </a>
          <PrimaryButton>Sign up</PrimaryButton>
        </div>
      </div>
    </header>
  );
}

export function PrimaryButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)]",
        "transition-[filter] hover:brightness-110",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center justify-center gap-2 rounded-md border border-line-strong bg-raised px-3.5 text-[13px] font-medium text-t1",
        "shadow-[var(--top-light)] transition-colors hover:bg-well",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Section heading inside the screen: title and one line, with an optional right-hand object. */
export function Head({ title, line, children }: { title: string; line: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-8">
      <div className="max-w-[640px]">
        <h2 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.015em] text-t1">{title}</h2>
        <p className="mt-2 text-[14.5px] leading-[1.55] text-t3">{line}</p>
      </div>
      {children}
    </div>
  );
}
