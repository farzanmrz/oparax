"use client";

// React Bits, David Haz. MIT plus Commons Clause. See LICENSE.md and PROVENANCE.md.

import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface Position {
  x: number;
  y: number;
}

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = "",
  spotlightColor = "color-mix(in srgb, var(--blue), transparent 75%)",
  onMouseMove,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFinePointer(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState<number>(0);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    onMouseMove?.(e);
    if (!divRef.current || isFocused || reducedMotion || !finePointer) return;

    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus: React.FocusEventHandler<HTMLDivElement> = (e) => {
    onFocus?.(e);
    if (reducedMotion || !finePointer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ x: rect.width / 2, y: rect.height / 2 });
    setIsFocused(true);
    setOpacity(0.6);
  };

  const handleBlur: React.FocusEventHandler<HTMLDivElement> = (e) => {
    onBlur?.(e);
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter: React.MouseEventHandler<HTMLDivElement> = (e) => {
    onMouseEnter?.(e);
    if (reducedMotion || !finePointer) return;
    setOpacity(0.6);
  };

  const handleMouseLeave: React.MouseEventHandler<HTMLDivElement> = (e) => {
    onMouseLeave?.(e);
    setOpacity(0);
  };

  return (
    <div
      {...props}
      data-react-bits="spotlight-card"
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("relative overflow-hidden", className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 ease-in-out"
        style={{
          opacity: reducedMotion || !finePointer ? 0 : opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />
      {children}
    </div>
  );
};

export default SpotlightCard;
