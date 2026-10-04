"use client";

import type { ReactNode } from "react";
import SpotlightCard from "@/components/react-bits/SpotlightCard";

/** React Bits SpotlightCard, recolored to the page's one brand blue: a soft light that follows the pointer. */
export function Spot({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <SpotlightCard className={className} spotlightColor="color-mix(in srgb, var(--brand) 16%, transparent)">
      {children}
    </SpotlightCard>
  );
}
