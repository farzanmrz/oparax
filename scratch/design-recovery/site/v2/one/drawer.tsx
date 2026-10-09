"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, X as Close } from "lucide-react";
import { cn } from "@/lib/utils";
import { itemLabel, kindOf, sourceOf, stories, when, type FeedStory } from "@/v2/deck/data";
import { ItemMark, KindGlyph, kindColor } from "@/v2/deck/marks";
import { FactList, sourcesIn, type LabelMode } from "./card";

// The source reader: one sheet about 400px wide at the right edge, over the page (never on the card), in the open
// sidebar's skin (translucent rail, blur, window shadow, no edge line); it never narrows the grid. Top to
// bottom: the story's sources, one row each (scrolling inside the sheet when there are many), then the selected
// source's own report of THIS story: matched by the story's own item from that source, never by everything the
// source has published. Picking another row swaps the report and leaves the sheet open. Close, Escape, and focus
// back to the name that opened it.

export const READER = 400;
const kindWord = { post: "Twitter post", article: "Article", release: "GitHub release" } as const;

/** The selected source's own report of this story: the Direct card built from the story's item from that source. */
function reportOf(story: FeedStory, sourceId: string) {
  const item = story.items.find((i) => sourceOf(i)?.id === sourceId);
  if (!item) return null;
  return { item, report: stories.direct.find((s) => s.items[0].id === item.id) ?? null };
}

export function Reader({
  storyId,
  sourceId,
  mode,
  onPick,
  onClose,
}: {
  storyId: string;
  sourceId: string;
  mode: LabelMode;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const story = stories.clustered.find((s) => s.id === storyId);
  const rows = story ? sourcesIn(story).filter((s) => s.sourceId) : [];
  const picked = story ? reportOf(story, sourceId) : null;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!story || !picked) return null;
  const { item, report } = picked;
  const kind = kindOf(item);
  return (
    <aside
      data-drawer-open=""
      role="dialog"
      aria-modal="false"
      aria-label={`Sources of: ${story.card.headline}`}
      className="fixed inset-y-0 right-0 z-[60] flex flex-col rounded-l-[14px] backdrop-blur-xl animate-in slide-in-from-right-8 duration-300 motion-reduce:animate-none"
      style={{ width: READER, background: "color-mix(in srgb, var(--rail) 80%, transparent)", boxShadow: "var(--window-shadow)" }}
    >
      <div className="relative flex shrink-0 items-center gap-2 px-4 pt-4 pb-2">
        <p className="flex-1 font-mono text-[10.5px] tracking-[0.12em] text-t3 uppercase">
          Sources in this story <span className="tracking-normal tabular-nums">{rows.length}</span>
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-8 shrink-0 place-items-center rounded-md text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Close className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div role="listbox" aria-label="Sources in this story" className="relative max-h-[38%] shrink-0 overflow-y-auto px-2.5 pb-3">
        {rows.map((r) => {
          const on = r.sourceId === sourceId;
          return (
            <button
              key={r.key}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => onPick(r.sourceId!)}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                on ? "bg-raised" : "hover:bg-raised",
              )}
            >
              <ItemMark item={r.item} size={26} className={r.item.kind === "post" ? "" : "rounded-[6px]"} />
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[13.5px] font-medium", on ? "text-[var(--brand)]" : "text-t2")}>{itemLabel(r.item, mode)}</span>
                <span className="block truncate text-[11.5px] text-t3">{r.item.title}</span>
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-t3">{when(r.item.published_at)}</span>
            </button>
          );
        })}
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto border-t border-line px-4 pt-4 pb-6">
        <p className="flex items-center gap-2 text-[12.5px] text-t3">
          <ItemMark item={item} size={18} />
          <span className="font-medium text-t1">{itemLabel(item, mode)}</span>
          <span className="flex" style={{ color: kindColor[kind] }}>
            <KindGlyph kind={kind} />
          </span>
          {kindWord[kind]}
          <span className="ml-auto tabular-nums">{when(item.published_at)}</span>
        </p>
        <h2 className="mt-3 text-[19px] leading-[1.3] font-semibold tracking-[-0.015em] text-t1">{report?.card.headline ?? item.title}</h2>
        {report ? (
          <FactList story={report} className="mt-3" />
        ) : (
          <p className="mt-3 text-[13.5px] leading-[1.5] text-t2">{item.text}</p>
        )}
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-[var(--raised)] px-2.5 py-1.5 text-[12.5px] text-t2 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
          style={{ boxShadow: "var(--top-light)" }}
        >
          Read the original <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
    </aside>
  );
}
