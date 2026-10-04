"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Layers, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { lift, liftStyle, Stage } from "@/v2/deck/chrome";
import { groups, HANDLE, itemsFrom, status, type Group, type Source } from "@/v2/deck/data";
import { GroupGlyph, SourceMark } from "@/v2/deck/marks";
import { BASE, type LabelMode } from "./card";

// The One sidebar, drawn as the Deck's source aside (v2/deck/feed.tsx): a 240px lifted column in the page grid,
// the stories in the next column. Open: the mark, "Oparax", the theme toggle and Collapse on top, then a copy of
// the Deck's source list (Sources, All sources, the group labels, 18px logos, 13px names, counts in one
// right-aligned column, three per group before "Show more"), then under one divider three rows of one anatomy:
// Notifications (opens its channels inline), the account with its days left, and Sign out. Closed, the column is
// gone and the content takes the width; one Expand control sits at the top left of the content's top row. Escape
// in the open aside collapses it and focuses Expand.

const LIMIT = 3;

type Sidebar = { open: boolean; expand: () => void; focusExpand: React.MutableRefObject<boolean> };
const SidebarContext = createContext<Sidebar | null>(null);

export function Shell({
  children,
  sources,
  onSource,
  activeSource,
  initialOpen = false,
  emptyLine,
  light = 720,
  xdm,
  ownExpand = false,
}: {
  children: React.ReactNode;
  sources: Source[];
  /** Kept for callers; the sidebar shows names only. */
  mode?: LabelMode;
  onMode?: (m: LabelMode) => void;
  onSource?: (id: string | null, trigger: HTMLElement) => void;
  activeSource?: string | null;
  initialOpen?: boolean;
  /** Shown in the open aside when there are no sources yet. */
  emptyLine?: string;
  light?: number;
  /** Notifications: X DMs on or off (sample state: off). */
  xdm?: boolean;
  onXdm?: (on: boolean) => void;
  /** The page places <Expand /> in its own top row; otherwise the Shell gives it a row above the page. */
  ownExpand?: boolean;
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
        {/* The page margins live here; a page's own <main> drops its horizontal pad so the aside and the content share them. */}
        <div className={cn("relative grid flex-1 items-start gap-5 px-2 lg:px-4", open && "lg:grid-cols-[240px_minmax(0,1fr)]")}>
          {open ? (
            <Rail sources={sources} onSource={onSource} activeSource={activeSource} onCollapse={collapse} emptyLine={emptyLine} xdm={xdm ?? false} />
          ) : null}
          <div className="relative flex min-w-0 flex-col [&>main]:px-0">
            {!ownExpand && !open ? (
              <div className="flex h-9 items-center pt-3">
                <Expand />
              </div>
            ) : null}
            {children}
          </div>
        </div>
      </SidebarContext.Provider>
    </Stage>
  );
}

const quiet = "transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring";
/** The bottom block's one row anatomy, the source Row's: 36px, an 18px icon slot, a 13px label, the same hover. */
const accountRow = cn("flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-t2 hover:text-t1", quiet);

/** Shown only while the sidebar is collapsed: one quiet 36px control that opens it. */
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
    <button
      ref={ref}
      type="button"
      onClick={ctx.expand}
      aria-expanded={false}
      aria-controls="one-sidebar"
      aria-label="Expand sidebar"
      title="Expand"
      className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-t3 hover:text-t1", quiet, className)}
    >
      <PanelLeftOpen className="size-[18px]" aria-hidden="true" />
    </button>
  );
}

function Rail({
  sources,
  onSource,
  activeSource,
  onCollapse,
  emptyLine,
  xdm,
}: {
  sources: Source[];
  onSource?: (id: string | null, trigger: HTMLElement) => void;
  activeSource?: string | null;
  onCollapse: () => void;
  emptyLine?: string;
  xdm: boolean;
}) {
  const [channels, setChannels] = useState(false);
  return (
    <aside
      id="one-sidebar"
      aria-label="Sidebar"
      className={cn(lift, "mt-3 flex flex-col p-2.5 lg:sticky lg:top-4 lg:h-[calc(100svh-28px)]")}
      style={liftStyle}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        onCollapse();
      }}
    >
      <div className="flex h-9 items-center gap-1 pb-1 pl-1.5">
        <Link href={`${BASE}/landing`} className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-t1">
          <OparaxMark className="size-[20px]" />
          Oparax
        </Link>
        <ThemeToggle className="ml-auto size-8 text-t3" />
        <button
          type="button"
          onClick={onCollapse}
          aria-expanded
          aria-controls="one-sidebar"
          aria-label="Collapse sidebar"
          title="Collapse"
          className={cn("grid size-8 place-items-center rounded-md text-t3 hover:text-t1", quiet)}
        >
          <PanelLeftClose className="size-[18px]" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        <SourceList sources={sources} onSource={onSource} activeSource={activeSource ?? null} emptyLine={emptyLine} />
      </div>

      {/* Pinned to the bottom of the sidebar (owner, Oct 4: "Why is that not at the bottom?") */}
      <div className="mt-auto border-t border-line pt-2">
        <button type="button" onClick={() => setChannels(!channels)} aria-expanded={channels} className={accountRow}>
          <span className="grid size-[18px] shrink-0 place-items-center">
            <Bell className="size-4" aria-hidden="true" />
          </span>
          <span className="flex-1">Notifications</span>
          <ChevronDown className={cn("size-3.5 shrink-0 text-t3 transition-transform", channels ? "rotate-180" : "-rotate-90")} aria-hidden="true" />
        </button>
        {channels ? (
          <ul aria-label="Notification channels">
            <li className="flex h-8 items-center gap-2 pr-2 pl-[38px] text-[12.5px] text-t3">
              X DMs<span className="ml-auto">{xdm ? "On" : "Off"}</span>
            </li>
          </ul>
        ) : null}
        <div className={accountRow}>
          <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>
          <span className="min-w-0 flex-1 truncate">@{HANDLE}</span>
          <span className="shrink-0 text-right text-[11px] tabular-nums text-t3">{status.daysLeft} days left</span>
        </div>
        <Link href={`${BASE}/login`} className={accountRow}>
          <span className="grid size-[18px] shrink-0 place-items-center">
            <LogOut className="size-4" aria-hidden="true" />
          </span>
          Sign out
        </Link>
      </div>
    </aside>
  );
}

