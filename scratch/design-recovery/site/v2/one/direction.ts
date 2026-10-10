"use client";

import { useSearchParams } from "next/navigation";

// The two directions the council agreed on October 9 for the places the owner named (the sidebar, the settings
// cards, the feed card, the onboarding's run), switched with ?dir=a or ?dir=b from the lab switcher so he can see
// both. A is the default. Review-only: the product will carry one.
export type Dir = "a" | "b";

export function useDirection(): Dir {
  const search = useSearchParams();
  return search.get("dir") === "b" ? "b" : "a";
}
