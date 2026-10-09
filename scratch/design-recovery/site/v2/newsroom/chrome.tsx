"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { THEME_KEY, ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { PREVIEW_NOTE, type FeedItem, type Story } from "./data";
import { ItemMark, KindGlyph } from "./marks";

// Newsroom chrome, carried from the accepted feed (next/council/chrome.tsx): the masthead with the page title,
// the person and the FREE WEEK badge, the primary blue action, facts with parenthesized citations that open the
// quoted span in place, and the status tile (icon tile, mono label, value). Plus the page wrapper with the
// lit stage and the marketing nav for the visitor screens.

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

/** The page: palette wrapper, quiet ground, soft radial light from the top. */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  useThemeGuard();
  return (
    <div className={cn("palette-council relative flex min-h-svh flex-col overflow-x-clip", className)}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[760px]" style={{ background: "var(--stage-light)" }} />
      <div className="relative flex min-h-svh flex-col">{children}</div>
    </div>
  );
}

export const SAMPLE_NOTE = "Sample build with illustrative values, not from your agent.";

/**
 * The Newsroom masthead, set on the page at the content inset: the mark and the page title on the left; the
 * person's initial and the theme on the right (no @handle and no plan badge, owner Oct 8); the preview note small beneath.
 */
export function Masthead({ title, note = PREVIEW_NOTE, className }: { title: string; badge?: boolean; note?: string; className?: string }) {
  return (
    <header className={cn("relative z-20 px-4 pt-6 lg:px-7", className)}>
      <div className="flex items-center gap-3.5">
        <OparaxMark className="size-[22px] shrink-0 text-t1" />
        <h1 className="min-w-0 text-[26px] leading-tight font-semibold tracking-[-0.025em] text-t1">{title}</h1>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-2 text-[13px] text-t1">
            <span className="grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>
            <ChevronsUpDown className="size-3.5 text-t3" />
          </span>
          <ThemeToggle className="size-8 text-t3" />
        </div>
      </div>
      <p className="mt-1 text-[11.5px] text-t3">{note}</p>
    </header>
  );
}

/** Marketing nav for the visitor screens (landing, sign up). */
export function SiteNav({ theme, active }: { theme?: string; active?: "signup" }) {
  const q = theme ? `?theme=${theme}` : "";
  return (
    <header className="relative z-20 border-b border-line bg-[var(--page)]/70 backdrop-blur">
      <div className="flex h-14 items-center gap-8 px-4 lg:px-7">
        <Link href={`/v2/newsroom/landing${q}`} className="flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-t1">
          <OparaxMark className="size-[20px]" />
          Oparax
        </Link>
        <nav aria-label="Sections" className="flex items-center gap-6 text-[13.5px] text-t2">
          <a href={`/v2/newsroom/landing${q}#product`} className="hover:text-t1">Product</a>
          <a href={`/v2/newsroom/landing${q}#sources`} className="hover:text-t1">Sources</a>
          <a href={`/v2/newsroom/landing${q}#pricing`} className="hover:text-t1">Pricing</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="size-8 text-t3" />
          <Link href={`/v2/newsroom/login${q}`} className="px-3 text-[13.5px] text-t2 hover:text-t1">
            Log In
          </Link>
          {active === "signup" ? null : (
            <PrimaryLink href={`/v2/newsroom/login${q ? q + "&" : "?"}mode=signup`}>Sign Up</PrimaryLink>
          )}
        </div>
      </div>
    </header>
  );
}

export const primaryClass = cn(
  "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-[13.5px] font-medium text-primary-foreground",
  "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)]",
  "transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

export const secondaryClass = cn(
  "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line-strong bg-[var(--window)] px-3.5 text-[13.5px] font-medium text-t1",
  "transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

export function PrimaryLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn(primaryClass, className)}>
      {children}
    </Link>
  );
}

export function AlertsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={cn(primaryClass, "h-8 px-3 text-[13px]", className)}>
      <XLogo className="size-3" />
      Get alerts on Twitter
    </button>
  );
}

