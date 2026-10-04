"use client";

import { useMemo, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Topic = "All" | "Operations" | "Design systems" | "Research" | "Culture";

type Entry = {
  topic: Exclude<Topic, "All">;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
};

const topics: Topic[] = [
  "All",
  "Operations",
  "Design systems",
  "Research",
  "Culture",
];

const entries: Entry[] = [
  {
    topic: "Research",
    title: "How we choose which customer stories deserve a full teardown",
    excerpt:
      "A framework for picking the right narrative, finding the transferable lesson, and keeping the piece useful long after launch week.",
    date: "Jul 08, 2026",
    readTime: "7 min read",
  },
  {
    topic: "Operations",
    title: "The publishing checklist that ended our last-minute rewrites",
    excerpt:
      "Evidence, screenshots, ownership, accessibility: the pass we run on every draft before anything reaches the blog.",
    date: "Jun 28, 2026",
    readTime: "5 min read",
  },
  {
    topic: "Design systems",
    title: "When a component note should graduate into documentation",
    excerpt:
      "The signals that tell us a pattern belongs in a release post, a migration guide, or the design system itself.",
    date: "Jun 15, 2026",
    readTime: "6 min read",
  },
  {
    topic: "Culture",
    title: "Writing retrospectives people actually reread",
    excerpt:
      "A compact structure for turning one team's reflection into a durable source of better decisions months later.",
    date: "May 30, 2026",
    readTime: "4 min read",
  },
];

export function Blog10() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<Topic>("All");

  const visible = useMemo(
    () =>
      active === "All"
        ? entries
        : entries.filter((entry) => entry.topic === active),
    [active],
  );

  const stagger: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  const listStagger: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  };

  const rowFade: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  };

  const zoom: Variants = {
    hover: { scale: reduce ? 1 : 1.04 },
  };

  const nudge: Variants = {
    hover: { x: reduce ? 0 : 2, y: reduce ? 0 : -2 },
  };

  return (
    <section className="w-full bg-white py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 dark:bg-neutral-950">
      <div className="max-w-[1400px] mx-auto w-full">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr] lg:gap-16"
        >
          <motion.aside
            variants={fadeUp}
            className="lg:sticky lg:top-8 lg:self-start"
          >
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-neutral-900 dark:text-white text-balance">
              The archive
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 text-pretty">
              Long-form notes on how we run the studio, filed by the workstream
              behind each decision.
            </p>

            <nav
              aria-label="Filter articles by topic"
              className="mt-8 flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
            >
              {topics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setActive(topic)}
                  aria-pressed={active === topic}
                  className="group flex shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 dark:hover:bg-neutral-900 dark:focus-visible:ring-white/30 lg:rounded-lg lg:px-2.5"
                >
                  <span
                    className={`h-2 w-2 rounded-full border transition-colors ${
                      active === topic
                        ? "border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white"
                        : "border-neutral-300 group-hover:border-neutral-500 dark:border-neutral-600 dark:group-hover:border-neutral-400"
                    }`}
                  />
                  <span
                    className={`transition-colors ${
                      active === topic
                        ? "font-medium text-neutral-900 dark:text-white"
                        : "text-neutral-500 group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-white"
                    }`}
                  >
                    {topic}
                  </span>
                </button>
              ))}
            </nav>
          </motion.aside>

          <motion.div variants={fadeUp} className="min-w-0">
            <div className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  variants={listStagger}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  className="divide-y divide-neutral-200 dark:divide-neutral-800"
                >
                  {visible.map((entry) => (
                    <motion.a
                      key={entry.title}
                      href="#"
                      variants={rowFade}
                      whileHover="hover"
                      className="group grid grid-cols-1 bg-white transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900/20 dark:bg-neutral-950 dark:hover:bg-neutral-900/60 dark:focus-visible:ring-white/30 md:grid-cols-[1fr_38%]"
                    >
                      <div className="relative h-56 overflow-hidden bg-neutral-100 dark:bg-neutral-900 sm:h-64 md:order-2 md:h-auto md:min-h-[300px]">
                        <motion.img
                          src="/svg/placeholder.svg"
                          alt=""
                          loading="lazy"
                          variants={zoom}
                          transition={{ duration: 0.45, ease: EASE }}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>

                      <div className="flex flex-col p-6 sm:p-8 md:order-1 lg:p-10">
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-500">
                          <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-medium text-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300">
                            {entry.topic}
                          </span>
                          <span>{entry.date}</span>
                          <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                          <span>{entry.readTime}</span>
                        </div>

                        <h3 className="mt-8 max-w-2xl text-2xl sm:text-3xl font-medium leading-tight tracking-tight text-neutral-900 transition-colors duration-200 group-hover:text-neutral-600 dark:text-white dark:group-hover:text-neutral-300 text-balance md:mt-14">
                          {entry.title}
                        </h3>
                        <p className="mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-2">
                          {entry.excerpt}
                        </p>

                        <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white">
                          Read article
                          <motion.span
                            variants={nudge}
                            transition={{ duration: 0.2, ease: EASE }}
                            className="inline-flex"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </motion.span>
                        </div>
                      </div>
                    </motion.a>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default Blog10;
