"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronsUpDown, Layers, Rows3 } from "lucide-react";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { THEME_KEY, ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { type FeedStory, type ItemView, type View } from "./data";
import { ItemMark, KindGlyph } from "./marks";
import { kindOf } from "./data";

// Chrome for the Deck v2 screens, carried from the accepted feeds (next/council/chrome.tsx): the open member
// header with its mode badge, the visitor header, the Clustered and Direct switch, the primary blue action, tiles,
// and facts with their citations (a citation opens that fact's verbatim quote in place).

export const BASE = "/v2/deck";

/** Re-applies the pre-paint theme choice after mount (hydration can rewrite <html> without the class). */
export function useThemeGuard() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search).get("theme");
      const stored = localStorage.getItem(THEME_KEY);
      const t = q === "light" || q === "dark" ? q : stored === "light" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", t === "dark");
    } catch {}
  }, []);
}

/** Lifted surface recipe from the accepted Deck: window ground, strong hairline, card shadow and top light. */
export const lift = "rounded-xl border border-line-strong bg-[var(--window)]";
export const liftStyle = { boxShadow: "var(--card-shadow), var(--top-light)" } as const;

/** Page wrapper: theme scope plus the soft radial light from the top. */
export function Stage({ children, className, light = 560 }: { children: React.ReactNode; className?: string; light?: number }) {
  useThemeGuard();
  return (
    <div className={cn("palette-council relative flex min-h-svh flex-col", className)}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0" style={{ height: light, background: "var(--stage-light)" }} />
      {children}
    </div>
  );
}

/**
 * The Deck member header: an open row on the page at the cards' left edge (x 52 at 1440). The mark and the page
 * title, then the page's own controls; its actions, the person's initial (no @handle and no plan badge, owner Oct 8),
 * and the theme at the right.
 * The page's line and the preview note sit beneath.
 */
export function Header({
  title,
  sub,
  note,
  controls,
  actions,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  note?: string;
  controls?: React.ReactNode;
  actions?: React.ReactNode;
  freeWeek?: boolean;
}) {
  return (
    <header className="relative z-20">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`${BASE}/landing`} aria-label="Oparax home" className="shrink-0 rounded-sm text-t1">
            <OparaxMark className="size-[22px]" />
          </Link>
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">{title}</h1>
        </div>
        {controls}
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {actions}
          <span className="flex shrink-0 items-center gap-2 text-[13px] text-t1">
            <span className="grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>
            <ChevronsUpDown className="size-3.5 text-t3" aria-hidden="true" />
          </span>
          <ThemeToggle className="-ml-2 size-8 text-t3" />
        </div>
      </div>
      {sub || note ? (
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1.5">
          <div className="min-w-0">{sub}</div>
          {note ? <p className="text-[11.5px] text-t3">{note}</p> : null}
        </div>
      ) : null}
    </header>
  );
}

/** Visitor header for the landing and sign-up pages. */
export function SiteHeader({ nav = false }: { nav?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[var(--page)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-8 px-4 lg:px-8">
        <Link href={`${BASE}/landing`} className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-t1">
          <OparaxMark className="size-[22px]" />
          Oparax
        </Link>
        {nav ? (
          <nav aria-label="Primary" className="hidden items-center gap-6 text-[13.5px] text-t3 md:flex">
            <a href="#sources" className="transition-colors hover:text-t1">
              Sources
            </a>
            <a href="#agent" className="transition-colors hover:text-t1">
              Your agent
            </a>
            <a href="#pricing" className="transition-colors hover:text-t1">
              Pricing
            </a>
          </nav>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="size-8 text-t3" />
          <Link href={`${BASE}/login`} className="h-8 rounded-md px-3 text-[13px] leading-8 text-t2 transition-colors hover:text-t1">
            Log In
          </Link>
          <PrimaryLink href={`${BASE}/login?mode=signup`}>Sign Up</PrimaryLink>
        </div>
      </div>
    </header>
  );
}

const primary = cn(
  "inline-flex items-center justify-center gap-2 rounded-md bg-primary font-medium text-primary-foreground",
  "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)]",
  "transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

export function PrimaryLink({ href, children, className, size = "sm" }: { href: string; children: React.ReactNode; className?: string; size?: "sm" | "lg" }) {
  return (
    <Link href={href} className={cn(primary, size === "lg" ? "h-10 px-4 text-[14px]" : "h-8 px-3 text-[13px]", className)}>
      {children}
    </Link>
  );
}

/** The quiet secondary action: window ground, strong hairline. */
export function SecondaryLink({ href, children, className, size = "sm" }: { href: string; children: React.ReactNode; className?: string; size?: "sm" | "lg" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border border-line-strong bg-[var(--window)] font-medium text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        size === "lg" ? "h-10 px-4 text-[14px]" : "h-8 px-3 text-[13px]",
        className,
      )}
      style={{ boxShadow: "var(--top-light)" }}
    >
      {children}
    </Link>
  );
}

/** The product's primary action while alerts are not yet connected. */
export function AlertsButton({ className, full = false }: { className?: string; full?: boolean }) {
  return (
    <button type="button" className={cn(primary, "h-8 px-3 text-[13px]", full && "w-full", className)}>
      <XLogo className="size-3" />
      Get alerts on Twitter
    </button>
  );
}

export function ViewSwitch({ view, onChange, className }: { view: View; onChange: (v: View) => void; className?: string }) {
  const icon = { clustered: Layers, direct: Rows3 };
  return (
    <div
      role="tablist"
      aria-label="Feed view"
      className={cn("flex rounded-lg border border-line bg-[var(--well)] p-0.5", className)}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        onChange(view === "clustered" ? "direct" : "clustered");
        const el = e.currentTarget;
        requestAnimationFrame(() => (el.querySelector('[aria-selected="true"]') as HTMLElement | null)?.focus());
      }}
    >
      {(["clustered", "direct"] as const).map((v) => {
        const Icon = icon[v];
        const on = v === view;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(v)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] text-t3 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring",
              on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
            )}
          >
            <Icon className={cn("size-3.5", on && "text-[var(--brand)]")} aria-hidden="true" />
            {v === "clustered" ? "Clustered" : "Direct"}
          </button>
        );
      })}
    </div>
  );
}

