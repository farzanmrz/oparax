"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type ScrollContainerValue = {
  element: HTMLDivElement | null;
  setElement: (element: HTMLDivElement | null) => void;
};

const ScrollContainerContext = createContext<ScrollContainerValue | null>(null);

export function ScrollContainerProvider({ children }: { children: ReactNode }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  return (
    <ScrollContainerContext.Provider value={{ element, setElement }}>
      {children}
    </ScrollContainerContext.Provider>
  );
}

export function ScrollRegion({ children, className }: { children: ReactNode; className?: string }) {
  const context = useContext(ScrollContainerContext);
  if (!context) throw new Error("ScrollRegion must be rendered inside ScrollContainerProvider");

  return (
    <div ref={context.setElement} className={cn("op-scroll-region", className)}>
      {children}
    </div>
  );
}

export function useScrollContainer(): HTMLDivElement | null {
  const context = useContext(ScrollContainerContext);
  if (!context) {
    throw new Error("useScrollContainer must be used inside ScrollContainerProvider");
  }
  return context.element;
}
