"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Bell, Layers, LogOut, Newspaper, PanelLeft } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { lift, liftStyle, Stage } from "@/v2/deck/chrome";
import { groups, HANDLE, itemsFrom, sources as allSources, type Source } from "@/v2/deck/data";
import { GroupGlyph, SourceMark } from "@/v2/deck/marks";
import { EASE } from "@/v2/deck/live";
import { BASE, type LabelMode } from "./card";

// The One chrome. Two round buttons at the bottom left: FIRST the source panel button (owner, pass 8: "the collab
// sidebar should be a button by itself, first thing"), then the Oparax bubble with its small menu. The source panel
// floats over the page (fixed, full height, 280px) and the page never moves; closed, it is gone completely (owner:
// "When it's closed, it's closed"). Its contents are the Deck's source list: Sources, All sources, a label per
// kind, three rows per kind and then Show more, each row a logo, a name and a count in one aligned column.

const NAV = [
  { href: `${BASE}/feed`, label: "Feed", icon: Newspaper },
  { href: `${BASE}/sources`, label: "Sources", icon: Layers },
  { href: `${BASE}/notifications`, label: "Notifications", icon: Bell },
];

export function Shell({
  children,
  header,
  sources = allSources,
  onSource,
  activeSource = null,
  initialOpen = false,
  light,
}: {
  children: React.ReactNode;
  /** The page's title row, first in the content column. */
  header?: React.ReactNode;
  /** The panel's sources (the feed's source list by default). */
  sources?: Source[];
  mode?: LabelMode;
  onMode?: (m: LabelMode) => void;
  /** Filters the page by a source. Without it, a row opens the feed filtered to that source. */
  onSource?: (id: string | null) => void;
  activeSource?: string | null;
  emptyLine?: string;
  ownExpand?: boolean;
  /** The source panel starts open (?panel=open on the feed). */
  initialOpen?: boolean;
  light?: number;
}) {
  const [panel, setPanel] = useState(initialOpen);
  const panelButton = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closePanel = (focus: boolean) => {
    setPanel(false);
    if (focus) requestAnimationFrame(() => panelButton.current?.focus());
  };
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel(true);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || panelButton.current?.contains(t)) return;
      if ((t as Element).closest?.("[data-one-chrome]")) return;
      setPanel(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [panel]);

  return (
    <Stage light={light}>
      <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-8 lg:px-8">
        <div className="min-w-0 [&>main]:px-0 [&>main]:pt-0">
          {header ? <div className="mb-6">{header}</div> : null}
          {children}
        </div>
      </div>
      {/* Closed, the panel unmounts at once: nothing of it stays on the page. */}
      {panel ? <SourcePanel ref={panelRef} sources={sources} selected={activeSource} onSelect={onSource} /> : null}
      <div className="fixed bottom-4 left-4 z-50 flex items-end gap-2.5">
        <button
          ref={panelButton}
          type="button"
          onClick={() => setPanel(!panel)}
          aria-expanded={panel}
          aria-controls="one-sources"
          aria-label={panel ? "Close sources" : "Open sources"}
          title="Sources"
          className={cn(
            lift,
            "grid size-11 place-items-center rounded-full transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring",
            panel ? "text-[var(--brand)]" : "text-t2",
          )}
          style={liftStyle}
        >
          <PanelLeft className="size-[19px]" aria-hidden="true" />
        </button>
        <Bubble />
      </div>
    </Stage>
  );
}

/** Kept for pages that still render it; the panel button replaces it, so it draws nothing. */
export function Expand({ className }: { className?: string }) {
  void className;
  return null;
}

/** The count column: one 24px right-aligned column, so the group and row numbers line up. */
const countCol = "w-6 shrink-0 text-right tabular-nums";
const SHOWN = 3;

function SourcePanel({
  ref,
  sources,
  selected,
  onSelect,
}: {
  ref: React.Ref<HTMLElement>;
  sources: Source[];
  selected: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [more, setMore] = useState<Set<string>>(() => new Set());
  const pick = (id: string | null) => {
    if (onSelect) return onSelect(id);
    router.push(id ? `${BASE}/feed?source=${id}` : `${BASE}/feed`);
  };
  return (
    <motion.aside
      ref={ref}
      id="one-sources"
      aria-label="Sources"
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className={cn(lift, "fixed inset-y-3 left-3 z-40 flex w-[280px] flex-col overflow-hidden")}
      style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5 pb-20">
        <p className="px-2 pt-1.5 pb-3 text-[15px] font-semibold text-t1">Sources</p>
        <Row on={selected === null} onClick={() => pick(null)}>
          <span className="grid size-[18px] place-items-center rounded-[5px] bg-[var(--brand-soft)] text-[var(--brand)]">
            <Layers className="size-3" aria-hidden="true" />
          </span>
          <span className="flex-1 text-left text-[13px] text-t1">All sources</span>
        </Row>
        {groups.map((g) => {
          const members = sources.filter((s) => s.group === g.id);
          if (!members.length) return null;
          const all = more.has(g.id);
          const shown = all ? members : members.slice(0, SHOWN);
          return (
            <section key={g.id} aria-label={g.label} className="mt-5">
              <p className="flex items-center gap-2 px-2 pb-1.5 text-[13px] font-semibold text-t1">
                <span className="grid size-[18px] place-items-center text-t3">
                  <GroupGlyph group={g.id} className="size-3.5" />
                </span>
                {g.label}
                <span className={cn(countCol, "ml-auto text-[11.5px] font-medium text-t3")}>{members.length}</span>
              </p>
              {shown.map((s) => {
                const n = itemsFrom(s.id).length;
                return (
                  <Row key={s.id} on={selected === s.id} onClick={() => pick(selected === s.id ? null : s.id)}>
                    <SourceMark source={s} size={18} className={s.group === "x" ? "" : "rounded-[5px]"} />
                    <span className="min-w-0 flex-1 truncate text-left text-[13px] text-t2">{s.name}</span>
                    <span className={cn(countCol, "text-[11.5px] text-t3")}>{n > 0 ? n : null}</span>
                  </Row>
                );
              })}
              {members.length > SHOWN ? (
                <button
                  type="button"
                  aria-expanded={all}
                  onClick={() =>
                    setMore((prev) => {
                      const next = new Set(prev);
                      if (next.has(g.id)) next.delete(g.id);
                      else next.add(g.id);
                      return next;
                    })
                  }
                  className="mt-1 ml-[38px] rounded-sm text-[12.5px] text-t3 underline decoration-line-strong underline-offset-4 transition-colors hover:text-t1 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {all ? "Show less" : "Show more"}
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
    </motion.aside>
  );
}

/** The Deck's source row (v2/deck/feed.tsx). */
function Row({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
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
  const settings = `${BASE}/settings`;
  return (
    <div ref={ref} data-one-chrome className="relative">
      {open ? (
        <div id="one-menu" role="menu" aria-label="Oparax" className={cn(lift, "absolute bottom-[calc(100%+8px)] left-0 w-[232px] p-2")} style={liftStyle}>
          {/* One mark only, on the bubble. The top row holds the theme button alone. */}
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
              <Link
                href={settings}
                role="menuitem"
                aria-current={pathname === settings ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-sm text-[12.5px] underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-ring",
                  pathname === settings ? "font-medium text-[var(--brand)]" : "text-t3 hover:text-t1",
                )}
              >
                Settings
              </Link>
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
