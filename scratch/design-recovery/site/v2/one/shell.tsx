"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { lift, liftStyle, Stage } from "@/v2/deck/chrome";
import { status } from "@/v2/deck/data";
import { BASE } from "./card";

// The One shell (owner, Oct 4: "we'd have a consistent running header for oparax"). Deck's open ground (Stage)
// and Deck's header line on every page of the app: the mark and wordmark, Feed and Settings, then the days left in
// the free week, the signed-in account (the email, since not everyone connects X) and the theme. The header's row
// runs the full width with 32px at each side (owner, Oct 5: "The margins are not only a page problem, but also a
// header problem"); the onboarding page spans the same width, the feed and settings keep their centred 1400px
// column. Nothing floats: no bubble, no tiles, no second bar. Login keeps the same line with the mark and the
// theme only.

const NAV = [
  { href: `${BASE}/feed`, label: "Feed" },
  { href: `${BASE}/settings`, label: "Settings" },
];

/** Preview account email: the sample account has no stored address, so the form's placeholder domain is used. */
export const ACCOUNT_EMAIL = "farzan@newsroom.com";

/** The 1400px column the feed, settings and login sit in. */
export const column = "mx-auto w-full max-w-[1400px] px-4 lg:px-8";

/** Full width with 32px at each side: the header's row and the onboarding page. */
export const wide = "w-full px-4 lg:px-8";

/** Clear ground under every page so the lab switcher (bottom right, about 100px tall) covers no control, plus 72px. */
export const switcherClear = "pb-[184px]";

function Divider() {
  return <span aria-hidden="true" className="h-5 w-px shrink-0 bg-line-strong" />;
}

/** The running header line. `app` adds the navigation and the person's objects; without it, mark and theme only. */
export function OneHeader({ app = true }: { app?: boolean }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[var(--page)]/80 backdrop-blur-md">
      <div className={cn(wide, "flex h-14 items-center gap-8")}>
        <Link href={app ? `${BASE}/feed` : `${BASE}/login`} className="flex shrink-0 items-center gap-2 rounded-sm text-[17px] font-semibold tracking-tight text-t1 focus-visible:outline-2 focus-visible:outline-ring">
          <OparaxMark className="size-[22px]" />
          Oparax
        </Link>
        {app ? (
          <nav aria-label="Pages" className="flex h-full items-stretch gap-6">
            {NAV.map(({ href, label }) => {
              const on = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "relative flex items-center text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    on ? "font-medium text-t1" : "text-t3 hover:text-t1",
                  )}
                >
                  {label}
                  {on ? <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-[var(--brand)]" /> : null}
                </Link>
              );
            })}
          </nav>
        ) : null}
        <div className="ml-auto flex items-center gap-5">
          {app ? (
            <>
              <DaysLeft />
              <Divider />
              <Account />
            </>
          ) : null}
          <ThemeToggle className="size-8 rounded-md border border-line-strong bg-[var(--window)] text-t2 shadow-[var(--top-light)] hover:text-t1" />
        </div>
      </div>
    </header>
  );
}

/** The free week shows only its days left, on every page, with no meter. */
function DaysLeft() {
  return (
    <p aria-label="Free week" className="text-[12.5px] whitespace-nowrap text-t2">
      <span className="font-medium text-t1 tabular-nums">{status.daysLeft}</span> days left
    </p>
  );
}

/** The person: the signed-in email with a small initial circle; a small menu with Sign out. */
function Account() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="one-account"
        className="flex h-8 items-center gap-2 rounded-md px-1.5 text-[13px] whitespace-nowrap transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className="grid size-[22px] place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand)] uppercase shadow-[inset_0_0_0_1px_var(--brand-line)]">
          {ACCOUNT_EMAIL.charAt(0)}
        </span>
        <span className="font-medium text-t1">{ACCOUNT_EMAIL}</span>
        <ChevronDown className="size-3.5 text-t3" aria-hidden="true" />
      </button>
      {open ? (
        <div id="one-account" role="menu" aria-label="Account" className={cn(lift, "absolute top-[calc(100%+8px)] right-0 w-[200px] p-1.5")} style={liftStyle}>
          <Link
            href={`${BASE}/login`}
            role="menuitem"
            className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-t2 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <LogOut className="size-4 text-t3" aria-hidden="true" />
            Sign out
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/** Every page inside the app: Deck's ground, the running header, the page in the 1400px column (`full`: the full
 * width with 32px at each side, as the onboarding does). */
export function AppShell({ children, light, full = false }: { children: React.ReactNode; light?: number; full?: boolean }) {
  return (
    <Stage light={light}>
      <OneHeader />
      <main className={cn(full ? wide : column, "relative flex-1 pt-7", switcherClear)}>{children}</main>
    </Stage>
  );
}

/** The page line under the header: the heading at the left, then what the page puts beside it and at its right. */
export function PageLine({ title, beside, right, live }: { title: React.ReactNode; beside?: React.ReactNode; right?: React.ReactNode; live?: boolean }) {
  return (
    <div className="flex min-h-9 items-center gap-5">
      <h1 aria-live={live ? "polite" : undefined} className="shrink-0 text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">
        {title}
      </h1>
      {beside}
      {right ? <div className="ml-auto flex min-w-0 items-center gap-3">{right}</div> : null}
    </div>
  );
}
