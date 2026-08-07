"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useScrollContainer } from "@/components/scroll-container";

export type ScrollHeaderStage = "full" | "hidden" | "tabs";

export function useScrollHeaderStage(): ScrollHeaderStage {
  const pathname = usePathname();
  const container = useScrollContainer();
  const [stage, setStage] = useState<ScrollHeaderStage>("full");
  const previousTop = useRef(0);

  useEffect(() => {
    setStage("full");
    previousTop.current = container?.scrollTop ?? 0;
    if (!container) return;

    function updateStage() {
      const nextTop = container?.scrollTop ?? 0;
      if (nextTop <= 90) {
        setStage("full");
      } else if (nextTop > previousTop.current) {
        setStage("hidden");
      } else if (nextTop < previousTop.current) {
        setStage("tabs");
      }
      previousTop.current = nextTop;
    }

    container.addEventListener("scroll", updateStage, { passive: true });
    return () => container.removeEventListener("scroll", updateStage);
  }, [container, pathname]);

  return stage;
}
