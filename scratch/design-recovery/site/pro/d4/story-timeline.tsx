// Adapted from React Bits Pro how-it-works-6 (https://pro.reactbits.dev/docs/blocks/how-it-works/how-it-works-6).
// Changes: four alternating image cards replaced by a two-column ledger (report arrives | your story) so a
// later report visibly updates one story; orange reached state recolored to the blue primary; the perpetual
// reached-node pulse replaced by a single ring that plays once; node positions measured instead of assumed
// evenly spaced; the every-frame requestAnimationFrame loop replaced by scroll and resize listeners;
// reduced motion shows every step reached with the full line; uppercase eyebrow and vendor sizes removed;
// neutral colors swapped for semantic tokens; md breakpoints moved to desk.
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "motion/react";
import { ArrowRight, ImagePlus, Newspaper, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { frame } from "../shared/shell";
import { OparaxMark, XLogo } from "../shared/brand";
import { ArticleCard, XPost } from "../shared/sources";
import { evidence } from "../content";
import { europa, scrollStory } from "./content";
import { StoryCard } from "./story-card";
import { reveal, usePrefersReducedMotion } from "./reduced-motion";

const [, release, update] = europa.sources;

const reports: ReactNode[] = [
  <XPost key="post" />,
  <ArticleCard key="release" source={release} image={evidence.article.image} />,
  <ArticleCard key="update" source={update} />,
];
const icons: ReactNode[] = [
  <XLogo key="x" className="size-4" />,
  <Newspaper key="n" className="size-[18px]" aria-hidden="true" />,
  <RefreshCw key="r" className="size-[18px]" aria-hidden="true" />,
  <OparaxMark key="o" className="size-6" />,
];

function Node({
  progress,
  at,
  reduce,
  children,
}: {
  progress: MotionValue<number>;
  at: number;
  reduce: boolean;
  children: ReactNode;
}) {
  const scale = useTransform(progress, [Math.max(0, at - 0.15), at], [0.82, 1]);
  const reached = useReached(progress, at, reduce);

  return (
    <div aria-hidden="true" className="relative grid size-12 place-items-center">
      <span className="absolute size-14 rounded-full bg-background" />
      {reached && !reduce && (
        <motion.span
          className="absolute size-11 rounded-full bg-primary"
          initial={{ scale: 1, opacity: 0.45 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      )}
      <motion.span
        style={reduce ? undefined : { scale }}
        className={cn(
          "relative grid size-11 place-items-center rounded-full border transition-colors duration-300",
          reached
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground",
        )}
      >
        {children}
      </motion.span>
    </div>
  );
}

function useReached(progress: MotionValue<number>, at: number, reduce: boolean) {
  const [reached, setReached] = useState(reduce);
  useMotionValueEvent(progress, "change", (value) => setReached(reduce || (value > 0 && value >= at - 0.001)));
  // Node positions are measured after mount, so re-check when this node's position changes.
  useEffect(() => setReached(reduce || (progress.get() > 0 && progress.get() >= at - 0.001)), [at, progress, reduce]);
  return reached;
}

function ChangeCard({
  index,
  progress,
  at,
  reduce,
}: {
  index: number;
  progress: MotionValue<number>;
  at: number;
  reduce: boolean;
}) {
  const step = scrollStory.steps[index];
  const reached = useReached(progress, at, reduce);
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-[border-color,box-shadow] duration-500",
        reached
          ? "border-primary/60 shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_14%,transparent)]"
          : "border-border",
      )}
    >
      {index === 0 && <p className="text-[17px] font-semibold leading-snug tracking-tight">{europa.title}</p>}
      <ul className={cn("flex flex-col gap-2", index === 0 && "mt-2.5")}>
        {step.facts.map((fact) => (
          <li key={fact} className="flex gap-2.5 text-sm leading-snug">
            <span
              aria-hidden="true"
              className="mt-[2px] grid size-4 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold leading-none text-primary-foreground"
            >
              +
            </span>
            <span>{fact}</span>
          </li>
        ))}
      </ul>
      {step.tag && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-secondary/70 p-2">
          <img src={europa.image} alt="" className="h-12 w-18 shrink-0 rounded-md object-cover" />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ImagePlus className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {step.tag}. Credit {europa.imageCredit}.
          </p>
        </div>
      )}
    </div>
  );
}

