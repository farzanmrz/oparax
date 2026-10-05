"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Layers, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { lift, liftStyle, ViewSwitch } from "@/v2/deck/chrome";
import { groups, itemsFrom, sources, stories, storyHasSource, type FeedStory, type Source, type View } from "@/v2/deck/data";
import { Arrive, Checking, EASE, useArrival } from "@/v2/deck/live";
import { GroupGlyph, SourceMark } from "@/v2/deck/marks";
import { StoryCard } from "./card";
import { AppShell, PageLine } from "./shell";

// The One feed inside the shell. The page line: Feed, the Clustered and Direct switch, and Deck's amber checking
// line at the right while a check runs. Then the stories in a grid read newest first across rows, left to right:
// three columns at 1440, two narrower, four at 2560. Cards in a row share the row's height (the grid stretches
// them), the picture stays 172px on top, and every fact shows. One round button at the bottom left opens Deck's
// source list over the page; a row filters the feed. The feed never moves.

const IMAGE_H = 172;

export function OneFeed({
  initialView,
  initialSource,
  initialPanel = false,
  settled,
}: {
  initialView: View;
  initialSource: string | null;
  initialPanel?: boolean;
  settled: boolean;
}) {
  const [view, setView] = useState<View>(initialView);
  const [sourceId, setSourceId] = useState<string | null>(sources.some((s) => s.id === initialSource) ? initialSource : null);
  const { pending } = useArrival(settled);

  // Keep the URL in step so each state has an address (and survives a reload).
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    q.set("view", view);
    if (sourceId) q.set("source", sourceId);
    else q.delete("source");
    history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
  }, [view, sourceId]);

  const all = stories[view];
  const selected = sources.find((s) => s.id === sourceId) ?? null;
  const filtered = selected ? all.filter((s) => storyHasSource(s, selected.id)) : all;
  const list = filtered.length ? filtered : all;
  const freshId = selected ? null : all[0].id;

  return (
    <AppShell>
      <PageLine
        title="Feed"
        beside={<ViewSwitch view={view} onChange={setView} />}
        right={!selected && pending > 0 ? <Checking pending={pending} /> : null}
      />
      <Grid list={list} freshId={freshId} />
      <SourcesControl initialOpen={initialPanel} selected={sourceId} onSelect={setSourceId} />
    </AppShell>
  );
}

/** Rows read left to right, newest first; a row is as tall as its tallest card and every card stretches to it. */
function Grid({ list, freshId }: { list: FeedStory[]; freshId: string | null }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3 min-[2200px]:grid-cols-4">
      {list.map((s, i) => (
        <Arrive key={s.id} index={i} className="h-full min-w-0">
          <StoryCard story={s} fresh={s.id === freshId} imageHeight={IMAGE_H} className="h-full" />
        </Arrive>
      ))}
    </div>
  );
}

/** The count column: one right-aligned column, so the group and row numbers line up. */
const countCol = "w-6 shrink-0 text-right tabular-nums";
const SHOWN = 3;

/** One round button at the bottom left of the feed; it opens Deck's source list over the page. The button, Escape
 * or a click outside closes it, and closed it is gone. */
function SourcesControl({ initialOpen, selected, onSelect }: { initialOpen: boolean; selected: string | null; onSelect: (id: string | null) => void }) {
  const [open, setOpen] = useState(initialOpen);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      requestAnimationFrame(() => button.current?.focus());
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || button.current?.contains(t)) return;
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
      {open ? <SourcePanel ref={panel} selected={selected} onSelect={onSelect} /> : null}
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="one-sources"
        aria-label={open ? "Close sources" : "Open sources"}
        title="Sources"
        className={cn(
          lift,
          "fixed bottom-4 left-4 z-50 grid size-11 place-items-center rounded-full transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring",
          open || selected ? "text-[var(--brand)]" : "text-t2",
        )}
        style={liftStyle}
      >
        <PanelLeft className="size-[19px]" aria-hidden="true" />
      </button>
    </>
  );
}

function SourcePanel({ ref, selected, onSelect }: { ref: React.Ref<HTMLElement>; selected: string | null; onSelect: (id: string | null) => void }) {
  const reduce = useReducedMotion();
  const [more, setMore] = useState<Set<string>>(() => new Set());
  return (
    <motion.aside
      ref={ref}
      id="one-sources"
      aria-label="Sources"
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className={cn(lift, "fixed inset-y-3 left-3 z-[45] flex w-[280px] flex-col overflow-hidden")}
      style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5 pb-20">
        <p className="px-2 pt-1.5 pb-3 text-[15px] font-semibold text-t1">Sources</p>
        <Row on={selected === null} onClick={() => onSelect(null)}>
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
              {shown.map((s: Source) => {
                const n = itemsFrom(s.id).length;
                return (
                  <Row key={s.id} on={selected === s.id} onClick={() => onSelect(selected === s.id ? null : s.id)}>
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
