"use client";

import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { itemLabel, kindOf, newest, sourceOf, when, type FeedStory, type ItemView, type Kind } from "@/v2/deck/data";
import { ItemMark, KindGlyph, kindColor } from "@/v2/deck/marks";
import { FreshRing } from "@/v2/deck/live";

// The One story card: text first. Top to bottom: the source row (inline 18px marks and 13px names, no pills, the
// time at the right; on a story joined from several sources each name opens that source's own synthesis), the headline,
// then every fact as the body with no publisher parentheses. A story with an image shows it as a 96px thumbnail
// beside the headline; an imageless story keeps the soft wash in its kind's color. The landing and login fans use
// the same card with the image on top ("hero"), as the Deck story card did. No colored strip along the top edge.

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

export function leadKind(story: FeedStory): Kind {
  return kindOf(story.items.length === 1 ? story.items[0] : newest(story));
}

export function FactList({ story, className }: { story: FeedStory; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {story.card.facts.map((f, i) => (
        <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.5] text-t2">
          <span aria-hidden="true" className="mt-[0.62em] size-1 shrink-0 rounded-full bg-t3" />
          <span className="min-w-0">{f.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function OneCard({
  story,
  mode = "name",
  image = "thumb",
  imageHeight = 150,
  compact = false,
  fresh = false,
  onSource,
  activeSource,
  className,
}: {
  story: FeedStory;
  mode?: LabelMode;
  /** "thumb": a 96px picture beside the headline (feed). "hero": the picture on top (landing and login fans). */
  image?: "thumb" | "hero";
  imageHeight?: number;
  /** Source row and headline only. */
  compact?: boolean;
  fresh?: boolean;
  /** Present on clustered cards: a source's name or mark opens that source's own report of the story. */
  onSource?: (sourceId: string, storyId: string, trigger: HTMLElement) => void;
  activeSource?: string | null;
  className?: string;
}) {
  const last = newest(story);
  const kind = leadKind(story);
  const pic = story.card.image;
  const list = sourcesIn(story);
  const interactive = Boolean(onSource) && list.some((s) => s.sourceId);
  const active = interactive && list.some((s) => s.sourceId === activeSource);
  // One card per story, nothing behind it (owner, Oct 3: "two cards on top of each other" rejected).
  return (
    <div className={cn("relative", className)}>
      <article
        data-story={story.id}
        className={cn(lift, "relative z-10 overflow-hidden transition-shadow", active && "outline-2 outline-offset-2 outline-[var(--brand)]")}
        style={liftStyle}
      >
        {fresh ? <FreshRing /> : null}
        {pic && image === "hero" ? (
          <div className="relative overflow-hidden border-b border-line" style={{ height: imageHeight }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pic} alt="" loading="lazy" className="size-full object-cover" />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--window)]/55 via-transparent to-transparent" />
          </div>
        ) : null}
        <div className="relative p-4">
          <div className="flex min-h-6 items-center gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              {list.map((s) =>
                interactive && s.sourceId ? (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={activeSource === s.sourceId}
                    aria-label={`Read ${itemLabel(s.item, mode)}'s report`}
                    onClick={(e) => onSource!(s.sourceId!, story.id, e.currentTarget)}
                    className={cn(
                      "flex max-w-full items-center gap-1.5 rounded-sm text-[13px] font-medium text-t1 transition-colors",
                      "hover:text-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      activeSource === s.sourceId && "text-[var(--brand)]",
                    )}
                  >
                    <ItemMark item={s.item} size={18} className={s.item.kind === "post" ? "" : "rounded-[5px]"} />
                    <span className="truncate">{itemLabel(s.item, mode)}</span>
                  </button>
                ) : (
                  <span key={s.key} className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-t1">
                    <ItemMark item={s.item} size={18} className={s.item.kind === "post" ? "" : "rounded-[5px]"} />
                    <span className="truncate">{itemLabel(s.item, mode)}</span>
                  </span>
                ),
              )}
            </div>
            <span className="flex shrink-0" style={{ color: kindColor[kind] }} title={kind === "post" ? "X post" : kind === "release" ? "GitHub release" : "Article"}>
              <KindGlyph kind={kind} />
            </span>
            <span className="ml-auto shrink-0 pl-2 text-[11.5px] tabular-nums text-t3">{when(last.published_at)}</span>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <h3 className={cn("min-w-0 flex-1 font-semibold tracking-[-0.015em] text-t1", compact ? "text-[16.5px] leading-[1.3]" : "text-[20px] leading-[1.28]")}>
              {story.card.headline}
            </h3>
            {pic && image === "thumb" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pic} alt="" loading="lazy" className="mt-0.5 size-24 shrink-0 rounded-[10px] object-cover object-center" />
            ) : null}
          </div>
          {compact ? null : <FactList story={story} className="mt-3" />}
        </div>
      </article>
    </div>
  );
}