/** The count column: one fixed width, right-aligned, so group and row numbers line up. */
const countCol = "w-6 shrink-0 text-right text-[11px] tabular-nums text-t3";
const count = (s: Source) => itemsFrom(s.id).length;

/** A copy of the Deck's SourceList (v2/deck/feed.tsx), names only, groups capped at three with Show more. */
function SourceList({
  sources,
  onSource,
  activeSource,
  emptyLine,
}: {
  sources: Source[];
  onSource?: (id: string | null, trigger: HTMLElement) => void;
  activeSource: string | null;
  emptyLine?: string;
}) {
  return (
    <div aria-label="Sources">
      <div className="flex items-center justify-between gap-2 px-1.5 pt-1 pb-2.5">
        <p className="text-[13px] font-semibold text-t1">Sources</p>
      </div>
      {sources.length === 0 && emptyLine ? <p className="px-2 pt-1 text-[12.5px] leading-relaxed text-t3">{emptyLine}</p> : null}
      {sources.length > 0 ? (
        <Row on={activeSource === null} onClick={onSource ? (e) => onSource(null, e.currentTarget) : undefined}>
          <span className="grid size-[18px] place-items-center rounded-[5px] bg-[var(--brand-soft)] text-[var(--brand)]">
            <Layers className="size-3" aria-hidden="true" />
          </span>
          <span className="flex-1 text-left text-[13px] text-t1">All sources</span>
        </Row>
      ) : null}
      <div className="mt-1">
        {groups.map((g) => {
          const members = sources.filter((s) => s.group === g.id).sort((a, b) => count(b) - count(a) || a.name.localeCompare(b.name));
          if (!members.length) return null;
          return <GroupBlock key={g.id} group={g.id} label={g.label} members={members} onSource={onSource} activeSource={activeSource} />;
        })}
      </div>
    </div>
  );
}

function GroupBlock({
  group,
  label,
  members,
  onSource,
  activeSource,
}: {
  group: Group;
  label: string;
  members: Source[];
  onSource?: (id: string | null, trigger: HTMLElement) => void;
  activeSource: string | null;
}) {
  const [more, setMore] = useState(false);
  const shown = more ? members : members.slice(0, LIMIT);
  return (
    <div className="mt-3">
      <GroupLabel glyph={<GroupGlyph group={group} />} count={members.length} className="px-2 pb-1.5">
        {label}
      </GroupLabel>
      {shown.map((s) => {
        const n = count(s);
        const on = activeSource === s.id;
        return (
          <Row key={s.id} on={on} onClick={onSource ? (e) => onSource(on ? null : s.id, e.currentTarget) : undefined} title={s.focus || undefined}>
            <SourceMark source={s} size={18} />
            <span className="min-w-0 flex-1 truncate text-left text-[13px] text-t2">{s.name}</span>
            <span className={countCol}>{n > 0 ? n : null}</span>
          </Row>
        );
      })}
      {members.length > LIMIT ? (
        <button
          type="button"
          onClick={() => setMore(!more)}
          aria-expanded={more}
          className={cn("flex min-h-8 w-full items-center rounded-md px-2 py-1 pl-[38px] text-left text-[12px] text-t3 hover:text-t1", quiet)}
        >
          {more ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

/** The Deck's GroupLabel (v2/deck/marks.tsx) with its count in the shared count column. */
function GroupLabel({ children, glyph, count, className }: { children: React.ReactNode; glyph?: React.ReactNode; count: number; className?: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] text-t3 uppercase", className)}>
      {glyph}
      {children}
      <span className={cn(countCol, "ml-auto font-mono text-[10.5px] tracking-normal")}>{count}</span>
    </p>
  );
}

/** The Deck's Row (v2/deck/feed.tsx). Without a handler it draws the same row without the hover. */
function Row({ on, onClick, title, children }: { on: boolean; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; title?: string; children: React.ReactNode }) {
  const cls = cn(
    "flex min-h-8 w-full items-center gap-2.5 rounded-md px-2 py-1",
    onClick && "transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
    on && onClick && "bg-[var(--brand-soft)] shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
  );
  return onClick ? (
    <button type="button" aria-pressed={on} onClick={onClick} title={title} className={cls}>
      {children}
    </button>
  ) : (
    <div title={title} className={cls}>
      {children}
    </div>
  );
}
