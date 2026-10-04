"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Layers, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { lift, liftStyle, Stage } from "@/v2/deck/chrome";
import { groups, HANDLE, itemsFrom, type Source } from "@/v2/deck/data";
import { GroupGlyph, SourceMark } from "@/v2/deck/marks";
import { BASE, type LabelMode } from "./card";

// The One sidebar: the Deck's SourceList aside (v2/deck/feed.tsx), copied, placed as the Deck places it (a lifted
// aside in the page grid, sticky at top-4, as tall as its content), with the owner's changes only: no Name/Handle
// switch; counts as bare numbers in one right-aligned 24px column; three sources per group, then a Show more row
// inside the group; Oparax and the theme toggle on a row above Sources; under the list Notifications, the account
// with its FREE WEEK badge, an outlined Sign out and, last, Collapse sidebar. Closed, the aside is gone and one
// Expand control sits at the bottom left of the viewport.

type Sidebar = { open: boolean; expand: () => void; focusExpand: React.MutableRefObject<boolean> };
const SidebarContext = createContext<Sidebar | null>(null);

const SHOWN = 3;

export function Shell({
  children,
  header,
  sources,
  onSource,
  activeSource,
  initialOpen = false,
  emptyLine,
  light,
  xdm = false,
  ownExpand = false,
}: {
  children: React.ReactNode;
  /** Spans the page above the grid, as the Deck's Header does. */
  header?: React.ReactNode;
  sources: Source[];
  /** Kept for callers; the sidebar shows names only. */
  mode?: LabelMode;
  onMode?: (m: LabelMode) => void;
  onSource?: (id: string | null) => void;
  activeSource?: string | null;
  initialOpen?: boolean;
  /** Shown in the open aside when there are no sources yet. */
  emptyLine?: string;
  light?: number;
  /** Notifications: X DMs on or off (sample state: off). */
  xdm?: boolean;
  onXdm?: (on: boolean) => void;
  /** The page renders <Expand /> itself; otherwise the Shell does. */
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
        <div className="relative w-full px-2 pt-4 lg:px-4">
          {header}
          <div className={cn("grid items-start gap-6", header && "mt-7", open && "lg:grid-cols-[264px_minmax(0,1fr)]")}>
            {open ? <SourceList sources={sources} selected={activeSource ?? null} onSelect={onSource} onCollapse={collapse} emptyLine={emptyLine} xdm={xdm} /> : null}
            <div className="min-w-0 [&>main]:px-0 [&>main]:pt-0">{children}</div>
          </div>
        </div>
        {ownExpand ? null : <Expand />}
      </SidebarContext.Provider>
    </Stage>
  );
}

/** Shown only while the sidebar is closed: one quiet 36px control, fixed at the bottom left of the viewport. */
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
      title="Expand sidebar"
      className={cn(
        "fixed bottom-4 left-4 z-40 grid size-9 place-items-center rounded-lg text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
    >
      <PanelLeftOpen className="size-[18px]" aria-hidden="true" />
    </button>
  );
}

/** The count column: one 24px right-aligned column, so the group and row numbers line up. */
const countCol = "w-6 shrink-0 text-right tabular-nums";

