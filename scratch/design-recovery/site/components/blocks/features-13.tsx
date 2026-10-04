"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Variants } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  MoonStar,
  Scale,
} from "lucide-react";

type FeatureId = "rotations" | "balance" | "handoffs" | "quiet";

const features: {
  id: FeatureId;
  icon: LucideIcon;
  title: string;
  body: string;
  caption: string;
}[] = [
  {
    id: "rotations",
    icon: CalendarRange,
    title: "Rotations that draft themselves",
    body: "Describe the coverage you need and Cadence writes a fair rotation around time zones, holidays, and everyone's no-page hours.",
    caption: "A week of coverage, drafted in seconds",
  },
  {
    id: "balance",
    icon: Scale,
    title: "Load that stays level",
    body: "Pages, reviews, and tickets are weighed together, so the same two people never quietly absorb an entire week.",
    caption: "Effort measured across everything, not just pages",
  },
  {
    id: "handoffs",
    icon: ArrowLeftRight,
    title: "Handoffs without the scramble",
    body: "Open incidents, context, and runbooks move to the next engineer automatically the moment a shift flips over.",
    caption: "Every shift change carries its context forward",
  },
  {
    id: "quiet",
    icon: MoonStar,
    title: "Quiet hours that actually hold",
    body: "Routine alerts wait until morning while true emergencies still break through, every decision logged and reviewable.",
    caption: "Only what matters breaks through at night",
  },
];

const rotationRows: {
  name: string;
  bars: { width: string; live?: boolean; deep?: boolean }[];
}[] = [
  {
    name: "Aya",
    bars: [{ width: "32%" }, { width: "20%", deep: true }, { width: "26%" }],
  },
  {
    name: "Marco",
    bars: [
      { width: "22%", deep: true },
      { width: "36%", live: true },
      { width: "16%" },
    ],
  },
  {
    name: "Priya",
    bars: [{ width: "40%" }, { width: "16%", deep: true }, { width: "22%" }],
  },
  {
    name: "Tomás",
    bars: [
      { width: "18%", deep: true },
      { width: "30%" },
      { width: "28%", deep: true },
    ],
  },
];

const balanceRows = [
  { label: "Pages", value: "32%", width: "32%" },
  { label: "Reviews", value: "35%", width: "35%" },
  { label: "Tickets", value: "33%", width: "33%" },
];

