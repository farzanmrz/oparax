"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Layers, LogOut, Newspaper } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { lift, liftStyle, Stage } from "@/v2/deck/chrome";
import { HANDLE, type Source } from "@/v2/deck/data";
import { BASE, type LabelMode } from "./card";

// The One chrome: no sidebar. One bubble at the bottom left (the Oparax mark, like the Next.js dev indicator) opens
// a small menu with Feed, Sources, Notifications, the theme toggle, the account and Sign out. Pages keep their own
// title row at the top of the content.

const NAV = [
  { href: `${BASE}/feed`, label: "Feed", icon: Newspaper },
  { href: `${BASE}/sources`, label: "Sources", icon: Layers },
  { href: `${BASE}/notifications`, label: "Notifications", icon: Bell },
];

export function Shell({
  children,
  header,
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
  // The sidebar is gone (owner, Oct 4: "this hunk of just a sidebar not being used for anything... that Next.js
  // pop-up... can be shown, and that will pop up into a menu"). The app's chrome is one bubble at the bottom left
  // that opens a small menu: Feed, Sources, Notifications, the theme, the account, Sign out.
  return (
    <Stage light={light}>
      <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-8 lg:px-8">
        <div className="min-w-0 [&>main]:px-0 [&>main]:pt-0">
          {header ? <div className="mb-7">{header}</div> : null}
          {children}
        </div>
      </div>
      <Bubble />
    </Stage>
  );
}

/** Kept for pages that still render it; the bubble replaces the sidebar, so it draws nothing. */
export function Expand({ className }: { className?: string }) {
  void className;
  return null;
}

const row = "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring";

function Bubble() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);
  return (
    <div ref={ref} className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
      {open ? (
        <div id="one-menu" role="menu" aria-label="Oparax" className={cn(lift, "w-[220px] p-2")} style={liftStyle}>
          {/* One mark only, on the bubble (owner, Oct 4: "why the hell is my menu itself showing the oparax logo... along with
              the oparax header logo at the top also"). The top row holds the theme button alone. */}
          <div className="flex h-9 items-center justify-end px-2">
            <ThemeToggle className="size-7 rounded-md border border-line-strong bg-[var(--raised)] text-t2 hover:text-t1" />
          </div>
          <nav aria-label="Pages" className="mt-1 grid gap-0.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const on = pathname === href;
              return (
                <Link key={href} href={href} role="menuitem" aria-current={on ? "page" : undefined} onClick={() => setOpen(false)} className={cn(row, on ? "bg-[var(--brand-soft)] font-medium text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]" : "text-t2 hover:text-t1")}>
                  <Icon className={cn("size-4 shrink-0", on ? "text-[var(--brand)]" : "text-t3")} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-1.5 border-t border-line-strong pt-1.5">
            <div className="flex h-9 items-center gap-2.5 px-2 text-[13px] text-t1">
              <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>
              <span className="min-w-0 flex-1 truncate">@{HANDLE}</span>
            </div>
            <Link href={`${BASE}/login`} role="menuitem" className={cn(row, "text-t2 hover:text-t1")}>
              <LogOut className="size-4 shrink-0 text-t3" aria-hidden="true" />
              Sign out
            </Link>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="one-menu"
        aria-label="Oparax menu"
        title="Oparax"
        className={cn(lift, "grid size-11 place-items-center rounded-full text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring")}
        style={liftStyle}
      >
        <OparaxMark className="size-[22px]" />
      </button>
    </div>
  );
}
