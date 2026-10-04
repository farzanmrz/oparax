"use client";

import { ArrowDown } from "lucide-react";
import {
  cubicBezier,
  type MotionValue,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { landingContent } from "@/lib/landing/content";

// Adapted from Magic UI Animated Beam (MIT): https://magicui.design/r/animated-beam.json.
// A shared clock pauses offscreen and in hidden tabs, then resumes each pulse without replaying it.
type Path = {
  id: string;
  d: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  vertical: boolean;
};

type Geometry = { width: number; height: number; paths: Path[] };

const pulseDuration = 2400;
const pulseStagger = 300;
const pulseTotal = pulseDuration + pulseStagger * 4;
const nodeNames = ["post", "release", "update", "engine", "story", "message"] as const;
const pulseEase = cubicBezier(0.16, 1, 0.3, 1);

function PulsePath({
  path,
  index,
  time,
}: {
  path: Path;
  index: number;
  time: MotionValue<number>;
}) {
  const id = useId();
  const delay = index * pulseStagger;
  const coordinate = (elapsed: number, leading: boolean) => {
    if (elapsed <= delay) return path.vertical ? path.startY : path.startX;
    const progress = pulseEase(Math.min((elapsed - delay) / pulseDuration, 1));
    const start = path.vertical ? path.startY : path.startX;
    const end = path.vertical ? path.endY : path.endX;
    return start + (progress + (leading ? 0.1 : 0)) * (end - start);
  };
  const leading = useTransform(time, (elapsed) => coordinate(elapsed, true));
  const trailing = useTransform(time, (elapsed) => coordinate(elapsed, false));

  return (
    <>
      <path d={path.d} stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" />
      <defs>
        <motion.linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          x1={path.vertical ? path.startX : leading}
          x2={path.vertical ? path.startX : trailing}
          y1={path.vertical ? leading : path.startY}
          y2={path.vertical ? trailing : path.startY}
        >
          <stop stopColor="var(--primary)" stopOpacity="0" />
          <stop offset="32.5%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </>
  );
}

export function Scene({
  sources,
  engine,
  delivered,
}: {
  sources: ReactNode;
  engine: ReactNode;
  delivered: ReactNode;
}) {
  const sceneRef = useRef<HTMLElement>(null);
  const enteredOnce = useInView(sceneRef, { once: true });
  const reduced = useReducedMotion();
  const time = useMotionValue(0);
  const elapsed = useRef(0);
  const [geometry, setGeometry] = useState<Geometry>({ width: 1, height: 1, paths: [] });
  const [visible, setVisible] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const media = window.matchMedia("(min-width: 700px)");
    const updateDesktop = () => setDesktop(media.matches);
    let intersecting = false;
    const updateVisibility = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      updateVisibility();
    });
    observer.observe(scene);
    updateDesktop();
    media.addEventListener("change", updateDesktop);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateDesktop);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !desktop) return;
    const nodes = nodeNames.map((name) =>
      scene.querySelector<HTMLElement>(`[data-scene-node="${name}"]`),
    );
    if (nodes.some((node) => !node)) return;
    const cards = nodes as HTMLElement[];
    const measure = () => {
      const bounds = scene.getBoundingClientRect();
      const boxes = cards.map((card) => card.getBoundingClientRect());
      const [post, release, update, engineBox, story, message] = boxes;
      const x = (value: number) => value - bounds.left;
      const y = (value: number) => value - bounds.top;
      const centerY = (box: DOMRect) => y(box.top + box.height / 2);
      const curve = (id: string, from: DOMRect, to: DOMRect, spread: number): Path => {
        const startX = x(from.right);
        const startY = centerY(from);
        const endX = x(to.left);
        const endY = centerY(to) + spread;
        const bend = (endX - startX) * 0.52;
        return {
          id,
          d: `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`,
          startX,
          startY,
          endX,
          endY,
          vertical: false,
        };
      };
      const startX = x(story.left + story.width / 2);
      const startY = y(story.bottom);
      const endX = x(message.left + message.width / 2);
      const endY = y(message.top);
      setGeometry({
        width: bounds.width,
        height: bounds.height,
        paths: [
          curve("post", post, engineBox, -36),
          curve("release", release, engineBox, 0),
          curve("update", update, engineBox, 36),
          curve("story", engineBox, story, 0),
          {
            id: "message",
            d: `M ${startX} ${startY} C ${startX} ${startY + 9}, ${endX} ${endY - 9}, ${endX} ${endY}`,
            startX,
            startY,
            endX,
            endY,
            vertical: true,
          },
        ],
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    for (const card of cards) observer.observe(card);
    measure();
    return () => observer.disconnect();
  }, [desktop]);

  useEffect(() => {
    if (!enteredOnce || !visible || !desktop || reduced || elapsed.current >= pulseTotal) return;
    let frame = 0;
    let previous = 0;
    const tick = (now: number) => {
      if (previous) elapsed.current = Math.min(pulseTotal, elapsed.current + now - previous);
      previous = now;
      time.set(elapsed.current);
      if (elapsed.current < pulseTotal) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [desktop, enteredOnce, reduced, time, visible]);

  return (
    <section
      ref={sceneRef}
      aria-label={landingContent.scene.label}
      className="ph-no-autocapture relative grid min-w-0 grid-cols-1 items-start gap-6 desk:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]"
    >
      {desktop && geometry.paths.length > 0 ? (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 size-full"
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          fill="none"
          preserveAspectRatio="none"
        >
          {geometry.paths.map((path, index) => (
            <g key={`${path.id}:${path.d}`}>
              <path d={path.d} stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
              {!reduced && enteredOnce ? <PulsePath path={path} index={index} time={time} /> : null}
            </g>
          ))}
        </svg>
      ) : null}
      <div className="relative z-10 min-w-0">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {landingContent.scene.sources}
        </h2>
        {sources}
      </div>
      <ArrowDown aria-hidden="true" className="mx-auto text-muted-foreground desk:hidden" />
      <div className="relative z-10 min-w-0">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {landingContent.scene.engine}
        </h2>
        {engine}
      </div>
      <ArrowDown aria-hidden="true" className="mx-auto text-muted-foreground desk:hidden" />
      <div className="relative z-10 min-w-0">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {landingContent.scene.delivered}
        </h2>
        {delivered}
      </div>
    </section>
  );
}