export function Tile({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn(lift, "px-4 py-3.5", className)} style={liftStyle}>
      <p className="text-[12px] font-medium text-t3">{label}</p>
      {children}
    </section>
  );
}

/** Facts with their citations. A citation names the item's publisher; opening it shows the quoted span. */
export function Facts({ story, size = "sm", className }: { story: FeedStory; size?: "sm" | "md"; className?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const byId = new Map(story.items.map((i) => [i.id, i]));
  return (
    <ul className={cn("space-y-2", className)}>
      {story.card.facts.map((fact, fi) => {
        const cited = [...new Map(fact.evidence.map((e) => [e.item, byId.get(e.item)!])).values()].filter(Boolean);
        return (
          <li key={fi} className={cn("flex gap-2.5", size === "sm" ? "text-[13.5px] leading-[1.5]" : "text-[15px] leading-[1.55]")}>
            <span aria-hidden="true" className="mt-[0.62em] size-1 shrink-0 rounded-full bg-t3" />
            <div className="min-w-0">
              <span className="text-t2">{fact.text}</span>{" "}
              <span className="whitespace-nowrap text-t3">
                (
                {cited.map((item, ci) => {
                  const key = `${fi}:${item.id}`;
                  return (
                    <span key={item.id}>
                      {ci > 0 ? ", " : ""}
                      <button
                        type="button"
                        onClick={() => setOpen(open === key ? null : key)}
                        aria-expanded={open === key}
                        className={cn("underline-offset-[3px] transition-colors hover:text-t2 hover:underline", open === key && "text-[var(--brand)] underline")}
                      >
                        {item.publisher}
                      </button>
                    </span>
                  );
                })}
                )
              </span>
              {cited.map((item) =>
                open === `${fi}:${item.id}` ? <Quote key={item.id} item={item} spans={fact.evidence.filter((e) => e.item === item.id).map((e) => e.span)} /> : null,
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Quote({ item, spans, className }: { item: ItemView; spans: string[]; className?: string }) {
  const kind = kindOf(item);
  return (
    <figure
      className={cn(
        "mt-2 rounded-md border border-line bg-[var(--well)] px-3 py-2.5 text-[13px] leading-relaxed",
        kind === "post" ? "border-l-2 border-l-[var(--kind-post)]" : kind === "release" ? "border-l-2 border-l-[var(--kind-github)]" : "border-l-2 border-l-[var(--kind-article)]",
        className,
      )}
    >
      <figcaption className="mb-1 flex items-center gap-1.5 text-[11.5px] text-t3">
        <ItemMark item={item} size={13} />
        {item.publisher}
        <KindGlyph kind={kind} className="ml-1 size-3 text-t3" />
      </figcaption>
      {spans.map((s) => (
        <blockquote key={s} className="text-t2">
          “{s.replace(/^["“]|["”]$/g, "")}”
        </blockquote>
      ))}
    </figure>
  );
}
