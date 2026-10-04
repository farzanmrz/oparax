"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

type Section = "All" | "In the news" | "Press releases" | "Blog";
type Post = {
  date: string;
  tag: string;
  section: Exclude<Section, "All">;
  title: string;
  image: string;
};

const tabs: Section[] = ["All", "In the news", "Press releases", "Blog"];

const posts: Post[] = [
  {
    date: "Aug 7, 2025",
    tag: "Product",
    section: "Blog",
    title: "Halcyon mid-year highlights",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1000&q=80",
  },
  {
    date: "Jul 31, 2025",
    tag: "Product",
    section: "Blog",
    title: "July product updates",
    image:
      "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=1000&q=80",
  },
  {
    date: "Jul 23, 2025",
    tag: "Release",
    section: "Press releases",
    title: "Introducing Halcyon Health",
    image:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&q=80",
  },
  {
    date: "Jul 23, 2025",
    tag: "Release",
    section: "Press releases",
    title: "Performance plans, reimagined",
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&q=80",
  },
  {
    date: "Jul 16, 2025",
    tag: "Event",
    section: "In the news",
    title: "Halcyon at Nexus 2025",
    image:
      "https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=1000&q=80",
  },
  {
    date: "Jul 8, 2025",
    tag: "Feature",
    section: "In the news",
    title: "People ops, finally unified",
    image:
      "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=1000&q=80",
  },
  {
    date: "Jul 2, 2025",
    tag: "Insight",
    section: "Blog",
    title: "AI that respects your team",
    image:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1000&q=80",
  },
  {
    date: "Jun 30, 2025",
    tag: "Product",
    section: "Blog",
    title: "June product updates",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&q=80",
  },
  {
    date: "Jun 10, 2025",
    tag: "Awards",
    section: "In the news",
    title: "2025 People Success Awards",
    image:
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1000&q=80",
  },
  {
    date: "Jun 3, 2025",
    tag: "Release",
    section: "Press releases",
    title: "Everything we shipped at Nexus",
    image:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1000&q=80",
  },
  {
    date: "Jun 3, 2025",
    tag: "Release",
    section: "Press releases",
    title: "Meet the Halcyon Agent Platform",
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1000&q=80",
  },
  {
    date: "May 31, 2025",
    tag: "Insight",
    section: "Blog",
    title: "Sharper goals, smoother reviews",
    image:
      "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=1000&q=80",
  },
];

export default function Blog6() {
  const [active, setActive] = useState<Section>("All");

  const visible = useMemo(
    () =>
      active === "All" ? posts : posts.filter((p) => p.section === active),
    [active],
  );

  return (
    <section className="w-full min-h-[var(--rb-section-min-h,100vh)] flex items-start py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-950">
      <div className="max-w-[1400px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-block text-xs tracking-[0.2em] uppercase text-neutral-500">
            Newsroom
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Updates at Halcyon
          </h1>
          <p className="mt-4 text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
            Product stories, launch notes, and a running log of how we build.
          </p>
        </motion.div>

        <nav className="mt-10 sm:mt-12 flex justify-center gap-6 sm:gap-10 border-b border-neutral-200 dark:border-neutral-800">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className="relative pb-3 text-sm sm:text-base transition-colors cursor-pointer"
            >
              <span
                className={
                  active === tab
                    ? "text-neutral-900 dark:text-white font-medium"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }
              >
                {tab}
              </span>
              {active === tab && (
                <motion.span
                  layoutId="blog6-underline"
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-neutral-900 dark:bg-white"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((post, i) => (
              <motion.article
                key={post.title}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{
                  layout: { type: "spring", stiffness: 260, damping: 30 },
                  opacity: { duration: 0.25, ease: "easeOut" },
                  y: { duration: 0.25, ease: "easeOut" },
                  delay: (i % 4) * 0.03,
                }}
                whileHover="hover"
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 cursor-pointer"
              >
                <div className="relative aspect-4/3 w-full overflow-hidden">
                  <motion.img
                    src={post.image}
                    alt=""
                    loading="lazy"
                    variants={{ hover: { scale: 1.05 } }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/90 dark:bg-neutral-950/80 backdrop-blur text-[11px] font-medium text-neutral-800 dark:text-neutral-200 border border-white/60 dark:border-neutral-800">
                      {post.tag}
                    </span>
                  </div>
                  <motion.div
                    variants={{ hover: { opacity: 1, y: 0 } }}
                    initial={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-white text-neutral-900 dark:bg-white dark:text-neutral-900 shadow-sm"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </motion.div>
                </div>
                <div className="p-4 sm:p-5 flex flex-col gap-2 flex-1">
                  <div className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
                    {post.date}
                  </div>
                  <h3 className="text-sm sm:text-base font-medium text-neutral-900 dark:text-white leading-snug line-clamp-2">
                    {post.title}
                  </h3>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        {visible.length >= 8 && (
          <div className="mt-10 flex justify-center">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer">
              Load more
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  d="m6 9 6 6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
