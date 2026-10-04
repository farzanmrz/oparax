// Custom composition with the stock shadcn Slider. React Bits Pro pricing-10
// (https://pro.reactbits.dev/docs/blocks/pricing/pricing-10) is layout reference only: its slider-sets-the-plan
// idea is kept, while its runs/seats tiers, billing cycles, 1.25x strike prices and badges are not used.
// The slider is proportional (100 to 4,000) and snaps to the three verified plans.
"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { frame } from "../shared/shell";
import { pricing } from "../content";
import { pricingCopy } from "./content";

const stops = pricing.tiers.map((tier) => tier.postsValue);
const min = stops[0];
const max = stops[stops.length - 1];
const pct = (value: number) => ((value - min) / (max - min)) * 100;
const nearest = (value: number) =>
  stops.reduce((best, stop, index) => (Math.abs(stop - value) < Math.abs(stops[best] - value) ? index : best), 0);

export function Pricing({ onSignup }: { onSignup: () => void }) {
  const [value, setValue] = useState(stops[1]);
  const selected = nearest(value);
  const tier = pricing.tiers[selected];
  const sliderRef = useRef<HTMLSpanElement>(null);

  // The stock Slider exposes no thumb props, so name the thumb and speak the plan, not a raw number.
  useEffect(() => {
    const thumb = sliderRef.current?.querySelector('[role="slider"]');
    thumb?.setAttribute("aria-label", pricingCopy.sliderLabel);
    thumb?.setAttribute("aria-valuetext", `${tier.posts} watched X posts a month, ${tier.name}, ${tier.price} ${pricing.period}`);
  }, [tier]);

  const step = (direction: 1 | -1) =>
    setValue(stops[Math.min(stops.length - 1, Math.max(0, selected + direction))]);

  // Arrow and page keys move between plans; Home and End reach the ends.
  function onKeyDown(event: KeyboardEvent) {
    const keys: Record<string, () => void> = {
      ArrowRight: () => step(1),
      ArrowUp: () => step(1),
      PageUp: () => step(1),
      ArrowLeft: () => step(-1),
      ArrowDown: () => step(-1),
      PageDown: () => step(-1),
      Home: () => setValue(min),
      End: () => setValue(max),
    };
    if (!keys[event.key]) return;
    event.preventDefault();
    keys[event.key]();
  }

  return (
    <section id="pricing" aria-labelledby="d4-pricing-heading" className="border-t border-border bg-secondary/35 dark:bg-[color-mix(in_oklab,var(--secondary)_45%,var(--background))]">
      <div className={cn(frame, "py-16 desk:py-24")}>
        <header className="mx-auto max-w-2xl text-center">
          <h2 id="d4-pricing-heading" className="text-3xl font-semibold tracking-tight desk:text-[40px] desk:leading-[1.1]">
            {pricing.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">{pricing.intro}</p>
        </header>

        <div className="mx-auto mt-12 max-w-[1180px]">
          <div className="rounded-2xl border border-border bg-card px-5 pt-5 pb-8 shadow-[0_1px_2px_rgb(9_15_29/0.05)] desk:px-8 desk:pt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p id="d4-slider-question" className="text-base font-semibold">
                {pricingCopy.question}
              </p>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                <span className="text-lg font-semibold text-foreground tabular-nums">{tier.posts}</span> {pricing.postsLabel},{" "}
                <span className="font-semibold text-primary">{tier.name}</span>
              </p>
            </div>
            <div className="relative mt-6">
              <Slider
                ref={sliderRef}
                min={min}
                max={max}
                step={1}
                value={[value]}
                onValueChange={([next]) => setValue(next)}
                onValueCommit={([next]) => setValue(stops[nearest(next)])}
                onKeyDown={onKeyDown}
                aria-labelledby="d4-slider-question"
                className="py-3 [&_[data-slot=slider-range]]:bg-linear-to-r [&_[data-slot=slider-range]]:from-primary/60 [&_[data-slot=slider-range]]:to-primary [&_[data-slot=slider-thumb]]:size-6 [&_[data-slot=slider-thumb]]:rounded-full [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-primary [&_[data-slot=slider-thumb]]:shadow-[0_2px_8px_rgb(9_15_29/0.25)] [&_[data-slot=slider-thumb]]:after:-inset-2.5 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-border"
              />
              <div aria-hidden="true" className="relative mt-1 h-10">
                {pricing.tiers.map((item, index) => {
                  // Radix keeps the 24px thumb inside the track, so its center sits half a thumb in from each end.
                  const left = pct(item.postsValue);
                  return (
                    <span
                      key={item.name}
                      style={{ left: `calc(${left}% + ${(0.5 - left / 100) * 24}px)` }}
                      className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-0.5 text-xs whitespace-nowrap"
                    >
                      <span className={cn("h-2 w-px", index === selected ? "bg-primary" : "bg-border")} />
                      <span className={cn("tabular-nums", index === selected ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {item.posts}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div role="group" aria-label={pricingCopy.plansLabel} className="mt-4 grid gap-4 desk:grid-cols-3">
            {pricing.tiers.map((item, index) => {
              const active = index === selected;
              return (
                <button
                  key={item.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setValue(item.postsValue)}
                  className={cn(
                    "relative flex flex-col rounded-2xl border p-5 text-left transition-[border-color,background-color,box-shadow] duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 desk:p-6",
                    active
                      ? "border-primary bg-accent/50 shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_16%,transparent)] dark:bg-accent/40"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-base font-semibold">{item.name}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-6 place-items-center rounded-full border transition-colors",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {active && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </span>
                  <span className="mt-3 text-[32px] font-semibold leading-none tracking-tight tabular-nums desk:mt-5 desk:text-[40px]">{item.posts}</span>
                  <span className="mt-1.5 text-sm text-muted-foreground">{pricing.postsLabel}</span>
                  <span className="mt-3 border-t border-border pt-3 text-base desk:mt-5 desk:pt-4">
                    <span className="text-2xl font-semibold">{item.price}</span>{" "}
                    <span className="text-muted-foreground">{pricing.period}</span>
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-sm">
                    <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    {item.cadence}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-center gap-5 text-center">
            <Button onClick={onSignup} className="h-11 min-w-56 px-6 text-[15px]">
              {pricingCopy.choose(tier.name)}
            </Button>
            <div>
              <p className="text-sm font-semibold">{pricingCopy.includedTitle}</p>
              <ul className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {pricing.included.map((line) => (
                  <li key={line} className="flex items-center gap-1.5">
                    <Check className="size-4 text-primary" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">{pricing.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
