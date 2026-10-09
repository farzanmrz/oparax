"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { THEME_KEY } from "@/next/theme";
import { cn } from "@/lib/utils";
import { Stage } from "@/v2/deck/chrome";
import { groups, itemsFrom, sources, status, type Group, type Source } from "@/v2/deck/data";
import { GroupGlyph, Segments, SourceMark } from "@/v2/deck/marks";
import { BASE } from "./card";

// The One shell (council on the One's chrome, October 8, rounds 1 to 3). No header on the signed-in pages: one
// continuous rail at the left of the page column (Window's rail: --rail ground, hairlines at its edges) holds
// everything, top to bottom, in three bands. The top band: the Oparax mark and wordmark in a 48px line (12px under
// the top edge) level with the page title, then Feed, Settings and Notifications (the current page underlined in brand) over a hairline. The
// middle band: Sources, his watched sources grouped under collapsible headings (13.5px semibold, the kind icon in its
// hue, the count, a chevron), the rows indented under them; on the onboarding page the seven steps stand here
// instead. The foot, pinned on --raised over a hairline: FREE WEEK and its meter, Light and Dark, the person, Sign
// out and Hide. Hide removes the whole rail; a labelled Menu at the bottom left brings it back, and while it is
// hidden the mark leads the page title. Login keeps its own visitor header line.

const NAV = [
  { href: `${BASE}/feed`, label: "Feed" },
  { href: `${BASE}/settings`, label: "Settings" },
  { href: `${BASE}/notifications`, label: "Notifications" },
];

/** Preview account email: the sample account has no stored address, so the form's placeholder domain is used. */
export const ACCOUNT_EMAIL = "farzan@newsroom.com";

/** The one column every page and the header sit in. */
export const column = "one-column";

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

/** Every page inside the app: the rail at the left of the page column and the page beside it on Deck's lit
 * ground. On the feed the rail filters the stories (`selected`, `onSelect`); on the other pages a source row opens
 * the feed filtered to that source. `middle` replaces the sources (the onboarding's seven steps). */
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
        <div className={cn(column, "relative flex flex-1 items-start")}>
          {open ? (
            <Rail selected={selected} onSelect={onSelect} middle={middle} onHide={() => choose(false)} hideRef={hide} />
          ) : null}
          <main className={cn("relative min-w-0 flex-1 pt-3", open && "lg:pl-8", switcherClear)}>{children}</main>
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

/** The rail: the mark and the pages, the sources (or the steps), the foot. One surface, three bands. */
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
    <aside
      aria-label="Oparax"
      className="sticky top-0 hidden h-svh w-[264px] shrink-0 flex-col self-start border-x border-line bg-[var(--rail)] lg:flex"
    >
      <div className="shrink-0 border-b border-line pt-3">
        <div className="flex h-12 items-center px-4">
          <Link
            href={`${BASE}/feed`}
            className="flex items-center gap-2 rounded-sm text-[15px] font-semibold tracking-[-0.01em] text-t1 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <OparaxMark className="size-[18px]" />
            Oparax
          </Link>
        </div>
        <nav aria-label="Pages" className="flex h-10 items-stretch gap-5 px-4">
          {NAV.map(({ href, label }) => {
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
                  "relative flex items-center text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  on ? "font-medium text-t1" : "text-t3 hover:text-t1",
                )}
              >
                {label}
                {on ? <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-[var(--brand)]" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{middle ?? <Sources selected={selected} onSelect={onSelect} />}</div>
      <Foot onHide={onHide} hideRef={hideRef} />
    </aside>
  );
}

/** A band's title in Deck's type ("Sources", "Steps"). */
export function RailTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="px-4 pt-4 text-[13px] font-semibold text-t1">{children}</h2>;
}

