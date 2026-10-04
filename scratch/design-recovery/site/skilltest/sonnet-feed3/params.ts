import type { View } from "@/next/council/data";

type Filter = "all" | "x" | "rss" | "website" | "github";

/** Page options from the query string: view, theme, a source group to open on, and ?empty=1 for the empty feed. */
export function parseParams(sp: Record<string, string | undefined>) {
  const view: View = sp.view === "direct" ? "direct" : "clustered";
  const source: Filter = (["x", "rss", "website", "github"] as const).find((s) => s === sp.source) ?? "all";
  return { view, theme: sp.theme, source, empty: sp.empty === "1" };
}
