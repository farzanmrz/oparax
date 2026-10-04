"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  GitPullRequest,
  Inbox,
  Clock,
  UserPlus,
} from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out";

const VIEWS = ["Inbox", "Snoozed", "Archived"] as const;
type View = (typeof VIEWS)[number];

type Kind = "review" | "access" | "incident";

const ICONS: Record<Kind, typeof Inbox> = {
  review: GitPullRequest,
  access: UserPlus,
  incident: CircleAlert,
};

type Item = {
  id: string;
  kind: Kind;
  actor: string;
  summary: string;
  target: string;
  time: string;
  view: View;
  unread: boolean;
  body: string;
  meta: { label: string; value: string }[];
  primary: string;
};

const SEED: Item[] = [
  {
    id: "a1",
    kind: "access",
    actor: "Priya Nandakumar",
    summary: "requested admin access to",
    target: "Cedar Labs billing",
    time: "9m",
    view: "Inbox",
    unread: true,
    body: "Priya needs to reconcile the October statement and issue two credits before the close on Friday. Access can be time-boxed to 7 days.",
    meta: [
      { label: "Requested role", value: "Billing admin" },
      { label: "Current role", value: "Member" },
      { label: "Duration", value: "7 days" },
      { label: "Approver", value: "You" },
    ],
    primary: "Grant access",
  },
  {
    id: "a2",
    kind: "review",
    actor: "Wei Chen",
    summary: "requested your review on",
    target: "Usage metering rewrite",
    time: "52m",
    view: "Inbox",
    unread: true,
    body: "Replaces the nightly aggregation job with a streaming counter. Adds a backfill script and a feature flag so we can roll back per workspace.",
    meta: [
      { label: "Repository", value: "halcyon/metering" },
      { label: "Files changed", value: "14" },
      { label: "Checks", value: "8 passing" },
      { label: "Base", value: "main" },
    ],
    primary: "Start review",
  },
  {
    id: "a3",
    kind: "incident",
    actor: "Halcyon",
    summary: "raised a latency alert on",
    target: "eu-west ingest",
    time: "3h",
    view: "Inbox",
    unread: false,
    body: "p95 crossed 800ms for 12 minutes and recovered without intervention. The queue depth peaked at 4,120 messages during the window.",
    meta: [
      { label: "Severity", value: "Warning" },
      { label: "Duration", value: "12m" },
      { label: "Peak p95", value: "812ms" },
      { label: "Status", value: "Recovered" },
    ],
    primary: "Open incident",
  },
  {
    id: "a4",
    kind: "review",
    actor: "Ana Reyes",
    summary: "left changes requested on",
    target: "Sidebar density pass",
    time: "1d",
    view: "Snoozed",
    unread: false,
    body: "Two comments on the collapsed rail widths and one on the tooltip delay. Everything else is approved.",
    meta: [
      { label: "Repository", value: "halcyon/web" },
      { label: "Comments", value: "3" },
      { label: "Checks", value: "6 passing" },
      { label: "Snoozed until", value: "Tomorrow 09:00" },
    ],
    primary: "Open pull request",
  },
  {
    id: "a5",
    kind: "access",
    actor: "Marco Silva",
    summary: "was added to",
    target: "Northwind workspace",
    time: "2d",
    view: "Archived",
    unread: false,
    body: "Marco accepted the invite and completed device enrolment. No further action is needed.",
    meta: [
      { label: "Role", value: "Editor" },
      { label: "Invited by", value: "You" },
      { label: "Device", value: "Enrolled" },
      { label: "Status", value: "Active" },
    ],
    primary: "View member",
  },
];

const SNOOZE = ["Later today", "Tomorrow 09:00", "Next week", "Pick a date"];

