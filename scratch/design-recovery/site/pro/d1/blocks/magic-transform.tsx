// Adapted from React Bits Pro magic-transform (https://pro.reactbits.dev/docs/components/magic-transform). Changes: documents render real source content passed by the caller instead of procedural scribbles; result chips render their label (the stock chip drew only a colored bar and a skeleton, never the label) and each burst emits only the labels of the document that just crossed; axis, halo, center tile and particles use theme tokens instead of violet and vendor hex colors; the React Bits logo default and the `paused` path were removed (paused rewinds every document, so the caller unmounts this stage instead); `onBurst` reports each crossing so the caller can stop after a fixed number of beats; result drift is bounded by the stage width so chips stay inside a narrow middle column.
"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

const MT_DOC_STYLE_ID = "magic-transform-doc-keyframes";
const MT_DOC_STYLE_CSS = `@keyframes magic-transform-doc-slide {
  from { transform: translate3d(var(--mt-from), 0, 0); }
  to   { transform: translate3d(var(--mt-to), 0, 0); }
}`;

const useDocSlideStyles = () => {
  useEffect(() => {
    if (document.getElementById(MT_DOC_STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = MT_DOC_STYLE_ID;
    el.textContent = MT_DOC_STYLE_CSS;
    document.head.appendChild(el);
  }, []);
};

export interface MagicTransformDocument {
  id: string;
  /** Recognizable source content shown on the card. */
  content: ReactNode;
  /** Short fact labels emitted when this document crosses the axis. */
  labels: string[];
}

export interface MagicTransformProps {
  documents: MagicTransformDocument[];
  height?: number | string;
  /** Seconds per beat: one document crosses the axis each beat. */
  documentDuration?: number;
  documentWidth?: number;
  documentHeight?: number;
  documentGap?: number;
  centerContent: ReactNode;
  centerSize?: number;
  /** Small caption above the center tile. */
  axisLabel?: ReactNode;
  particleCount?: number;
  onBurst?: (count: number) => void;
  className?: string;
  style?: CSSProperties;
}

// Blue family only, from the shared glow tokens.
const PARTICLE_COLORS = ["var(--primary)", "var(--glow-2)", "var(--glow-3)"];

interface ParticleSpec {
  id: number;
  color: string;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  microDelay: number;
}

const useParticleSpecs = (count: number, reach: number): ParticleSpec[] =>
  useMemo(() => {
    const specs: ParticleSpec[] = [];
    for (let i = 0; i < count; i++) {
      const seed = i * 9301;
      const rand = (n: number) => {
        const x = Math.sin(seed + n * 49297) * 233280;
        return x - Math.floor(x);
      };
      const angle = (rand(1) - 0.5) * 1.4;
      const dist = reach * (0.35 + rand(2) * 0.65);
      specs.push({
        id: i,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist * 0.65,
        rot: (rand(3) - 0.5) * 360,
        size: 5 + Math.floor(rand(4) * 6),
        microDelay: rand(5) * 0.12,
      });
    }
    return specs;
  }, [count, reach]);

function SlidingDoc({
  index,
  total,
  beat,
  documentWidth,
  documentHeight,
  documentGap,
  centerX,
  children,
}: {
  index: number;
  total: number;
  beat: number;
  documentWidth: number;
  documentHeight: number;
  documentGap: number;
  centerX: number;
  children: ReactNode;
}) {
  const cycle = beat * total;
  const travelStart = centerX - total * (documentWidth + documentGap);
  const loopEnd = centerX + documentWidth + documentGap;

  const docStyle: CSSProperties = {
    width: documentWidth,
    height: documentHeight,
    top: 0,
    left: 0,
    position: "absolute",
    willChange: "transform",
    ["--mt-from" as string]: `${travelStart}px`,
    ["--mt-to" as string]: `${loopEnd}px`,
    animationName: "magic-transform-doc-slide",
    animationDuration: `${cycle}s`,
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationDelay: `${-index * beat}s`,
  };

  return (
    <div
      className="overflow-hidden rounded-[12px] border border-border bg-card text-card-foreground shadow-[0_8px_28px_-10px_rgb(9_15_29/0.35)]"
      style={docStyle}
    >
      {children}
    </div>
  );
}

const MagicTransform = ({
  documents,
  height = 420,
  documentDuration = 1.4,
  documentWidth = 150,
  documentHeight = 196,
  documentGap = 24,
  centerContent,
  centerSize = 52,
  axisLabel,
  particleCount = 14,
  onBurst,
  className,
  style,
}: MagicTransformProps) => {
  useDocSlideStyles();

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageWidth, setStageWidth] = useState(0);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    setStageWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? el.clientWidth;
      setStageWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const beat = documentDuration;
  const docCount = Math.max(1, documents.length);
  const centerX = stageWidth / 2;
  // Chips and particles stay inside the right half of the stage.
  const reach = Math.max(60, centerX - 40);

  const [burst, setBurst] = useState({ id: 0, doc: 0 });
  const onBurstRef = useRef(onBurst);
  onBurstRef.current = onBurst;

  useEffect(() => {
    if (stageWidth <= 0) return;
    const start = performance.now();
    const cycle = beat * docCount;
    const span = (docCount + 1) * (documentWidth + documentGap);
    const impactOffset = docCount * (documentWidth + documentGap) - documentWidth;
    const tauCross = (impactOffset / span) * cycle;
    let count = 0;

    // Which document reaches the axis at elapsed time t: (t + i * beat) is congruent to tauCross.
    const crossingDoc = (t: number) => {
      const shift = (((tauCross - t) % cycle) + cycle) % cycle;
      return Math.round(shift / beat) % docCount;
    };
    const fire = () => {
      count += 1;
      setBurst({ id: count, doc: crossingDoc((performance.now() - start) / 1000) });
      onBurstRef.current?.(count);
    };

    const phase = ((-tauCross % beat) + beat) % beat;
    const firstDelay = phase < 1e-3 ? beat : beat - phase;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = setTimeout(() => {
      fire();
      intervalId = setInterval(fire, beat * 1000);
    }, firstDelay * 1000);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [stageWidth, beat, docCount, documentWidth, documentGap]);

  const particleSpecs = useParticleSpecs(particleCount, reach);
  const labels = documents[burst.doc]?.labels ?? [];

  return (
    <div
      ref={stageRef}
      className={cn("relative overflow-hidden rounded-xl", className)}
      style={{ height, ...style }}
      aria-hidden="true"
    >
      {stageWidth > 0 && (
        <div
          className="pointer-events-none absolute z-10 overflow-hidden"
          style={{ left: 0, width: centerX, top: `calc(50% - ${documentHeight / 2}px)`, height: documentHeight }}
        >
          {documents.map((doc, i) => (
            <SlidingDoc
              key={doc.id}
              index={i}
              total={docCount}
              beat={beat}
              documentWidth={documentWidth}
              documentHeight={documentHeight}
              documentGap={documentGap}
              centerX={centerX}
            >
              {doc.content}
            </SlidingDoc>
          ))}
        </div>
      )}

      <div
        className="pointer-events-none absolute z-20"
        style={{
          width: 56,
          height: documentHeight,
          left: "50%",
          top: "50%",
          transform: "translate(-100%, -50%)",
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--primary) 8%, transparent) 60%, color-mix(in oklab, var(--primary) 18%, transparent) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute z-20 bg-primary"
        style={{ width: 2, height: documentHeight + 40, left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
      />

      {axisLabel && (
        <div
          className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium whitespace-nowrap text-foreground shadow-[0_1px_2px_rgb(9_15_29/0.1)]"
          style={{ top: `calc(50% - ${documentHeight / 2 + 52}px)` }}
        >
          {axisLabel}
        </div>
      )}

      <motion.div
        key={`center-${burst.id}`}
        className="pointer-events-none absolute top-1/2 left-1/2 z-30 flex items-center justify-center rounded-[12px] border border-border bg-card text-foreground shadow-[0_10px_36px_-6px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
        style={{ width: centerSize, height: centerSize, translate: "-50% -50%" }}
        initial={{ scale: 1 }}
        animate={burst.id === 0 ? undefined : { scale: [1, 1.14, 1] }}
        transition={{ duration: Math.min(0.6, beat * 0.5), ease: [0.16, 1, 0.3, 1], times: [0, 0.25, 1] }}
      >
        {centerContent}
      </motion.div>

      {stageWidth > 0 && burst.id > 0 && (
        <div key={`particles-${burst.id}`} className="pointer-events-none absolute top-1/2 left-1/2 z-20">
          {particleSpecs.map((p) => {
            const lifetime = Math.min(beat * 1.1, 2);
            return (
              <motion.div
                key={p.id}
                className="absolute"
                style={{ left: 0, top: 0, width: p.size, height: p.size, translate: "-50% -50%" }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.4 }}
                animate={{ x: p.dx, y: p.dy, rotate: p.rot, scale: 1, opacity: [0, 1, 1, 0] }}
                transition={{
                  default: { duration: lifetime, ease: [0.16, 1, 0.3, 1], delay: p.microDelay },
                  opacity: { duration: lifetime, times: [0, 0.12, 0.5, 1], ease: "easeOut", delay: p.microDelay },
                }}
              >
                <div className="h-full w-full rounded-[2px]" style={{ background: p.color }} />
              </motion.div>
            );
          })}
        </div>
      )}

      {stageWidth > 0 && burst.id > 0 && (
        <div key={`results-${burst.id}`} className="pointer-events-none absolute top-1/2 left-1/2 z-30">
          {labels.map((label, i) => {
            const total = labels.length;
            const t = total === 1 ? 0.5 : i / (total - 1);
            const angle = (t - 0.5) * 0.9;
            const endX = 36 + Math.cos(angle) * Math.min(reach - 150, 120);
            const endY = Math.sin(angle) * 90 - 14;
            const launchRot = i % 2 === 0 ? -8 : 8;
            const lifetime = Math.min(beat * 1.1, 2);
            return (
              <motion.div
                key={label}
                className="absolute"
                style={{ left: 0, top: 0, transformOrigin: "0% 50%" }}
                initial={{ x: 0, y: 0, rotate: launchRot, opacity: 0, scale: 0.6 }}
                animate={{ x: endX, y: endY, rotate: 0, scale: 1, opacity: [0, 1, 1, 0] }}
                transition={{
                  default: { duration: lifetime, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 },
                  opacity: { duration: lifetime, times: [0, 0.1, 0.62, 1], ease: "easeOut", delay: i * 0.05 },
                }}
              >
                <span className="block rounded-md bg-primary px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-primary-foreground shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
                  {label}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MagicTransform;
