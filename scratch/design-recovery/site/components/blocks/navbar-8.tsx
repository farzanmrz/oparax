"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Download,
  Filter,
  MoreHorizontal,
  SlidersHorizontal,
} from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out";

const surface =
  "rounded-[var(--rb-r-xl,12px)] border border-neutral-200 bg-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] dark:border-neutral-800 dark:bg-neutral-900";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const SPRING = { type: "spring" as const, bounce: 0, duration: 0.35 };

const pop = (reduce: boolean | null) => ({
  initial: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 },
  animate: reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 },
  exit: reduce
    ? { opacity: 0, transition: { duration: 0.12 } }
    : {
        opacity: 0,
        scale: 0.97,
        y: -4,
        transition: { duration: 0.12, ease: EASE_OUT },
      },
  transition: { duration: 0.18, ease: EASE_OUT },
});

const menuItem =
  "flex w-full cursor-pointer items-center gap-2 rounded-[var(--rb-r-md,8px)] px-2.5 py-1.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800";

const PRIMARY = [
  { id: "all", label: "All", count: 248 },
  { id: "open", label: "Open", count: 46 },
  { id: "review", label: "In review", count: 12 },
  { id: "done", label: "Done", count: 190 },
];

const OVERFLOW = [
  { id: "archived", label: "Archived", count: 84 },
  { id: "drafts", label: "Drafts", count: 7 },
  { id: "spam", label: "Blocked", count: 3 },
];

const ROWS = [
  { title: "Retry failed webhooks after backoff", who: "Nadia V.", at: "12m" },
  { title: "Split checkout bundle by route", who: "Marcus S.", at: "1h" },
  { title: "Backfill invoice tax regions", who: "Priya R.", at: "3h" },
  { title: "Rotate signing keys for Harbor Coffee", who: "Tom A.", at: "6h" },
  { title: "Trim onboarding email sequence", who: "Elena M.", at: "1d" },
];

export default function Navbar8() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState("open");
  const [extra, setExtra] = useState<(typeof OVERFLOW)[number] | null>(null);
  const [menu, setMenu] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  const tabs = extra ? [...PRIMARY, extra] : PRIMARY;

  useEffect(() => {
    if (!menu) return;
    const doc = rootRef.current?.ownerDocument;
    if (!doc) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest?.("[data-menu-root]")) setMenu(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    doc.addEventListener("pointerdown", onPointerDown);
    doc.addEventListener("keydown", onKeyDown);
    return () => {
      doc.removeEventListener("pointerdown", onPointerDown);
      doc.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  const active = tabs.find((t) => t.id === tab) ?? tabs[0];

  const onKeyDown = (event: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === tab);
    let next = i;
    if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next].id);
  };

  return (
    <div
      ref={rootRef}
      className="relative flex h-full min-h-[400px] w-full flex-col overflow-hidden bg-white dark:bg-neutral-950"
    >
      <header className="relative z-20 flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-200 px-3 py-2.5 sm:px-4 dark:border-neutral-800">
        <div
          role="tablist"
          aria-label="Work queue filters"
          onKeyDown={onKeyDown}
          className="relative flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-[var(--rb-r-lg,10px)] bg-neutral-100 p-1 dark:bg-neutral-900"
        >
          {tabs.map((t) => {
            const isActive = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                data-tab={t.id}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={cx(
                  "relative inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--rb-r-sm,6px)] px-2.5 text-[13px] font-medium",
                  transition,
                  focus,
                  isActive
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
                )}
              >
                {isActive && (
                  <motion.span
                    aria-hidden
                    layoutId={`${uid}-pill`}
                    transition={reduce ? { duration: 0 } : SPRING}
                    className="absolute inset-0 rounded-[var(--rb-r-sm,6px)] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.08)] dark:bg-neutral-800"
                  />
                )}
                <span className="relative">{t.label}</span>
                <span
                  className={cx(
                    "relative text-[11px] tabular-nums",
                    isActive ? "text-neutral-500" : "text-neutral-400",
                  )}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative" data-menu-root>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="More views"
            onClick={() => {
              setMenu((m) => !m);
            }}
            className={cx(
              "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
              transition,
              focus,
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                {...pop(reduce)}
                role="menu"
                className={cx(
                  surface,
                  "absolute top-full left-0 z-30 mt-1.5 w-[190px] origin-top-left p-1",
                )}
              >
                <p className="px-2.5 py-1.5 text-[11px] font-medium tracking-[0.08em] text-neutral-400 uppercase">
                  More views
                </p>
                {OVERFLOW.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setExtra(o);
                      setTab(o.id);
                      setMenu(false);
                    }}
                    className={cx(menuItem, transition, focus)}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    <span className="text-[11px] text-neutral-400 tabular-nums">
                      {o.count}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className={cx(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--rb-r-md,8px)] px-2.5 text-[13px] font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
              transition,
              focus,
            )}
          >
            <Filter aria-hidden className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button
            type="button"
            className={cx(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--rb-r-md,8px)] px-2.5 text-[13px] font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
              transition,
              focus,
            )}
          >
            <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Display</span>
          </button>
          <button
            type="button"
            className={cx(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-2.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800",
              transition,
              focus,
            )}
          >
            <Download aria-hidden className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        <p className="px-1 text-[12px] text-neutral-500">
          {active.count} items in {active.label.toLowerCase()}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={tab}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              transition: { duration: 0.12, ease: EASE_OUT },
            }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="mt-2 space-y-1"
          >
            {ROWS.map((r) => (
              <li key={r.title}>
                <button
                  type="button"
                  className={cx(
                    "group flex w-full cursor-pointer items-center gap-3 rounded-[var(--rb-r-lg,10px)] px-3 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900",
                    transition,
                    focus,
                  )}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600"
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-900 dark:text-neutral-100">
                    {r.title}
                  </span>
                  <span className="hidden shrink-0 text-[12px] text-neutral-500 sm:inline">
                    {r.who}
                  </span>
                  <span className="shrink-0 text-[12px] text-neutral-400 tabular-nums">
                    {r.at}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="h-3.5 w-3.5 shrink-0 text-neutral-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:text-neutral-600"
                  />
                </button>
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>
    </div>
  );
}