export default function Notifications4() {
  const uid = useId();
  const reduce = useReducedMotion();
  const [items, setItems] = useState<Item[]>(SEED);
  const [view, setView] = useState<View>("Inbox");
  const [selected, setSelected] = useState<string | null>("a1");
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const snoozeRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => items.filter((i) => i.view === view),
    [items, view],
  );

  const active = items.find((i) => i.id === selected) ?? null;
  const showDetail = active !== null && active.view === view;

  useEffect(() => {
    if (!snoozeOpen) return;
    const node = snoozeRef.current;
    const doc = node?.ownerDocument ?? document;
    const onDown = (e: MouseEvent) => {
      if (node && !node.contains(e.target as Node)) setSnoozeOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSnoozeOpen(false);
    };
    doc.addEventListener("mousedown", onDown);
    doc.addEventListener("keydown", onKey);
    return () => {
      doc.removeEventListener("mousedown", onDown);
      doc.removeEventListener("keydown", onKey);
    };
  }, [snoozeOpen]);

  const move = (id: string, to: View) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, view: to, unread: false } : i)),
    );
    setSnoozeOpen(false);
  };

  const open = (id: string) => {
    setSelected(id);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, unread: false } : i)),
    );
  };

  return (
    <div className="relative flex h-full min-h-[680px] w-full flex-col overflow-hidden bg-white dark:bg-neutral-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <h2 className="text-[15px] font-medium text-neutral-900 dark:text-white">
          Activity
        </h2>
        <div
          role="tablist"
          aria-label="Activity views"
          className="inline-flex rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-950"
        >
          {VIEWS.map((v) => {
            const on = v === view;
            return (
              <button
                key={v}
                role="tab"
                type="button"
                aria-selected={on}
                onClick={() => setView(v)}
                className={cx(
                  "relative inline-flex h-7 items-center gap-1.5 rounded-[var(--rb-r-sm,6px)] px-2.5 text-[13px]",
                  on
                    ? "text-neutral-900 dark:text-white"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white",
                  transition,
                  focus,
                )}
              >
                {on && (
                  <motion.span
                    layoutId={`${uid}-view`}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 34 }
                    }
                    className="absolute inset-0 rounded-[var(--rb-r-sm,6px)] border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                  />
                )}
                <span className="relative">{v}</span>
                <span className="relative text-[11px] text-neutral-400 tabular-nums dark:text-neutral-500">
                  {items.filter((i) => i.view === v).length}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[300px_1fr]">
        <div
          className={cx(
            "min-h-0 overflow-y-auto border-neutral-200 md:border-r dark:border-neutral-800",
            showDetail ? "hidden md:block" : "block",
          )}
        >
          {rows.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-neutral-50 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500">
                <Inbox className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <p className="text-[13px] text-neutral-900 dark:text-white">
                {view} is empty
              </p>
            </div>
          ) : (
            <ul className="p-2">
              {rows.map((item) => {
                const Icon = ICONS[item.kind];
                const on = item.id === selected;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => open(item.id)}
                      aria-current={on}
                      className={cx(
                        "flex w-full gap-3 rounded-[var(--rb-r-lg,10px)] border p-3 text-left",
                        on
                          ? "border-neutral-200/70 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
                          : "border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900",
                        transition,
                        focus,
                      )}
                    >
                      <span
                        className={cx(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--rb-r-md,8px)] border",
                          item.unread
                            ? "border-neutral-900 bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:border-white dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]"
                            : "border-neutral-200/70 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400",
                          transition,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13px] text-neutral-900 dark:text-white">
                            {item.actor}
                          </span>
                          <span className="shrink-0 text-[12px] text-neutral-400 tabular-nums dark:text-neutral-500">
                            {item.time}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">
                          {item.summary} {item.target}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className={cx(
            "min-h-0 overflow-y-auto",
            showDetail ? "block" : "hidden md:block",
          )}
        >
          {!showDetail ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-[13px] text-neutral-900 dark:text-white">
                Nothing selected
              </p>
              <p className="max-w-[30ch] text-[13px] text-neutral-500 dark:text-neutral-400">
                Choose an item from the list to see its context and actions.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.article
                key={active.id}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="p-5"
              >
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className={cx(
                    "mb-3 inline-flex h-8 items-center gap-1.5 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-2.5 text-[13px] text-neutral-700 md:hidden dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300",
                    transition,
                    focus,
                  )}
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Back
                </button>

                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                  <span className="text-neutral-900 dark:text-white">
                    {active.actor}
                  </span>{" "}
                  {active.summary}
                </p>
                <h3 className="mt-1 text-[17px] font-medium text-neutral-900 dark:text-white">
                  {active.target}
                </h3>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={cx(
                      "inline-flex h-9 items-center gap-1.5 rounded-[var(--rb-r-md,8px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] px-3 text-[13px] font-medium text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]",
                      "hover:bg-neutral-800 dark:hover:bg-neutral-200",
                      transition,
                      focus,
                    )}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    {active.primary}
                  </button>

                  <div className="relative" ref={snoozeRef}>
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={snoozeOpen}
                      onClick={() => setSnoozeOpen((v) => !v)}
                      className={cx(
                        "inline-flex h-9 items-center gap-1.5 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-3 text-[13px] text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300",
                        "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                        transition,
                        focus,
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Snooze
                      <ChevronDown
                        className={cx(
                          "h-3.5 w-3.5 transition-transform duration-150",
                          snoozeOpen && "rotate-180",
                        )}
                        strokeWidth={1.75}
                      />
                    </button>
                    <AnimatePresence>
                      {snoozeOpen && (
                        <motion.div
                          role="menu"
                          initial={
                            reduce ? false : { opacity: 0, y: -4, scale: 0.98 }
                          }
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={
                            reduce
                              ? undefined
                              : { opacity: 0, y: -4, scale: 0.98 }
                          }
                          transition={{ duration: 0.14, ease: "easeOut" }}
                          className="absolute top-[calc(100%+6px)] left-0 z-30 w-[180px] origin-top-left rounded-[var(--rb-r-xl,12px)] border border-neutral-200 bg-white p-1 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.24)] dark:border-neutral-800 dark:bg-neutral-900"
                        >
                          {SNOOZE.map((s) => (
                            <button
                              key={s}
                              role="menuitem"
                              type="button"
                              onClick={() => move(active.id, "Snoozed")}
                              className={cx(
                                "flex h-8 w-full items-center rounded-[var(--rb-r-md,8px)] px-2.5 text-left text-[13px] text-neutral-700 dark:text-neutral-300",
                                "hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white",
                                transition,
                                focus,
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    type="button"
                    onClick={() => move(active.id, "Archived")}
                    className={cx(
                      "inline-flex h-9 items-center gap-1.5 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-3 text-[13px] text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300",
                      "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                      transition,
                      focus,
                    )}
                  >
                    <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Archive
                  </button>
                </div>

                <p className="mt-5 max-w-[64ch] text-[13px] leading-6 text-neutral-500 dark:text-neutral-400">
                  {active.body}
                </p>

                <div className="mt-5 rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-950">
                  <dl className="grid gap-px overflow-hidden rounded-[var(--rb-r-lg,10px)] bg-neutral-200/70 sm:grid-cols-2 dark:bg-neutral-800">
                    {active.meta.map((m) => (
                      <div
                        key={m.label}
                        className="bg-white px-4 py-3 dark:bg-neutral-900"
                      >
                        <dt className="text-[12px] text-neutral-500 dark:text-neutral-400">
                          {m.label}
                        </dt>
                        <dd className="mt-0.5 text-[13px] text-neutral-900 dark:text-white">
                          {m.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className={cx(
                    "mt-4 inline-flex items-center gap-1.5 rounded-[var(--rb-r-sm,6px)] text-[13px] text-neutral-700 dark:text-neutral-300",
                    "hover:text-neutral-900 dark:hover:text-white",
                    transition,
                    focus,
                  )}
                >
                  Open in {active.kind === "review" ? "repository" : "console"}
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                </a>
              </motion.article>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
