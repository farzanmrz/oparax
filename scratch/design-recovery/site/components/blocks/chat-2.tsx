"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  Image as ImageIcon,
  Phone,
  Search,
  SendHorizontal,
  Video,
} from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out";

const frame =
  "rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-950";
const panel =
  "rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-900";

const THREADS = [
  {
    id: "sofia",
    name: "Sofia Alvarez",
    initials: "SA",
    preview: "Sent the revised copy deck",
    at: "09:41",
    unread: 2,
    online: true,
  },
  {
    id: "marcus",
    name: "Marcus Bell",
    initials: "MB",
    preview: "Works for me, let's ship it",
    at: "09:12",
    unread: 0,
    online: true,
  },
  {
    id: "priya",
    name: "Priya Nandakumar",
    initials: "PN",
    preview: "Photo",
    at: "Yesterday",
    unread: 0,
    online: false,
  },
  {
    id: "wei",
    name: "Wei Chen",
    initials: "WC",
    preview: "I'll pick this up Monday",
    at: "Yesterday",
    unread: 0,
    online: false,
  },
  {
    id: "tomas",
    name: "Tomás Guerrero",
    initials: "TG",
    preview: "Thanks for the review",
    at: "Tue",
    unread: 0,
    online: false,
  },
];

const BUBBLES = [
  {
    id: "b1",
    me: false,
    text: "Morning. The revised copy deck is in the shared folder, second tab has the shorter variants.",
    at: "09:28",
  },
  {
    id: "b2",
    me: true,
    text: "Got it. The shorter headline reads much better on mobile.",
    at: "09:31",
    read: true,
  },
  {
    id: "b3",
    me: true,
    text: "One ask: can the subhead drop the second clause? It wraps to three lines at 375.",
    at: "09:31",
    read: true,
  },
  {
    id: "b4",
    me: false,
    text: "Easy. I will trim it and re-export both light and dark.",
    at: "09:38",
  },
  {
    id: "b5",
    me: false,
    text: "Anything else before I lock the file?",
    at: "09:41",
  },
];

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

export default function Chat2() {
  const [active, setActive] = useState("sofia");
  const [draft, setDraft] = useState("");
  const { ref, edges, onScroll } = useScrollFade<HTMLDivElement>();

  return (
    <div className="flex h-full min-h-[680px] w-full flex-col overflow-hidden bg-white p-4 sm:p-6 dark:bg-neutral-950">
      <div
        className={cx(
          frame,
          "mx-auto grid min-h-0 w-full max-w-[1000px] flex-1 gap-1 md:grid-cols-[260px_1fr]",
        )}
      >
        <aside className={cx(panel, "hidden min-h-0 flex-col md:flex")}>
          <div className="p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <label htmlFor="chat-2-search" className="sr-only">
                Search conversations
              </label>
              <input
                id="chat-2-search"
                placeholder="Search messages"
                className={cx(
                  "h-8 w-full rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white pr-2.5 pl-8 text-[13px] text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100",
                  transition,
                  focus,
                )}
              />
            </div>
          </div>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
            {THREADS.map((t) => {
              const isActive = t.id === active;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => setActive(t.id)}
                    className={cx(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--rb-r-md,8px)] px-2 py-2 text-left",
                      transition,
                      focus,
                      isActive
                        ? "bg-neutral-100 dark:bg-neutral-800"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
                    )}
                  >
                    <span className="relative shrink-0">
                      <span
                        aria-hidden
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
                      >
                        {t.initials}
                      </span>
                      {t.online && (
                        <span
                          aria-hidden
                          className="absolute right-0 bottom-0 h-2 w-2 rounded-full border-2 border-white bg-[var(--rb-accent,oklch(20.5%_0_0))] dark:border-neutral-900 dark:bg-[var(--rb-accent,oklch(100%_0_0))]"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                          {t.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-neutral-400 tabular-nums">
                          {t.at}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] text-neutral-500">
                          {t.preview}
                        </span>
                        {t.unread > 0 && (
                          <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[var(--rb-accent,oklch(20.5%_0_0))] px-1 text-[10px] font-medium text-[var(--rb-accent-fg,oklch(100%_0_0))] tabular-nums dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]">
                            {t.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col gap-1">
          <div
            className={cx(
              panel,
              "flex items-center justify-between gap-3 px-4 py-3",
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                SA
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-[14px] font-medium text-neutral-900 dark:text-neutral-100">
                  Sofia Alvarez
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-neutral-500">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-[var(--rb-accent,oklch(20.5%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))]"
                  />
                  Active now
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {[
                { icon: Phone, label: "Start voice call" },
                { icon: Video, label: "Start video call" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  className={cx(
                    "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
                    transition,
                    focus,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div
            className={cx(
              panel,
              "relative flex min-h-0 flex-1 flex-col overflow-hidden",
            )}
          >
            <div
              ref={ref}
              onScroll={onScroll}
              className="flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto p-4 [&>*:first-child]:mt-auto"
            >
              <p className="pb-1 text-center text-[11px] text-neutral-400">
                Today
              </p>
              {BUBBLES.map((b) => (
                <div
                  key={b.id}
                  className={cx("flex", b.me ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cx(
                      "max-w-[78%] rounded-[var(--rb-r-2xl,14px)] px-3.5 py-2.5",
                      b.me
                        ? "rounded-br-[var(--rb-r-sm,6px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]"
                        : "rounded-bl-[var(--rb-r-sm,6px)] bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100",
                    )}
                  >
                    <p className="text-[13px] leading-relaxed">{b.text}</p>
                    <p
                      className={cx(
                        "mt-1 flex items-center justify-end gap-1 text-[11px] tabular-nums",
                        b.me
                          ? "text-white/60 dark:text-neutral-900/60"
                          : "text-neutral-400",
                      )}
                    >
                      {b.at}
                      {b.me &&
                        (b.read ? (
                          <CheckCheck className="h-3 w-3" aria-label="Read" />
                        ) : (
                          <Check className="h-3 w-3" aria-label="Sent" />
                        ))}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div
              aria-hidden="true"
              className={cx(
                "pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-900",
                edges.start ? "opacity-100" : "opacity-0",
              )}
            />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDraft("");
            }}
            className={cx(panel, "flex items-center gap-2 p-2 pl-3")}
          >
            <label htmlFor="chat-2-composer" className="sr-only">
              Message Sofia Alvarez
            </label>
            <input
              id="chat-2-composer"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message"
              className="h-8 min-w-0 flex-1 bg-transparent text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100"
            />
            <button
              type="button"
              aria-label="Attach image"
              className={cx(
                "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
                transition,
                focus,
              )}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim()}
              className={cx(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--rb-r-md,8px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[var(--rb-accent-fg,oklch(100%_0_0))] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]",
                draft.trim() &&
                  "cursor-pointer hover:bg-neutral-800 active:scale-[0.98] dark:hover:bg-neutral-200",
                transition,
                focus,
              )}
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
