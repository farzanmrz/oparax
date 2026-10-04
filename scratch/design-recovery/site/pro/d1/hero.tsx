"use client";

// Hero: centered promise, then Sources -> Oparax -> Delivery on one heading line. A subgrid shares
// the heading, note and content rows across the three stages so they stay aligned at any width.
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { frame } from "../shared/shell";
import { ArticleCard, XDm, XPost } from "../shared/sources";
import { evidence, hero, stages, stories } from "../content";
import type { DirectionProps } from "../types";
import { TransformStage } from "./transform-stage";

const [, articleSource, followupSource] = stories[0].sources;

function Stage({
  title,
  note,
  children,
  arrow,
  className,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative grid gap-y-1 lg:row-span-3 lg:grid-rows-subgrid", className)}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{note}</p>
      <div className="relative mt-4">
        {arrow && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 -left-[26px] z-10 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-background text-primary shadow-[0_1px_2px_rgb(9_15_29/0.1)] max-lg:hidden"
          >
            <ArrowRight className="size-3.5" />
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

export function Hero({ onSignup, onFeed }: Pick<DirectionProps, "onSignup" | "onFeed">) {
  return (
    <section id="product" className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(55%_60%_at_50%_0%,color-mix(in_oklab,var(--glow-2)_20%,transparent),transparent_70%),radial-gradient(35%_40%_at_50%_55%,color-mix(in_oklab,var(--glow-1)_10%,transparent),transparent_70%)]"
      />
      <div className={cn(frame, "pt-10 pb-14 desk:pt-12")}>
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance desk:text-[3.5rem] desk:leading-[1.08]">
            {hero.headline}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground desk:text-lg">
            {hero.subhead}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button onClick={onSignup} className="h-11 px-5 text-sm">
              {hero.primary}
            </Button>
            <Button variant="outline" onClick={onFeed} className="h-11 gap-2 px-5 text-sm">
              {hero.secondary}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-11 grid max-w-[640px] gap-y-10 lg:max-w-none lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-[52px]">
          <Stage title={stages.sources.title} note={stages.sources.note}>
            <div className="flex flex-col gap-3">
              <XPost />
              <ArticleCard source={articleSource} image={evidence.article.image} />
              <ArticleCard source={followupSource} />
            </div>
          </Stage>
          <Stage title={stages.engine.title} note={stages.engine.note} arrow>
            <TransformStage className="h-full min-h-[400px]" />
          </Stage>
          <Stage title={stages.delivery.title} note={stages.delivery.note} arrow>
            <XDm onOpen={onFeed} className="shadow-[0_1px_2px_rgb(9_15_29/0.06),0_12px_32px_-12px_rgb(9_15_29/0.25)]" />
          </Stage>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">{hero.sample}</p>
      </div>
    </section>
  );
}
