"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { ChevronsUpDown, Layers, Rows3 } from "lucide-react";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { THEME_KEY, ThemeToggle } from "@/next/theme";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { counts, HANDLE, hrefWith, type View } from "./data";

// The Window skin shared by every v2 Window screen: the in-window app bar or the site header, the lit stage rim,
// the lifted window that is the page, the primary blue action, and the name or handle preference for sources.

export const BASE = "/v2/window";

/** Re-applies the pre-paint theme choice after mount, in case hydration rewrote <html>. */
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

/**
 * The signed-in app bar, drawn inside the window as its first row: mark, the person, their plan badge and the
 * account switch on the left; the preview note and the theme on the right.
 */
export function TopBar({ note, badge = true, className }: { note?: string; badge?: boolean; className?: string }) {
  useThemeGuard();
  return (
    <header className={cn("relative z-20 flex h-12 shrink-0 items-center gap-3 border-b border-line px-4", className)}>
      <Link href={`${BASE}/landing`} aria-label="Oparax home" className="text-t1">
        <OparaxMark className="size-[18px]" />
      </Link>
      <span className="flex shrink-0 items-center gap-2 text-[13px] text-t1">
        <span className="grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>@{HANDLE}
        {badge ? (
          <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide whitespace-nowrap text-[var(--caution)]">
            FREE WEEK
          </span>
        ) : null}
        <ChevronsUpDown className="size-3.5 text-t3" aria-hidden="true" />
      </span>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        {note ? <span className="block min-w-0 truncate rounded-full border border-line px-2.5 py-1 text-[11.5px] text-t3">{note}</span> : null}
        <ThemeToggle className="size-8 shrink-0 text-t3" />
      </div>
    </header>
  );
}

/** The visitor header for the landing page and sign up. */
export function SiteHeader({ active }: { active?: "landing" | "signup" }) {
  useThemeGuard();
  return (
    <header className="relative z-20 border-b border-line">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-8 px-6">
        <Link href={`${BASE}/landing`} className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-t1">
          <OparaxMark className="size-5" />
          Oparax
        </Link>
        {active === "landing" ? (
          <nav aria-label="Sections" className="flex items-center gap-6 text-[13.5px] text-t2">
            <a href="#sources" className="hover:text-t1">Sources</a>
            <a href="#agent" className="hover:text-t1">Your agent</a>
            <a href="#pricing" className="hover:text-t1">Pricing</a>
          </nav>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="size-8 text-t3" />
          <Link href={`${BASE}/login`} className="rounded-md px-3 py-1.5 text-[13.5px] text-t2 hover:text-t1">
            Log in
          </Link>
          {active === "signup" ? null : (
            <Link
              href={`${BASE}/login?mode=signup`}
              className="inline-flex h-8 items-center rounded-md bg-primary px-3.5 text-[13.5px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)] hover:brightness-110"
            >
              Sign up
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

/** The lit stage frame a window sits in (Window feed: --stage-frame, --stage-light). */
export function Stage({
  children,
  className,
  innerClassName,
  grid = false,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  grid?: boolean;
}) {
  return (
    <div className={cn("relative overflow-clip rounded-[18px] border border-line", className)} style={{ background: "var(--stage-frame)" }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "var(--stage-light)" }} />
      {grid ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
          style={{ backgroundImage: "var(--dot-grid)", backgroundSize: "18px 18px" }}
        />
      ) : null}
      <div className={cn("relative", innerClassName)}>{children}</div>
    </div>
  );
}

/** The lifted window: one step lighter than the page, layered shadow, top-lit edge. */
export function Window({
  children,
  className,
  open = false,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  /** Bleeds off the bottom of its stage, as the accepted feed window does. */
  open?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "relative overflow-clip border border-line-strong bg-[var(--window)]",
        open ? "rounded-t-[14px] border-b-0" : "rounded-[14px]",
        className,
      )}
      style={{ boxShadow: "var(--window-shadow), var(--top-light)", ...style }}
    >
      {children}
    </div>
  );
}

/**
 * The one frame every signed-in Window page shares: the page is the window. Only a 12px rim of the lit stage shows
 * on the top and sides (x 12 to 1428 at 1440 wide); the app bar is the window's first row, and the page heading,
 * when the page has one, sits under it at the top of the working area.
 */
export function AppFrame({
  bar,
  heading,
  side,
  grid = false,
  open = true,
  className,
  children,
}: {
  bar: React.ReactNode;
  heading?: React.ReactNode;
  side?: React.ReactNode;
  grid?: boolean;
  open?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  // The page is the window: it fills the viewport edge to edge, with no stage, rim, border or outer shadow.
  void grid;
  void open;
  return (
    <main className="flex min-h-svh flex-1 flex-col bg-[var(--window)]">
      {bar}
      {heading ? (
        <div className="flex flex-col gap-4 border-b border-line px-5 py-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10 lg:px-8">
          <div className="min-w-0">{heading}</div>
          {side ? <div className="flex shrink-0 flex-wrap items-center gap-3">{side}</div> : null}
        </div>
      ) : null}
      <div className={cn("flex-1", className)}>{children}</div>
    </main>
  );
}

/** Three quiet dots and a title, the top of a window that is not the app itself. */
export function WindowBar({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-10 shrink-0 items-center gap-3 border-b border-line bg-[var(--rail)] px-4", className)}>
      <span aria-hidden="true" className="flex gap-1.5">
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
      </span>
      {children}
    </div>
  );
}

/** Small capitalized group label, system monospace (X ACCOUNTS, RSS FEEDS ...). */
export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[10.5px] font-medium tracking-[0.12em] text-t3 uppercase", className)}>{children}</p>;
}

export function PrimaryButton({
  children,
  className,
  href,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  const cls = cn(
    "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground",
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)]",
    "transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    className,
  );
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className, href }: { children: React.ReactNode; className?: string; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line-strong bg-[var(--raised)] px-4 text-[13.5px] font-medium text-t1 transition-colors hover:border-t3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      style={{ boxShadow: "var(--top-light)" }}
    >
      {children}
    </Link>
  );
}

