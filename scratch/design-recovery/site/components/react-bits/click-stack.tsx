"use client";

import React, { useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

export interface ClickStackProps {
  /** Renderable content for each card: images, text, JSX, or any React node */
  items?: React.ReactNode[];
  /** Width of each card in pixels */
  cardWidth?: number;
  /** Height of each card in pixels */
  cardHeight?: number;
  /** Horizontal offset between stacked depth levels */
  spreadX?: number;
  /** Vertical offset between stacked depth levels */
  spreadY?: number;
  /** Transition duration in seconds */
  duration?: number;
  /** GSAP easing string for card repositioning */
  ease?: string;
  /** Card corner radius in pixels */
  borderRadius?: number;
  /** Card shadow blur radius */
  shadowBlur?: number;
  /** Card shadow opacity (0–1) */
  shadowOpacity?: number;
  /** Fallback background color for card surfaces */
  cardColor?: string;
  /** Maximum number of cards shown in the stack */
  visibleCount?: number;
  /** Scale reduction per depth level (0–1) */
  depthScale?: number;
  /** Opacity reduction per depth level (0–1) */
  depthOpacity?: number;
  /** CSS class for the outer container */
  className?: string;
  /** CSS class applied to each card wrapper */
  cardClassName?: string;
  /** Overall container opacity */
  opacity?: number;
}

const SWATCHES = ["01", "02", "03", "04", "05", "06"];

const BUILTIN_CARDS = SWATCHES.map((id) => (
  <div
    key={id}
    style={{
      background: "#ffffff",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#000000",
      fontSize: 56,
      fontWeight: 700,
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
    }}
  >
    {id}
  </div>
));

const ClickStack: React.FC<ClickStackProps> = ({
  items,
  cardWidth = 250,
  cardHeight = 300,
  spreadX = 20,
  spreadY = -20,
  duration = 0.35,
  ease = "power3.out",
  borderRadius = 24,
  shadowBlur = 30,
  shadowOpacity = 0.3,
  cardColor = "#ffffff",
  visibleCount = 5,
  depthScale = 0.08,
  depthOpacity = 0,
  className,
  cardClassName,
  opacity = 1,
}) => {
  const cards = items ?? BUILTIN_CARDS;
  const total = cards.length;
  const vis = Math.min(visibleCount, total);

  const seq = useRef<number[]>([]);
  const busy = useRef(false);
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const cfg = useRef({
    spreadX,
    spreadY,
    depthScale,
    depthOpacity,
    vis,
    duration,
    ease,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cfg.current = {
      spreadX,
      spreadY,
      depthScale,
      depthOpacity,
      vis,
      duration,
      ease,
    };
  });

  const arrange = useCallback((animate: boolean) => {
    const c = cfg.current;
    seq.current.forEach((itemIdx, rank) => {
      const el = nodes.current[itemIdx];
      if (!el) return;

      if (rank >= c.vis) {
        gsap.set(el, { opacity: 0, visibility: "hidden", zIndex: -1 });
        return;
      }

      const target = {
        x: rank * c.spreadX,
        y: rank * c.spreadY,
        scale: 1 - rank * c.depthScale,
        opacity: Math.max(0, 1 - rank * c.depthOpacity),
        visibility: "visible" as const,
        zIndex: c.vis - rank,
        rotation: 0,
      };

      if (animate) {
        gsap.to(el, { ...target, duration: c.duration, ease: c.ease });
      } else {
        gsap.set(el, target);
      }
    });
  }, []);

  useEffect(() => {
    seq.current = Array.from({ length: total }, (_, i) => i);
    busy.current = false;
    arrange(false);
    if (containerRef.current) {
      containerRef.current.style.visibility = "visible";
    }
  }, [total, arrange]);

  useEffect(() => {
    if (seq.current.length > 0) arrange(false);
  }, [spreadX, spreadY, depthScale, depthOpacity, vis, arrange]);

  useEffect(() => {
    const refs = nodes.current;
    return () => {
      refs.forEach((el) => {
        if (el) gsap.killTweensOf(el);
      });
    };
  }, []);

  const cycle = useCallback(() => {
    if (busy.current || total < 2) return;
    busy.current = true;

    const c = cfg.current;
    const frontIdx = seq.current[0];
    const frontEl = nodes.current[frontIdx];

    if (!frontEl) {
      busy.current = false;
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false;
      },
    });

    tl.to(frontEl, {
      scale: 1.04,
      opacity: 0,
      duration: c.duration * 0.55,
      ease: "power2.in",
      onComplete: () => {
        const moved = seq.current.shift()!;
        seq.current.push(moved);

        const c2 = cfg.current;

        gsap.set(nodes.current[moved]!, {
          opacity: 0,
          visibility: "hidden",
          zIndex: -1,
        });

        seq.current.forEach((idx, rank) => {
          if (idx === moved) return;
          const el = nodes.current[idx];
          if (!el) return;

          if (rank >= c2.vis) {
            gsap.set(el, { opacity: 0, visibility: "hidden", zIndex: -1 });
            return;
          }

          gsap.to(el, {
            x: rank * c2.spreadX,
            y: rank * c2.spreadY,
            scale: 1 - rank * c2.depthScale,
            opacity: Math.max(0, 1 - rank * c2.depthOpacity),
            visibility: "visible",
            zIndex: c2.vis - rank,
            duration: c2.duration * 0.65,
            ease: "power2.out",
          });
        });

        const movedRank = seq.current.indexOf(moved);
        const movedEl = nodes.current[moved];

        if (movedRank < c2.vis && movedEl) {
          gsap.set(movedEl, {
            x: movedRank * c2.spreadX,
            y: movedRank * c2.spreadY,
            scale: 1 - movedRank * c2.depthScale,
            opacity: 0,
            visibility: "visible",
            zIndex: c2.vis - movedRank,
          });
          gsap.to(movedEl, {
            opacity: Math.max(0, 1 - movedRank * c2.depthOpacity),
            duration: c2.duration * 0.5,
            delay: c2.duration * 0.2,
            ease: "power1.out",
          });
        }
      },
    });
  }, [total]);

  return (
    <div
      ref={containerRef}
      onClick={cycle}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden cursor-pointer",
        className,
      )}
      style={{ opacity, visibility: "hidden" }}
    >
      {cards.map((content, idx) => (
        <div
          key={idx}
          ref={(el) => {
            nodes.current[idx] = el;
          }}
          className={cn("absolute overflow-hidden", cardClassName)}
          style={{
            width: cardWidth,
            height: cardHeight,
            borderRadius,
            background: cardColor,
            boxShadow: `0 ${Math.round(shadowBlur * 0.15)}px ${Math.round(
              shadowBlur * 0.5,
            )}px rgba(0,0,0,${(shadowOpacity * 0.5).toFixed(
              2,
            )}), 0 ${Math.round(shadowBlur * 0.4)}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity})`,
            willChange: "transform, opacity",
          }}
        >
          {content}
        </div>
      ))}
    </div>
  );
};

ClickStack.displayName = "ClickStack";

export default ClickStack;
