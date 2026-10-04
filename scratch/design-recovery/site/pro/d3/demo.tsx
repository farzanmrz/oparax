"use client";

// The Bento Wire demo: one row of three cells (Sources, Oparax, Delivery) whose headings share one
// line through a CSS subgrid, with measured wires running from each report into the story and on to X.
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { frame } from "../shared/shell";
import { XDm } from "../shared/sources";
import { interest, stages, stories } from "../content";
import { SourceStack, Wires } from "./blocks/bento-1";
import { FactList, SourceChips, StoryPhoto, tile } from "./story-parts";
import { demo } from "./content";

const europa = stories[0];

// Wide screens: three columns sharing a heading row. Narrow screens: cells stack, wires run downward.
const row = "min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] min-[1100px]:grid-rows-[auto_1fr]";
const cell = cn(tile, "relative flex flex-col bg-card/90 backdrop-blur-md min-[1100px]:row-span-2 min-[1100px]:grid min-[1100px]:grid-rows-subgrid min-[1100px]:gap-0");

function CellHeading({ title, note }: { title: string; note: string }) {
  return (
    <header className="px-5 pb-3.5 pt-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{note}</p>
    </header>
  );
}

export function Demo({ running, onFeed }: { running: boolean; onFeed: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const stackRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  return (
    <div id="product" className={cn(frame, "mt-9 desk:mt-10")}>
      <div
        ref={containerRef}
        role="group"
        aria-label={demo.label}
        className={cn(
          "relative mx-auto grid max-w-2xl gap-x-10 gap-y-12 min-[1100px]:max-w-none min-[1100px]:gap-y-0",
          row,
        )}
      >
        <section className={cell} aria-label={stages.sources.title}>
          <CellHeading title={stages.sources.title} note={stages.sources.note} />
          <div className="px-5 pb-5">
            <SourceStack itemRefs={itemRefs} stackRef={stackRef} onActive={setActive} />
          </div>
        </section>

        <section className={cell} aria-label={stages.engine.title}>
          <CellHeading title={stages.engine.title} note={stages.engine.note} />
          <div className="flex flex-col px-5 pb-5">
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              </span>
              <span>
                {interest.match}: <span className="font-medium text-foreground">{interest.value}</span>
              </span>
            </p>
            <article
              ref={storyRef}
              className="mt-3 flex flex-1 flex-col rounded-lg border border-border bg-background/70 p-4 desk:p-5"
            >
              <h3 className="text-lg font-semibold leading-snug tracking-tight desk:text-xl">{europa.title}</h3>
              <div className="mb-4 mt-3 flex gap-4 max-desk:flex-col">
                <FactList facts={europa.facts} className="flex-1" />
                <StoryPhoto
                  src={europa.image!}
                  alt=""
                  credit={europa.imageCredit}
                  className="w-[31%] shrink-0 max-desk:w-full"
                  imgClassName="aspect-[4/5] max-desk:aspect-[16/9]"
                />
              </div>
              <SourceChips sources={europa.sources} active={active} compact className="mt-auto border-t border-border pt-3.5" />
            </article>
          </div>
        </section>

        <section className={cell} aria-label={stages.delivery.title}>
          <CellHeading title={stages.delivery.title} note={stages.delivery.note} />
          <div ref={deliveryRef} className="flex px-5 pb-5">
            <XDm onOpen={onFeed} className="w-full bg-background/70" />
          </div>
        </section>

        <Wires
          containerRef={containerRef}
          itemRefs={itemRefs}
          stackRef={stackRef}
          storyRef={storyRef}
          deliveryRef={deliveryRef}
          active={active}
          running={running}
        />
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">{demo.caption}</p>
    </div>
  );
}