const nightAlerts = [
  { text: "Deploy finished · staging", held: true },
  { text: "Error budget at 12% burn", held: true },
  { text: "P1, checkout latency spike", held: false },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const vignetteStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const vignetteItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const growX: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const barTone = (bar: { live?: boolean; deep?: boolean }) =>
  bar.live
    ? "bg-emerald-500/80 dark:bg-emerald-400/80"
    : bar.deep
      ? "bg-neutral-300 dark:bg-neutral-600"
      : "bg-neutral-200 dark:bg-neutral-800";

function VignetteCard({ id }: { id: FeatureId }) {
  return (
    <motion.div
      variants={vignetteStagger}
      initial="hidden"
      animate="show"
      className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
    >
      {id === "rotations" && (
        <div className="space-y-4">
          <motion.div
            variants={vignetteItem}
            className="flex items-center justify-between"
          >
            <span className="text-xs font-semibold text-neutral-900 dark:text-white">
              Next week
            </span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              Auto-drafted
            </span>
          </motion.div>
          <div className="space-y-3">
            {rotationRows.map((row) => (
              <motion.div
                key={row.name}
                variants={vignetteItem}
                className="flex items-center gap-3"
              >
                <span className="w-12 shrink-0 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {row.name}
                </span>
                <div className="flex flex-1 items-center gap-1">
                  {row.bars.map((bar, index) => (
                    <div
                      key={index}
                      style={{ width: bar.width }}
                      className={`h-2.5 rounded-full ${barTone(bar)}`}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div
            variants={vignetteItem}
            className="flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-900"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Balanced across 3 time zones
            </span>
          </motion.div>
        </div>
      )}

      {id === "balance" && (
        <div className="space-y-5">
          <motion.div
            variants={vignetteItem}
            className="flex items-center justify-between"
          >
            <span className="text-xs font-semibold text-neutral-900 dark:text-white">
              This week&apos;s load
            </span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              Spread ±2%
            </span>
          </motion.div>
          {balanceRows.map((row) => (
            <motion.div
              key={row.label}
              variants={vignetteItem}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {row.label}
                </span>
                <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                  {row.value}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
                <motion.div
                  variants={growX}
                  style={{ width: row.width }}
                  className="h-full origin-left rounded-full bg-neutral-900 dark:bg-white"
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {id === "handoffs" && (
        <div className="space-y-6">
          <motion.div
            variants={vignetteItem}
            className="flex items-center justify-between"
          >
            <span className="text-xs font-semibold text-neutral-900 dark:text-white">
              Shift change
            </span>
            <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
              09:00 UTC
            </span>
          </motion.div>
          <motion.div
            variants={vignetteItem}
            className="flex items-center gap-3"
          >
            <div className="flex flex-col items-center gap-1.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                AK
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                Off shift
              </span>
            </div>
            <div className="relative flex-1 self-start pt-[21px]">
              <div className="border-t border-dashed border-neutral-300 dark:border-neutral-700" />
              <span className="absolute left-1/2 top-[21px] flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                <ArrowLeftRight className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white ring-2 ring-emerald-500/50 dark:bg-white dark:text-neutral-900 dark:ring-emerald-400/50">
                MR
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                On call
              </span>
            </div>
          </motion.div>
          <motion.div
            variants={vignetteItem}
            className="flex items-center gap-2.5 rounded-xl border border-neutral-100 bg-neutral-50 px-3.5 py-3 dark:border-neutral-900 dark:bg-neutral-900/60"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] text-neutral-600 dark:text-neutral-300">
              Context transferred: 3 incidents, 12 runbooks
            </span>
          </motion.div>
        </div>
      )}

      {id === "quiet" && (
        <div className="space-y-4">
          <motion.div
            variants={vignetteItem}
            className="flex items-center justify-between"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-white">
              <MoonStar className="h-3.5 w-3.5" />
              Quiet hours
            </span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              22:00 – 07:00
            </span>
          </motion.div>
          <div className="space-y-2">
            {nightAlerts.map((alert) => (
              <motion.div key={alert.text} variants={vignetteItem}>
                <div
                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${
                    alert.held
                      ? "border-neutral-100 opacity-60 dark:border-neutral-900"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      alert.held
                        ? "bg-neutral-300 dark:bg-neutral-600"
                        : "bg-red-500 dark:bg-red-400"
                    }`}
                  />
                  <span className="flex-1 text-[11px] text-neutral-600 dark:text-neutral-300">
                    {alert.text}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      alert.held
                        ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400"
                        : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    }`}
                  >
                    {alert.held ? "Held" : "Paged"}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div
            variants={vignetteItem}
            className="flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-900"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              2 routine alerts held until morning
            </span>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export function Features13() {
  const [activeId, setActiveId] = useState<FeatureId>("rotations");
  const active =
    features.find((feature) => feature.id === activeId) ?? features[0];

  return (
    <section className="w-full bg-white px-4 py-16 dark:bg-neutral-950 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto w-full max-w-[1400px]">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-2xl"
        >
          <motion.h2
            variants={fadeUp}
            className="mt-5 text-3xl font-semibold leading-[1.1] tracking-tight text-neutral-900 dark:text-white sm:text-4xl md:text-5xl"
          >
            Every shift, already sorted
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-lg"
          >
            Cadence drafts fair rotations, balances the real workload, and keeps
            nights quiet, so coverage stops being a weekly negotiation.
          </motion.p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-12 grid grid-cols-1 items-start gap-10 sm:mt-16 lg:grid-cols-[1fr_1.05fr] lg:gap-16"
        >
          <motion.div
            variants={container}
            className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800"
          >
            {features.map((feature, index) => {
              const isOpen = feature.id === activeId;
              return (
                <motion.div key={feature.id} variants={fadeUp}>
                  <h3>
                    <button
                      type="button"
                      id={`cadence-trigger-${feature.id}`}
                      aria-expanded={isOpen}
                      aria-controls={`cadence-panel-${feature.id}`}
                      onClick={() => setActiveId(feature.id)}
                      className="group flex w-full cursor-pointer items-baseline gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950 sm:py-6"
                    >
                      <span className="w-7 shrink-0 text-xs font-medium tabular-nums text-neutral-400 dark:text-neutral-600">
                        0{index + 1}
                      </span>
                      <span
                        className={`flex-1 text-lg font-medium tracking-tight transition-colors duration-200 sm:text-xl ${
                          isOpen
                            ? "text-neutral-900 dark:text-white"
                            : "text-neutral-500 group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-white"
                        }`}
                      >
                        {feature.title}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className={`self-center transition-colors duration-200 ${
                          isOpen
                            ? "text-neutral-900 dark:text-white"
                            : "text-neutral-400 dark:text-neutral-600"
                        }`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </motion.span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        id={`cadence-panel-${feature.id}`}
                        role="region"
                        aria-labelledby={`cadence-trigger-${feature.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          duration: 0.45,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="overflow-hidden"
                      >
                        <div className="pb-6 sm:pb-7">
                          <p className="max-w-md pl-11 pr-8 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                            {feature.body}
                          </p>
                          <div className="mt-6 flex justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900 lg:hidden">
                            <VignetteCard id={feature.id} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="hidden min-h-[480px] flex-col items-center justify-center rounded-3xl border border-neutral-200 bg-neutral-50 p-8 dark:border-neutral-800 dark:bg-neutral-900 lg:flex"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex w-full flex-col items-center"
              >
                <VignetteCard id={active.id} />
                <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
                  {active.caption}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default Features13;
