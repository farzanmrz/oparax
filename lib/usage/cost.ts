import { modelRate, X_SEARCH_USD, X_VERIFY_USD } from "@/lib/usage/pricing";

export interface CostInput {
  kind: string;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Gateway market-rate cost for this call, if the gateway reported it (BYOK estimate). */
  gatewayMarketCost: number | null;
  /** xSearch tool invocations (scan only). */
  xSearchCalls: number | null;
  /** Quantity for x_verify (handles checked). */
  verifyCount: number | null;
}

/** Resolve a USD cost for one leaf event. Pure + total — never throws, never null. */
export function computeCostUsd(input: CostInput): number {
  // 1) Gateway calls: trust the gateway's market-rate estimate when present.
  if (input.gatewayMarketCost != null && input.gatewayMarketCost > 0) {
    return round6(input.gatewayMarketCost);
  }
  // 2) X API verification: per-handle flat rate.
  if (input.kind === "x_verify") {
    return round6((input.verifyCount ?? 0) * X_VERIFY_USD);
  }
  // 3) web_validate + anything internal: free.
  if (input.kind === "web_validate") return 0;
  // 4) Token-priced models (direct-xAI scan, or gateway fallback when marketCost absent).
  const rate = modelRate(input.model);
  const tokenCost = rate
    ? (input.inputTokens ?? 0) * rate.input + (input.outputTokens ?? 0) * rate.output
    : 0;
  const searchCost = (input.xSearchCalls ?? 0) * X_SEARCH_USD;
  return round6(tokenCost + searchCost);
}

function round6(n: number): number {
  return Number(n.toFixed(6));
}
