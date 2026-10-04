"use client";

// React Bits, David Haz. MIT plus Commons Clause. See LICENSE.md and PROVENANCE.md.

import { motion, useMotionValue, useTransform, useReducedMotion, type PanInfo } from "motion/react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface CardRotateProps {
  children: React.ReactNode;
  onSendToBack: () => void;
  sensitivity: number;
  disableDrag?: boolean;
  inert?: boolean;
}

function CardRotate({
  children,
  onSendToBack,
  sensitivity,
  disableDrag = false,
  inert = false,
}: CardRotateProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [60, -60]);
  const rotateY = useTransform(x, [-100, 100], [-60, 60]);

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (Math.abs(info.offset.x) > sensitivity || Math.abs(info.offset.y) > sensitivity) {
      onSendToBack();
    } else {
      x.set(0);
      y.set(0);
    }
  }

  if (disableDrag) {
    return (
      <motion.div className="absolute inset-0 cursor-pointer" inert={inert} style={{ x: 0, y: 0 }}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab"
      inert={inert}
      style={{ x, y, rotateX, rotateY }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={{ cursor: "grabbing" }}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  );
}

export interface StackProps {
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  keyboardAdvance?: boolean;
  ariaLabel?: string;
  className?: string;
  randomRotation?: boolean;
  sensitivity?: number;
  sendToBackOnClick?: boolean;
  cards?: React.ReactNode[];
  animationConfig?: { stiffness: number; damping: number };
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  mobileClickOnly?: boolean;
  mobileBreakpoint?: number;
}

export default function Stack({
  currentIndex,
  onIndexChange,
  keyboardAdvance = true,
  ariaLabel = "Source card deck. Use arrow keys to browse.",
  className,
  randomRotation = false,
  sensitivity = 200,
  cards = [],
  animationConfig = { stiffness: 260, damping: 20 },
  sendToBackOnClick = false,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  mobileClickOnly = false,
  mobileBreakpoint = 768,
}: StackProps) {
  const reducedMotion = useReducedMotion();
  const [localIndex, setLocalIndex] = useState(0);
  const activeIndex = cards.length
    ? (((currentIndex ?? localIndex) % cards.length) + cards.length) % cards.length
    : 0;
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [mobileBreakpoint]);

  const shouldDisableDrag = mobileClickOnly && isMobile;
  const shouldEnableClick = sendToBackOnClick || shouldDisableDrag;

  const stack = cards.map((_, position) => {
    const index = (activeIndex + cards.length - 1 - position) % cards.length;
    return { id: index, content: cards[index] };
  });

  const selectIndex = (index: number) => {
    if (!cards.length) return;
    const next = (index + cards.length) % cards.length;
    if (currentIndex === undefined) setLocalIndex(next);
    onIndexChange?.(next);
  };

  const sendToBack = () => selectIndex(activeIndex + 1);

  useEffect(() => {
    if (autoplay && !reducedMotion && cards.length > 1 && !isPaused) {
      const interval = setInterval(() => {
        const next = (activeIndex + 1) % cards.length;
        if (currentIndex === undefined) setLocalIndex(next);
        onIndexChange?.(next);
      }, autoplayDelay);
      return () => clearInterval(interval);
    }
  }, [
    autoplay,
    reducedMotion,
    cards.length,
    activeIndex,
    currentIndex,
    onIndexChange,
    autoplayDelay,
    isPaused,
  ]);

  return (
    <div
      data-react-bits="Stack"
      className={cn(
        "relative w-full h-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] rounded-2xl",
        className,
      )}
      role="region"
      aria-label={ariaLabel}
      tabIndex={keyboardAdvance && cards.length > 1 ? 0 : undefined}
      onKeyDown={(event) => {
        if (!keyboardAdvance || event.target !== event.currentTarget) return;
        if (["ArrowRight", "ArrowDown", "Enter", " "].includes(event.key)) {
          event.preventDefault();
          selectIndex(activeIndex + 1);
        } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
          event.preventDefault();
          selectIndex(activeIndex - 1);
        }
      }}
      style={{
        perspective: 600,
      }}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      {reducedMotion
        ? cards[activeIndex]
        : stack.map((card, index) => {
            const randomRotate = randomRotation ? ((card.id * 7) % 10) - 5 : 0;
            return (
              <CardRotate
                key={card.id}
                onSendToBack={sendToBack}
                sensitivity={sensitivity}
                disableDrag={shouldDisableDrag}
                inert={index !== stack.length - 1}
              >
                <motion.div
                  className="rounded-2xl overflow-hidden w-full h-full"
                  onClick={() => shouldEnableClick && sendToBack()}
                  animate={{
                    rotateZ: (stack.length - index - 1) * 4 + randomRotate,
                    scale: 1 + index * 0.06 - stack.length * 0.06,
                    transformOrigin: "90% 90%",
                  }}
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: animationConfig.stiffness,
                    damping: animationConfig.damping,
                  }}
                >
                  {card.content}
                </motion.div>
              </CardRotate>
            );
          })}
    </div>
  );
}
