"use client";

import {
  Bell,
  BookMarked,
  ChevronDown,
  List,
  Moon,
  PanelLeft,
  Rss,
  Sun,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSignOut } from "@/components/landing/sign-out-button";
import { OparaxMark } from "@/components/logo";
import { useResolvedTheme } from "@/components/one/brand-header";
import { GroupGlyph, SourceMark } from "@/components/one/marks";
import { Stage, titleCase } from "@/components/one/stage";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { landingContent } from "@/lib/landing/content";
import { monitorContent } from "@/lib/monitor/content";
import type { AsideGroup, AsideKind } from "@/lib/monitor/present";
import { cn } from "@/lib/utils";

// The One shell (owner, Oct 10, locked; lab v2/one/shell.tsx): one 248px rail fixed to the viewport's left edge: the
// head (the mark and "Oparax" opening the feed, the theme icon and Hide at the right), the group "Navigation" (Feed,
// Sources, Notifications, Account), the group "Filter" (the four kinds as headers, their sources indented; a row opens
// the feed filtered to that source), and a darker foot with the initial, the name and Sign Out. Hide removes the
// whole rail; the same panel icon, fixed at the top left where Hide sat, brings it back. The page's column is centred
// in the width that remains, under the Width rule. Before an agent exists the seven steps stand in the rail's middle.
// Below 1024px, where the lab has no rail, the same rail opens as a sheet from the panel icon.

const copy = monitorContent.menu;
const RAIL_KEY = "oparax-one-rail";
const story = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The kind's hue on its group heading: X posts in the text colour, articles teal, GitHub its own mark. */
export const hue: Record<AsideKind, string> = {
  x: "text-t1",
  rss: "text-[var(--kind-article)]",
  website: "text-[var(--kind-article)]",
  github: "text-[var(--kind-github)]",
};

/** The one rail row: 32px, inset 8px from both sides with an 8px radius, the icon or mark at x16 and the text at x36
 * (8px inset, 8px padding, a 15px icon, 5px). The four pages use it, and the onboarding's steps. */
export const railRow =
  "relative mx-2 flex h-8 items-center gap-[5px] rounded-lg pr-2 pl-2 text-[13px] transition-colors";
const selectedRow = "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]";
const quietRow = "text-t2 hover:bg-raised/60 hover:text-t1";
/** The panel icon's button: Hide in the head and, while the rail is hidden, the same icon fixed at the top left. */
const panelIcon =
  "size-7 shrink-0 place-items-center rounded-md text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring";

/** The theme as one switch (owner, Oct 9: "a simple light switch that converted to a dark switch"): one icon button
 * showing the mode a press brings, the sun in dark mode and the moon in light. */
export function ThemeButton({ className }: { className?: string }) {
  const { theme, setTheme } = useResolvedTheme();
  const dark = theme !== "light";
  const label = dark ? copy.switchToLight : copy.switchToDark;
  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(panelIcon, "grid", className)}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

/** Whether the rail is showing, so the page line can carry the mark while it is hidden. */
const RailContext = createContext(true);

/** The mark (icon only, 20px) at the left of the page title line, only while the rail is hidden. */
export function RailMark({ href }: { href: string }) {
  const open = useContext(RailContext);
  if (open) return null;
  return (
    <Link
      href={href}
      aria-label={landingContent.brand}
      className="hidden shrink-0 rounded-sm text-t1 focus-visible:outline-2 focus-visible:outline-ring lg:block"
    >
      <OparaxMark className="size-5" />
    </Link>
  );
}

/** The page line, level with the rail's mark: the heading at the left (the mark before it while the rail is hidden),
 * then what the page puts beside it and at its right. */
export function PageLine({
  title,
  home,
  beside,
  right,
  live,
}: {
  title: React.ReactNode;
  /** Where the mark leads while the rail is hidden. */
  home: string;
  beside?: React.ReactNode;
  right?: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div className="flex min-h-12 items-center gap-5">
      <div className="flex shrink-0 items-center gap-3">
        <RailMark href={home} />
        <h1
          aria-live={live ? "polite" : undefined}
          className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1"
        >
          {title}
        </h1>
      </div>
      {beside}
      {right ? <div className="ml-auto flex min-w-0 items-center gap-3">{right}</div> : null}
    </div>
  );
}

export type ShellPerson = { name: string; initial: string };

