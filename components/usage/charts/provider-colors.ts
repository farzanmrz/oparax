/**
 * Per-provider chart colors. Canvas (recharts SVG) can't read CSS custom
 * properties reliably, so these are hard-coded hex values that align with the
 * graphite palette. Unknown providers fall back to a neutral graphite.
 */
const PROVIDER_COLORS: Record<string, string> = {
  xai: "#534AB7",
  deepinfra: "#1D9E75",
  deepseek: "#378ADD",
  x_api: "#888780",
  gateway: "#BA7517",
  internal: "#888780",
};

const FALLBACK = "#888780";

/** A small rotating palette for keys without a fixed provider color (e.g. kinds, users). */
const PALETTE = ["#534AB7", "#378ADD", "#1D9E75", "#BA7517", "#888780", "#8A6FE8", "#5FBF9B"];

export function providerColor(key: string): string {
  return PROVIDER_COLORS[key] ?? FALLBACK;
}

/** Deterministic color for an arbitrary key — provider color if known, else palette by index. */
export function colorForKey(key: string, index: number): string {
  return PROVIDER_COLORS[key] ?? PALETTE[index % PALETTE.length];
}
