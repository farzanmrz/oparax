"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, List, Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { THEME_KEY } from "@/next/theme";
import { cn } from "@/lib/utils";
import { Stage } from "@/v2/deck/chrome";
import { groups, sources, status, type Group, type Source } from "@/v2/deck/data";
import { GroupGlyph, SourceMark } from "@/v2/deck/marks";
import { BASE } from "./card";

// The One shell (council on the One's rail, October 8, Grok's specification with the round 2 changes). No header on
// the signed-in pages: one 240px rail fixed to the viewport's left edge (--rail ground, one --line on its right) and
// the page's column centred in the width that remains, under the Width rule. Top to bottom: the brand head (the mark
// and "Oparax", not a link, a hairline under it); Feed, Settings and Notifications as 32px rows (icon at x16, label
// at x36, the current page a 2px brand bar at the rail's edge and a --raised fill); his watched sources under
// collapsible headings (the kind icon at x16 and the text at x36), each row the logo at x16 and the name only at x36;
// on the onboarding page the seven steps stand in that middle instead. The foot, on the same ground under one
// hairline: FREE WEEK and days left, the seven segments, posts used, then Theme, Sign out and Hide. Hide removes the
// whole rail; a labelled Menu at the bottom left brings it back, and while it is hidden the mark leads the page
// title. Login keeps its own visitor header line.

const NAV = [
  { href: `${BASE}/feed`, label: "Feed", Icon: List },
  { href: `${BASE}/settings`, label: "Settings", Icon: Settings },
  { href: `${BASE}/notifications`, label: "Notifications", Icon: Bell },
];

/** Preview account email: the sample account has no stored address, so the form's placeholder domain is used. */
export const ACCOUNT_EMAIL = "farzan@newsroom.com";

/** The one column every page and the header sit in. */
export const column = "one-column";

/** The same column centred in the width beside the rail (one.css). */
const railColumn = "one-column-rail";

/** Clear ground under every page so the lab switcher (bottom right, about 100px tall) covers no control, plus 72px. */
export const switcherClear = "pb-[184px]";

/** The column's side margin (one.css), for the Menu control that sits at the column's bottom left. */
const COLUMN_MARGIN = "clamp(48px, calc((100vw - 1400px) / 4), 290px)";

/** The kind's hue on its group heading: X posts, articles from feeds and sites, GitHub's own mark. */
const hue: Record<Group, string> = {
  x: "text-[var(--kind-post)]",
  rss: "text-[var(--kind-article)]",
  website: "text-[var(--kind-article)]",
  github: "text-[var(--kind-github)]",
};

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

/** The visitor header line for login: the mark and wordmark, and a labelled Appearance switch, in the page's one
 * column. The signed-in pages have no header; the rail holds the mark. */
export function OneHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[var(--page)]/80 backdrop-blur-md">
      <div className={cn(column, "flex h-12 items-center gap-7")}>
        <Link
          href={`${BASE}/login`}
          className="flex shrink-0 items-center gap-2 rounded-sm text-[15px] font-semibold tracking-[-0.01em] text-t1 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <OparaxMark className="size-[18px]" />
          Oparax
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span id="appearance" className="text-[12.5px] text-t3">
            Appearance
          </span>
          <ThemeSwitch className="w-[168px]" />
        </div>
      </div>
    </header>
  );
}

/** Whether the rail is showing, so the page title line can carry the mark while it is hidden. */
const RailContext = createContext(true);
const RAIL_KEY = "oparax-one-rail";

/** The mark (icon only, 20px) at the left of the page title line, only while the rail is hidden. */
export function RailMark() {
  const open = useContext(RailContext);
  if (open) return null;
  return (
    <Link href={`${BASE}/feed`} aria-label="Oparax" className="hidden shrink-0 rounded-sm text-t1 focus-visible:outline-2 focus-visible:outline-ring lg:block">
      <OparaxMark className="size-5" />
    </Link>
  );
}

/** Every page inside the app: the rail fixed at the viewport's left edge and the page in its column beside it, on
 * Deck's lit ground. On the feed the rail filters the stories (`selected`, `onSelect`); on the other pages a source
 * row opens the feed filtered to that source. `middle` replaces the sources (the onboarding's seven steps). */
