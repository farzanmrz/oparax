// Per-token USD rates for models that bypass the gateway (direct xAI scan).
// Gateway calls (chat/draft/redraft) use providerMetadata.gateway.marketCost instead.
export const MODEL_RATES: Record<string, { input: number; output: number }> = {
  // grok-4.3 (direct xai.responses): $1.25/1M in, $2.50/1M out
  "grok-4.3": { input: 1.25 / 1_000_000, output: 2.5 / 1_000_000 },
};

// xAI x_search server-side tool: $5.00 / 1000 calls.
export const X_SEARCH_USD = 0.005;

// X API user-lookup (handle verification), pay-per-use, per checked handle.
export const X_VERIFY_USD = 0.01;

/** Look up per-token rates for a model id; null if unknown (gateway-priced). */
export function modelRate(model: string | null): { input: number; output: number } | null {
  if (!model) return null;
  return MODEL_RATES[model] ?? null;
}
