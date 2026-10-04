"use client";

import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AtSign,
  Bell,
  Check,
  CheckCheck,
  GitPullRequest,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out";

const TABS = ["All", "Unread", "Mentions"] as const;
type Tab = (typeof TABS)[number];

type Kind = "mention" | "comment" | "review" | "member" | "security";

const ICONS: Record<Kind, typeof Bell> = {
  mention: AtSign,
  comment: MessageSquare,
  review: GitPullRequest,
  member: UserPlus,
  security: ShieldCheck,
};

type Item = {
  id: string;
  kind: Kind;
  actor: string;
  action: string;
  target: string;
  detail?: string;
  time: string;
  group: "Today" | "Yesterday" | "Earlier";
  unread: boolean;
};

const SEED: Item[] = [
  {
    id: "n1",
    kind: "mention",
    actor: "Ana Reyes",
    action: "mentioned you in",
    target: "Q3 rollout plan",
    detail:
      "Can you confirm the migration window before we lock the schedule with Northwind?",
    time: "12m",
    group: "Today",
    unread: true,
  },
  {
    id: "n2",
    kind: "review",
    actor: "Wei Chen",
    action: "requested review on",
    target: "Billing usage meter",
    detail: "14 files changed across the metering service and the invoice job.",
    time: "48m",
    group: "Today",
    unread: true,
  },
  {
    id: "n3",
    kind: "comment",
    actor: "Marco Silva",
    action: "replied in",
    target: "Onboarding checklist",
    detail: "Moved the workspace step ahead of the invite step. Looks cleaner.",
    time: "2h",
    group: "Today",
    unread: true,
  },
  {
    id: "n4",
    kind: "member",
    actor: "Priya Nandakumar",
    action: "joined",
    target: "Cedar Labs",
    detail: "Invited by you as an editor.",
    time: "5h",
    group: "Today",
    unread: false,
  },
  {
    id: "n5",
    kind: "security",
    actor: "Halcyon",
    action: "signed in from a new device on",
    target: "macOS · Lisbon",
    detail: "If this was not you, revoke the session and rotate your keys.",
    time: "Yesterday",
    group: "Yesterday",
    unread: true,
  },
  {
    id: "n6",
    kind: "mention",
    actor: "Sofia Alvarez",
    action: "mentioned you in",
    target: "Retention teardown",
    detail:
      "Pulled your cohort chart into the summary. Shout if that is stale.",
    time: "Yesterday",
    group: "Yesterday",
    unread: false,
  },
  {
    id: "n7",
    kind: "comment",
    actor: "Marco Silva",
    action: "resolved your comment in",
    target: "Meridian import",
    time: "2d",
    group: "Earlier",
    unread: false,
  },
  {
    id: "n8",
    kind: "review",
    actor: "Ana Reyes",
    action: "approved",
    target: "Sidebar density pass",
    time: "3d",
    group: "Earlier",
    unread: false,
  },
];

const GROUPS = ["Today", "Yesterday", "Earlier"] as const;