/** His watched sources, grouped. Each group is a collapsible summary (starts open) that cannot be mistaken for a
 * row: 13.5px semibold --t1, the kind icon in its hue, the count, a chevron, a hairline above every group after the
 * first. Rows are 12.5px --t2 under it, indented to the heading's text, with the source's real logo or avatar, its
 * name, handle or host, and how many items in the feed came from it, aligned under the group's count. */
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
    <div className="pb-4">
      <RailTitle>Sources</RailTitle>
      {present.map((g, i) => {
        const list = sources.filter((s) => s.group === g.id);
        const open = !closed.has(g.id);
        return (
          <section key={g.id} aria-label={g.label} className={cn(i > 0 ? "mt-2 border-t border-line" : "mt-1")}>
            <h3>
              <button
                type="button"
                onClick={() => toggle(g.id)}
                aria-expanded={open}
                aria-controls={`rail-${g.id}`}
                className="flex w-full items-center gap-2 px-4 pt-4 pb-1.5 text-left text-[13.5px] font-semibold text-t1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <GroupGlyph group={g.id} className={cn("size-3.5 shrink-0", hue[g.id])} />
                <span className="min-w-0 flex-1 truncate">{g.label}</span>
                <span className="text-[11.5px] font-normal tabular-nums text-t3">{list.length}</span>
                <ChevronDown className={cn("size-3.5 shrink-0 text-t3 transition-transform", !open && "-rotate-90")} aria-hidden="true" />
              </button>
            </h3>
            {open ? (
              <ul id={`rail-${g.id}`} className="px-2">
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

/** What follows a source's name: the handle for Twitter accounts, the host for feeds and sites. */
const secondOf = (s: Source) => (s.group === "x" ? s.handle : s.group === "github" ? null : s.mark);

function SourceRow({ source: s, on, onSelect }: { source: Source; on: boolean; onSelect?: (id: string | null) => void }) {
  const n = itemsFrom(s.id).length;
  const second = secondOf(s);
  const cls = cn(
    "flex h-[30px] w-full items-center gap-2 rounded-md pr-[30px] pl-[30px] text-left text-[12.5px] text-t2 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
    on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
  );
  const title = `${s.name}${second ? ` ${second}` : ""}${s.why ? `: ${s.why}` : s.focus ? `: ${s.focus}` : ""}`;
  const body = (
    <>
      <SourceMark source={s} size={16} className={s.group === "x" ? "" : "rounded-[4px]"} />
      <span className="min-w-0 flex-1 truncate leading-tight">
        {s.name}
        {second ? <span className="ml-1.5 text-[11.5px] text-t3">{second}</span> : null}
      </span>
      {n > 0 ? <span className="shrink-0 text-[11px] tabular-nums text-t3">{n}</span> : null}
    </>
  );
  return (
    <li>
      {onSelect ? (
        <button type="button" onClick={() => onSelect(on ? null : s.id)} aria-pressed={on} title={title} className={cls}>
          {body}
        </button>
      ) : (
        <Link href={`${BASE}/feed?source=${s.id}`} title={title} className={cls}>
          {body}
        </Link>
      )}
    </li>
  );
}

/** The foot, pinned under the middle on --raised: FREE WEEK with its meter, days left and posts used; Light and
 * Dark; the person; Sign out; Hide. */
function Foot({ onHide, hideRef }: { onHide: () => void; hideRef: React.RefObject<HTMLButtonElement | null> }) {
  return (
    <div className="shrink-0 border-t border-line bg-[var(--raised)] px-4 pt-3.5 pb-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10.5px] font-medium tracking-[0.12em] text-[var(--caution)] uppercase">Free week</p>
        <p className="text-[12px] text-t2">
          <span className="font-medium text-t1 tabular-nums">{status.daysLeft}</span> days left
        </p>
      </div>
      <div className="mt-2">
        <Segments total={status.trialDays} filled={status.daysLeft} />
      </div>
      <p className="mt-1.5 text-[11.5px] tabular-nums text-t3">
        {status.poolUsed} of {status.poolLimit} watched Twitter posts used
      </p>
      <ThemeSwitch className="mt-3.5 w-full" />
      <p className="mt-3.5 flex min-w-0 items-center gap-2 text-[12.5px]">
        <span
          aria-hidden="true"
          className="grid size-[22px] shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand)] uppercase shadow-[inset_0_0_0_1px_var(--brand-line)]"
        >
          {ACCOUNT_EMAIL.charAt(0)}
        </span>
        <span className="min-w-0 truncate font-medium text-t1">{ACCOUNT_EMAIL}</span>
      </p>
      <div className="mt-3 flex items-center gap-2">
        <SignOut className="flex-1 justify-center" />
        <button
          ref={hideRef}
          type="button"
          onClick={onHide}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12.5px] text-t3 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <PanelLeftClose className="size-3.5" aria-hidden="true" />
          Hide
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
