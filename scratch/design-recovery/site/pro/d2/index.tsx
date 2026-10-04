"use client";

// Direction 2, Workspace: the landing page shows the product itself. The hero is an Oparax app window whose
// three panes are the three stages; the feed is the same workspace as a list and reading pane.
import { Button } from "@/components/ui/button";
import { FeedHeading } from "../shared/feed-heading";
import { frame } from "../shared/shell";
import { feed, hero, pricing } from "../content";
import type { DirectionProps } from "../types";
import { setup } from "./content";
import { Roadmap } from "./roadmap";
import WorkspaceWindow from "./blocks/workspace-window";
import SetupLog from "./blocks/setup-log";
import PricingCompare from "./blocks/pricing-compare";
import FeedReader from "./blocks/feed-reader";

function Landing({ onSignup, onFeed }: DirectionProps) {
  return (
    <>
      <section id="product" className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[180px] h-[720px] bg-[radial-gradient(55%_50%_at_50%_45%,color-mix(in_oklab,var(--glow-2)_26%,transparent),transparent_70%)] dark:bg-[radial-gradient(55%_50%_at_50%_45%,color-mix(in_oklab,var(--glow-2)_34%,transparent),transparent_70%)]"
        />
        <div className={frame + " relative pb-16 pt-10 text-center desk:pb-20 desk:pt-12"}>
          <h1 className="mx-auto max-w-5xl text-[40px] font-semibold leading-[1.08] tracking-[-0.025em] desk:text-[56px]">
            {hero.headline}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground desk:text-lg">{hero.subhead}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={onSignup} className="h-11 px-6 text-[15px]">
              {hero.primary}
            </Button>
            <Button onClick={onFeed} variant="outline" className="h-11 px-6 text-[15px]">
              {hero.secondary}
            </Button>
          </div>
          <div className="mt-9">
            <WorkspaceWindow />
          </div>
        </div>
      </section>

      <section aria-labelledby="d2-setup" className="border-t border-border py-16 desk:py-24">
        <div className={frame + " grid items-center gap-10 min-[1000px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] min-[1000px]:gap-16"}>
          <div>
            <h2 id="d2-setup" className="text-3xl font-semibold tracking-tight desk:text-4xl">
              {setup.title}
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">{setup.intro}</p>
            <ol className="mt-8 flex flex-col">
              {setup.steps.map((step, index) => (
                <li key={step.title} className="relative flex gap-4 pb-7 last:pb-0">
                  {index < setup.steps.length - 1 && (
                    <span aria-hidden="true" className="absolute left-[15px] top-9 bottom-1 w-px bg-border" />
                  )}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-sm font-semibold text-foreground">
                    {index + 1}
                  </span>
                  <div className="pt-1">
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <SetupLog />
        </div>
      </section>

      <Roadmap />

      <section id="pricing" className="border-t border-border py-16 desk:py-24">
        <div className={frame}>
          <h2 className="text-3xl font-semibold tracking-tight desk:text-4xl">{pricing.title}</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{pricing.intro}</p>
          <div className="mt-10">
            <PricingCompare onSignup={onSignup} />
          </div>
        </div>
      </section>
    </>
  );
}

function Feed({ feedMode, onFeedMode }: DirectionProps) {
  return (
    <div className={frame + " py-8 desk:py-10"}>
      <FeedHeading mode={feedMode} onMode={onFeedMode} />
      <div className="mt-6">
        <FeedReader key={feedMode} mode={feedMode} />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{feed.sample}</p>
    </div>
  );
}

export default function Direction2(props: DirectionProps) {
  return <main className="flex-1">{props.page === "feed" ? <Feed {...props} /> : <Landing {...props} />}</main>;
}
