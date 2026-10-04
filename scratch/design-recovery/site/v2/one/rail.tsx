"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Bell, Layers, LogOut, Newspaper, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { lift, liftStyle, Stage } from "@/v2/deck/chrome";
import { HANDLE, type Source } from "@/v2/deck/data";
import { BASE, type LabelMode } from "./card";

// The One sidebar is the app's chrome, as the owner's Supabase example is (Oct 4: "the collab sidebar should be a
// button by itself, first thing. Oparax's logo and word mark are at the top... why do we need [the sources] on the
// left?"). Top to bottom: the collapse button, the Oparax mark and wordmark, three navigation rows (Feed, Sources,
// Notifications); at the bottom the account with the theme toggle as a button, then Sign out as a plain row. The
// page's own title and content sit in the column beside it. Collapsed, the sidebar is gone and a bordered Expand
// button takes its place at the start of the page's title row.

type Sidebar = { open: boolean; expand: () => void; focusExpand: React.MutableRefObject<boolean> };
const SidebarContext = createContext<Sidebar | null>(null);

const NAV = [
  { href: `${BASE}/feed`, label: "Feed", icon: Newspaper },
  { href: `${BASE}/sources`, label: "Sources", icon: Layers },
  { href: `${BASE}/notifications`, label: "Notifications", icon: Bell },
];

export function Shell({
  children,
  header,
  initialOpen = true,
  light,
}: {
  children: React.ReactNode;
  /** The page's title row, first in the content column. */
  header?: React.ReactNode;
  /** Kept for callers from earlier passes; the chrome lists no sources. */
  sources?: Source[];
  mode?: LabelMode;
  onMode?: (m: LabelMode) => void;
  onSource?: (id: string | null) => void;
  activeSource?: string | null;
  emptyLine?: string;
  xdm?: boolean;
  onXdm?: (on: boolean) => void;
  ownExpand?: boolean;
  initialOpen?: boolean;
  light?: number;
}) {
  const [open, setOpen] = useState(initialOpen);
  const focusExpand = useRef(false);
  const collapse = () => {
    focusExpand.current = true;
    setOpen(false);
  };
  return (
    <Stage light={light}>
      <SidebarContext.Provider value={{ open, expand: () => setOpen(true), focusExpand }}>
        <div className="relative w-full px-2 pt-4 lg:px-4">
          <div className={cn("grid items-start gap-6", open && "lg:grid-cols-[232px_minmax(0,1fr)]")}>
            {open ? <Chrome onCollapse={collapse} /> : null}
            <div className="min-w-0 [&>main]:px-0 [&>main]:pt-0">
              {header ? <div className="mb-7">{header}</div> : null}
              {children}
            </div>
          </div>
        </div>
      </SidebarContext.Provider>
    </Stage>
  );
}

const iconButton =
  "grid size-8 shrink-0 place-items-center rounded-md border border-line-strong bg-[var(--raised)] text-t2 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring";

/** Shown only while the sidebar is collapsed: a bordered button, the first thing in the page's title row. */
export function Expand({ className }: { className?: string }) {
  const ctx = useContext(SidebarContext);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ctx && !ctx.open && ctx.focusExpand.current) {
      ctx.focusExpand.current = false;
      ref.current?.focus();
    }
  }, [ctx]);
  if (!ctx || ctx.open) return null;
  return (
    <button ref={ref} type="button" onClick={ctx.expand} aria-expanded={false} aria-controls="one-sidebar" aria-label="Expand sidebar" title="Expand sidebar" className={cn(iconButton, className)}>
      <PanelLeftOpen className="size-4" aria-hidden="true" />
    </button>
  );
}

const row = "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring";

function Chrome({ onCollapse }: { onCollapse: () => void }) {
  const pathname = usePathname();
  return (
    <aside
      id="one-sidebar"
      aria-label="Sidebar"
      className={cn(lift, "hidden p-2.5 lg:sticky lg:top-4 lg:flex lg:min-h-[calc(100svh-32px)] lg:flex-col")}
      style={liftStyle}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        onCollapse();
      }}
    >
      <div className="flex h-8 items-center gap-2.5 px-0.5">
        <button type="button" onClick={onCollapse} aria-expanded aria-controls="one-sidebar" aria-label="Collapse sidebar" title="Collapse sidebar" className={iconButton}>
          <PanelLeftClose className="size-4" aria-hidden="true" />
        </button>
        <Link href={`${BASE}/landing`} className="flex min-w-0 items-center gap-2 text-[15px] font-semibold tracking-tight text-t1">
          <OparaxMark className="size-[20px]" />
          Oparax
        </Link>
        <ThemeToggle className="ml-auto size-8 rounded-md border border-line-strong bg-[var(--raised)] text-t2 hover:text-t1" />
      </div>

      <nav aria-label="Pages" className="mt-6 grid gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const on = pathname === href;
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn(row, on ? "bg-[var(--brand-soft)] font-medium text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]" : "text-t2 hover:text-t1")}>
              <Icon className={cn("size-4 shrink-0", on ? "text-[var(--brand)]" : "text-t3")} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line-strong pt-2.5">
        <div className="flex h-9 items-center gap-2.5 px-2 text-[13px] text-t1">
          <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>
          <span className="min-w-0 flex-1 truncate">@{HANDLE}</span>
        </div>
        <Link href={`${BASE}/login`} className={cn(row, "text-t2 hover:text-t1")}>
          <LogOut className="size-4 shrink-0 text-t3" aria-hidden="true" />
          Sign out
        </Link>
      </div>
    </aside>
  );
}