export default function Notifications1() {
  const uid = useId();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<Tab>("All");
  const [items, setItems] = useState<Item[]>(SEED);

  const unread = items.filter((i) => i.unread).length;

  const visible = useMemo(
    () =>
      items.filter((i) =>
        tab === "Unread"
          ? i.unread
          : tab === "Mentions"
            ? i.kind === "mention"
            : true,
      ),
    [items, tab],
  );

  const grouped = GROUPS.map((g) => ({
    group: g,
    rows: visible.filter((i) => i.group === g),
  })).filter((g) => g.rows.length > 0);

  const toggleRead = (id: string) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, unread: !i.unread } : i)),
    );

  const dismiss = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const markAll = () =>
    setItems((prev) => prev.map((i) => ({ ...i, unread: false })));

  return (
    <div className="relative flex h-full min-h-[680px] w-full flex-col overflow-hidden bg-white dark:bg-neutral-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-medium text-neutral-900 dark:text-white">
            Notifications
          </h2>
          <AnimatePresence initial={false}>
            {unread > 0 && (
              <motion.span
                key="count"
                initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="rounded-[var(--rb-r-sm,6px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] px-1.5 py-0.5 text-[11px] leading-4 font-medium text-[var(--rb-accent-fg,oklch(100%_0_0))] tabular-nums dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]"
              >
                {unread}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={markAll}
          disabled={unread === 0}
          className={cx(
            "inline-flex h-8 items-center gap-1.5 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-2.5 text-[13px] text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300",
            "hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-neutral-900",
            transition,
            focus,
          )}
        >
          <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
          Mark all read
        </button>
      </header>

      <div className="px-5 pt-4">
        <div
          role="tablist"
          aria-label="Filter notifications"
          className="inline-flex rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-950"
        >
          {TABS.map((t) => {
            const active = t === tab;
            const n =
              t === "Unread"
                ? unread
                : t === "Mentions"
                  ? items.filter((i) => i.kind === "mention").length
                  : items.length;
            return (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setTab(t)}
                className={cx(
                  "relative inline-flex h-7 items-center gap-1.5 rounded-[var(--rb-r-sm,6px)] px-2.5 text-[13px]",
                  active
                    ? "text-neutral-900 dark:text-white"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white",
                  transition,
                  focus,
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`${uid}-tab`}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 34 }
                    }
                    className="absolute inset-0 rounded-[var(--rb-r-sm,6px)] border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                  />
                )}
                <span className="relative">{t}</span>
                <span className="relative text-[11px] text-neutral-400 tabular-nums dark:text-neutral-500">
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {grouped.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-neutral-50 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500">
              <Bell className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="text-[13px] text-neutral-900 dark:text-white">
              Nothing here
            </p>
            <p className="max-w-[26ch] text-[13px] text-neutral-500 dark:text-neutral-400">
              You are caught up on {tab.toLowerCase()} notifications.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ group, rows }) => (
              <section key={group}>
                <h3 className="px-1 pb-2 text-[11px] tracking-[0.06em] text-neutral-400 uppercase dark:text-neutral-500">
                  {group}
                </h3>
                <ul className="space-y-1">
                  <AnimatePresence initial={false}>
                    {rows.map((item) => {
                      const Icon = ICONS[item.kind];
                      return (
                        <motion.li
                          key={item.id}
                          layout={reduce ? false : "position"}
                          initial={false}
                          exit={
                            reduce
                              ? undefined
                              : { opacity: 0, height: 0, marginBottom: 0 }
                          }
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="group/row relative overflow-hidden"
                        >
                          <div
                            className={cx(
                              "flex gap-3 rounded-[var(--rb-r-lg,10px)] border border-transparent p-3",
                              "hover:border-neutral-200/70 hover:bg-neutral-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-900",
                              transition,
                            )}
                          >
                            <span
                              className={cx(
                                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--rb-r-md,8px)] border",
                                item.unread
                                  ? "border-neutral-900 bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:border-white dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]"
                                  : "border-neutral-200/70 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400",
                                transition,
                              )}
                            >
                              <Icon
                                className="h-3.5 w-3.5"
                                strokeWidth={1.75}
                              />
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">
                                <span className="text-neutral-900 dark:text-white">
                                  {item.actor}
                                </span>{" "}
                                {item.action}{" "}
                                <span className="text-neutral-900 dark:text-white">
                                  {item.target}
                                </span>
                              </p>
                              {item.detail && (
                                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">
                                  {item.detail}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 items-start gap-1">
                              <span className="mt-1.5 text-[12px] text-neutral-400 tabular-nums group-focus-within/row:opacity-0 group-hover/row:opacity-0 dark:text-neutral-500">
                                {item.time}
                              </span>
                              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => toggleRead(item.id)}
                                  aria-label={
                                    item.unread ? "Mark as read" : "Mark unread"
                                  }
                                  className={cx(
                                    "inline-flex h-7 w-7 items-center justify-center rounded-[var(--rb-r-sm,6px)] border border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400",
                                    "hover:text-neutral-900 dark:hover:text-white",
                                    transition,
                                    focus,
                                  )}
                                >
                                  {item.unread ? (
                                    <Check
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.75}
                                    />
                                  ) : (
                                    <Bell
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.75}
                                    />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => dismiss(item.id)}
                                  aria-label="Dismiss notification"
                                  className={cx(
                                    "inline-flex h-7 w-7 items-center justify-center rounded-[var(--rb-r-sm,6px)] border border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400",
                                    "hover:text-neutral-900 dark:hover:text-white",
                                    transition,
                                    focus,
                                  )}
                                >
                                  <X
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.75}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
