"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

type SubStep = { label: string; seconds: number };

type Phase = {
  label: string;
  seconds: number;
  subSteps: SubStep[];
};

const PHASES: Phase[] = [
  {
    label: "Prepare export",
    seconds: 4.2,
    subSteps: [
      { label: "Validate source schema", seconds: 1.1 },
      { label: "Snapshot three tables", seconds: 2.4 },
      { label: "Acquire export lock", seconds: 0.7 },
    ],
  },
  {
    label: "Extract records",
    seconds: 12.8,
    subSteps: [
      { label: "Read customers", seconds: 3.1 },
      { label: "Read subscriptions", seconds: 6.4 },
      { label: "Read invoices", seconds: 3.3 },
    ],
  },
  {
    label: "Transform rows",
    seconds: 8.3,
    subSteps: [
      { label: "Normalise currencies", seconds: 2.2 },
      { label: "Resolve account owners", seconds: 4.0 },
      { label: "Drop test accounts", seconds: 2.1 },
    ],
  },
  {
    label: "Load warehouse",
    seconds: 5.1,
    subSteps: [
      { label: "Stage to temp table", seconds: 1.8 },
      { label: "Merge into reporting schema", seconds: 3.3 },
    ],
  },
  {
    label: "Verify output",
    seconds: 2.0,
    subSteps: [
      { label: "Compare row counts", seconds: 0.9 },
      { label: "Check referential integrity", seconds: 1.1 },
    ],
  },
];

const MAX_SUB = Math.max(
  ...PHASES.flatMap((p) => p.subSteps.map((s) => s.seconds)),
);
const TOTAL = PHASES.reduce((sum, p) => sum + p.seconds, 0);

function fmt(seconds: number) {
  return `${seconds.toFixed(1)}s`;
}

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

export default function AgentActivity2() {
  const feed = useScrollFade<HTMLDivElement>();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
  });

  return (
    <div className="relative flex h-full min-h-[560px] w-full flex-col gap-3 overflow-hidden bg-white p-4 sm:gap-4 sm:p-6 dark:bg-neutral-950">
      <header className="flex shrink-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-medium tracking-[-0.01em] text-neutral-900 dark:text-neutral-100">
            Weekly warehouse export
          </h2>
          <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600"
            />
            <span>Succeeded</span>
          </div>
        </div>
        <span className="shrink-0 text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400">
          {fmt(TOTAL)}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div
            ref={feed.ref}
            onScroll={feed.onScroll}
            className="h-full overflow-y-auto overscroll-contain p-1"
          >
            <ol className="flex flex-col">
              {PHASES.map((phase, i) => {
                const isOpen = Boolean(open[i]);
                return (
                  <li key={i} className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setOpen((prev) => ({ ...prev, [i]: !prev[i] }))
                      }
                      aria-expanded={isOpen}
                      className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-[var(--rb-r-sm,6px)] px-2 text-left transition-[transform,background-color,color] duration-150 ease-out hover:bg-neutral-50 active:scale-[0.99] focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:hover:bg-neutral-900 dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]"
                    >
                      <span className="flex w-4 shrink-0 justify-center">
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600"
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                        {phase.label}
                      </span>
                      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-500">
                        {fmt(phase.seconds)}
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className={cx(
                          "h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform duration-200 ease-out dark:text-neutral-500",
                          isOpen && "rotate-90",
                        )}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={
                            reduceMotion ? false : { height: 0, opacity: 0 }
                          }
                          animate={{ height: "auto", opacity: 1 }}
                          exit={
                            reduceMotion ? undefined : { height: 0, opacity: 0 }
                          }
                          transition={{
                            duration: 0.2,
                            ease: [0.23, 1, 0.32, 1],
                          }}
                          className="overflow-hidden"
                        >
                          <ul className="pb-1.5 pl-10 pr-2">
                            {phase.subSteps.map((sub, j) => (
                              <li
                                key={j}
                                className="flex h-8 items-center gap-3"
                              >
                                <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-600 dark:text-neutral-400">
                                  {sub.label}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="hidden h-1 w-24 shrink-0 overflow-hidden rounded-full bg-neutral-200 sm:block dark:bg-neutral-800"
                                >
                                  <span
                                    className="block h-full rounded-full bg-neutral-400 dark:bg-neutral-500"
                                    style={{
                                      width: `${(sub.seconds / MAX_SUB) * 100}%`,
                                    }}
                                  />
                                </span>
                                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-500">
                                  {fmt(sub.seconds)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
          </div>

          <div
            aria-hidden="true"
            className={cx(
              "pointer-events-none absolute inset-x-0 top-0 h-8 rounded-t-[var(--rb-r-lg,10px)] bg-gradient-to-b from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-950",
              feed.edges.start ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            aria-hidden="true"
            className={cx(
              "pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-[var(--rb-r-lg,10px)] bg-gradient-to-t from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-950",
              feed.edges.end ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </div>
    </div>
  );
}