/** Said once under the alerts button: what the preview link does differently from the product's. */
export function AlertsPreviewNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-[12px] leading-[1.5] text-t3", className)}>
      Preview: opens X&apos;s composer with “Start alerts” typed. Choose @oparax_ai as the recipient.
    </p>
  );
}

/** The product's primary action while alerts are not yet connected (bot-button.tsx copy). */
export function AlertsButton({ className, full = false }: { className?: string; full?: boolean }) {
  // The product opens X's composer to the bot with "Start alerts" typed (app/api/activation/route.ts); the
  // preview has no bot id, so it opens the composer with the text only.
  return (
    <a
      href={`https://x.com/messages/compose?text=${encodeURIComponent("Start alerts")}`}
      target="_blank"
      rel="noreferrer"
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
    </a>
  );
}

export function ViewSwitch({ view, theme, source, className }: { view: View; theme?: string; source?: string | null; className?: string }) {
  const icon = { clustered: Layers, direct: Rows3 };
  return (
    <nav aria-label="Feed view" className={cn("flex rounded-lg border border-line bg-[var(--well)] p-0.5", className)}>
      {(["clustered", "direct"] as const).map((v) => {
        const Icon = icon[v];
        const on = v === view;
        return (
          <Link
            key={v}
            href={hrefWith(`${BASE}/feed`, { view: v, theme, source })}
            aria-current={on ? "page" : undefined}
            title={v === "clustered" ? `${counts.clustered} stories` : `${counts.direct} articles, posts and releases`}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] text-t3 transition-colors hover:text-t1",
              on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
            )}
          >
            <Icon className={cn("size-3.5", on && "text-[var(--brand)]")} aria-hidden="true" />
            {v === "clustered" ? "Clustered" : "Direct"}
            <span className="tabular-nums text-t3">{counts[v]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Name or handle for every source on screen; remembered per viewer. */
type Show = "name" | "handle";
const ShowContext = createContext<{ show: Show; setShow: (s: Show) => void }>({ show: "name", setShow: () => {} });
const SHOW_KEY = "oparax-v2-window-show";

export function ShowProvider({ children }: { children: React.ReactNode }) {
  const [show, setShowState] = useState<Show>("name");
  useEffect(() => {
    try {
      if (localStorage.getItem(SHOW_KEY) === "handle") setShowState("handle");
    } catch {}
  }, []);
  const setShow = (s: Show) => {
    setShowState(s);
    try {
      localStorage.setItem(SHOW_KEY, s);
    } catch {}
  };
  return <ShowContext.Provider value={{ show, setShow }}>{children}</ShowContext.Provider>;
}

export const useShow = () => useContext(ShowContext);

export function ShowToggle({ className }: { className?: string }) {
  const { show, setShow } = useShow();
  return (
    <ToggleGroup
      type="single"
      value={show}
      onValueChange={(v) => (v === "name" || v === "handle" ? setShow(v) : undefined)}
      aria-label="Show sources by name or handle"
      spacing={0}
      className={cn("w-full rounded-md border border-line bg-[var(--well)] p-0.5", className)}
    >
      {(["name", "handle"] as const).map((s) => (
        <ToggleGroupItem
          key={s}
          value={s}
          className="h-6 flex-1 rounded-[5px]! px-2 text-[11.5px] font-normal text-t3 hover:bg-transparent hover:text-t1 data-[state=on]:bg-[var(--raised)] data-[state=on]:text-t1 data-[state=on]:shadow-[inset_0_0_0_1px_var(--line-strong)]"
        >
          {s === "name" ? "Name" : "Handle"}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
