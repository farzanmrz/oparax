"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { profile } from "@/next/data/onboarding";
import { cn } from "@/lib/utils";
import { lift, liftStyle, Stage } from "@/v2/deck/chrome";
import { HANDLE, status, storiesThisWeek, week } from "@/v2/deck/data";
import { Segments, WeekBars, XAvatar } from "@/v2/deck/marks";
import { BASE } from "./card";

// The One shell (owner, Oct 4: "we'd have a consistent running header for oparax"). Deck's open ground (Stage)
// and Deck's header line, inside the centred 1400px column, on every page of the app: the mark and wordmark, the
// three pages, then the this-week object, the free-week object, the account and the theme. Nothing floats: no
// bubble, no tiles, no second bar. Login keeps the same line with the mark and the theme only.

const NAV = [
  { href: `${BASE}/feed`, label: "Feed" },
  { href: `${BASE}/onboarding`, label: "Onboarding" },
  { href: `${BASE}/settings`, label: "Settings" },
];

/** The 1400px column every One page sits in. */
export const column = "mx-auto w-full max-w-[1400px] px-4 lg:px-8";

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
      <div className={cn(column, "flex h-14 items-center gap-8")}>
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
              <ThisWeek />
              <Divider />
              <FreeWeek />
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

/** Deck's This week tile, drawn inline: the count and the seven day bars. */
function ThisWeek() {
  return (
    <section aria-label="This week" className="flex items-center gap-3">
      <p className="flex items-baseline gap-1.5 text-[12.5px] whitespace-nowrap">
        <span className="text-t3">This week</span>
        <span className="text-[15px] font-semibold tabular-nums text-t1">{storiesThisWeek}</span>
        <span className="text-t2">stories</span>
      </p>
      <WeekBars week={week} height={18} className="w-[64px] gap-1" />
    </section>
  );
}

/** Deck's Free week tile, drawn inline: the days left and the day meter. */
function FreeWeek() {
  return (
    <section aria-label="Free week" className="flex items-center gap-3">
      <p className="text-[12.5px] whitespace-nowrap">
        <span className="text-t3">Free week, </span>
        <span className="font-medium text-t1">
          <span className="tabular-nums">{status.daysLeft}</span> days left
        </span>
      </p>
      <div className="w-[120px]">
        <Segments total={status.trialDays} filled={status.daysLeft} />
      </div>
    </section>
  );
}

/** The person: avatar, name and handle on one line; a small menu with Sign out. */
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
        <XAvatar handle={HANDLE} size={22} />
        <span className="font-medium text-t1">{profile.name}</span>
        <span className="text-t3">@{HANDLE}</span>
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

/** Every page inside the app: Deck's ground, the running header, the page in the 1400px column. */
export function AppShell({ children, light }: { children: React.ReactNode; light?: number }) {
  return (
    <Stage light={light}>
      <OneHeader />
      <main className={cn(column, "relative flex-1 pt-7", switcherClear)}>{children}</main>
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
