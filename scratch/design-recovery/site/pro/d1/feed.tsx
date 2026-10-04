"use client";

// Feed page: "Your Feed" with Direct/Clustered beside it, then blog-11 hairline rows grouped by date.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { FeedHeading } from "../shared/feed-heading";
import { frame } from "../shared/shell";
import { directItems, feed, stories } from "../content";
import type { DirectionProps } from "../types";
import { Blog11, directRow, storyRow } from "./blocks/blog-11";

const byNewest = (a: { date: string }, b: { date: string }) => Date.parse(b.date) - Date.parse(a.date);
const clusteredRows = stories.map(storyRow).sort(byNewest);
const directRows = directItems.map(directRow).sort(byNewest);

export function Feed({ feedMode, onFeedMode }: Pick<DirectionProps, "feedMode" | "onFeedMode">) {
  const reduce = useReducedMotion();
  return (
    <div className={cn(frame, "py-10 desk:py-12")}>
      <FeedHeading mode={feedMode} onMode={onFeedMode} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={feedMode}
          initial={{ opacity: 0, y: reduce ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="mt-8"
        >
          <Blog11 rows={feedMode === "direct" ? directRows : clusteredRows} />
        </motion.div>
      </AnimatePresence>
      <p className="mt-6 text-xs text-muted-foreground">{feed.sample}</p>
    </div>
  );
}