/** Every page inside the app: the rail fixed at the viewport's left edge and the page in its column beside it. The
 * rail's rows link to the feed filtered to a source; `selected` is the source the feed shows now. `middle` replaces
 * the navigation and the sources (the onboarding's seven steps). */
export function AppShell({
  children,
  home,
  handle,
  groups,
  selected = null,
  middle,
  person,
  light,
  className,
}: {
  children: React.ReactNode;
  /** Where the head's mark leads: the feed, or onboarding before an agent exists. */
  home: string;
  /** The agent's page address, or null before one exists. */
  handle: string | null;
  groups: AsideGroup[];
  selected?: string | null;
  middle?: React.ReactNode;
  person: ShellPerson;
  light?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  const [sheet, setSheet] = useState(false);
  const moved = useRef(false);
  const show = useRef<HTMLButtonElement>(null);
  const hide = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem(RAIL_KEY) === "hidden") setOpen(false);
    } catch {
      // Storage can be unavailable (private windows); the rail opens for this page view.
    }
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
    } catch {
      // The choice then lasts for this page view only.
    }
  };
  const rail = (
    <RailBody
      home={home}
      handle={handle}
      groups={groups}
      selected={selected}
      middle={middle}
      person={person}
      onNavigate={() => setSheet(false)}
      onHide={() => choose(false)}
      hideRef={hide}
    />
  );
  return (
    <Stage light={light} className={className}>
      <RailContext.Provider value={open}>
        <div style={{ "--one-rail-w": `${open ? 248 : 0}px` } as React.CSSProperties}>
          {open ? (
            <aside
              aria-label={copy.rail}
              className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-[var(--rail)] lg:flex"
            >
              {rail}
            </aside>
          ) : null}
          <Sheet open={sheet} onOpenChange={setSheet}>
            <SheetContent
              side="left"
              showCloseButton={false}
              aria-label={copy.rail}
              className="w-[248px] gap-0 border-line bg-[var(--rail)] p-0 text-t1 sm:max-w-[248px]"
            >
              <SheetTitle className="sr-only">{copy.rail}</SheetTitle>
              {rail}
            </SheetContent>
          </Sheet>
          <div className={cn(open ? "one-column-rail" : "one-column", "relative flex items-start")}>
            <main className="relative min-w-0 flex-1 pt-3 pb-24">{children}</main>
          </div>
          <button
            ref={show}
            type="button"
            aria-label={copy.show}
            title={copy.show}
            onClick={() => (window.innerWidth >= 1024 ? choose(true) : setSheet(true))}
            className={cn(panelIcon, "fixed top-[14px] left-4 z-40 grid", open && "lg:hidden")}
          >
            <PanelLeft className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </RailContext.Provider>
    </Stage>
  );
}

/** A group's label (shadcn's sidebar label): 12px t3 in a 32px row. */
function GroupLabel({ children }: { children: string }) {
  return <p className="flex h-8 items-center px-4 text-[12px] text-t3">{children}</p>;
}

/** The rail's contents, the same in the fixed rail and in the narrow-screen sheet: the head, the middle (the four
 * pages and the sources, or the onboarding's steps) and the foot. */