export function AppShell({
  children,
  light,
  selected = null,
  onSelect,
  middle,
}: {
  children: React.ReactNode;
  light?: number;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  middle?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const moved = useRef(false);
  const menu = useRef<HTMLButtonElement>(null);
  const hide = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem(RAIL_KEY) === "hidden") setOpen(false);
    } catch {}
  }, []);
  // After Hide or Menu, focus lands on the control that undoes it.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    (open ? hide : menu).current?.focus();
  }, [open]);
  const choose = (next: boolean) => {
    moved.current = true;
    setOpen(next);
    try {
      localStorage.setItem(RAIL_KEY, next ? "open" : "hidden");
    } catch {}
  };
  return (
    <Stage light={light}>
      <RailContext.Provider value={open}>
        {open ? <Rail selected={selected} onSelect={onSelect} middle={middle} onHide={() => choose(false)} hideRef={hide} /> : null}
        <div className={cn(open ? railColumn : column, "relative flex flex-1 items-start")}>
          <main className={cn("relative min-w-0 flex-1 pt-3", switcherClear)}>{children}</main>
        </div>
        {open ? null : (
          <button
            ref={menu}
            type="button"
            onClick={() => choose(true)}
            className="fixed bottom-4 z-40 hidden h-9 items-center gap-2 rounded-md border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring lg:inline-flex"
            style={{ left: COLUMN_MARGIN, boxShadow: "var(--window-shadow), var(--top-light)" }}
          >
            <PanelLeftOpen className="size-4 text-t3" aria-hidden="true" />
            Menu
          </button>
        )}
      </RailContext.Provider>
    </Stage>
  );
}

/** The one rail row: 32px, inset 8px from both sides with an 8px radius, the icon or mark at x16 and the text at x36
 * (8px inset, 8px padding, a 15px icon, 5px). Feed, Settings and Notifications use it, and the onboarding's steps. */
export const railRow = "relative mx-2 flex h-8 items-center gap-[5px] rounded-lg pr-2 pl-2 text-[13px] transition-colors";

