// lib/agent/usage-cost.ts
//
// Sums per-call dollar costs already resolved elsewhere. The L7 resolver is
// `lib/agent/gateway-cost.ts`'s `resolveGatewayCost`; this module no longer reads raw
// usage itself — the old desk scan/draft/onboarding pipeline that did
// (`rawEstimatedCost`, predating L7) was deleted with that pipeline (D15).

/** Sum the known (non-null) costs; null when every input is null (nothing known to sum). */
export function sumCosts(costs: Array<number | null>): number | null {
  const known = costs.filter((c): c is number => c != null);
  return known.length > 0 ? known.reduce((sum, c) => sum + c, 0) : null;
}
