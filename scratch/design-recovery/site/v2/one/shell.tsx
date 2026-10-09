"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Layers, LogOut, Moon, Sun } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { THEME_KEY } from "@/next/theme";
import { cn } from "@/lib/utils";
import { lift, Stage } from "@/v2/deck/chrome";
import { groups, itemsFrom, sources, status } from "@/v2/deck/data";
import { GroupGlyph, Segments, SourceMark } from "@/v2/deck/marks";
import { BASE } from "./card";

// The One shell (owner, Oct 8: "take the actual header and sidebar from the window and remove the name handle").
// Window's thin header (48px, one hairline under it) runs the full width: the mark and wordmark, Feed and Settings
// (the current page underlined in brand), flexible space, and the account at the far right exactly as the One had
// it (the initial, the signed-in email, a chevron; the menu holds the plan, the Light and Dark switch and Sign out).
// Nothing else in the bar. Under it at the left, Window's source rail: All sources, then Twitter accounts, RSS feeds,
// Websites and GitHub under small capitalized headings, each with its kind's mark, each row with the source's real
// avatar or favicon. The page body sits to the right of the rail on Deck's lit ground. Login keeps the header line
// with the mark and a labelled Appearance switch, since there is no account.

const NAV = [
  { href: `${BASE}/feed`, label: "Feed" },
  { href: `${BASE}/settings`, label: "Settings" },
];

/** Preview account email: the sample account has no stored address, so the form's placeholder domain is used. */
export const ACCOUNT_EMAIL = "farzan@newsroom.com";

/** The one column every page and the header sit in. */
export const column = "one-column";

/** Clear ground under every page so the lab switcher (bottom right, about 100px tall) covers no control, plus 72px. */
export const switcherClear = "pb-[184px]";

/** The page theme, read from <html> and kept in step with any other switch on the page. */
function useTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.classList.contains("dark"));
    read();
    const watch = new MutationObserver(read);
    watch.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => watch.disconnect();
  }, []);
  const choose = (next: boolean) => {
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {}
  };
  return { dark, choose };
}

