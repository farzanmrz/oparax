"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const plans = [
  {
    name: "Core",
    monthly: 15,
    yearly: 12,
    description: "Track spend across a single entity",
    cta: "Start with Core",
    featured: false,
  },
  {
    name: "Plus",
    monthly: 39,
    yearly: 31,
    description: "Approvals and controls for teams",
    cta: "Start with Plus",
    featured: true,
  },
  {
    name: "Prime",
    monthly: 79,
    yearly: 63,
    description: "Governance for multi-entity orgs",
    cta: "Talk to sales",
    featured: false,
  },
];

const groups = [
  {
    title: "Workspace",
    rows: [
      { label: "Members", values: ["3", "25", "Unlimited"] },
      { label: "Virtual cards", values: ["5", "Unlimited", "Unlimited"] },
      { label: "Receipt history", values: ["30 days", "1 year", "Unlimited"] },
      { label: "Guest access", values: [false, true, true] },
    ],
  },
  {
    title: "Controls",
    rows: [
      { label: "Approval flows", values: [false, true, true] },
      { label: "SAML SSO", values: [false, false, true] },
      { label: "Audit log export", values: [false, false, true] },
      { label: "Support", values: ["Email", "Business hours", "24/7 + CSM"] },
    ],
  },
];

const columns = "grid grid-cols-[1.3fr_1fr_1fr_1fr]";
const tint = "bg-neutral-50 dark:bg-neutral-900";

function ValueCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-neutral-900 dark:bg-white">
        <Check
          className="h-3 w-3 text-white dark:text-neutral-900"
          aria-hidden="true"
        />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span>
        <Minus
          className="h-4 w-4 text-neutral-300 dark:text-neutral-700"
          aria-hidden="true"
        />
        <span className="sr-only">Not included</span>
      </span>
    );
  }
  return (
    <span className="text-sm text-neutral-700 dark:text-neutral-300">
      {value}
    </span>
  );
}

