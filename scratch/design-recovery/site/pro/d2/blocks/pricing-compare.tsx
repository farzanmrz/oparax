"use client";

// Adapted from React Bits Pro pricing-15 (https://pro.reactbits.dev/docs/blocks/pricing). Changes: the three
// verified Oparax plans replace Core/Plus/Prime; removed the monthly/yearly switch, yearly prices, "Save 20%",
// the "Most popular" badge and featured column; watched X posts is the first, emphasized row; alert cadence
// in words; included features as check rows; the 300-post free week is a note; the section heading moved out to
// the host; neutral and black/white classes became semantic tokens; lg breakpoints became desk; rounded-full
// controls became the shared radius; the stock plan selector and its layout animation kept for phones.
import { useState } from "react";
import { Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { pricing } from "../../content";
import { pricingCopy } from "../content";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const columns = "grid grid-cols-[1.25fr_1fr_1fr_1fr]";
const plans = pricing.tiers;

function Included() {
  return (
    <span className="grid size-5 place-items-center rounded-full bg-primary">
      <Check className="size-3 text-primary-foreground" strokeWidth={3} aria-hidden="true" />
      <span className="sr-only">{pricingCopy.included}</span>
    </span>
  );
}

function Price({ plan }: { plan: (typeof plans)[number] }) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">{plan.price}</span>
      <span className="text-sm text-muted-foreground">{pricing.period}</span>
    </p>
  );
}

function Posts({ plan, large = false }: { plan: (typeof plans)[number]; large?: boolean }) {
  return (
    <span className={large ? "text-2xl font-semibold tracking-tight tabular-nums text-foreground" : "text-xl font-semibold tabular-nums text-foreground"}>
      {plan.posts}
    </span>
  );
}

export default function PricingCompare({ onSignup }: { onSignup: () => void }) {
  const [active, setActive] = useState(1);
  const reduceMotion = useReducedMotion();
  const activePlan = plans[active];

  return (
    <div>
      <div className="max-desk:hidden">
        <div className={columns}>
          <div aria-hidden="true" />
          {plans.map((plan) => (
            <div key={plan.name} className="px-5 pb-6 pt-2">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{plan.name}</h3>
              <div className="mt-2">
                <Price plan={plan} />
              </div>
              <Button onClick={onSignup} variant="outline" className="mt-5 h-10 w-full text-sm">
                {pricingCopy.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className={`${columns} rounded-[calc(var(--radius)+4px)] border border-primary/30 bg-accent/60`}>
          <div className="flex items-center px-5 py-5 text-[15px] font-semibold text-foreground">{pricingCopy.rows.posts}</div>
          {plans.map((plan) => (
            <div key={plan.name} className="flex items-center px-5 py-5">
              <Posts plan={plan} large />
            </div>
          ))}
        </div>

        <div className={`${columns} border-b border-border`}>
          <div className="px-5 py-4 text-sm text-muted-foreground">{pricingCopy.rows.alerts}</div>
          {pricingCopy.alertShort.map((value, index) => (
            <div key={plans[index].name} className="flex items-center px-5 py-4 text-sm text-foreground">
              {value}
            </div>
          ))}
        </div>
        {pricing.included.map((label) => (
          <div key={label} className={`${columns} border-b border-border`}>
            <div className="px-5 py-4 text-sm text-muted-foreground">{label}</div>
            {plans.map((plan) => (
              <div key={plan.name} className="flex items-center px-5 py-4">
                <Included />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="desk:hidden">
        <div role="group" aria-label={pricingCopy.selectLabel} className="grid grid-cols-3 rounded-lg border border-border bg-secondary p-1">
          {plans.map((plan, index) => (
            <button
              key={plan.name}
              type="button"
              aria-pressed={active === index}
              onClick={() => setActive(index)}
              className={`relative min-h-11 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                active === index ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {active === index && (
                <motion.span
                  layoutId="d2-pricing-tab"
                  transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE }}
                  className="absolute inset-0 rounded-md bg-primary"
                />
              )}
              <span className="relative z-10">{plan.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activePlan.name}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, ease: EASE }}
            >
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{activePlan.name}</h3>
              <div className="mt-1">
                <Price plan={activePlan} />
              </div>
              <div className="mt-4 rounded-lg border border-primary/30 bg-accent/60 px-4 py-3">
                <Posts plan={activePlan} large />
                <p className="text-sm text-muted-foreground">{pricing.postsLabel}</p>
              </div>
              <div className="mt-2 divide-y divide-border">
                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm text-muted-foreground">{pricingCopy.rows.alerts}</span>
                  <span className="text-right text-sm text-foreground">{pricingCopy.alertShort[active]}</span>
                </div>
                {pricing.included.map((label) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <Included />
                  </div>
                ))}
              </div>
              <Button onClick={onSignup} className="mt-4 h-11 w-full text-sm">
                {pricingCopy.cta}
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground desk:px-5">{pricing.note}</p>
    </div>
  );
}