/** Light and Dark as a labelled two-way switch (the Clustered and Direct switch's skin). */
export function ThemeSwitch({ className }: { className?: string }) {
  const { dark, choose } = useTheme();
  const options = [
    { value: false, label: "Light", Icon: Sun },
    { value: true, label: "Dark", Icon: Moon },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("flex rounded-lg border border-line bg-[var(--well)] p-0.5", className)}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        choose(!dark);
        const el = e.currentTarget;
        requestAnimationFrame(() => (el.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus());
      }}
    >
      {options.map(({ value, label, Icon }) => {
        const on = dark === value;
        return (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => choose(value)}
            className={cn(
              "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-[12.5px] text-t3 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring",
              on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
            )}
          >
            <Icon className={cn("size-3.5", on && "text-[var(--brand)]")} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Window's thin header. `app` adds Feed, Settings and the account; without it (login), the labelled Appearance
 * switch, in the page's one column. */
export function OneHeader({ app = true }: { app?: boolean }) {
  const pathname = usePathname();
  return (
    <header className={cn("sticky top-0 z-40 border-b border-line", app ? "bg-[var(--window)]" : "bg-[var(--page)]/80 backdrop-blur-md")}>
      <div className={cn(app ? "px-4" : column, "flex h-12 items-center gap-7")}>
        <Link href={app ? `${BASE}/feed` : `${BASE}/login`} className="flex shrink-0 items-center gap-2 rounded-sm text-[15px] font-semibold tracking-[-0.01em] text-t1 focus-visible:outline-2 focus-visible:outline-ring">
          <OparaxMark className="size-[18px]" />
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
                    "relative flex items-center text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
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
        <div className="ml-auto flex items-center">
          {app ? (
            <Account />
          ) : (
            <div className="flex items-center gap-3">
              <span id="appearance" className="text-[12.5px] text-t3">
                Appearance
              </span>
              <ThemeSwitch className="w-[168px]" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** The person: the initial, the signed-in email and a chevron. The menu holds the plan (one object: Free week, the
 * 7-segment meter, the days left as its caption, the watched posts used), the theme, and Sign out. */
function Account() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
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
        ref={button}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="one-account"
        className="-mr-1.5 flex h-8 items-center gap-2 rounded-md px-1.5 text-[13px] whitespace-nowrap transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className="grid size-[22px] place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand)] uppercase shadow-[inset_0_0_0_1px_var(--brand-line)]">
          {ACCOUNT_EMAIL.charAt(0)}
        </span>
        <span className="font-medium text-t1">{ACCOUNT_EMAIL}</span>
        <ChevronDown className={cn("size-3.5 text-t3 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div
          id="one-account"
          aria-label="Account"
          className={cn(lift, "absolute top-[calc(100%+10px)] right-0 w-[296px] divide-y divide-line")}
          style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
        >
          <div className="p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13.5px] font-semibold text-t1">Free week</p>
              <p className="text-[12px] text-t2">
                <span className="font-medium text-t1 tabular-nums">{status.daysLeft}</span> days left
              </p>
            </div>
            <div className="mt-2.5">
              <Segments total={status.trialDays} filled={status.daysLeft} />
            </div>
            <p className="mt-2 text-[12px] tabular-nums text-t3">
              {status.poolUsed} of {status.poolLimit} watched Twitter posts used
            </p>
          </div>
          <div className="flex items-center gap-3 p-4">
            <span className="text-[13px] text-t2">Theme</span>
            <ThemeSwitch className="ml-auto w-[168px]" />
          </div>
          <div className="p-4">
            <SignOut className="w-full justify-center" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Sign out as a bordered action. */
export function SignOut({ className }: { className?: string }) {
  return (
    <Link
      href={`${BASE}/login`}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
      style={{ boxShadow: "var(--top-light)" }}
    >
      <LogOut className="size-3.5 text-t3" aria-hidden="true" />
      Sign out
    </Link>
  );
}

/** Every page inside the app: Window's thin header across the top, Window's source rail at the left, and the page
 * on Deck's lit ground beside it. On the feed the rail filters the stories (`selected`, `onSelect`); on the other
 * pages a row opens the feed filtered to that source. */
export function AppShell({
  children,
  light,
  selected = null,
  onSelect,
}: {
  children: React.ReactNode;
  light?: number;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  return (
    <Stage light={light}>
      <OneHeader />
      <div className="relative flex flex-1">
        <SourceRail selected={selected} onSelect={onSelect} />
        <main className={cn("relative min-w-0 flex-1 px-6 pt-7 lg:px-8", switcherClear)}>{children}</main>
      </div>
    </Stage>
  );
}

/** Window's source rail (v2/window/feed.tsx), without the Name and Handle switch: All sources, then each kind under
 * its small capitalized heading with the kind's mark, one row per source (its avatar or favicon, the name, how many
 * items in the feed came from it). */
function SourceRail({ selected, onSelect }: { selected: string | null; onSelect?: (id: string | null) => void }) {
  const row = (on: boolean) =>
    cn(
      "flex h-[28px] w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] text-t2 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
      on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
    );
  const item = (id: string | null, on: boolean, children: React.ReactNode, title?: string) =>
    onSelect ? (
      <button type="button" onClick={() => onSelect(id)} aria-pressed={on} title={title} className={row(on)}>
        {children}
      </button>
    ) : (
      <Link href={id ? `${BASE}/feed?source=${id}` : `${BASE}/feed`} title={title} className={row(on)}>
        {children}
      </Link>
    );
  return (
    <aside aria-label="Sources" className="hidden w-[228px] shrink-0 border-r border-line bg-[var(--rail)] lg:block">
      <div className="sticky top-12 max-h-[calc(100svh-48px)] overflow-y-auto pb-6">
        <ul className="px-2 pt-3">
          <li>
            {item(
              null,
              selected === null,
              <>
                <Layers className={cn("size-3.5 text-t3", selected === null && "text-[var(--brand)]")} aria-hidden="true" />
                All sources
              </>,
            )}
          </li>
        </ul>
        {groups.map((g) => {
          const list = sources.filter((s) => s.group === g.id);
          if (!list.length) return null;
          return (
            <section key={g.id} aria-label={g.label} className="pt-4">
              <p className="flex items-center gap-1.5 px-4 pb-1.5 font-mono text-[10.5px] font-medium tracking-[0.12em] text-t3 uppercase">
                <GroupGlyph group={g.id} className="size-3" />
                {g.label}
              </p>
              <ul className="px-2">
                {list.map((s) => {
                  const on = selected === s.id;
                  const n = itemsFrom(s.id).length;
                  return (
                    <li key={s.id}>
                      {item(
                        on ? null : s.id,
                        on,
                        <>
                          <SourceMark source={s} size={15} className={s.group === "x" ? "" : "rounded-[4px]"} />
                          <span className="min-w-0 flex-1 truncate leading-tight">{s.name}</span>
                          {n > 0 ? <span className="shrink-0 text-[11px] tabular-nums text-t3">{n}</span> : null}
                        </>,
                        `${s.handle}${s.why ? `: ${s.why}` : s.focus ? `: ${s.focus}` : ""}`,
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
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