/** The rail: the brand head, the pages, the sources (or the steps), the foot. */
function Rail({
  selected,
  onSelect,
  middle,
  onHide,
  hideRef,
}: {
  selected: string | null;
  onSelect?: (id: string | null) => void;
  middle?: React.ReactNode;
  onHide: () => void;
  hideRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const pathname = usePathname();
  return (
    <aside aria-label="Oparax" className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-line bg-[var(--rail)] lg:flex">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-4">
        <OparaxMark className="size-[18px] shrink-0 text-t1" />
        <span className="text-[15px] leading-5 font-semibold tracking-[-0.01em] text-t1">Oparax</span>
      </div>
      <nav aria-label="Pages" className="flex shrink-0 flex-col gap-[2px] pt-2 pb-3">
        {NAV.map(({ href, label, Icon }) => {
          const on = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              onClick={(e) => {
                // On the feed, Feed shows the whole feed again: it clears a pressed source.
                if (on && onSelect) {
                  e.preventDefault();
                  onSelect(null);
                }
              }}
              className={cn(
                railRow,
                "group/nav font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                on ? "bg-raised text-t1" : "text-t2 hover:bg-raised/60 hover:text-t1",
              )}
            >
              {on ? <span aria-hidden="true" className="absolute inset-y-0 -left-2 w-[2px] bg-[var(--brand)]" /> : null}
              <Icon className={cn("size-[15px] shrink-0", on ? "text-t1" : "text-t3 group-hover/nav:text-t2")} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">{middle ?? <Sources selected={selected} onSelect={onSelect} />}</div>
      <Foot onHide={onHide} hideRef={hideRef} />
    </aside>
  );
}

/** His watched sources, grouped. Each group is a collapsible heading (starts open) that cannot be mistaken for a row:
 * 13px semibold --t1, the kind icon in its hue at x16, the text at x36, the group's count and a chevron at the right,
 * a hairline above every group after the first. The rows sit on the heading's lines: the real logo or avatar at x16
 * under the kind icon, the name only at x36 under the heading's text. An empty group is absent. */
function Sources({ selected, onSelect }: { selected: string | null; onSelect?: (id: string | null) => void }) {
  const [closed, setClosed] = useState<Set<Group>>(() => new Set());
  const toggle = (g: Group) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  const present = groups.filter((g) => sources.some((s) => s.group === g.id));
  return (
    <div className="pb-3">
      {present.map((g, i) => {
        const list = sources.filter((s) => s.group === g.id);
        const open = !closed.has(g.id);
        return (
          <section key={g.id} aria-label={g.label} className={cn("pb-2", i > 0 && "border-t border-line")}>
            <h3>
              <button
                type="button"
                onClick={() => toggle(g.id)}
                aria-expanded={open}
                aria-controls={`rail-${g.id}`}
                className={cn(
                  "flex w-full items-center gap-1.5 px-4 pb-1 text-left text-[13px] leading-[18px] font-semibold text-t1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  i > 0 && "pt-[14px]",
                )}
              >
                <GroupGlyph group={g.id} className={cn("size-3.5 shrink-0", hue[g.id])} />
                <span className="min-w-0 flex-1 truncate">{g.label}</span>
                <span className="font-mono text-[11px] font-normal tabular-nums text-t3">{list.length}</span>
                <ChevronDown className={cn("size-3 shrink-0 text-t4 transition-transform", !open && "-rotate-90")} aria-hidden="true" />
              </button>
            </h3>
            {open ? (
              <ul id={`rail-${g.id}`}>
                {list.map((s) => (
                  <SourceRow key={s.id} source={s} on={selected === s.id} onSelect={onSelect} />
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/** A source row: 30px, the logo (16px) at x16 and the name at x36, nothing else. Pressed is the --raised fill. */
function SourceRow({ source: s, on, onSelect }: { source: Source; on: boolean; onSelect?: (id: string | null) => void }) {
  const cls = cn(
    "mx-2 flex h-[30px] items-center gap-1 rounded-lg px-2 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
    on ? "bg-raised text-t1" : "text-t2 hover:bg-raised/60 hover:text-t1",
  );
  const title = `${s.name}${s.why ? `: ${s.why}` : s.focus ? `: ${s.focus}` : ""}`;
  const body = (
    <>
      <SourceMark source={s} size={16} className={s.group === "x" ? "" : "rounded-[4px]"} />
      <span className="min-w-0 flex-1 truncate">{s.name}</span>
    </>
  );
  return (
    <li className="flex">
      {onSelect ? (
        <button type="button" onClick={() => onSelect(on ? null : s.id)} aria-pressed={on} title={title} className={cn(cls, "flex-1")}>
          {body}
        </button>
      ) : (
        <Link href={`${BASE}/feed?source=${s.id}`} title={title} className={cn(cls, "flex-1")}>
          {body}
        </Link>
      )}
    </li>
  );
}

/** The foot, pinned under one hairline on the rail's own ground: FREE WEEK and days left, the seven segments on their
 * own line, posts used; then one line with Theme, Sign out and Hide. The account lives on Settings. */
function Foot({ onHide, hideRef }: { onHide: () => void; hideRef: React.RefObject<HTMLButtonElement | null> }) {
  const { dark, choose } = useTheme();
  const ThemeIcon = dark ? Sun : Moon;
  const icon =
    "grid size-7 shrink-0 place-items-center rounded-md text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <div className="shrink-0 border-t border-line px-4 pt-3 pb-1 font-mono text-[11px] leading-4">
      <p className="flex items-baseline justify-between gap-3">
        <span className="font-medium tracking-[0.12em] text-[var(--caution)] uppercase">Free week</span>
        <span className="tabular-nums text-t3">{status.daysLeft} days left</span>
      </p>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {Array.from({ length: status.trialDays }, (_, i) => (
          <span key={i} className={cn("h-[3px] w-[18px] rounded-full", i < status.daysLeft ? "bg-[var(--caution)]" : "bg-line-strong")} />
        ))}
      </div>
      <p className="mt-2 tabular-nums text-t3">
        {status.poolUsed} of {status.poolLimit} posts
      </p>
      <div className="mt-1 flex h-9 items-center gap-1 font-sans">
        <button type="button" aria-label="Theme" title={dark ? "Light" : "Dark"} onClick={() => choose(!dark)} className={cn(icon, "-ml-[7px]")}>
          <ThemeIcon className="size-3.5" aria-hidden="true" />
        </button>
        <Link
          href={`${BASE}/login`}
          className="rounded-sm text-[12px] text-t3 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
        >
          Sign out
        </Link>
        <span className="flex-1" />
        <button ref={hideRef} type="button" aria-label="Hide" title="Hide" onClick={onHide} className={cn(icon, "-mr-[7px]")}>
          <PanelLeftClose className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** The page line, level with the rail's mark: the heading at the left (the mark before it while the rail is
 * hidden), then what the page puts beside it and at its right. */
export function PageLine({ title, beside, right, live }: { title: React.ReactNode; beside?: React.ReactNode; right?: React.ReactNode; live?: boolean }) {
  return (
    <div className="flex min-h-12 items-center gap-5">
      <div className="flex shrink-0 items-center gap-3">
        <RailMark />
        <h1 aria-live={live ? "polite" : undefined} className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">
          {title}
        </h1>
      </div>
      {beside}
      {right ? <div className="ml-auto flex min-w-0 items-center gap-3">{right}</div> : null}
    </div>
  );
}
