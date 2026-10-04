"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  AtSign,
  Check,
  Clock,
  GitPullRequest,
  Inbox,
  Rocket,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,transform] duration-150 ease-out";

const frame =
  "flex flex-col gap-1 rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900";

const panel =
  "rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-950";

const UNDO_MS = 5000;

function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setEdges({
      start: scrollTop > 1,
      end: Math.ceil(scrollTop + clientHeight) < scrollHeight - 1,
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    const view = el?.ownerDocument.defaultView;
    if (!el || !view?.ResizeObserver) return;
    const observer = new view.ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  return { ref, edges, onScroll: update };
}

type Note = {
  id: string;
  icon: LucideIcon;
  title: string;
  preview: string;
  time: string;
};

const NOTES: Note[] = [
  {
    id: "n1",
    icon: AtSign,
    title: "Priya Nair mentioned you in Checkout v3",
    preview:
      "Can you take the payment-intent race here? I left a thread on the retry logic and tagged you for the final call.",
    time: "2m",
  },
  {
    id: "n2",
    icon: GitPullRequest,
    title: "Review requested on “Split ledger writes”",
    preview:
      "Marcus Feld opened a pull request in billing-core and asked for your review before the freeze.",
    time: "11m",
  },
  {
    id: "n3",
    icon: Rocket,
    title: "Deploy succeeded, web-app 4.18.0",
    preview:
      "Production rollout finished across all three regions. Error rate is flat and latency is within budget.",
    time: "38m",
  },
  {
    id: "n4",
    icon: TriangleAlert,
    title: "API usage at 82% of your monthly quota",
    preview:
      "At the current rate you will reach the plan limit around Aug 24. Raise the cap to avoid throttled requests.",
    time: "1h",
  },
  {
    id: "n5",
    icon: AtSign,
    title: "Dana Okafor mentioned you in Design review",
    preview:
      "The empty states look great now. One note on the toast timing that I think is worth a quick pass.",
    time: "3h",
  },
  {
    id: "n6",
    icon: GitPullRequest,
    title: "Your pull request was approved and merged",
    preview:
      "“Cache supplier lookups” passed review from two reviewers and merged into main a moment ago.",
    time: "5h",
  },
  {
    id: "n7",
    icon: Rocket,
    title: "Staging deploy started, api-gateway 2.9.1",
    preview:
      "Build 4821 is rolling out to staging. You will get a follow-up when smoke tests complete.",
    time: "Yesterday",
  },
  {
    id: "n8",
    icon: TriangleAlert,
    title: "Certificate for hooks.northwind.io renews in 6 days",
    preview:
      "Auto-renewal is enabled, but the last attempt was rate-limited. Confirm DNS still points to the load balancer.",
    time: "2d",
  },
];

const INITIAL_READ = new Set(["n3", "n6", "n7"]);

type Tab = "all" | "unread";

export default function List8() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(INITIAL_READ),
  );
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set());
  const [collapsingIds, setCollapsingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [undoId, setUndoId] = useState<string | null>(null);

  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { ref, edges, onScroll } = useScrollFade<HTMLUListElement>();

  useEffect(() => setMounted(true), []);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    },
    [],
  );

  const unreadCount = NOTES.filter(
    (n) => !archivedIds.has(n.id) && !readIds.has(n.id),
  ).length;

  const visible = NOTES.filter((n) => {
    if (archivedIds.has(n.id)) return false;
    if (tab === "unread" && readIds.has(n.id) && !collapsingIds.has(n.id))
      return false;
    return true;
  });

  const toggleRead = (id: string) =>
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const markAllRead = () => setReadIds(() => new Set(NOTES.map((n) => n.id)));

  const archive = (id: string) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setCollapsingIds((prev) => new Set(prev).add(id));
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      setArchivedIds((prev) => new Set(prev).add(id));
      setCollapsingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
    setUndoId(id);
    undoTimer.current = setTimeout(() => setUndoId(null), UNDO_MS);
  };

  const undo = () => {
    if (!undoId) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    const id = undoId;
    setArchivedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setCollapsingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setUndoId(null);
  };

  const emptyAll = visible.length === 0 && tab === "all";
  const emptyUnread = visible.length === 0 && tab === "unread";

  const actionBtn = cx(
    "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 active:scale-[0.97] dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
    transition,
    focus,
  );

  return (
    <div className="flex h-full min-h-[560px] w-full flex-col overflow-hidden bg-white p-8 sm:p-10 dark:bg-neutral-950">
      <div className="mx-auto flex h-full w-full max-w-[720px] flex-col">
        <header className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-medium tracking-[-0.015em] text-neutral-900 dark:text-neutral-100">
              Inbox
            </h2>
            <p className="mt-0.5 text-[13px] tabular-nums text-neutral-500">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "You're all caught up"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className={cx(
                "inline-flex h-8 cursor-pointer items-center rounded-[var(--rb-r-md,8px)] border border-neutral-200/70 bg-white px-3 text-[13px] font-medium text-neutral-900 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-800",
                transition,
                focus,
              )}
            >
              Mark all read
            </button>

            <div
              role="tablist"
              aria-label="Filter notifications"
              className="flex shrink-0 items-center gap-1 rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900"
            >
              {(["all", "unread"] as Tab[]).map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t)}
                    className={cx(
                      "h-6 cursor-pointer rounded-[var(--rb-r-sm,6px)] px-2.5 text-[13px] font-medium capitalize",
                      transition,
                      focus,
                      active
                        ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-neutral-950 dark:text-neutral-100"
                        : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          {emptyAll || emptyUnread ? (
            <div
              className={cx(
                frame,
                "h-full items-center justify-center px-6 text-center",
              )}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--rb-r-lg,10px)] border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                <Inbox className="h-5 w-5 text-neutral-500" />
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {emptyUnread ? "No unread messages" : "Inbox zero"}
              </p>
              <p className="mt-1 max-w-xs text-[13px] text-neutral-600 dark:text-neutral-400">
                {emptyUnread
                  ? "Everything here has been read. Switch to all to see the full history."
                  : "You've archived everything. Restore a message to bring it back."}
              </p>
              <button
                type="button"
                onClick={() =>
                  emptyUnread ? setTab("all") : setArchivedIds(new Set())
                }
                className={cx(
                  "mt-4 inline-flex h-8 cursor-pointer items-center rounded-[var(--rb-r-md,8px)] border border-neutral-200/70 bg-white px-3 text-[13px] font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-800",
                  transition,
                  focus,
                )}
              >
                {emptyUnread ? "View all" : "Restore archived"}
              </button>
            </div>
          ) : (
            <div className="relative h-full overflow-hidden rounded-[var(--rb-r-2xl,14px)]">
              <ul
                ref={ref}
                onScroll={onScroll}
                style={{ touchAction: "pan-y" }}
                className={cx(frame, "h-full overflow-y-auto")}
              >
                {visible.map((n, i) => {
                  const read = readIds.has(n.id);
                  const collapsing = collapsingIds.has(n.id);
                  const Icon = n.icon;
                  return (
                    <li
                      key={n.id}
                      className="grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none"
                      style={{
                        gridTemplateRows: collapsing ? "0fr" : "1fr",
                        opacity: collapsing ? 0 : mounted ? 1 : 0,
                        transform: mounted ? undefined : "translateY(4px)",
                        transitionDelay: collapsing
                          ? "0ms"
                          : `${Math.min(i, 8) * 20}ms`,
                      }}
                    >
                      <div className="overflow-hidden">
                        <div
                          className={cx(
                            panel,
                            "group flex h-16 items-center gap-3 px-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                            transition,
                          )}
                        >
                          <span
                            aria-hidden={read}
                            className={cx(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              read
                                ? "bg-transparent"
                                : "bg-[var(--rb-accent,oklch(20.5%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))]",
                            )}
                          >
                            {!read && <span className="sr-only">Unread</span>}
                          </span>

                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--rb-r-lg,10px)] bg-neutral-100 dark:bg-neutral-800"
                          >
                            <Icon
                              className={cx(
                                "h-[18px] w-[18px]",
                                read
                                  ? "text-neutral-400 dark:text-neutral-500"
                                  : "text-neutral-600 dark:text-neutral-300",
                              )}
                            />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p
                              className={cx(
                                "truncate text-[13px]",
                                read
                                  ? "text-neutral-500"
                                  : "font-medium text-neutral-900 dark:text-neutral-100",
                              )}
                            >
                              {n.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-neutral-500">
                              {n.preview}
                            </p>
                          </div>

                          <time className="shrink-0 self-start pt-0.5 text-[12px] tabular-nums text-neutral-500">
                            {n.time}
                          </time>

                          <div
                            className={cx(
                              "flex shrink-0 items-center gap-1 opacity-100 transition-opacity duration-150 ease-out sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => toggleRead(n.id)}
                              aria-label={
                                read ? "Mark as unread" : "Mark as read"
                              }
                              className={actionBtn}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label="Snooze"
                              className={actionBtn}
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => archive(n.id)}
                              aria-label="Archive"
                              className={actionBtn}
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div
                aria-hidden="true"
                className={cx(
                  "pointer-events-none absolute inset-x-0 top-0 h-8 rounded-t-[var(--rb-r-2xl,14px)] bg-gradient-to-b from-neutral-50 to-transparent transition-opacity duration-200 ease-out dark:from-neutral-900",
                  edges.start ? "opacity-100" : "opacity-0",
                )}
              />
              <div
                aria-hidden="true"
                className={cx(
                  "pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-[var(--rb-r-2xl,14px)] bg-gradient-to-t from-neutral-50 to-transparent transition-opacity duration-200 ease-out dark:from-neutral-900",
                  edges.end ? "opacity-100" : "opacity-0",
                )}
              />
            </div>
          )}

          <div
            aria-live="polite"
            className={cx(
              "pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 transition-[opacity,transform] duration-200 ease-out",
              undoId ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            )}
          >
            <div className="pointer-events-auto flex h-10 items-center gap-3 rounded-[var(--rb-r-lg,10px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] pl-3 pr-1.5 text-[13px] text-[var(--rb-accent-fg,oklch(100%_0_0))] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]">
              <span>Message archived</span>
              <button
                type="button"
                onClick={undo}
                className="inline-flex h-7 cursor-pointer items-center rounded-[var(--rb-r-md,8px)] px-2.5 font-medium text-[var(--rb-accent-fg,oklch(100%_0_0))] hover:bg-white/10 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rb-accent-fg,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))] dark:hover:bg-black/10 dark:focus-visible:outline-[var(--rb-accent-fg,oklch(20.5%_0_0))]"
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
