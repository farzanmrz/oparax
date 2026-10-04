"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const commits = [
  { hash: "a1f3c9", message: "Ship dark mode for dashboards", author: "KM" },
  { hash: "8b21e0", message: "Fix reconnect loop on idle tabs", author: "JT" },
  { hash: "c7d442", message: "Cut cold-start time by 41%", author: "RS" },
];

const gates = [
  { name: "Type check", meta: "12 s", done: true },
  { name: "Unit tests", meta: "1 m 48 s", done: true },
  { name: "Bundle budget", meta: "+0.4 kB", done: true },
  { name: "Smoke tests", meta: "Queued", done: false },
];

const notes = [
  { tag: "Added", text: "Workspace-level dark mode with per-user override" },
  { tag: "Fixed", text: "WebSocket reconnect loop on idle dashboard tabs" },
  { tag: "Perf", text: "41% faster cold starts on large workspaces" },
];

const environments = [
  { name: "Staging", status: "Deployed · 2 h ago", live: true },
  { name: "Canary", status: "Holding 5% of traffic", live: true },
  { name: "Production", status: "Awaiting promotion", live: false },
];

function ReleasePanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
            v2.4.0
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
            Cut from main · 14 commits · 3 authors
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-[11px] text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          release/2.4
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {commits.map((commit) => (
          <div
            key={commit.hash}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3.5 py-3 dark:border-neutral-800"
          >
            <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-600">
              {commit.hash}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-neutral-700 dark:text-neutral-300">
              {commit.message}
            </span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-medium text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              {commit.author}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-400 dark:text-neutral-600">
        + 11 more commits in scope
      </p>
    </div>
  );
}

function GatesPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {gates.map((gate) => (
          <div
            key={gate.name}
            className="flex items-center justify-between rounded-xl border border-neutral-200 px-3.5 py-3 dark:border-neutral-800"
          >
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {gate.name}
            </span>
            <span className="flex items-center gap-2.5">
              <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-600">
                {gate.meta}
              </span>
              {gate.done ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-dashed border-neutral-300 dark:border-neutral-700" />
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        3 of 4 gates green: promotion unlocks when smoke tests pass.
      </p>
    </div>
  );
}

function NotesPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {notes.map((note) => (
          <div
            key={note.tag}
            className="flex items-start gap-3 rounded-xl border border-neutral-200 px-3.5 py-3 dark:border-neutral-800"
          >
            <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              {note.tag}
            </span>
            <span className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {note.text}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-400 dark:text-neutral-600">
        Publishes to your changelog and release email on promote.
      </p>
    </div>
  );
}

function PromotePanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {environments.map((env) => (
          <div
            key={env.name}
            className="rounded-xl border border-neutral-200 p-3.5 dark:border-neutral-800"
          >
            <span className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  env.live
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : "bg-neutral-300 dark:bg-neutral-700"
                }`}
              />
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                {env.name}
              </span>
            </span>
            <span className="mt-1.5 block text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-500">
              {env.status}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="w-full cursor-pointer rounded-full bg-black py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950"
      >
        Promote to production
      </button>
      <p className="text-center text-xs text-neutral-500 dark:text-neutral-500">
        Auto-rollback arms itself the moment traffic shifts.
      </p>
    </div>
  );
}

const steps = [
  {
    title: "Cut the release",
    meta: "~10 s",
    copy: "Tag a version from main and Shipyard assembles the commits, authors, and scope automatically.",
    panelLabel: "Release draft",
    panel: ReleasePanel,
  },
  {
    title: "Gates run in parallel",
    meta: "2–4 min",
    copy: "Type checks, tests, and bundle budgets run at once, a single red gate blocks promotion.",
    panelLabel: "Quality gates",
    panel: GatesPanel,
  },
  {
    title: "The changelog writes itself",
    meta: "Instant",
    copy: "Merged pull requests become grouped, readable notes your customers actually see.",
    panelLabel: "Release notes",
    panel: NotesPanel,
  },
  {
    title: "Promote with one click",
    meta: "Guarded",
    copy: "Staging, canary, then production, with automatic rollback the moment error rates spike.",
    panelLabel: "Promotion",
    panel: PromotePanel,
  },
];

export function HowItWorks9() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.65, ease: EASE },
    },
  };

  const selectTab = (index: number) => {
    const next = (index + steps.length) % steps.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      selectTab(active + 1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      selectTab(active - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectTab(steps.length - 1);
    }
  };

  const ActivePanel = steps[active].panel;

  return (
    <section
      aria-labelledby="hiw9-heading"
      className="w-full bg-white px-4 py-16 dark:bg-neutral-950 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(320px,0.9fr)_1.25fr] lg:items-start lg:gap-16"
        >
          <motion.div variants={item}>
            <h2
              id="hiw9-heading"
              className="text-3xl font-medium leading-[1.1] tracking-tight text-neutral-900 text-balance dark:text-white sm:text-4xl lg:text-5xl"
            >
              Merge to production in four supervised steps.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-lg">
              Shipyard runs the same sequence for every release: visible to the
              whole team, enforced by gates, and reversible in one click.
            </p>

            <div
              role="tablist"
              aria-orientation="vertical"
              aria-label="Release steps"
              onKeyDown={handleKeyDown}
              className="mt-8 flex flex-col gap-1.5 lg:mt-10"
            >
              {steps.map((step, index) => {
                const isActive = active === index;
                return (
                  <button
                    key={step.title}
                    ref={(el) => {
                      tabRefs.current[index] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`hiw9-tab-${index}`}
                    aria-selected={isActive}
                    aria-controls="hiw9-panel"
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActive(index)}
                    className={`relative w-full cursor-pointer rounded-2xl px-5 py-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950 ${
                      isActive
                        ? ""
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="hiw9-indicator"
                        transition={{ duration: 0.4, ease: EASE }}
                        className="absolute inset-0 rounded-2xl bg-neutral-100 dark:bg-neutral-900"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative flex items-start gap-4">
                      <span
                        className={`pt-0.5 font-mono text-xs ${
                          isActive
                            ? "text-neutral-900 dark:text-white"
                            : "text-neutral-400 dark:text-neutral-600"
                        }`}
                      >
                        0{index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span
                            className={`text-sm font-medium sm:text-base ${
                              isActive
                                ? "text-neutral-900 dark:text-white"
                                : "text-neutral-600 dark:text-neutral-400"
                            }`}
                          >
                            {step.title}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-neutral-400 dark:text-neutral-600">
                            {step.meta}
                          </span>
                        </span>
                        <AnimatePresence initial={false}>
                          {isActive && (
                            <motion.span
                              key="copy"
                              initial={
                                reduce
                                  ? { opacity: 0 }
                                  : { height: 0, opacity: 0 }
                              }
                              animate={
                                reduce
                                  ? { opacity: 1 }
                                  : { height: "auto", opacity: 1 }
                              }
                              exit={
                                reduce
                                  ? { opacity: 0 }
                                  : { height: 0, opacity: 0 }
                              }
                              transition={{ duration: 0.35, ease: EASE }}
                              className="block overflow-hidden"
                            >
                              <span className="block pt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                                {step.copy}
                              </span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <a
              href="#"
              className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-full text-sm font-medium text-neutral-900 transition-colors duration-200 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4 focus-visible:ring-offset-white dark:text-white dark:hover:text-neutral-400 dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950"
            >
              Read the release playbook
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </motion.div>

          <motion.div variants={item} className="min-w-0">
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-500">
                  {steps[active].panelLabel}
                </span>
                <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-600">
                  Step {active + 1} of {steps.length}
                </span>
              </div>
              <div
                id="hiw9-panel"
                role="tabpanel"
                aria-labelledby={`hiw9-tab-${active}`}
                className="min-h-[420px] overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 sm:min-h-[380px]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="p-5 sm:p-7"
                  >
                    <ActivePanel />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default HowItWorks9;