function SourceList({
  sources,
  selected,
  onSelect,
  onCollapse,
  emptyLine,
  xdm,
}: {
  sources: Source[];
  selected: string | null;
  onSelect?: (id: string | null) => void;
  onCollapse: () => void;
  emptyLine?: string;
  xdm: boolean;
}) {
  const [more, setMore] = useState<Set<string>>(() => new Set());
  const [channels, setChannels] = useState(false);
  return (
    <aside
      id="one-sidebar"
      aria-label="Sources"
      className={cn(lift, "hidden p-2.5 lg:sticky lg:top-4 lg:block")}
      style={liftStyle}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        onCollapse();
      }}
    >
      <div className="flex h-8 items-center gap-2 px-1.5">
        <Link href={`${BASE}/landing`} className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-t1">
          <OparaxMark className="size-[20px]" />
          Oparax
        </Link>
        <ThemeToggle className="ml-auto size-8 text-t3" />
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 px-1.5 pt-1 pb-2.5">
        <p className="text-[13px] font-semibold text-t1">Sources</p>
      </div>
      {sources.length === 0 && emptyLine ? <p className="px-2 pt-1 text-[12.5px] leading-relaxed text-t3">{emptyLine}</p> : null}
      {sources.length > 0 ? (
        <Row on={selected === null} onClick={() => onSelect?.(null)}>
          <span className="grid size-[18px] place-items-center rounded-[5px] bg-[var(--brand-soft)] text-[var(--brand)]">
            <Layers className="size-3" aria-hidden="true" />
          </span>
          <span className="flex-1 text-left text-[13px] text-t1">All sources</span>
        </Row>
      ) : null}
      <div className="mt-1 grid gap-x-4 sm:grid-cols-2 lg:grid-cols-1">
        {groups.map((g) => {
          const members = sources.filter((s) => s.group === g.id);
          if (!members.length) return null;
          const all = more.has(g.id);
          const shown = all ? members : members.slice(0, SHOWN);
          return (
            <div key={g.id} className="mt-3">
              <GroupLabel glyph={<GroupGlyph group={g.id} />} count={members.length} className="px-2 pb-1.5">
                {g.label}
              </GroupLabel>
              {shown.map((s) => {
                const n = itemsFrom(s.id).length;
                return (
                  <Row key={s.id} on={selected === s.id} onClick={() => onSelect?.(selected === s.id ? null : s.id)}>
                    <SourceMark source={s} size={18} />
                    <span className="min-w-0 flex-1 truncate text-left text-[13px] text-t2">{s.name}</span>
                    <span className={cn(countCol, "text-[11px] text-t3")}>{n > 0 ? n : null}</span>
                  </Row>
                );
              })}
              {members.length > SHOWN ? (
                <Row
                  on={false}
                  expanded={all}
                  onClick={() =>
                    setMore((prev) => {
                      const next = new Set(prev);
                      if (next.has(g.id)) next.delete(g.id);
                      else next.add(g.id);
                      return next;
                    })
                  }
                >
                  <span className="grid size-[18px] shrink-0 place-items-center text-t3">
                    <ChevronDown className={cn("size-3.5 transition-transform", all && "rotate-180")} aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-left text-[13px] text-t3">{all ? "Show less" : "Show more"}</span>
                </Row>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-line-strong pt-2.5">
        <Row on={false} expanded={channels} onClick={() => setChannels(!channels)}>
          <span className="grid size-[18px] shrink-0 place-items-center text-t3">
            <Bell className="size-4" aria-hidden="true" />
          </span>
          <span className="flex-1 text-left text-[13px] text-t2">Notifications</span>
          <ChevronDown className={cn("size-3.5 shrink-0 text-t3 transition-transform", channels ? "rotate-180" : "-rotate-90")} aria-hidden="true" />
        </Row>
        {channels ? (
          <p className="flex min-h-8 items-center gap-2.5 py-1 pr-2 pl-[36px] text-[12.5px] text-t3">
            <span className="flex-1">X DMs</span>
            <span>{xdm ? "On" : "Off"}</span>
          </p>
        ) : null}
        <div className="flex min-h-8 w-full items-center gap-2.5 px-2 py-1 text-[13px] text-t1">
          <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>
          <span className="min-w-0 flex-1 truncate">@{HANDLE}</span>
          <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide whitespace-nowrap text-[var(--caution)]">
            FREE WEEK
          </span>
        </div>
        <Link
          href={`${BASE}/login`}
          className="mt-1.5 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-line-strong text-[13px] text-t2 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <LogOut className="size-3.5" aria-hidden="true" />
          Sign out
        </Link>
        <button
          type="button"
          onClick={onCollapse}
          aria-expanded
          aria-controls="one-sidebar"
          className="mt-2.5 flex min-h-8 w-full items-center gap-2.5 rounded-md px-2 py-1 text-[13px] text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="grid size-[18px] shrink-0 place-items-center">
            <PanelLeftClose className="size-4" aria-hidden="true" />
          </span>
          Collapse sidebar
        </button>
      </div>
    </aside>
  );
}

/** The Deck's GroupLabel (v2/deck/marks.tsx) with its count in the shared 24px count column. */
function GroupLabel({ children, glyph, count, className }: { children: React.ReactNode; glyph?: React.ReactNode; count: number; className?: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] text-t3 uppercase", className)}>
      {glyph}
      {children}
      <span className={cn(countCol, "ml-auto tracking-normal")}>{count}</span>
    </p>
  );
}

/** The Deck's Row (v2/deck/feed.tsx). */
function Row({ on, expanded, onClick, children }: { on: boolean; expanded?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={expanded === undefined ? on : undefined}
      aria-expanded={expanded}
      onClick={onClick}
      className={cn(
        "flex min-h-8 w-full items-center gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
        on && "bg-[var(--brand-soft)] shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
      )}
    >
      {children}
    </button>
  );
}
