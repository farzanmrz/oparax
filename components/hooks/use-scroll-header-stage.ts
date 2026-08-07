"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useScrollContainer } from "@/components/scroll-container";

export type ScrollHeaderStage = "full" | "hidden" | "tabs";

export function useScrollHeaderStage(hasTabs: boolean): ScrollHeaderStage {
  const pathname = usePathname();
  const container = useScrollContainer();
  const [stage, setStage] = useState<ScrollHeaderStage>("full");
  const previousTop = useRef(0);
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;
    setStage("full");
    previousTop.current = container?.scrollTop ?? 0;
  }, [container, pathname]);

  useEffect(() => {
    if (!container) return;

    function updateStage() {
      const nextTop = container?.scrollTop ?? 0;
      if (nextTop <= 90) {
        setStage("full");
      } else if (nextTop > previousTop.current) {
        setStage("hidden");
      } else if (nextTop < previousTop.current) {
        setStage(hasTabs ? "tabs" : "full");
      }
      previousTop.current = nextTop;
    }

    container.addEventListener("scroll", updateStage, { passive: true });
    return () => container.removeEventListener("scroll", updateStage);
  }, [container, hasTabs]);

  return stage;
}