/** Small capitalized mono label (the Newsroom header idiom). */
export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[10.5px] tracking-[0.08em] text-t3", className)}>{children}</p>;
}

/** The lifted surface: window color, strong hairline, card shadow and top light. */
export function Lifted({
  children,
  className,
  strong = false,
  as: Tag = "section",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
  as?: "section" | "div" | "aside";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      {...rest}
      className={cn("overflow-hidden rounded-xl border border-line-strong bg-[var(--window)]", className)}
      style={{ boxShadow: strong ? "var(--window-shadow), var(--top-light)" : "var(--card-shadow), var(--top-light)" }}
    >
      {children}
    </Tag>
  );
}

export function StatusTile({
  icon,
  label,
  children,
  tone,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  tone?: "ok" | "caution" | "error" | "post" | "article";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border border-line bg-[var(--window)] p-2.5", className)} style={{ boxShadow: "var(--top-light)" }}>
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-md border border-line bg-[var(--raised)] text-t2",
          tone === "ok" && "text-[var(--ok)]",
          tone === "caution" && "text-[var(--caution)]",
          tone === "error" && "text-[var(--error)]",
          tone === "post" && "text-[var(--kind-post)]",
          tone === "article" && "text-[var(--kind-article)]",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.08em] text-t3">{label}</p>
        <div className="mt-0.5 text-[13px] text-t1">{children}</div>
      </div>
    </div>
  );
}

/** The live agent glyph from the accepted feed: six green dots. */
export function LiveDots() {
  return (
    <span className="grid grid-cols-3 gap-[3px]">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="size-[5px] rounded-full bg-[var(--ok)]" />
      ))}
    </span>
  );
}

/** Facts with citations. A citation names the item's publisher; opening it shows the quoted span in place. */
export function Facts({ story, size = "md", className }: { story: Story; size?: "sm" | "md"; className?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const byId = new Map(story.items.map((i) => [i.id, i]));
  return (
    <ul className={cn(size === "sm" ? "space-y-1.5" : "space-y-2", className)}>
      {story.card.facts.map((fact, fi) => {
        const cited = [...new Map(fact.evidence.map((e) => [e.item, byId.get(e.item)!])).values()].filter(Boolean);
        return (
          <li key={fi} className={cn("flex gap-2.5", size === "sm" ? "text-[13px] leading-[1.5]" : "text-[14.5px] leading-[1.55]")}>
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
                        className={cn(
                          "underline-offset-[3px] transition-colors hover:text-t1 hover:underline focus-visible:outline-2 focus-visible:outline-ring",
                          open === key && "text-[var(--brand)] underline",
                        )}
                      >
                        {item.kind === "github" ? "GitHub" : item.publisher}
                      </button>
                    </span>
                  );
                })}
                )
              </span>
              {cited.map((item) =>
                open === `${fi}:${item.id}` ? (
                  <Quote key={item.id} item={item} spans={fact.evidence.filter((e) => e.item === item.id).map((e) => e.span)} />
                ) : null,
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const quoteEdge = { post: "border-l-[var(--kind-post)]", article: "border-l-[var(--kind-article)]", github: "border-l-[var(--kind-github)]" };

export function Quote({ item, spans, className }: { item: FeedItem; spans: string[]; className?: string }) {
  return (
    <figure className={cn("mt-2 rounded-md border border-l-2 border-line bg-[var(--well)] px-3 py-2.5 text-[13px] leading-relaxed", quoteEdge[item.kind], className)}>
      <figcaption className="mb-1 flex items-center gap-1.5 text-[11.5px] text-t3">
        <ItemMark item={item} size={13} />
        {item.kind === "github" ? item.author : item.publisher}
        <KindGlyph kind={item.kind} className="ml-1 size-3 text-t3" />
      </figcaption>
      {spans.map((s) => (
        <blockquote key={s} className={cn("text-t2", item.kind === "github" && "font-mono text-[12px]")}>
          {item.kind === "github" ? s : `“${s.replace(/^["“]|["”]$/g, "")}”`}
        </blockquote>
      ))}
    </figure>
  );
}
