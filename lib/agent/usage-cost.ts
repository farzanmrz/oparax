// lib/agent/usage-cost.ts
//
// Reads the DeepSeek provider's own dollar estimate out of ONE call's raw usage.
// The AI Gateway surfaces per-call cost as `usage.raw.estimated_cost` (USD) — verified
// against production runs rows. `generateText`'s TOP-LEVEL `usage` is the summed-across-
// steps reduce, which DROPS `raw`, so callers must pass PER-STEP usage
// (`result.steps[i].usage`) or a single-call `generateObject` usage. Nullable end to end:
// a gateway-routed provider that omits the field yields null (unknown) — never a
// fabricated price. Pure, no I/O.
export function rawEstimatedCost(usage: unknown): number | null {
  const raw = (usage as { raw?: { estimated_cost?: unknown } } | undefined)?.raw;
  return typeof raw?.estimated_cost === "number" ? raw.estimated_cost : null;
}

/** Sum the known (non-null) costs; null when every input is null (nothing known to sum). */
export function sumCosts(costs: Array<number | null>): number | null {
  const known = costs.filter((c): c is number => c != null);
  return known.length > 0 ? known.reduce((sum, c) => sum + c, 0) : null;
}
