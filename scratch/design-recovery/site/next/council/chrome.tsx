"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronsUpDown, Layers, Rows3 } from "lucide-react";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { THEME_KEY, ThemeToggle } from "../theme";
import { cn } from "@/lib/utils";
import type { FeedStory, ItemView } from "../data/feed";
import { counts, HANDLE, hrefWith, PREVIEW_NOTE, type View } from "./data";
import { KindGlyph, ReportMark } from "./marks";

// Chrome shared by the three council directions: the slim top bar (Supabase breadcrumb logic with a mode
// badge), the Direct and Clustered switch (links, so each view has a URL), the primary blue action, and the
// story's facts with their parenthesized citations, which open that fact's verbatim quotes in place.

/** Re-applies the pre-paint theme choice after mount. If hydration ever falls back to a client render, React
 * rewrites <html> without the class the layout script set; this puts it back. */
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

export function TopBar({ title, className }: { title: string; className?: string }) {
  useThemeGuard();
  return (
    <header className={cn("relative z-20 flex h-12 shrink-0 items-center gap-3 border-b border-line px-4", className)}>
      <OparaxMark className="size-[18px] text-t1" />
      <span className="text-t4">/</span>
      <span className="flex items-center gap-2 text-[13px] text-t1">
        <span className="grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>
        @{HANDLE}
        <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide text-[var(--caution)]">
          FREE WEEK
        </span>
        <ChevronsUpDown className="size-3.5 text-t4" />
      </span>
      <span className="text-t4">/</span>
      <span className="text-[13px] text-t2">{title}</span>
      <div className="ml-auto flex items-center gap-2">
        <span className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-t3">{PREVIEW_NOTE}</span>
        <ThemeToggle className="size-8 text-t3" />
      </div>
    </header>
  );
}

export function ViewSwitch({ base, view, theme, className }: { base: string; view: View; theme?: string; className?: string }) {
  const icon = { clustered: Layers, direct: Rows3 };
  return (
    <nav aria-label="Feed view" className={cn("flex rounded-lg border border-line bg-[var(--well)] p-0.5", className)}>
      {(["clustered", "direct"] as const).map((v) => {
        const Icon = icon[v];
        const on = v === view;
        return (
          <Link
            key={v}
            href={hrefWith(base, { view: v, theme })}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] text-t3 transition-colors hover:text-t1",
              on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
            )}
          >
            <Icon className={cn("size-3.5", on && "text-[var(--brand)]")} aria-hidden="true" />
            {v === "clustered" ? "Clustered" : "Direct"}
            <span className="tabular-nums text-t4">{counts[v]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** The product's primary action while alerts are not yet connected (bot-button.tsx copy). */
export function AlertsButton({ className, full = false }: { className?: string; full?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center justify-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)]",
        "transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        full && "w-full",
        className,
      )}
    >
      <XLogo className="size-3" />
      Get alerts on X
    </button>
  );
}

/** Facts with their citations. A citation names the report's publisher; opening it shows the quoted span. */
export function Facts({
  story,
  max,
  size = "md",
  className,
}: {
  story: FeedStory;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const byId = new Map(story.items.map((i) => [i.id, i]));
  const facts = max ? story.card.facts.slice(0, max) : story.card.facts;
  return (
    <ul className={cn("space-y-2", className)}>
      {facts.map((fact, fi) => {
        const cited = [...new Map(fact.evidence.map((e) => [e.item, byId.get(e.item)!])).values()];
        return (
          <li key={fi} className={cn("flex gap-2.5", size === "sm" ? "text-[13px] leading-[1.5]" : "text-[14.5px] leading-[1.55]")}>
            <span aria-hidden="true" className={cn("mt-[0.6em] size-1 shrink-0 rounded-full bg-t4", size === "md" && "mt-[0.62em]")} />
            <div className="min-w-0">
              <span className="text-t2">{fact.text}</span>{" "}
              <span className="whitespace-nowrap text-t4">
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
                          "underline-offset-[3px] transition-colors hover:text-t2 hover:underline",
                          open === key && "text-[var(--brand)] underline",
                        )}
                      >
                        {item.publisher}
                      </button>
                    </span>
                  );
                })}
                )
              </span>
              {cited.map((item) => {
                if (open !== `${fi}:${item.id}`) return null;
                return (
                  <Quote key={item.id} item={item} spans={fact.evidence.filter((e) => e.item === item.id).map((e) => e.span)} />
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Quote({ item, spans, className }: { item: ItemView; spans: string[]; className?: string }) {
  return (
    <figure
      className={cn(
        "mt-2 rounded-md border border-line bg-[var(--well)] px-3 py-2.5 text-[13px] leading-relaxed",
        item.kind === "post" ? "border-l-2 border-l-[var(--kind-post)]" : "border-l-2 border-l-[var(--kind-article)]",
        className,
      )}
    >
      <figcaption className="mb-1 flex items-center gap-1.5 text-[11.5px] text-t3">
        <ReportMark item={item} size={13} />
        {item.publisher}
        <KindGlyph kind={item.kind} className="ml-1 size-3 text-t4" />
      </figcaption>
      {spans.map((s) => (
        <blockquote key={s} className="text-t2">
          “{s.replace(/^["“]|["”]$/g, "")}”
        </blockquote>
      ))}
    </figure>
  );
}
