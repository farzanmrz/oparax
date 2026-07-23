/**
 * Shared display formatters. Pure, no I/O.
 */

/**
 * Format a USD cost for display. Per-model / per-story council costs are sub-cent
 * and need 3 decimals to be meaningful ("$0.019", "$0.054"); dashboard totals read
 * cleaner at 2 ("$50.30"). `null`/`undefined` (an un-costed model_calls row) renders
 * as "$0.00" — callers that must distinguish "unknown" from "free" can special-case
 * before calling.
 */
export function formatCost(usd: number | null | undefined): string {
  if (usd == null || Number.isNaN(usd)) return "$0.00";
  if (usd > 0 && usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}
