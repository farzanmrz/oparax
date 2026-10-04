// Adapted from React Bits Pro pricing-6 (https://pro.reactbits.dev/docs/blocks/pricing/pricing-6). Changes: monthly/annual toggle, annual prices, "Most Popular" badge, raised middle card and purple removed; the three verified plans (Hobby, Creator, Wire) now lead with watched X posts as the large figure, then price and alert cadence in words; per-card feature lists replaced by one shared "Every plan includes" row; free week as a note; heading demoted below the hero; buttons use the shadcn Button and open sign-up; neutral colors swapped for semantic tokens; mount stagger removed so the cards are static (the page's one motion moment is the hero wire).
"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { frame } from "../../shared/shell";
import { pricing } from "../../content";
import { SectionHeading } from "../modes";
import { pricingCopy } from "../content";
import { tile } from "../story-parts";

export function Pricing6({ onSignup }: { onSignup: () => void }) {
  return (
    <section id="pricing" aria-labelledby="d3-pricing" className="relative overflow-hidden py-16 desk:py-24">
      <div className={frame}>
        <SectionHeading id="d3-pricing" title={pricing.title} intro={pricing.intro} />

        <div className="mt-10 grid w-full gap-5 min-[900px]:grid-cols-3">
          {pricing.tiers.map((plan, index) => (
            <article
              key={plan.name}
              aria-labelledby={`d3-plan-${plan.name}`}
              className={cn(tile, "relative flex flex-col overflow-hidden p-6")}
            >
              {/* Glow grows with the allowance, so the larger plans read as more of X, not as "better". */}
              <div
                aria-hidden="true"
                style={{ opacity: 0.35 + index * 0.25 }}
                className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-primary/18 to-transparent"
              />
              <h3 id={`d3-plan-${plan.name}`} className="relative text-lg font-semibold text-muted-foreground">
                {plan.name}
              </h3>
              <p className="relative mt-4 flex flex-col">
                <span className="text-5xl font-semibold tracking-tight tabular-nums">{plan.posts}</span>
                <span className="mt-1 text-sm font-medium">{pricing.postsLabel}</span>
              </p>
              <div className="relative mt-5 border-t border-border pt-4">
                <p className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{pricing.period}</span>
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">{plan.cadence}</p>
              </div>
              <Button onClick={onSignup} className="relative mt-6 h-11 w-full text-sm">
                {pricingCopy.cta}
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 text-sm">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <p className="font-semibold">{pricingCopy.includedTitle}:</p>
          <ul aria-label={pricingCopy.includedTitle} className="contents">
            {pricing.included.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="grid size-4.5 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
          </div>
          <p className="text-center text-muted-foreground">{pricing.note}</p>
        </div>
      </div>
    </section>
  );
}

export default Pricing6;
