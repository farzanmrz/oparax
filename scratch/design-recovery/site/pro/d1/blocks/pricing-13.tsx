// Adapted from React Bits Pro pricing-13 (https://pro.reactbits.dev/docs/blocks/pricing). Changes: seat-based Starter/Growth/Scale data replaced by the verified Hobby, Creator and Wire plans; every option shows its watched X posts, and the detail panel leads with that allowance before the price; "Recommended" badge, per-seat wording, trial copy and the seats/support/uptime grid removed; Wire's 15-minute cadence stated in words; neutral, black and white colors swapped for semantic tokens and the shared Button; vendor container and heading size replaced by the shared frame and section scale; in-view mount reveal removed; lg breakpoints moved to desk.
"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { frame } from "../../shared/shell";
import { pricing } from "../../content";
import { pricingCopy } from "../content";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Pricing13({ onSignup }: { onSignup: () => void }) {
  const [active, setActive] = useState(1);
  const reduceMotion = useReducedMotion();
  const plan = pricing.tiers[active];

  return (
    <section
      id="pricing"
      aria-labelledby="d1-pricing-title"
      className="w-full border-t border-border bg-secondary/40 py-16 desk:py-20"
    >
      <div className={frame}>
        <div className="max-w-2xl">
          <h2 id="d1-pricing-title" className="text-3xl font-semibold tracking-tight text-balance desk:text-4xl">
            {pricing.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground desk:text-lg">{pricing.intro}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 items-start gap-8 desk:mt-12 desk:grid-cols-[1fr_1.05fr] desk:gap-12">
          <div>
            <div className="space-y-3" role="group" aria-label={pricingCopy.selectLabel}>
              {pricing.tiers.map((option, index) => {
                const selected = active === index;
                return (
                  <button
                    key={option.name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActive(index)}
                    className={cn(
                      "relative w-full cursor-pointer rounded-xl border p-5 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      selected ? "border-transparent" : "border-border bg-card/60 hover:border-primary/40",
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId="d1-pricing13-selected"
                        transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE }}
                        className="absolute -inset-px rounded-xl bg-card ring-2 ring-primary ring-inset"
                      />
                    )}
                    <span className="relative z-10 flex items-start gap-4">
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200",
                          selected ? "border-primary" : "border-muted-foreground/50",
                        )}
                      >
                        <motion.span
                          initial={false}
                          animate={{ scale: selected ? 1 : 0.4, opacity: selected ? 1 : 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE }}
                          className="size-2.5 rounded-full bg-primary"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold text-foreground">{option.name}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{option.posts}</span> {pricing.postsLabel}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                          {option.price}
                        </span>
                        <span className="block text-xs text-muted-foreground">{pricing.period}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{pricing.note}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[0_1px_2px_rgb(9_15_29/0.06),0_16px_40px_-20px_rgb(9_15_29/0.3)] desk:p-9">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: EASE }}
                aria-live="polite"
              >
                <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>
                <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-5xl font-semibold tracking-tight tabular-nums text-primary desk:text-6xl">
                    {plan.posts}
                  </span>
                  <span className="text-base text-muted-foreground">{pricing.postsLabel}</span>
                </p>
                <p className="mt-3 text-base">
                  <span className="text-xl font-semibold tabular-nums">{plan.price}</span>{" "}
                  <span className="text-muted-foreground">{pricing.period}</span>
                </p>

                <dl className="mt-7 border-y border-border py-4">
                  <dt className="text-xs text-muted-foreground">{pricingCopy.cadenceLabel}</dt>
                  <dd className="mt-1 text-sm font-semibold">{plan.cadence}</dd>
                </dl>

                <p className="mt-7 text-sm font-semibold">{pricingCopy.includedLabel}</p>
                <ul className="mt-3 space-y-2.5">
                  {pricing.included.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/90">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button onClick={onSignup} className="mt-8 h-11 w-full text-sm">
                  {pricingCopy.cta}
                </Button>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
