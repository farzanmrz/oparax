// Adapted from React Bits Pro blog-6 (https://pro.reactbits.dev/docs/blocks/blog/blog-6). Changes: newsroom heading, section tabs, Unsplash images, tag pills, hover arrow, hover zoom and Load more removed; four-column image grid became a two-column bento grid where a photo tile spans two rows and text-only tiles stay complete; every tile reads title, facts and sources before an optional photo; Direct items carry original source identity and Open original, grouped under one date header per day; Clustered stories show their sources once and their date once; neutral colors swapped for semantic tokens; the popLayout entrance is kept for switching Direct and Clustered and reduced to opacity under reduced motion.
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { directItems, feed, stories, type DirectItem, type Story } from "../../content";
import type { FeedMode } from "../../types";
import { FactList, OpenOriginal, SourceChips, SourceIdentity, StoryPhoto, tile } from "../story-parts";

const grid = "grid grid-cols-1 gap-5 desk:grid-flow-dense desk:grid-cols-2";

function useEntrance(index: number) {
  const reduce = useReducedMotion();
  return {
    layout: !reduce,
    initial: { opacity: 0, y: reduce ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduce ? 0 : -6 },
    transition: {
      layout: { type: "spring", stiffness: 260, damping: 30 },
      opacity: { duration: 0.25, ease: "easeOut" },
      y: { duration: 0.25, ease: "easeOut" },
      delay: Math.min(index, 5) * 0.04,
    },
  } as const;
}

function StoryTile({ story, index, left }: { story: Story; index: number; left: boolean }) {
  const entrance = useEntrance(index);
  return (
    <motion.article
      {...entrance}
      aria-labelledby={`d3-story-${story.id}`}
      className={cn(
        tile,
        "flex flex-col p-5 desk:p-6",
        story.image ? "desk:col-start-2 desk:row-span-2" : left && "desk:col-start-1",
      )}
    >
      <h2 id={`d3-story-${story.id}`} className="text-xl font-semibold leading-snug tracking-tight">
        {story.title}
      </h2>
      <FactList facts={story.facts} className="mt-3" />
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <SourceChips sources={story.sources} />
        <time dateTime={new Date(story.date).toISOString().slice(0, 10)} className="text-sm text-muted-foreground">
          {story.date}
        </time>
      </footer>
      {story.image && (
        <StoryPhoto
          src={story.image}
          alt=""
          credit={story.imageCredit}
          className="mt-5 flex flex-1 flex-col"
          fill
        />
      )}
    </motion.article>
  );
}

function DirectTile({ item, index, wide, left }: { item: DirectItem; index: number; wide: boolean; left: boolean }) {
  const entrance = useEntrance(index);
  return (
    <motion.article
      {...entrance}
      className={cn(
        tile,
        "flex flex-col p-5 desk:p-6",
        item.image ? "desk:col-start-2 desk:row-span-2" : left && "desk:col-start-1",
        wide && "desk:col-span-2",
      )}
    >
      <h3 className={cn("text-lg font-semibold leading-snug tracking-tight", wide && "max-w-3xl")}>{item.headline}</h3>
      <FactList facts={item.facts} className={cn("mt-2.5", wide && "max-w-3xl")} />
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-4">
        <SourceIdentity source={item.source} />
        <OpenOriginal source={item.source} />
      </footer>
      {item.image && (
        <StoryPhoto
          src={item.image}
          alt={item.imageAlt ?? ""}
          credit={item.credit}
          className="mt-4 flex flex-1 flex-col"
          fill
        />
      )}
    </motion.article>
  );
}

// One date header per day. A photo tile spans two rows on the right with text tiles beside it;
// a lone text tile spans both columns so no grid cell sits empty.
function directGroups() {
  const groups: { date: string; items: DirectItem[] }[] = [];
  for (const item of directItems) {
    const last = groups.at(-1);
    if (last && last.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }
  return groups;
}

export default function Blog6({ mode }: { mode: FeedMode }) {
  const newestFirst = [...stories].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {mode === "clustered" ? (
        <motion.div key="clustered" exit={{ opacity: 0 }} className={grid}>
          <p className="sr-only">{feed.clusteredHint}</p>
          {newestFirst.map((story, index) => (
            <StoryTile key={story.id} story={story} index={index} left={newestFirst.some((s) => s.image)} />
          ))}
        </motion.div>
      ) : (
        <motion.div key="direct" exit={{ opacity: 0 }} className="flex flex-col gap-9">
          <p className="sr-only">{feed.directHint}</p>
          {directGroups().map((group, groupIndex) => {
            const cells = group.items.reduce((sum, item) => sum + (item.image ? 2 : 1), 0);
            return (
              <section key={group.date} aria-labelledby={`d3-day-${groupIndex}`}>
                <h2
                  id={`d3-day-${groupIndex}`}
                  className="mb-3 flex items-center gap-3 text-sm font-semibold text-muted-foreground after:h-px after:flex-1 after:bg-border"
                >
                  {group.date}
                </h2>
                <div className={grid}>
                  {group.items.map((item, index) => (
                    <DirectTile
                      key={item.headline}
                      item={item}
                      index={groupIndex * 2 + index}
                      wide={cells % 2 === 1 && index === group.items.length - 1 && !item.image}
                      left={group.items.some((other) => other.image)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