function RailBody({
  home,
  handle,
  groups,
  selected,
  middle,
  person,
  onNavigate,
  onHide,
  hideRef,
}: {
  home: string;
  handle: string | null;
  groups: AsideGroup[];
  selected: string | null;
  middle?: React.ReactNode;
  person: ShellPerson;
  onNavigate: () => void;
  onHide: () => void;
  hideRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const pathname = usePathname().toLowerCase();
  const feed = handle ? `/${handle}` : null;
  const nav = feed
    ? [
        {
          href: feed,
          label: copy.feed,
          Icon: List,
          // A story opened from the feed is still the feed.
          on:
            pathname === feed ||
            (pathname.startsWith(`${feed}/`) && story.test(pathname.slice(feed.length + 1))),
        },
        {
          href: `${feed}/sources`,
          label: copy.sources,
          Icon: Rss,
          on: pathname === `${feed}/sources`,
        },
        {
          href: `${feed}/notifications`,
          label: copy.notifications,
          Icon: Bell,
          on: pathname === `${feed}/notifications`,
        },
        {
          href: `${feed}/account`,
          label: copy.account,
          Icon: UserRound,
          on: pathname === `${feed}/account`,
        },
      ]
    : [];
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line py-3 pr-3 pl-4">
        <Link
          href={home}
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-sm text-[15px] leading-5 font-semibold tracking-[-0.01em] text-t1 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <OparaxMark className="size-[18px] shrink-0 text-t1" />
          {landingContent.brand}
        </Link>
        <ThemeButton className="ml-auto" />
        <button
          ref={hideRef}
          type="button"
          aria-label={copy.hide}
          title={copy.hide}
          onClick={onHide}
          className={cn(panelIcon, "hidden lg:grid")}
        >
          <PanelLeft className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          middle ? "pt-2" : "flex flex-col gap-3 py-2",
        )}
      >
        {middle ?? (
          <>
            <nav aria-label={copy.navigation} className="flex flex-col gap-[2px]">
              <GroupLabel>{copy.navigation}</GroupLabel>
              {nav.map(({ href, label, Icon, on }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    railRow,
                    "group/nav font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    on ? selectedRow : quietRow,
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[15px] shrink-0",
                      on ? "text-[var(--brand)]" : "text-t3 group-hover/nav:text-t2",
                    )}
                    aria-hidden="true"
                  />
                  {label}
                </Link>
              ))}
            </nav>
            {groups.length ? (
              <div>
                <GroupLabel>{copy.filter}</GroupLabel>
                <Sources groups={groups} selected={selected} onNavigate={onNavigate} />
              </div>
            ) : null}
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5 border-t border-line bg-[var(--well)] px-4 py-3">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[11px] font-semibold text-white uppercase"
        >
          {person.initial}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] leading-[18px] font-semibold text-t1">
          {person.name}
        </span>
        <SignOut />
      </div>
    </>
  );
}

/** Sign Out as the foot's quiet word. */
function SignOut() {
  const { status, signOut } = useSignOut();
  return (
    <button
      type="button"
      onClick={signOut}
      disabled={status === "pending"}
      className="shrink-0 rounded-sm text-[12px] text-t3 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-70"
    >
      <span role={status === "error" ? "alert" : undefined}>
        {status === "error"
          ? copy.signOutFailed
          : status === "pending"
            ? copy.signingOut
            : copy.signOut}
      </span>
    </button>
  );
}

/** The watched sources under the Filter label: a header per kind (13px semibold, the kind mark, the count, a
 * chevron) and its rows (the logo and the name only) indented 24px under it. No hairlines. An empty kind is absent. */
function Sources({
  groups,
  selected,
  onNavigate,
}: {
  groups: AsideGroup[];
  selected: string | null;
  onNavigate: () => void;
}) {
  const [closed, setClosed] = useState<Set<AsideKind>>(() => new Set());
  const toggle = (g: AsideKind) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  return (
    <div className="flex flex-col gap-[2px]">
      {groups.map((g) => {
        const open = !closed.has(g.kind);
        return (
          <section key={g.kind} aria-label={titleCase(g.label)} className="flex flex-col gap-[2px]">
            <h3>
              <button
                type="button"
                onClick={() => toggle(g.kind)}
                aria-expanded={open}
                aria-controls={`rail-${g.kind}`}
                className="mx-2 flex h-8 w-[calc(100%-16px)] items-center gap-2 rounded-lg px-2 text-left text-[13px] leading-5 font-semibold text-t1 transition-colors hover:bg-raised/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <GroupGlyph kind={g.kind} className={cn("size-4 shrink-0", hue[g.kind])} />
                <span className="min-w-0 flex-1 truncate">{titleCase(g.label)}</span>
                <span className="font-mono text-[11px] font-normal text-t3 tabular-nums">
                  {g.rows.length}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3 shrink-0 text-t4 transition-transform",
                    !open && "-rotate-90",
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>
            {open ? (
              <ul id={`rail-${g.kind}`} className="flex flex-col gap-[2px] pl-6">
                {g.rows.map((s) => {
                  const on = selected === s.key;
                  return (
                    <li key={s.key} className="flex">
                      <Link
                        href={s.href}
                        onClick={onNavigate}
                        aria-current={on ? "true" : undefined}
                        title={s.address !== s.name ? `${s.name}: ${s.address}` : s.name}
                        className={cn(
                          "mx-2 flex h-7 flex-1 items-center gap-2 rounded-lg px-2 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                          on ? selectedRow : quietRow,
                        )}
                      >
                        {g.kind === "github" ? (
                          <BookMarked
                            className="size-4 shrink-0 text-t3"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                        ) : (
                          <SourceMark
                            kind={g.kind === "x" ? "x" : "site"}
                            mark={s.mark}
                            size={16}
                            className={g.kind === "x" ? "" : "rounded-[4px]"}
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
