"use client";

// The feed's one round button at the bottom left (design preview v2/one/feed.tsx SourcesControl): it opens the
// agent's source list over the page, each kind with its count and three rows, then Show more. The product has no
// per-source filter for the feed, so the list only lists. The button, Escape or a click outside closes it, and
// closed it is gone.

import { PanelLeft } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { GroupGlyph, SourceMark } from "@/components/one/marks";
import { lift, liftHigh } from "@/components/one/stage";
import { monitorContent } from "@/lib/monitor/content";
import { cn } from "@/lib/utils";

export type OverlayGroup = {
  kind: "x" | "rss" | "website";
  label: string;
  rows: { key: string; name: string; mark: string }[];
};

const SHOWN = 3;
const copy = monitorContent.sourcesOverlay;

export function SourcesOverlay({ groups }: { groups: OverlayGroup[] }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      requestAnimationFrame(() => button.current?.focus());
    };
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || button.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);
  return (
    <>
      {open ? <Panel ref={panel} groups={groups} /> : null}
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="one-sources"
        aria-label={open ? copy.close : copy.open}
        title={copy.title}
        className={cn(
          lift,
          "fixed bottom-4 left-4 z-50 grid size-11 place-items-center rounded-full transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring",
          open ? "text-[var(--brand)]" : "text-t2",
        )}
      >
        <PanelLeft className="size-[19px]" aria-hidden="true" />
      </button>
    </>
  );
}

function Panel({ ref, groups }: { ref: React.Ref<HTMLElement>; groups: OverlayGroup[] }) {
  const reduce = useReducedMotion();
  const [more, setMore] = useState<Set<string>>(() => new Set());
  return (
    <motion.aside
      ref={ref}
      id="one-sources"
      aria-label={copy.title}
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        liftHigh,
        "fixed inset-y-3 left-3 z-[45] flex w-[280px] flex-col overflow-hidden",
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5 pb-20">
        <p className="px-2 pt-1.5 pb-1 text-[15px] font-semibold text-t1">{copy.title}</p>
        {groups.length ? null : <p className="px-2 pt-2 text-[13px] text-t3">{copy.empty}</p>}
        {groups.map((group) => {
          const all = more.has(group.kind);
          const shown = all ? group.rows : group.rows.slice(0, SHOWN);
          return (
            <section key={group.kind} aria-label={group.label} className="mt-4">
              <p className="flex items-center gap-2 px-2 pb-1.5 text-[13px] font-semibold text-t1">
                <span className="grid size-[18px] place-items-center text-t3">
                  <GroupGlyph kind={group.kind} className="size-3.5" />
                </span>
                {group.label}
                <span className="ml-auto w-6 text-right text-[11.5px] font-medium text-t3 tabular-nums">
                  {group.rows.length}
                </span>
              </p>
              <ul>
                {shown.map((row) => (
                  <li
                    key={row.key}
                    className="flex min-h-8 items-center gap-2.5 rounded-md px-2 py-1"
                  >
                    <SourceMark
                      kind={group.kind === "x" ? "x" : "site"}
                      mark={row.mark}
                      size={18}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-t2">{row.name}</span>
                  </li>
                ))}
              </ul>
              {group.rows.length > SHOWN ? (
                <button
                  type="button"
                  aria-expanded={all}
                  onClick={() =>
                    setMore((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.kind)) next.delete(group.kind);
                      else next.add(group.kind);
                      return next;
                    })
                  }
                  className="mt-1 ml-[38px] rounded-sm text-[12.5px] text-t3 underline decoration-line-strong underline-offset-4 transition-colors hover:text-t1 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {all ? copy.less : copy.more}
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
    </motion.aside>
  );
}