export function StoryTimeline({ onFeed }: { onFeed: () => void }) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progress = useMotionValue(reduce ? 1 : 0);
  const [bounds, setBounds] = useState({ top: 0, height: 0, ats: [0, 0.33, 0.66, 1] });

  useEffect(() => {
    if (reduce) progress.set(1);
    let frameId = 0;
    const measure = () => {
      frameId = 0;
      const container = ref.current;
      const nodes = nodeRefs.current.filter((node): node is HTMLDivElement => Boolean(node));
      if (!container || nodes.length < 2) return;
      const centers = nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return rect.top + rect.height / 2;
      });
      const first = centers[0];
      const span = centers[centers.length - 1] - first;
      if (span <= 0) return;
      if (!reduce) progress.set(Math.min(1, Math.max(0, (window.innerHeight * 0.55 - first) / span)));
      const top = first - container.getBoundingClientRect().top;
      const ats = centers.map((center) => (center - first) / span);
      setBounds((prev) =>
        prev.top === top && prev.height === span && prev.ats.every((value, i) => value === ats[i])
          ? prev
          : { top, height: span, ats },
      );
    };
    const schedule = () => {
      if (!frameId) frameId = requestAnimationFrame(measure);
    };
    schedule();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frameId);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, [progress, reduce]);

  const lineScale = useTransform(progress, [0, 1], [0, 1]);
  const finaleAt = bounds.ats[3] ?? 1;
  const nodeCol = "col-start-1 row-span-2 desk:col-start-2 desk:row-span-2";

  return (
    <section id={scrollStory.id} aria-labelledby="d4-updates-heading" className="border-t border-border bg-secondary/35 dark:bg-[color-mix(in_oklab,var(--secondary)_45%,var(--background))]">
      <div className={cn(frame, "py-16 desk:py-24")}>
        <header className="mx-auto max-w-2xl text-center">
          <h2 id="d4-updates-heading" className="text-3xl font-semibold tracking-tight text-balance desk:text-[40px] desk:leading-[1.1]">
            {scrollStory.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">{scrollStory.intro}</p>
          <p className="mt-2 text-xs text-muted-foreground">{scrollStory.sample}</p>
        </header>

        <div className="mt-12 hidden grid-cols-[1fr_3rem_1fr] gap-x-10 text-sm font-semibold text-muted-foreground desk:grid">
          <p className="text-right">{scrollStory.reportColumn}</p>
          <span />
          <p>{scrollStory.storyColumn}</p>
        </div>

        <div ref={ref} className="relative mx-auto mt-6 max-w-[1180px] desk:mt-4">
          <div
            aria-hidden="true"
            style={{ top: bounds.top, height: bounds.height }}
            className="absolute left-6 w-px -translate-x-1/2 border-l border-dashed border-border desk:left-1/2"
          />
          <motion.div
            aria-hidden="true"
            style={{ top: bounds.top, height: bounds.height, scaleY: lineScale, transformOrigin: "top" }}
            className="absolute left-6 w-[2px] -translate-x-1/2 rounded-full bg-linear-to-b from-primary/60 to-primary desk:left-1/2"
          />

          <ol className="flex list-none flex-col gap-14 desk:gap-20">
            {scrollStory.steps.map((step, index) => (
              <li
                key={step.id}
                className="grid grid-cols-[3rem_1fr] gap-x-4 gap-y-3 desk:grid-cols-[1fr_3rem_1fr] desk:gap-x-10"
              >
                <div ref={(node) => { nodeRefs.current[index] = node; }} className={cn(nodeCol, "relative z-10 self-start")}>
                  <Node progress={progress} at={bounds.ats[index] ?? 0} reduce={reduce}>
                    {icons[index]}
                  </Node>
                </div>
                <motion.div
                  {...reveal(reduce)}
                  className="col-start-2 desk:col-start-1 desk:row-start-1 desk:flex desk:flex-col desk:items-end"
                >
                  <h3 className="flex min-h-12 items-center text-base font-semibold desk:justify-end">{step.label}</h3>
                  <div className="mt-2 w-full max-w-[480px]">{reports[index]}</div>
                </motion.div>
                <motion.div
                  {...reveal(reduce, 0.08)}
                  className="col-start-2 desk:col-start-3 desk:row-start-1"
                >
                  <p className="flex min-h-12 items-center gap-2 text-sm font-semibold text-primary max-desk:min-h-0">
                    {step.change}
                  </p>
                  <div className="mt-2 max-w-[480px]">
                    <ChangeCard index={index} progress={progress} at={bounds.ats[index] ?? 0} reduce={reduce} />
                  </div>
                </motion.div>
              </li>
            ))}

            <li className="grid grid-cols-[3rem_1fr] gap-x-4 gap-y-4 desk:grid-cols-1 desk:justify-items-center">
              <div ref={(node) => { nodeRefs.current[3] = node; }} className="relative z-10 row-span-2 desk:row-span-1">
                <Node progress={progress} at={finaleAt} reduce={reduce}>
                  {icons[3]}
                </Node>
              </div>
              <div className="flex w-full max-w-[560px] flex-col gap-4 desk:items-center">
                <h3 className="flex min-h-12 items-center text-base font-semibold desk:min-h-0">{scrollStory.finale}</h3>
                <StoryCard story={europa} markAdded headingLevel={4} className="w-full shadow-[0_12px_32px_-16px_rgb(9_15_29/0.35)]" />
                <Button variant="outline" onClick={onFeed} className="h-11 gap-2 self-start px-5 desk:self-center">
                  {scrollStory.finaleAction}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
