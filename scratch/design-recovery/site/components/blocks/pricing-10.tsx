"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ChevronRight,
  Sparkles,
  Zap,
  Users,
  Workflow,
  Mail,
  Database,
  Webhook,
  UserCheck,
} from "lucide-react";

const runTiers = [
  { runs: 5_000, monthly: 0 },
  { runs: 25_000, monthly: 19 },
  { runs: 100_000, monthly: 49 },
  { runs: 500_000, monthly: 129 },
  { runs: 1_000_000, monthly: 229 },
  { runs: 5_000_000, monthly: 699 },
];

const seatTiers = [
  { seats: 1, monthly: 0 },
  { seats: 3, monthly: 24 },
  { seats: 10, monthly: 69 },
  { seats: 25, monthly: 149 },
  { seats: 50, monthly: 269 },
  { seats: 100, monthly: 479 },
];

const runFeatures = [
  { icon: Workflow, text: "Unlimited workflows" },
  { icon: Webhook, text: "Webhooks & API triggers" },
  { icon: Database, text: "Run history for 90 days" },
  { icon: Zap, text: "Priority execution queue" },
  { icon: Mail, text: "Email & Slack alerts" },
];

const seatFeatures = [
  { icon: UserCheck, text: "SSO & role-based access" },
  { icon: Users, text: "Shared team workspaces" },
  { icon: Workflow, text: "Collaborative editing" },
  { icon: Database, text: "Audit logs & activity feed" },
  { icon: Mail, text: "Priority support" },
];

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1000}k`;
  return `${n}`;
}

function Slider({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="relative h-6 flex items-center">
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700" />
      <div
        className="absolute h-1.5 rounded-full bg-neutral-900 dark:bg-white"
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute h-5 w-5 rounded-full bg-white border-2 border-neutral-900 shadow-sm pointer-events-none"
        style={{ left: `calc(${pct}% - 10px)` }}
      />
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}

export default function Pricing10() {
  const [runCycle, setRunCycle] = useState<"Monthly" | "Annual" | "One-time">(
    "Monthly",
  );
  const [seatCycle, setSeatCycle] = useState<"Monthly" | "Annual">("Monthly");
  const [runIdx, setRunIdx] = useState(2);
  const [seatIdx, setSeatIdx] = useState(1);

  const runTier = runTiers[runIdx];
  const seatTier = seatTiers[seatIdx];

  const runPrice = useMemo(() => {
    if (runCycle === "Annual") return Math.round(runTier.monthly * 10);
    if (runCycle === "One-time") return Math.round(runTier.monthly * 2.5);
    return runTier.monthly;
  }, [runCycle, runTier]);

  const seatPrice = useMemo(() => {
    if (seatCycle === "Annual") return Math.round(seatTier.monthly * 10);
    return seatTier.monthly;
  }, [seatCycle, seatTier]);

  const runSuffix =
    runCycle === "Annual" ? "/yr" : runCycle === "One-time" ? "" : "/mo";
  const seatSuffix = seatCycle === "Annual" ? "/yr" : "/mo";

  const runOriginal = Math.round(runPrice * 1.25);
  const seatOriginal = Math.round(seatPrice * 1.25);

  return (
    <section className="w-full min-h-[var(--rb-section-min-h,100vh)] flex items-center py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-950">
      <div className="max-w-[1400px] mx-auto w-full flex flex-col items-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl md:text-5xl font-semibold text-neutral-900 dark:text-white text-center tracking-tight max-w-3xl"
        >
          Pay for what you ship, nothing else
        </motion.h2>
        <p className="mt-5 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 text-center max-w-2xl leading-relaxed">
          Skip rigid tiers and surprise overage fees. Dial in the exact runs and
          seats your team needs, adjust any time, and only ever pay for the
          capacity you actually use.
        </p>

        <button className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-white cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
          Try it free for 14 days
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-5 w-full max-w-5xl">
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-neutral-900 dark:text-white" />
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                Runs
              </p>
            </div>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              A run is a single workflow execution end-to-end. Runs never expire
              and any unused volume rolls forward into the next billing cycle,
              so you never lose capacity you paid for.
            </p>

            <div className="mt-5 inline-flex p-1 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 w-fit">
              {(["Monthly", "Annual", "One-time"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setRunCycle(c)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                    runCycle === c
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-6 relative">
              {runIdx === 2 && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] z-10">
                  Most popular
                </span>
              )}
              <div className="py-5 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-center">
                <p className="text-2xl font-semibold text-neutral-900 dark:text-white inline-flex items-center gap-2">
                  {formatNumber(runTier.runs)} <Sparkles className="h-5 w-5" />
                </p>
              </div>
              <div className="mt-5">
                <Slider
                  value={runIdx}
                  max={runTiers.length - 1}
                  onChange={setRunIdx}
                />
              </div>
            </div>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-3xl font-semibold text-neutral-900 dark:text-white">
                {runPrice === 0 ? "Free" : `$${runPrice}`}
              </span>
              {runPrice > 0 && (
                <>
                  <span className="text-sm text-neutral-400 line-through">
                    ${runOriginal}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">
                    {runSuffix}
                  </span>
                </>
              )}
              <span className="ml-auto px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-700 dark:text-neutral-300">
                20% volume discount
              </span>
            </div>

            <ul className="mt-5 space-y-2">
              {runFeatures.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                >
                  <Icon className="h-3.5 w-3.5 text-neutral-500" />
                  {text}
                </li>
              ))}
            </ul>

            <p className="mt-6 pt-4 border-t border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-500 text-center">
              Volume pricing kicks in automatically past 100k runs&mdash;no
              contracts or sales calls.
            </p>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-900 dark:text-white" />
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                Seats
              </p>
            </div>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Bring in your whole team without restructuring your plan. Seats
              are priced flat, scale smoothly, and can be added or removed at
              the end of any billing period.
            </p>

            <div className="mt-5 inline-flex p-1 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 w-fit">
              {(["Monthly", "Annual"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setSeatCycle(c)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                    seatCycle === c
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="py-5 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-center">
                <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {seatTier.seats} {seatTier.seats === 1 ? "seat" : "seats"}
                </p>
              </div>
              <div className="mt-5">
                <Slider
                  value={seatIdx}
                  max={seatTiers.length - 1}
                  onChange={setSeatIdx}
                />
              </div>
            </div>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-3xl font-semibold text-neutral-900 dark:text-white">
                {seatPrice === 0 ? "Free" : `$${seatPrice}`}
              </span>
              {seatPrice > 0 && (
                <>
                  <span className="text-sm text-neutral-400 line-through">
                    ${seatOriginal}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">
                    {seatSuffix}
                  </span>
                </>
              )}
            </div>

            <ul className="mt-5 space-y-2">
              {seatFeatures.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                >
                  <Icon className="h-3.5 w-3.5 text-neutral-500" />
                  {text}
                </li>
              ))}
            </ul>

            <p className="mt-6 pt-4 border-t border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-500 text-center">
              Annual plans include two free months and a dedicated onboarding
              specialist for teams of 25+.
            </p>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
