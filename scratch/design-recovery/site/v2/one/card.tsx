"use client";

import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { itemLabel, newest, sourceOf, when, type FeedStory, type ItemView } from "@/v2/deck/data";
import { ItemMark } from "@/v2/deck/marks";
import { FreshRing, NewFlag } from "@/v2/deck/live";

// The One story card: the Deck's StoryCard (v2/deck/stack.tsx) with the owner's changes only: one card per story
// (no plates, no peek), no "N Articles" kind chip, every fact without its publisher parentheses, and one top row
// that never clips: the source marks (three, then +N), ONE source name (the story's lead source; the others are
// marks only) and the time at the right. The name truncates; the marks and the time never shrink. A picture sits on
// top at a fixed height; an imageless card starts at its source row on the same surface, with no wash.

export const BASE = "/v2/one";
export type LabelMode = "name" | "handle";

/** One entry per distinct source in the story, in the story's own item order. */
export function sourcesIn(story: FeedStory) {
  const seen = new Map<string, { key: string; sourceId: string | null; item: ItemView }>();
  for (const item of story.items) {
    const src = sourceOf(item);
    const key = src?.id ?? item.id;
    if (!seen.has(key)) seen.set(key, { key, sourceId: src?.id ?? null, item });
  }
  return [...seen.values()];
}

/** The Deck's Facts (v2/deck/chrome.tsx) without the publisher parentheses. */
export function FactList({ story, size = "sm", className }: { story: FeedStory; size?: "sm" | "md"; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {story.card.facts.map((fact, fi) => (
        <li key={fi} className={cn("flex gap-2.5", size === "sm" ? "text-[13.5px] leading-[1.5]" : "text-[15px] leading-[1.55]")}>
          <span aria-hidden="true" className="mt-[0.62em] size-1 shrink-0 rounded-full bg-t3" />
          <div className="min-w-0">
            <span className="text-t2">{fact.text}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

const MAX_MARKS = 3;

/** The card's top row: marks (three, then +N), the lead source's name, the time. */
function SourceLine({ story, mode, size }: { story: FeedStory; mode: LabelMode; size: number }) {
  const list = sourcesIn(story);
  const shown = list.slice(0, MAX_MARKS);
  const extra = list.length - shown.length;
  const lead = list[0].item;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 items-center">
        {shown.map(({ key, item }, i) => (
          <span
            key={key}
            className="rounded-full ring-2 ring-[var(--window)]"
            style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: shown.length - i, borderRadius: item.kind === "post" ? 999 : 5 }}
          >
            <ItemMark item={item} size={size} className={item.kind === "post" ? "" : "rounded-[5px]"} />
          </span>
        ))}
        {extra > 0 ? <span className="ml-1.5 text-[11.5px] font-medium tabular-nums text-t3">+{extra}</span> : null}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-t1">{itemLabel(lead, mode)}</span>
      <span className="shrink-0 text-[11.5px] tabular-nums whitespace-nowrap text-t3">{when(newest(story).published_at)}</span>
    </div>
  );
}

export function StoryStack({
  story,
  mode = "name",
  fresh = false,
  imageHeight = 148,
  className,
}: {
  story: FeedStory;
  mode?: LabelMode;
  fresh?: boolean;
  imageHeight?: number;
  className?: string;
}) {
  return <StoryCard story={story} mode={mode} fresh={fresh} imageHeight={imageHeight} className={className} />;
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
  /** Headline only. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <article className={cn(lift, "relative z-10 flex flex-col overflow-hidden", className)} style={liftStyle}>
      {fresh ? <FreshRing /> : null}
      {story.card.image ? (
        <div className="relative shrink-0 overflow-hidden border-b border-line" style={{ height: imageHeight }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.card.image} alt="" loading="lazy" className="size-full object-cover" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--window)]/55 via-transparent to-transparent" />
        </div>
      ) : null}
      <div className={cn("relative flex-1", size === "md" ? "p-5" : "p-4")}>
        <SourceLine story={story} mode={mode} size={story.card.image ? 18 : 20} />
        {fresh ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <NewFlag />
          </div>
        ) : null}
        <h3 className={cn("mt-2.5 font-semibold tracking-[-0.01em] text-t1", size === "md" ? "text-[21px] leading-[1.25]" : "text-[16.5px] leading-[1.3]")}>
          {story.card.headline}
        </h3>
        {compact ? null : <FactList story={story} size={size} className="mt-2.5" />}
      </div>
    </article>
  );
}

/** The landing uses the same card. `image` is kept for callers; the picture is always on top. */
export function OneCard({
  image: _image,
  ...props
}: {
  story: FeedStory;
  mode?: LabelMode;
  image?: "thumb" | "hero";
  imageHeight?: number;
  compact?: boolean;
  fresh?: boolean;
  className?: string;
}) {
  void _image;
  return <StoryCard {...props} />;
}
