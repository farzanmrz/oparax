"use client";

import { cn } from "@/lib/utils";
import { Facts, lift, liftStyle } from "./chrome";
import { itemLabel, kindOf, newest, when, type FeedStory, type ItemView, type Kind } from "./data";
import { ItemMark, KindChip, kindColor, kindSoft, kindWord, MarkStack } from "./marks";
import { FreshRing, NewFlag } from "./live";

// The Deck's story stack, carried from the accepted feed (React Bits Stack and hero-10 stacking, rebuilt as CSS so
// the front card stays readable). Fixed for v2: every fact shows on arrival (no "more facts"), counts carry their
// unit and are said once ("2 Articles", never also "2 reports"), and every card has the same anatomy whether or
// not it has a picture: optional image, identity row, kinds, headline, facts. An imageless card keeps its place
// with a soft wash in its kind's color instead of an empty frame.

export type LabelMode = "name" | "handle";

export const PEEK = 22;

export function StoryStack({
  story,
  mode = "name",
  fresh = false,
  peek = PEEK,
  imageHeight = 148,
  native = false,
  className,
}: {
  story: FeedStory;
  mode?: LabelMode;
  fresh?: boolean;
  peek?: number;
  imageHeight?: number;
  /** Plates show a line of the item's own words under their header (landing hero). */
  native?: boolean;
  className?: string;
}) {
  const lead = newest(story);
  const behind = [...story.items].filter((i) => i.id !== lead.id).sort((a, b) => (a.published_at < b.published_at ? 1 : -1)).slice(0, 2);
  return (
    <div className={cn("group relative", className)} style={{ paddingTop: behind.length * peek }}>
      {behind
        .map((item, i) => <Plate key={item.id} item={item} depth={i + 1} top={(behind.length - 1 - i) * peek} mode={mode} native={native} />)
        .reverse()}
      <StoryCard story={story} mode={mode} fresh={fresh} imageHeight={imageHeight} />
    </div>
  );
}

function Plate({ item, depth, top, mode, native }: { item: ItemView; depth: number; top: number; mode: LabelMode; native: boolean }) {
  const kind = kindOf(item);
  const line = item.text.split("\n").filter(Boolean)[0];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-x-0 rounded-xl border border-line-strong bg-[var(--raised)] transition-transform duration-300 ease-out",
        depth === 1 ? "group-hover:-translate-y-[6px]" : "group-hover:-translate-y-[10px]",
      )}
      style={{ top, height: 140, marginInline: depth * 10, zIndex: 3 - depth, boxShadow: "var(--card-shadow)" }}
    >
      <span className="absolute inset-x-4 top-0 h-[2px] rounded-b-full" style={{ background: kindColor[kind] }} />
      <span className="flex h-[22px] items-center gap-1.5 px-3.5 text-[11px] text-t2">
        <ItemMark item={item} size={12} />
        <span className="truncate">{itemLabel(item, mode)}</span>
        <span className="text-t3">{kindWord[kind]}</span>
        <span className="ml-auto shrink-0 text-t3 tabular-nums">{when(item.published_at)}</span>
      </span>
      {native ? (
        <span className={cn("block truncate px-3.5 text-[12.5px] text-t2", kind === "release" && "font-mono text-[11.5px]")}>{kind === "article" ? item.title : line}</span>
      ) : null}
    </div>
  );
}

/** Kind counts for a story, each with its unit, in a fixed order. */
export function kindsOf(story: FeedStory) {
  const order: Kind[] = ["article", "post", "release"];
  return order.map((k) => ({ kind: k, count: story.items.filter((i) => kindOf(i) === k).length })).filter((k) => k.count > 0);
}

export function StoryCard({
  story,
  mode = "name",
  fresh = false,
  imageHeight = 148,
  size = "sm",
  compact = false,
  className,
}: {
  story: FeedStory;
  mode?: LabelMode;
  fresh?: boolean;
  imageHeight?: number;
  size?: "sm" | "md";
  /** Headline only, for cards fanned behind a readable front card. */
  compact?: boolean;
  className?: string;
}) {
  const last = newest(story);
  const kinds = kindsOf(story);
  const leadKind = kindOf(story.items.length === 1 ? story.items[0] : last);
  const names = [...new Set(story.items.map((i) => itemLabel(i, mode)))];
  return (
    <article className={cn(lift, "relative z-10 overflow-hidden", className)} style={liftStyle}>
      {fresh ? <FreshRing /> : null}
      {story.card.image ? (
        <div className="relative overflow-hidden border-b border-line" style={{ height: imageHeight }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.card.image} alt="" loading="lazy" className="size-full object-cover" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--window)]/55 via-transparent to-transparent" />
        </div>
      ) : (
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24" style={{ background: `linear-gradient(180deg, ${kindSoft[leadKind]}, transparent)` }} />
      )}
      <div className={cn("relative", size === "md" ? "p-5" : "p-4")}>
        <div className="flex items-center gap-2">
          <MarkStack items={story.items} size={story.card.image ? 18 : 22} />
          <span className="min-w-0 truncate text-[12.5px] font-medium text-t1">{names.join(", ")}</span>
          <span className="ml-auto shrink-0 text-[11.5px] tabular-nums text-t3">{when(last.published_at)}</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {kinds.map((k) => (
            <KindChip key={k.kind} kind={k.kind} count={k.count} />
          ))}
          {fresh ? <NewFlag className="ml-1" /> : null}
        </div>
        <h3 className={cn("mt-2.5 font-semibold tracking-[-0.01em] text-t1", size === "md" ? "text-[21px] leading-[1.25]" : "text-[16.5px] leading-[1.3]")}>
          {story.card.headline}
        </h3>
        {compact ? null : <Facts story={story} size={size} className="mt-2.5" />}
      </div>
    </article>
  );
}
