// Adapted from React Bits Pro how-it-works-8 (https://pro.reactbits.dev/docs/blocks/how-it-works/how-it-works-8).
// Changes: data-sync copy and visuals replaced by real Sources, clustered story and XDm; heading row moved
// above the visuals so the three headings and notes share one line; the stock aria-hidden on the visual
// container removed (only connectors stay hidden); neutral/white/black and mono swapped for semantic
// tokens and Open Sans; 1400px container replaced by the shared frame; lg breakpoints moved to desk.
"use client";

import { ArrowRight } from "lucide-react";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { frame } from "../shared/shell";
import { ArticleCard, XDm, XPost } from "../shared/sources";
import { evidence, hero, stages, stories } from "../content";
import { StoryCard } from "./story-card";
import { usePrefersReducedMotion } from "./reduced-motion";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const [, release, update] = stories[0].sources;

function SourcesVisual() {
  return (
    <div className="flex flex-col gap-2.5">
      <XPost compact className="p-3.5 shadow-[0_1px_2px_rgb(9_15_29/0.06)]" />
      <ArticleCard
        source={release}
        image={evidence.article.image}
        className="shadow-[0_1px_2px_rgb(9_15_29/0.06)] [&>img]:w-20 [&_h3+p]:line-clamp-1"
      />
      <ArticleCard source={update} className="shadow-[0_1px_2px_rgb(9_15_29/0.06)] [&_h3+p]:line-clamp-1" />
    </div>
  );
}

const steps = [
  { ...stages.sources, visual: SourcesVisual },
  {
    ...stages.engine,
    visual: () => <StoryCard story={stories[0]} photo="strip" className="h-full shadow-[0_1px_2px_rgb(9_15_29/0.06)]" />,
  },
  { ...stages.delivery, visual: () => <XDm className="h-full rounded-xl shadow-[0_1px_2px_rgb(9_15_29/0.06)]" /> },
];

export function Hero({ onSignup, onFeed }: { onSignup: () => void; onFeed: () => void }) {
  const reduce = usePrefersReducedMotion();
  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  return (
    <section id="product" aria-labelledby="d4-hero-heading" className="relative isolate overflow-hidden">
      {/* Static blue atmosphere inside the navy foundation; no animation. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(60%_70%_at_50%_0%,color-mix(in_oklab,var(--glow-2)_22%,transparent),transparent_70%)] dark:bg-[radial-gradient(60%_70%_at_50%_0%,color-mix(in_oklab,var(--glow-1)_45%,transparent),transparent_70%)]"
      />
      <div className={cn(frame, "pt-10 pb-14 desk:pt-12 desk:pb-20")}>
        <div className="mx-auto max-w-5xl text-center">
          <h1
            id="d4-hero-heading"
            className="text-[34px] font-semibold leading-[1.08] tracking-tight text-balance desk:text-[54px]"
          >
            {hero.headline}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty desk:text-lg">
            {hero.subhead}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={onSignup} className="h-11 px-6 text-[15px]">
              {hero.primary}
            </Button>
            <Button variant="outline" onClick={onFeed} className="h-11 gap-2 px-5 text-[15px]">
              {hero.secondary}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <motion.ol
          variants={container}
          initial={reduce ? false : "hidden"}
          animate={reduce ? "show" : undefined}
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="mt-9 grid list-none grid-cols-1 gap-y-12 desk:mt-12 desk:grid-cols-3 desk:grid-rows-[auto_auto_1fr] desk:gap-x-8 desk:gap-y-0"
        >
          {steps.map((step, index) => {
            const Visual = step.visual;
            const segment =
              index === 0 ? "left-5 -right-4" : index === steps.length - 1 ? "-left-4 right-0" : "-left-4 -right-4";
            return (
              <motion.li
                key={step.title}
                variants={item}
                className="grid grid-rows-[auto_auto_1fr] desk:row-span-3 desk:grid-rows-subgrid"
              >
                <div className="relative flex h-10 items-center max-desk:hidden">
                  <div
                    aria-hidden="true"
                    className={cn("absolute top-1/2 hidden h-px -translate-y-1/2 bg-border desk:block", segment)}
                  />
                  <motion.div
                    aria-hidden="true"
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={reduce ? { scaleX: 1 } : undefined}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: 0.35 + index * 0.4, ease: "linear" }}
                    className={cn(
                      "absolute top-1/2 hidden h-[2px] origin-left -translate-y-1/2 rounded-full bg-linear-to-r from-primary/70 to-primary desk:block",
                      segment,
                    )}
                  />
                  <span
                    aria-hidden="true"
                    className="relative z-10 flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-[6px] ring-background"
                  >
                    {index + 1}
                  </span>
                </div>
                <div className="mb-4 desk:mt-4">
                  <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
                    <span
                      aria-hidden="true"
                      className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground desk:hidden"
                    >
                      {index + 1}
                    </span>
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.title}
                  </h2>
                  <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{step.note}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/50 p-2.5 dark:bg-secondary/40">
                  <Visual />
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
        <p className="mt-6 text-center text-xs text-muted-foreground">{hero.sample}</p>
      </div>
    </section>
  );
}
