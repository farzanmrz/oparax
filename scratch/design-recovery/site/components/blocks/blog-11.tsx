"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { ArrowUpRight } from "lucide-react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Post = {
  tag: string;
  title: string;
  date: string;
  readTime: string;
};

const featured = {
  tag: "Featured essay",
  title: "How we plan a month of product stories without losing the thread",
  excerpt:
    "A look inside the calendar, the review rituals, and the editorial constraints that keep publishing steady while product work accelerates.",
  date: "Jul 14, 2026",
  readTime: "8 min read",
  author: "Mara Chen",
  role: "Editorial lead",
  initials: "MC",
};

const posts: Post[] = [
  {
    tag: "Guides",
    title: "A better brief for customer-facing launch posts",
    date: "Jul 07, 2026",
    readTime: "5 min read",
  },
  {
    tag: "Notes",
    title: "What belongs above the fold in a changelog",
    date: "Jun 24, 2026",
    readTime: "4 min read",
  },
  {
    tag: "Interviews",
    title: "Three teams, one release: a retro in three voices",
    date: "Jun 11, 2026",
    readTime: "6 min read",
  },
  {
    tag: "Guides",
    title: "Screenshots that explain themselves",
    date: "May 29, 2026",
    readTime: "3 min read",
  },
];

export function Blog11() {
  const reduce = useReducedMotion();

  const stagger: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  };

  const listStagger: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  const zoom: Variants = {
    hover: { scale: reduce ? 1 : 1.05 },
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
        >
          <motion.div
            variants={fadeUp}
            className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-12"
          >
            <div className="max-w-2xl">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-neutral-900 dark:text-white text-balance">
                Notes from the build
              </h2>
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-neutral-600 dark:text-neutral-400 text-pretty">
                Essays on the systems, rituals, and small editorial decisions
                that keep product communication calm.
              </p>
            </div>

            <a
              href="#"
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/30 dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:focus-visible:ring-white/40 sm:w-auto"
            >
              Browse the journal
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </motion.div>

          <motion.div
            variants={stagger}
            className="mt-12 grid grid-cols-1 items-start gap-10 sm:mt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14"
          >
            <motion.a
              href="#"
              variants={fadeUp}
              whileHover="hover"
              className="group block rounded-3xl border border-neutral-200 bg-neutral-50 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 dark:border-neutral-800 dark:bg-neutral-900 dark:focus-visible:ring-white/30"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-950">
                <motion.img
                  src="/svg/placeholder.svg"
                  alt=""
                  loading="lazy"
                  variants={zoom}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-900 shadow-sm backdrop-blur dark:bg-neutral-950/80 dark:text-white">
                  {featured.tag}
                </span>
              </div>

              <div className="px-5 pb-6 pt-6 sm:px-7 sm:pb-8 sm:pt-7">
                <div className="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-500">
                  <span>{featured.date}</span>
                  <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span>{featured.readTime}</span>
                </div>
                <h3 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-medium leading-tight tracking-tight text-neutral-900 transition-colors duration-200 group-hover:text-neutral-600 dark:text-white dark:group-hover:text-neutral-300 text-balance">
                  {featured.title}
                </h3>
                <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-3">
                  {featured.excerpt}
                </p>

                <div className="mt-8 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white dark:bg-white dark:text-neutral-900">
                    {featured.initials}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {featured.author}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-500">
                      {featured.role}
                    </span>
                  </span>
                </div>
              </div>
            </motion.a>

            <motion.div variants={listStagger} className="lg:pt-2">
              <motion.p
                variants={fadeUp}
                className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-500"
              >
                More this month
              </motion.p>

              <div className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                {posts.map((post) => (
                  <motion.a
                    key={post.title}
                    href="#"
                    variants={fadeUp}
                    whileHover="hover"
                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900/20 dark:focus-visible:ring-white/30 sm:gap-5 sm:py-6"
                  >
                    <div className="w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900 sm:w-28">
                      <div className="aspect-[4/3]">
                        <motion.img
                          src="/svg/placeholder.svg"
                          alt=""
                          loading="lazy"
                          variants={zoom}
                          transition={{ duration: 0.45, ease: EASE }}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-500">
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {post.tag}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                        <span>{post.date}</span>
                        <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                        <span>{post.readTime}</span>
                      </div>
                      <h3 className="mt-2 text-base sm:text-lg font-medium leading-snug tracking-tight text-neutral-900 transition-colors duration-200 group-hover:text-neutral-600 dark:text-white dark:group-hover:text-neutral-300 line-clamp-2">
                        {post.title}
                      </h3>
                    </div>

                    <motion.span
                      variants={nudge}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="inline-flex text-neutral-400 transition-colors group-hover:text-neutral-900 dark:text-neutral-600 dark:group-hover:text-white"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </motion.span>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default Blog11;