export default function Pricing15() {
  const [yearly, setYearly] = useState(true);
  const [active, setActive] = useState(1);
  const reduceMotion = useReducedMotion();
  const activePlan = plans[active];
  const shift = reduceMotion ? 0 : 14;

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  const primaryCta =
    "w-full cursor-pointer rounded-full bg-black dark:bg-white px-6 py-3 text-sm font-medium text-white dark:text-black transition-colors duration-200 hover:bg-neutral-800 dark:hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950";
  const secondaryCta =
    "w-full cursor-pointer rounded-full border border-neutral-300 dark:border-neutral-700 px-6 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 transition-colors duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950";

  const renderPrice = (plan: (typeof plans)[number]) => (
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-medium text-neutral-500 dark:text-neutral-400">
        $
      </span>
      <span className="relative inline-grid overflow-hidden">
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 text-4xl font-semibold tracking-tight tabular-nums"
        >
          {yearly ? plan.yearly : plan.monthly}
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`${plan.name}-${yearly}`}
            initial={{ opacity: 0, y: shift }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -shift }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: EASE }}
            className="col-start-1 row-start-1 text-4xl font-semibold tracking-tight tabular-nums text-neutral-900 dark:text-white"
          >
            {yearly ? plan.yearly : plan.monthly}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-sm text-neutral-500 dark:text-neutral-400">
        /mo
      </span>
    </div>
  );

  return (
    <section className="w-full bg-white dark:bg-neutral-950 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={container}
        className="max-w-[1400px] mx-auto w-full"
      >
        <motion.div variants={item} className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
            Compare plans
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-neutral-900 dark:text-white">
            Spend management that scales with you.
          </h2>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
            Start on Core, move up when approvals and governance start to
            matter. Every price is per seat, per month: yearly billing saves
            20%.
          </p>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <span
            className={`text-sm font-medium transition-colors duration-200 ${
              yearly
                ? "text-neutral-500 dark:text-neutral-400"
                : "text-neutral-900 dark:text-white"
            }`}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label="Bill yearly"
            onClick={() => setYearly((value) => !value)}
            className={`relative h-7 w-12 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 ${
              yearly
                ? "bg-neutral-900 dark:bg-white"
                : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          >
            <motion.span
              initial={false}
              animate={{ x: yearly ? 20 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, ease: EASE }}
              className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white dark:bg-neutral-950 shadow-sm"
            />
          </button>
          <span
            className={`text-sm font-medium transition-colors duration-200 ${
              yearly
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            Yearly
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Save 20%
          </span>
        </motion.div>

        <motion.div variants={item} className="mt-12">
          <div className="hidden lg:block mx-auto max-w-5xl">
            <div className={columns}>
              <div className="flex items-end px-6 pb-8">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Per seat, per month
                </p>
              </div>
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`px-6 pt-6 pb-8 ${plan.featured ? `rounded-t-2xl ${tint}` : ""}`}
                >
                  <div className="h-6">
                    {plan.featured && (
                      <span className="inline-flex rounded-full bg-neutral-900 dark:bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider leading-none text-white dark:text-neutral-900">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                    {plan.name}
                  </p>
                  <p className="mt-1 min-h-10 text-sm leading-snug text-neutral-600 dark:text-neutral-400">
                    {plan.description}
                  </p>
                  <div className="mt-5">{renderPrice(plan)}</div>
                  <div className="mt-6">
                    <button
                      className={plan.featured ? primaryCta : secondaryCta}
                    >
                      {plan.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {groups.map((group) => (
              <div key={group.title}>
                <div className={columns}>
                  <div className="px-6 pt-10 pb-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                      {group.title}
                    </p>
                  </div>
                  {plans.map((plan) => (
                    <div
                      key={plan.name}
                      className={plan.featured ? tint : ""}
                    />
                  ))}
                </div>
                {group.rows.map((row) => (
                  <div
                    key={row.label}
                    className={`${columns} border-t border-neutral-200 dark:border-neutral-800`}
                  >
                    <div className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                      {row.label}
                    </div>
                    {row.values.map((value, index) => (
                      <div
                        key={plans[index].name}
                        className={`flex items-center px-6 py-4 ${plans[index].featured ? tint : ""}`}
                      >
                        <ValueCell value={value} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            <div
              className={`${columns} border-t border-neutral-200 dark:border-neutral-800`}
            >
              <div />
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`h-6 ${plan.featured ? `rounded-b-2xl ${tint}` : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="lg:hidden mx-auto max-w-lg">
            <div
              role="group"
              aria-label="Select a plan to compare"
              className="grid grid-cols-3 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-1"
            >
              {plans.map((plan, index) => (
                <button
                  key={plan.name}
                  type="button"
                  aria-pressed={active === index}
                  onClick={() => setActive(index)}
                  className={`relative cursor-pointer rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-100 dark:focus-visible:ring-offset-neutral-900 ${
                    active === index
                      ? "text-white dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {active === index && (
                    <motion.span
                      layoutId="pricing15-tab"
                      transition={{
                        duration: reduceMotion ? 0 : 0.3,
                        ease: EASE,
                      }}
                      className="absolute inset-0 rounded-full bg-neutral-900 dark:bg-white"
                    />
                  )}
                  <span className="relative z-10">{plan.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activePlan.name}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
                  transition={{ duration: reduceMotion ? 0 : 0.25, ease: EASE }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                      {activePlan.name}
                    </p>
                    {activePlan.featured && (
                      <span className="rounded-full bg-neutral-900 dark:bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider leading-none text-white dark:text-neutral-900">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {activePlan.description}
                  </p>
                  <div className="mt-5">{renderPrice(activePlan)}</div>
                  <div className="mt-6">
                    <button
                      className={
                        activePlan.featured ? primaryCta : secondaryCta
                      }
                    >
                      {activePlan.cta}
                    </button>
                  </div>

                  {groups.map((group) => (
                    <div key={group.title} className="mt-7">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                        {group.title}
                      </p>
                      <div className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {group.rows.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between gap-4 py-3"
                          >
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              {row.label}
                            </span>
                            <ValueCell value={row.values[active]} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <motion.p
          variants={item}
          className="mt-10 text-center text-sm text-neutral-500 dark:text-neutral-400"
        >
          All plans include bank-grade encryption, two-factor authentication,
          and unlimited receipt scanning.
        </motion.p>
      </motion.div>
    </section>
  );
}
