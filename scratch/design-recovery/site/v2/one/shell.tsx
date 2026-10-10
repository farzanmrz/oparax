"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Bell, BookMarked, ChevronDown, List, Moon, PanelLeft, Rss, Sun, UserRound } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { THEME_KEY } from "@/next/theme";
import { cn } from "@/lib/utils";
import { Stage } from "@/v2/deck/chrome";
import { profile } from "@/next/data/onboarding";
import { groups, sources, type Group, type Source } from "@/v2/deck/data";
import { GroupGlyph, SourceMark } from "@/v2/deck/marks";
import { BASE } from "./card";

// The One shell (owner, Oct 10, from the Design canvas): one 248px rail fixed to the viewport's left edge: the head
// (the mark and "Oparax" opening the feed, the theme icon and Hide at the right), the group "Navigation" (Feed,
// Sources, Notifications, Account), the group "Feed" (the four kinds as headers, their sources indented), and a
// darker foot with the initial, the name and Sign Out. Hide removes the whole rail; the same panel icon, fixed at
// the bottom left, brings it back. The page's column is centred in the width that remains, under the Width rule,
// and scrolls to the viewport's bottom with 160px of ground after its last block. Before an agent exists the seven
// steps stand in the rail's middle. Login keeps its own visitor header line.

const NAV = [
  { href: `${BASE}/feed`, label: "Feed", Icon: List },
  { href: `${BASE}/sources`, label: "Sources", Icon: Rss },
  { href: `${BASE}/notifications`, label: "Notifications", Icon: Bell },
  { href: `${BASE}/account`, label: "Account", Icon: UserRound },
];

/** Title Case for card headers and buttons (owner, Oct 10: "the first letter of each alphabet needs to be capital.
 * RSS Feeds F is capital."): the first letter of every word up, the rest as written. */
export const title = (t: string) => t.replace(/\b([a-z])/g, (m) => m.toUpperCase());

/** Preview account email: the sample account has no stored address, so the form's placeholder domain is used. */
export const ACCOUNT_EMAIL = "farzan@newsroom.com";

/** The one column every page and the header sit in. */
export const column = "one-column";

/** The same column centred in the width beside the rail (one.css). */
const railColumn = "one-column-rail";

/** Ground under the last block of a page, inside the scrolling area: the lab switcher's three rows plus its 16px
 * offset (v2/shared/style-switcher.tsx), so the last row can scroll clear of the dock. */
export const switcherClear = "pb-[160px]";

