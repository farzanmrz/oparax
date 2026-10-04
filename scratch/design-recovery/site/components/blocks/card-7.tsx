"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,transform] duration-150 ease-out";

const card =
  "relative flex h-full flex-col rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-white p-5 transition-colors duration-150 ease-out hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700";

type Entry = {
  id: string;
  version: string;
  date: string;
  title: string;
  excerpt: string;
  author: string;
  initials: string;
  readTime: string;
};

const ENTRIES: Entry[] = [
  {
    id: "2-9",
    version: "2.9",
    date: "12 March",
    title: "Scheduled exports",
    excerpt:
      "Any saved view can now run on a schedule and drop a CSV into your warehouse without a manual export step.",
    author: "Nina Sørensen",
    initials: "NS",
    readTime: "3 min read",
  },
  {
    id: "2-8",
    version: "2.8",
    date: "27 February",
    title: "Faster search across long-running workspaces",
    excerpt:
      "Search now returns in under 200ms on workspaces with more than a million records, and matches highlight in place.",
    author: "Dmitri Oyelaran",
    initials: "DO",
    readTime: "4 min read",
  },
  {
    id: "2-7",
    version: "2.7",
    date: "9 February",
    title: "Roles you can define yourself",
    excerpt:
      "Build a role from individual permissions instead of choosing between admin and member, and apply it per project.",
    author: "Rita Marchetti",
    initials: "RM",
    readTime: "6 min read",
  },
  {
    id: "2-6",
    version: "2.6",
    date: "22 January",
    title: "Comment threads on every record",
    excerpt:
      "Discussion moved out of the activity feed and onto the record itself, so context stays where the work happens.",
    author: "Tomas Alvarez",
    initials: "TA",
    readTime: "2 min read",
  },
  {
    id: "2-5",
    version: "2.5",
    date: "8 January",
    title: "Offline drafts",
    excerpt:
      "Edits made without a connection are kept locally and merged when you reconnect, with conflicts surfaced inline.",
    author: "Iris Haddad",
    initials: "IH",
    readTime: "5 min read",
  },
  {
    id: "2-4",
    version: "2.4",
    date: "18 December",
    title: "A quieter notification model",
    excerpt:
      "Notifications group by project and collapse duplicates, so a busy morning arrives as four items instead of forty.",
    author: "Nina Sørensen",
    initials: "NS",
    readTime: "3 min read",
  },
];

export default function Card7() {
  const [saved, setSaved] = useState<Set<string>>(() => new Set(["2-8"]));

  const toggle = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="h-full min-h-[560px] w-full overflow-y-auto bg-white p-6 sm:p-8 dark:bg-neutral-950">
      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {ENTRIES.map((entry) => {
          const isSaved = saved.has(entry.id);

          return (
            <li key={entry.id} className={card}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  {entry.version} · {entry.date}
                </p>

                <button
                  type="button"
                  aria-pressed={isSaved}
                  onClick={() => toggle(entry.id)}
                  className={cx(
                    "relative z-10 -mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[var(--rb-r-sm,6px)] active:scale-[0.97]",
                    isSaved
                      ? "bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
                    transition,
                    focus,
                  )}
                >
                  <Bookmark aria-hidden="true" className="h-3.5 w-3.5" />
                  <span className="sr-only">
                    {isSaved ? "Remove bookmark from" : "Bookmark"}{" "}
                    {entry.title}
                  </span>
                </button>
              </div>

              <h3 className="mt-2 text-base font-medium tracking-[-0.01em] text-neutral-900 dark:text-neutral-100">
                <a
                  href="#"
                  className={cx(
                    "rounded-[var(--rb-r-xs,4px)] outline-none after:absolute after:inset-0 after:content-['']",
                    focus,
                  )}
                >
                  {entry.title}
                </a>
              </h3>

              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                {entry.excerpt}
              </p>

              <div className="mt-4 flex items-center gap-2 pt-1">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  {entry.initials}
                </span>
                <p className="min-w-0 truncate text-xs text-neutral-600 dark:text-neutral-400">
                  {entry.author}
                </p>
                <span
                  aria-hidden="true"
                  className="h-1 w-1 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700"
                />
                <p className="shrink-0 text-xs text-neutral-500">
                  {entry.readTime}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
