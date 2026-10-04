"use client";

import { motion, type Variants } from "motion/react";
import { BadgeCheck, Heart, MessageCircle, Repeat2, Star } from "lucide-react";

const featured = {
  quote:
    "Cadence made our team feel ten people larger without adding a single meeting to the calendar.",
  name: "Clara Weiss",
  role: "Head of Ops, Northstar",
  avatar:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
};

const wordmarks = ["Northstar", "Relay", "Forma", "Alpenglow"];

const posts = [
  {
    name: "Mina Hart",
    handle: "@minahart",
    date: "Mar 3",
    text: "The rare product that makes our operating cadence feel lighter without hiding any of the hard parts.",
    replies: "48",
    reposts: "212",
    likes: "2.4k",
    avatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Callum Price",
    handle: "@callumprice",
    date: "Feb 24",
    text: "I opened Cadence for a launch checklist and ended up moving the whole studio over before Friday.",
    replies: "31",
    reposts: "96",
    likes: "918",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Aya Mensah",
    handle: "@ayamensah",
    date: "Feb 18",
    text: "Clear enough for leadership, flexible enough for the people doing the actual work. That gap is usually where tools fail.",
    replies: "57",
    reposts: "144",
    likes: "1.7k",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Felix Chen",
    handle: "@felixchen",
    date: "Feb 11",
    text: "The first project hub my team did not immediately try to rebuild in a spreadsheet.",
    replies: "19",
    reposts: "63",
    likes: "604",
    avatar:
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80",
  },
];

const panel: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const grid: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function SocialProof16() {
  return (
    <section className="w-full bg-white px-4 py-16 dark:bg-neutral-950 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <motion.div
          variants={panel}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-col rounded-3xl border border-neutral-900 bg-neutral-900 p-8 dark:border-neutral-800 dark:bg-neutral-900 sm:p-10 lg:col-span-5 lg:p-12"
        >
          <div
            role="img"
            aria-label="Rated 5 out of 5 stars"
            className="flex items-center gap-1 text-white"
          >
            {[0, 1, 2, 3, 4].map((star) => (
              <Star key={star} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <blockquote className="mt-8 text-balance text-2xl font-medium leading-snug tracking-tight text-white sm:text-3xl xl:text-4xl">
            &ldquo;{featured.quote}&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center gap-4 lg:mt-auto lg:pt-10">
            <img
              src={featured.avatar}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-white">
                {featured.name}
              </p>
              <p className="text-sm text-neutral-400">{featured.role}</p>
            </div>
          </div>
          <div className="mt-10 pt-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              In good company
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
              {wordmarks.map((mark) => (
                <span
                  key={mark}
                  className="text-sm font-semibold tracking-wide text-neutral-400"
                >
                  {mark}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={grid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7 lg:gap-6"
        >
          {posts.map((post) => (
            <motion.article
              key={post.handle}
              variants={card}
              whileHover={{
                y: -4,
                transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
              }}
              className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={post.avatar}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="flex items-center gap-1 text-sm font-semibold text-neutral-900 dark:text-white">
                      {post.name}
                      <BadgeCheck className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {post.handle}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {post.date}
                </span>
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 sm:text-[15px]">
                {post.text}
              </p>
              <div className="mt-5 flex items-center gap-6 pt-4 text-neutral-500 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1.5 text-xs tabular-nums">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.replies}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs tabular-nums">
                  <Repeat2 className="h-3.5 w-3.5" />
                  {post.reposts}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs tabular-nums">
                  <Heart className="h-3.5 w-3.5" />
                  {post.likes}
                </span>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
