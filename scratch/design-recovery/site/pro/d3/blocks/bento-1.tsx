// Adapted from React Bits Pro bento-1 (https://pro.reactbits.dev/docs/blocks/bento/bento-1). Changes: the vertical funnel became a left-to-right wire across three bento cells (vertical again on phones, as stock); Lucide chips and fake record counts replaced by the real NASA post and two NASA articles, each a link to the original; connectors are measured from the real cards instead of fixed paths; travelling pulses run three times within about 4.8s, then settle into lit wires (never start under reduced motion); hover/focus lighting kept and extended to the matching source chip in the story; Connect pill, sync card, emerald ping and 4.4s infinite bar removed; neutral/white/black swapped for semantic tokens. Stays outside .rb-theme-scope.
"use client";

import { useEffect, useState, type RefObject } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ArticleCard, XPost } from "../../shared/sources";
import { stories } from "../../content";

const europa = stories[0];

// The three reports the demo story is built from: the X post first, then the two articles.
export function SourceStack({
  itemRefs,
  stackRef,
  onActive,
}: {
  itemRefs: RefObject<(HTMLAnchorElement | null)[]>;
  stackRef: RefObject<HTMLDivElement | null>;
  onActive: (index: number | null) => void;
}) {
  const link =
    "group block rounded-xl outline-none transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-ring hover:-translate-y-px";
  const handlers = (index: number) => ({
    onMouseEnter: () => onActive(index),
    onMouseLeave: () => onActive(null),
    onFocus: () => onActive(index),
    onBlur: () => onActive(null),
  });
  return (
    <div ref={stackRef} className="relative flex flex-col gap-3">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 -z-10 bg-[radial-gradient(circle,color-mix(in_oklch,var(--foreground),transparent_88%)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <a
        ref={(node) => {
          itemRefs.current[0] = node;
        }}
        href={europa.sources[0].url}
        target="_blank"
        rel="noreferrer"
        className={link}
        {...handlers(0)}
      >
        <XPost compact className="bg-background/70 p-3.5 transition-colors group-hover:border-primary/60" />
      </a>
      {[1, 2].map((index) => (
        <a
          key={index}
          ref={(node) => {
            itemRefs.current[index] = node;
          }}
          href={europa.sources[index].url}
          target="_blank"
          rel="noreferrer"
          className={link}
          {...handlers(index)}
        >
          <ArticleCard
            source={europa.sources[index]}
            className="bg-background/70 transition-colors group-hover:border-primary/60 [&_h3+p]:hidden"
          />
        </a>
      ))}
    </div>
  );
}

type Wire = { d: string; from: [number, number]; to: [number, number] };
type Geometry = { width: number; height: number; inputs: Wire[]; output: Wire | null };

function curve(from: [number, number], to: [number, number], vertical: boolean): Wire {
  const [x1, y1] = from;
  const [x2, y2] = to;
  if (vertical) {
    const my = (y1 + y2) / 2;
    return { d: `M${x1} ${y1} C${x1} ${my} ${x2} ${my} ${x2} ${y2}`, from, to };
  }
  const mx = (x1 + x2) / 2;
  return { d: `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`, from, to };
}

// Connectors are measured from the rendered cards so they meet them at any width.
function useGeometry(
  containerRef: RefObject<HTMLDivElement | null>,
  itemRefs: RefObject<(HTMLAnchorElement | null)[]>,
  stackRef: RefObject<HTMLDivElement | null>,
  storyRef: RefObject<HTMLElement | null>,
  deliveryRef: RefObject<HTMLElement | null>,
) {
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const c = container.getBoundingClientRect();
      const story = storyRef.current?.getBoundingClientRect();
      const delivery = deliveryRef.current?.getBoundingClientRect();
      const stack = stackRef.current?.getBoundingClientRect();
      const items = itemRefs.current.map((node) => node?.getBoundingClientRect());
      if (!story || !delivery || !stack || items.some((rect) => !rect)) return;
      const at = (x: number, y: number): [number, number] => [x - c.left, y - c.top];
      // Stacked cells: wires stay in the gaps, from cell edge to cell edge, so they never cross headings.
      const engineCell = storyRef.current?.closest("section")?.getBoundingClientRect();
      const deliveryCell = deliveryRef.current?.closest("section")?.getBoundingClientRect();
      if (story.left < stack.right && engineCell && deliveryCell) {
        const mid = engineCell.left + engineCell.width / 2;
        setGeometry({
          width: c.width,
          height: c.height,
          inputs: [0.3, 0.5, 0.7].map((f) =>
            curve(at(stack.left + stack.width * f, stack.bottom + 20), at(mid, engineCell.top), true),
          ),
          output: curve(at(mid, engineCell.bottom), at(mid, deliveryCell.top), true),
        });
        return;
      }
      const inputs = items.map((rect) =>
        curve(at(rect!.right, rect!.top + rect!.height / 2), at(story.left, story.top + story.height / 2), false),
      );
      const output = curve(
        at(story.right, story.top + story.height / 2),
        at(delivery.left, delivery.top + delivery.height / 2),
        false,
      );
      setGeometry({ width: c.width, height: c.height, inputs, output });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, itemRefs, stackRef, storyRef, deliveryRef]);
  return geometry;
}

const pulse = { duration: 1.1, repeat: 2, repeatDelay: 0.25, ease: "linear" } as const;

export function Wires({
  containerRef,
  itemRefs,
  stackRef,
  storyRef,
  deliveryRef,
  active,
  running,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  itemRefs: RefObject<(HTMLAnchorElement | null)[]>;
  stackRef: RefObject<HTMLDivElement | null>;
  storyRef: RefObject<HTMLElement | null>;
  deliveryRef: RefObject<HTMLElement | null>;
  active: number | null;
  running: boolean;
}) {
  const geometry = useGeometry(containerRef, itemRefs, stackRef, storyRef, deliveryRef);
  if (!geometry) return null;
  const wires = [...geometry.inputs, ...(geometry.output ? [geometry.output] : [])];
  return (
    <svg
      aria-hidden="true"
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      className="pointer-events-none absolute inset-0 z-10 overflow-visible"
    >
      {wires.map((wire, index) => {
        const isOutput = index === geometry.inputs.length;
        const lit = active === index || (isOutput && active !== null);
        return (
          <g key={index}>
            <path
              d={wire.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={lit ? 2 : 1.5}
              strokeLinecap="round"
              className={cn(
                "transition-[color,stroke-width] duration-500",
                lit ? "text-primary" : running ? "text-border" : "text-primary/45",
              )}
            />
            {running && (
              <motion.path
                d={wire.d}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.25}
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="14 86"
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: [100, 0] }}
                transition={{ ...pulse, delay: isOutput ? 0.95 : index * 0.18 }}
                className="text-primary drop-shadow-[0_0_4px_var(--primary)]"
              />
            )}
            <circle cx={wire.from[0]} cy={wire.from[1]} r={3} className="fill-card stroke-primary" strokeWidth={1.5} />
            {(isOutput || index === 0) && (
              <circle cx={wire.to[0]} cy={wire.to[1]} r={3.5} className="fill-primary" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default SourceStack;
