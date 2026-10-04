"use client";

import { Pause, Play } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { AmbientWaves } from "@/components/landing/ambient-waves";
import { Button } from "@/components/ui/button";
import { landingContent } from "@/lib/landing/content";

export function Atmosphere() {
  const layer = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const reduced = Boolean(useReducedMotion());
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = layer.current;
    if (!element) return;
    let intersecting = false;
    const updateVisibility = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      updateVisibility();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const running = !paused && !reduced && visible;
  const label = reduced
    ? landingContent.motion.reduced
    : paused
      ? landingContent.motion.resume
      : landingContent.motion.pause;

  return (
    <>
      <div ref={layer} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <AmbientWaves dark={resolvedTheme === "dark"} running={running} />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        aria-pressed={!paused && !reduced}
        disabled={reduced}
        onClick={() => setPaused((value) => !value)}
        className="absolute top-0 right-0 size-11 desk:size-8"
      >
        {paused || reduced ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </Button>
    </>
  );
}
