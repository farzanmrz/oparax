"use client";

// Section 2: two bento tiles with the same event read Direct (ESA alone) and Clustered (ESA and NASA joined).
import { useEffect, useRef, useState, type RefObject } from "react";
import { Layers, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { frame } from "../shared/shell";
import type { FeedMode } from "../types";
import { modes } from "./content";
import { FactList, OpenOriginal, SourceChips, SourceIdentity, tile } from "./story-parts";

export function SectionHeading({ title, intro, id }: { title: string; intro: string; id?: string }) {
  return (
    <header className="mx-auto max-w-2xl text-center">
      <h2 id={id} className="text-[28px] font-semibold leading-tight tracking-tight desk:text-[34px]">
        {title}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">{intro}</p>
    </header>
  );
}

function ModeTile({
  icon: Icon,
  name,
  line,
  action,
  onOpen,
  panelRef,
  children,
}: {
  panelRef: RefObject<HTMLDivElement | null>;
  icon: typeof Rows3;
  name: string;
  line: string;
  action: string;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={name} className={cn(tile, "flex flex-col p-5 desk:p-6")}>
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
          <p className="text-sm text-muted-foreground">{line}</p>
        </div>
      </header>
      <div ref={panelRef} className="mt-5 flex flex-1 flex-col rounded-lg border border-border bg-background/60 p-4 desk:p-5">
        {children}
      </div>
      <Button variant="ghost" onClick={onOpen} className="mt-3 h-10 self-start px-3 text-sm text-primary max-desk:h-11">
        {action}
      </Button>
    </section>
  );
}

// A static wire joins ESA's Direct item to the same ESA report inside the Clustered story.
function useSameSourceWire(
  gridRef: RefObject<HTMLDivElement | null>,
  directRef: RefObject<HTMLDivElement | null>,
  clusteredRef: RefObject<HTMLDivElement | null>,
  url: string,
) {
  const [d, setD] = useState<{ path: string; from: [number, number]; to: [number, number] } | null>(null);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const g = grid.getBoundingClientRect();
      const direct = directRef.current?.getBoundingClientRect();
      const clustered = clusteredRef.current?.getBoundingClientRect();
      const identity = directRef.current?.querySelector("p")?.getBoundingClientRect();
      const chip = clusteredRef.current?.querySelector(`a[href="${url}"]`)?.getBoundingClientRect();
      if (!direct || !clustered || !identity || !chip || clustered.left < direct.right) return setD(null);
      const from: [number, number] = [direct.right - g.left, identity.top + identity.height / 2 - g.top];
      const to: [number, number] = [chip.left - g.left, chip.top + chip.height / 2 - g.top];
      const mx = (from[0] + clustered.left - g.left) / 2;
      setD({ path: `M${from[0]} ${from[1]} C${mx + 30} ${from[1]} ${mx - 30} ${to[1]} ${clustered.left - g.left} ${to[1]} L${to[0]} ${to[1]}`, from, to });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [gridRef, directRef, clusteredRef, url]);
  return d;
}

export function Modes({ onFeedMode }: { onFeedMode: (mode: FeedMode) => void }) {
  const { item } = modes.direct;
  const { story } = modes.clustered;
  const gridRef = useRef<HTMLDivElement>(null);
  const directRef = useRef<HTMLDivElement>(null);
  const clusteredRef = useRef<HTMLDivElement>(null);
  const wire = useSameSourceWire(gridRef, directRef, clusteredRef, item.source.url);
  return (
    <section aria-labelledby="d3-modes" className="py-16 desk:py-24">
      <div className={frame}>
        <SectionHeading id="d3-modes" title={modes.title} intro={modes.intro} />
        <div
          ref={gridRef}
          className="relative mt-10 grid gap-5 desk:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] desk:gap-x-14"
        >
          <ModeTile
            icon={Rows3}
            name={modes.direct.name}
            line={modes.direct.line}
            action={modes.direct.action}
            onOpen={() => onFeedMode("direct")}
            panelRef={directRef}
          >
            <SourceIdentity source={item.source} />
            <h4 className="mt-3 text-lg font-semibold leading-snug">{item.headline}</h4>
            <FactList facts={item.facts} className="mt-2.5" />
            <OpenOriginal source={item.source} className="mt-auto self-start pt-3" />
          </ModeTile>
          <ModeTile
            icon={Layers}
            name={modes.clustered.name}
            line={modes.clustered.line}
            action={modes.clustered.action}
            onOpen={() => onFeedMode("clustered")}
            panelRef={clusteredRef}
          >
            <h4 className="text-lg font-semibold leading-snug">{story.title}</h4>
            <FactList facts={story.facts} className="mt-2.5" />
            <div className="mt-auto pt-4">
              <SourceChips sources={story.sources} className="border-t border-border pt-3.5" />
            </div>
          </ModeTile>
          {wire && (
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
              <path d={wire.path} fill="none" stroke="var(--primary)" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 4" />
              <circle cx={wire.from[0]} cy={wire.from[1]} r={3} fill="var(--card)" stroke="var(--primary)" strokeWidth={1.5} />
              <circle cx={wire.to[0]} cy={wire.to[1]} r={3} fill="var(--primary)" />
            </svg>
          )}
        </div>
      </div>
    </section>
  );
}
