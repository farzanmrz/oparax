"use client";

import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { itemLabel, kindOf, newest, sourceOf, when, type FeedStory, type ItemView } from "@/v2/deck/data";
import { kindSoft, MarkStack } from "@/v2/deck/marks";
import { FreshRing, NewFlag } from "@/v2/deck/live";

// The One story card: the Deck's StoryStack and StoryCard (v2/deck/stack.tsx), copied, with the owner's changes
// only: no backing plates and no peek (one card per story, flush), no "N Articles" kind chip, and every fact
// without its publisher parentheses (the citations are the source row at the top). The New badge, the image on top
// and the imageless card's soft wash stay as the Deck draws them.

export const BASE = "/v2/one";
export type LabelMode = "name" | "handle";

/** One entry per distinct source in the story, newest item first. */
export function sourcesIn(story: FeedStory) {
  const seen = new Map<string, { key: string; sourceId: string | null; item: ItemView }>();
  for (const item of [...story.items].sort((a, b) => (a.published_at < b.published_at ? 1 : -1))) {
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
  return (
    <div className={cn("group relative", className)}>
      <StoryCard story={story} mode={mode} fresh={fresh} imageHeight={imageHeight} />
    </div>
  );
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

/** The landing and login fans use the same card. `image` is kept for callers; the picture is always on top. */
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