/** The kind's hue on its group heading and on Settings: X posts, articles from feeds and sites, GitHub's own mark. */
export const hue: Record<Group, string> = {
  x: "text-t1",
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

/** The theme as one switch (owner, Oct 9: "a simple light switch that converted to a dark switch"): one icon button
 * at the right of the Oparax line showing the mode a press brings, the sun in dark mode and the moon in light. */
export function ThemeButton({ className }: { className?: string }) {
  const { dark, choose } = useTheme();
  const label = dark ? "Switch to light" : "Switch to dark";
  const Icon = dark ? Sun : Moon;
  return (
    <button type="button" aria-label={label} title={label} onClick={() => choose(!dark)} className={cn(panelIcon, "grid", className)}>
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
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
  const show = useRef<HTMLButtonElement>(null);
  const hide = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem(RAIL_KEY) === "hidden") setOpen(false);
    } catch {}
  }, []);
  // After Hide or show, focus lands on the control that undoes it.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    (open ? hide : show).current?.focus();
  }, [open]);
  const choose = (next: boolean) => {
    moved.current = true;
    setOpen(next);
    try {
      localStorage.setItem(RAIL_KEY, next ? "open" : "hidden");
    } catch {}
  };
  const width = open ? 248 : 0;
  return (
    <Stage light={light}>
      <RailContext.Provider value={open}>
        <div style={{ "--one-rail-w": `${width}px` } as React.CSSProperties}>
          {open ? <Rail selected={selected} onSelect={onSelect} middle={middle} onHide={() => choose(false)} hideRef={hide} /> : null}
          <div className="relative flex h-svh flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollPaddingBottom: 160 }}>
              <div className={cn(width ? railColumn : column, "relative flex items-start")}>
                <main className={cn("relative min-w-0 flex-1 pt-3", switcherClear)}>{children}</main>
              </div>
            </div>
          </div>
          {!open ? (
            <button
              ref={show}
              type="button"
              aria-label="Show Sidebar"
              title="Show Sidebar"
              onClick={() => choose(true)}
              className={cn(panelIcon, "fixed bottom-4 left-4 z-40 hidden lg:grid")}
            >
              <PanelLeft className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </RailContext.Provider>
    </Stage>
  );
}

/** The one rail row: 32px, inset 8px from both sides with an 8px radius, the icon or mark at x16 and the text at x36
 * (8px inset, 8px padding, a 15px icon, 5px). The four pages use it, and the onboarding's steps. */
export const railRow = "relative mx-2 flex h-8 items-center gap-[5px] rounded-lg pr-2 pl-2 text-[13px] transition-colors";

const selectedRow = "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]";
const quietRow = "text-t2 hover:bg-raised/60 hover:text-t1";

/** A group's label (shadcn's sidebar label): 12px t3 in a 32px row. */
function GroupLabel({ children }: { children: string }) {
  return <p className="flex h-8 items-center px-4 text-[12px] text-t3">{children}</p>;
}

/** The rail (owner, Oct 10, from the Design canvas he approved): the head (the mark and "Oparax" opening the feed,
 * the theme icon and Hide at the right); the group "Navigation" with Feed, Sources, Notifications and Account; the
 * group "Feed" with the four kinds as headers and their sources indented under them; the foot, a darker plate with
 * the initial, the name and Sign Out. On the onboarding page the seven steps stand in the middle instead. */
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
    <aside aria-label="Oparax" className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-[var(--rail)] lg:flex">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line py-3 pr-3 pl-4">
        <Link href={`${BASE}/feed`} className="flex items-center gap-2 rounded-sm text-[15px] leading-5 font-semibold tracking-[-0.01em] text-t1 focus-visible:outline-2 focus-visible:outline-ring">
          <OparaxMark className="size-[18px] shrink-0 text-t1" />
          Oparax
        </Link>
        <ThemeButton className="ml-auto" />
        <button ref={hideRef} type="button" aria-label="Hide Sidebar" title="Hide Sidebar" onClick={onHide} className={cn(panelIcon, "grid")}>
          <PanelLeft className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className={cn("min-h-0 flex-1 overflow-y-auto", middle ? "pt-2" : "flex flex-col gap-3 py-2")}>
        {middle ?? (
          <>
            <nav aria-label="Navigation" className="flex flex-col gap-[2px]">
              <GroupLabel>Navigation</GroupLabel>
              {NAV.map(({ href, label, Icon }) => {
                const on = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={on ? "page" : undefined}
                    onClick={(e) => {
                      // On the feed, Feed shows the whole feed again: it clears a pressed source.
                      if (on && onSelect && href === `${BASE}/feed`) {
                        e.preventDefault();
                        onSelect(null);
                      }
                    }}
                    className={cn(railRow, "group/nav font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", on ? selectedRow : quietRow)}
                  >
                    <Icon className={cn("size-[15px] shrink-0", on ? "text-[var(--brand)]" : "text-t3 group-hover/nav:text-t2")} aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div>
              <GroupLabel>Feed</GroupLabel>
              <Sources selected={selected} onSelect={onSelect} />
            </div>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5 border-t border-line bg-[var(--well)] px-4 py-3">
        <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[11px] font-semibold text-white">
          {profile.name[0]}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] leading-[18px] font-semibold text-t1">{profile.name}</span>
        <Link href={`${BASE}/login`} className="shrink-0 rounded-sm text-[12px] text-t3 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring">
          Sign Out
        </Link>
      </div>
    </aside>
  );
}

/** His watched sources under the Feed label: a header per kind (13px semibold, the kind mark, the count, a chevron)
 * and its rows (the logo and the name only) indented 24px under it. No hairlines. An empty kind is absent. */
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
    <div className="flex flex-col gap-[2px]">
      {present.map((g) => {
        const list = sources.filter((s) => s.group === g.id);
        const open = !closed.has(g.id);
        return (
          <section key={g.id} aria-label={title(g.label)} className="flex flex-col gap-[2px]">
            <h3>
              <button
                type="button"
                onClick={() => toggle(g.id)}
                aria-expanded={open}
                aria-controls={`rail-${g.id}`}
                className="mx-2 flex h-8 w-[calc(100%-16px)] items-center gap-2 rounded-lg px-2 text-left text-[13px] leading-5 font-semibold text-t1 transition-colors hover:bg-raised/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <GroupGlyph group={g.id} className={cn("size-4 shrink-0", hue[g.id])} />
                <span className="min-w-0 flex-1 truncate">{title(g.label)}</span>
                <span className="font-mono text-[11px] font-normal tabular-nums text-t3">{list.length}</span>
                <ChevronDown className={cn("size-3 shrink-0 text-t4 transition-transform", !open && "-rotate-90")} aria-hidden="true" />
              </button>
            </h3>
            {open ? (
              <ul id={`rail-${g.id}`} className="flex flex-col gap-[2px] pl-6">
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

/** A source row: 28px, the logo (16px) and the name, nothing else. A GitHub row shows a repository icon (owner,
 * Oct 9). Pressed is the enclosed blue selection. */
function SourceRow({ source: s, on, onSelect }: { source: Source; on: boolean; onSelect?: (id: string | null) => void }) {
  const cls = cn(
    "mx-2 flex h-7 items-center gap-2 rounded-lg px-2 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
    on ? selectedRow : quietRow,
  );
  const label = `${s.name}${s.why ? `: ${s.why}` : s.focus ? `: ${s.focus}` : ""}`;
  const body = (
    <>
      {s.group === "github" ? (
        <BookMarked className="size-4 shrink-0 text-t3" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <SourceMark source={s} size={16} className={s.group === "x" ? "" : "rounded-[4px]"} />
      )}
      <span className="min-w-0 flex-1 truncate">{s.name}</span>
    </>
  );
  return (
    <li className="flex">
      {onSelect ? (
        <button type="button" onClick={() => onSelect(on ? null : s.id)} aria-pressed={on} title={label} className={cn(cls, "flex-1")}>
          {body}
        </button>
      ) : (
        <Link href={`${BASE}/feed?source=${s.id}`} title={label} className={cn(cls, "flex-1")}>
          {body}
        </Link>
      )}
    </li>
  );
}

/** The panel icon's button: Hide in the head and, while the rail is hidden, the same icon fixed at the bottom left. */
const panelIcon =
  "size-7 shrink-0 place-items-center rounded-md text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring";

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
