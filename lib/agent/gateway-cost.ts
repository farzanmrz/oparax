// lib/agent/gateway-cost.ts
//
// THE ONE L7 cost path. Was inline in lib/voice/extract-guide.ts; extracted here so a third
// copy never gets written alongside it and lib/agent/usage-cost.ts's retired pre-L7 path.
// See decisions.md L7, L9.1 (inferenceCost is a STRING — Number() it), L9.5.
import { gateway } from "ai";

/** Finite number or null ("unknown") — never NaN, so a junk cost string doesn't suppress the
 *  getGenerationInfo fallback or write NaN into cost_usd. */
export const toFiniteOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : null;
  return n != null && Number.isFinite(n) ? n : null;
};

/** The ONE L7 cost path: gateway metadata first (inferenceCost is a STRING — L9.1),
 *  gateway.getGenerationInfo({ id }) fallback (returns totalCost for every provider — the
 *  proper fix for DeepSeek/GLM's missing inferenceCost). Reads a call's TOP-LEVEL
 *  providerMetadata; no per-step usage needed. */
export async function resolveGatewayCost(result: {
  providerMetadata?: Record<string, unknown>;
}): Promise<{ costUsd: number | null; generationId: string | null }> {
  const gw = result.providerMetadata?.gateway as
    | { inferenceCost?: unknown; cost?: unknown; generationId?: string }
    | undefined;
  let costUsd = toFiniteOrNull(gw?.inferenceCost ?? gw?.cost);
  const generationId = gw?.generationId ?? null;
  if (costUsd == null && generationId) {
    try {
      const info = await gateway.getGenerationInfo({ id: generationId });
      costUsd = toFiniteOrNull((info as { totalCost?: unknown })?.totalCost);
    } catch {
      // Non-fatal — cost_usd degrades to null (the nullable-cost convention).
    }
  }
  return { costUsd, generationId };
}
