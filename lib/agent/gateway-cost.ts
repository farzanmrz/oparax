// lib/agent/gateway-cost.ts
//
// THE ONE cost path. Was inline in lib/voice/extract-guide.ts; extracted here so a third copy
// never gets written alongside it and lib/agent/usage-cost.ts's retired path.
// See AGENTS.md's metering + model-call rules (inferenceCost is a STRING — Number() it).
import type { createAdminClient } from "@/lib/supabase/admin";

/** Finite number or null ("unknown") — never NaN, so a junk cost string doesn't suppress the
 *  generation-lookup fallback or write NaN into cost_usd. */
export const toFiniteOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : null;
  return n != null && Number.isFinite(n) ? n : null;
};

const GENERATION_URL = "https://ai-gateway.vercel.sh/v1/generation";

/**
 * The gateway's own record of one generation, fetched by id.
 *
 * This is a RAW fetch, not `gateway.getGenerationInfo()` from `@ai-sdk/gateway`, and that is a
 * deliberate replacement rather than a style choice: on 4.0.11 that helper throws
 * `Invalid error response format: Gateway request failed` against a response the endpoint
 * returns as a perfectly good HTTP 200 — it fails to parse its own success shape, and then
 * fails to parse the error it invents about it. `resolveGatewayCost` caught that throw and
 * degraded every affected call's cost to null, silently, which is exactly the metering gap the
 * ledger exists to prevent. Live-probed 2026-07-25; re-check on an SDK upgrade before reverting.
 *
 * Two fields matter, and the second one is why this can't just read `total_cost`:
 *   - `total_cost`      — what VERCEL bills. Zero on a BYOK call, because Vercel isn't billing.
 *   - `upstream_inference_cost` — what the PROVIDER charges. The real number under BYOK.
 * With DeepSeek and DeepInfra keys attached, `total_cost` is 0 on every drafting call, so
 * reading it alone would have recorded $0 for the entire council. Prefer a non-zero total_cost
 * (the non-BYOK path, where it is authoritative) and fall back to upstream.
 */
export async function fetchGenerationCost(generationId: string): Promise<number | null> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return null; // deployed runs authenticate via Vercel OIDC — nothing to do here
  try {
    const res = await fetch(`${GENERATION_URL}?id=${encodeURIComponent(generationId)}`, {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { total_cost?: unknown; upstream_inference_cost?: unknown };
    };
    const total = toFiniteOrNull(body.data?.total_cost);
    if (total != null && total > 0) return total;
    return toFiniteOrNull(body.data?.upstream_inference_cost) ?? total;
  } catch {
    return null;
  }
}

/** The ONE cost path: gateway metadata first (inferenceCost is a STRING), then a generation
 *  lookup by id for the providers that omit it (DeepSeek/GLM). Reads a call's TOP-LEVEL
 *  providerMetadata; no per-step usage needed. Never throws — cost_usd degrades to null (the
 *  nullable-cost convention) rather than failing a call that already billed. */
export async function resolveGatewayCost(result: {
  providerMetadata?: Record<string, unknown>;
}): Promise<{ costUsd: number | null; generationId: string | null }> {
  const gw = result.providerMetadata?.gateway as
    | { inferenceCost?: unknown; cost?: unknown; generationId?: string }
    | undefined;
  let costUsd = toFiniteOrNull(gw?.inferenceCost ?? gw?.cost);
  const generationId = gw?.generationId ?? null;
  // ZERO triggers the lookup as surely as null does. On a BYOK call the metadata reports
  // `inferenceCost: 0` (or omits it) — structurally a valid number, so a `== null` guard accepts
  // it and never looks further, recording $0 for a call the provider really did charge for. With
  // DeepSeek and DeepInfra keys attached that is the ENTIRE drafting council reading as free.
  //
  // The lookup will usually MISS here, and that is expected, not a failure: the gateway's usage
  // event is not queryable for ~19s after the call returns (live-probed 2026-07-25 — 404 at 0s,
  // 1s, 4s and 9s; 200 at 19s). Blocking a request that long to price it would be absurd, so
  // this stays a single cheap attempt and the miss is repaired later by
  // `reconcileMissingCosts()`, which is what `model_calls.generation_id` is stored for.
  if ((costUsd == null || costUsd === 0) && generationId) {
    costUsd = await fetchGenerationCost(generationId);
  }
  return { costUsd, generationId };
}

/**
 * Repairs `model_calls` rows whose cost never resolved at write time.
 *
 * Necessary because of the ~19s lag above: a call priced synchronously misses whenever the
 * provider omits `inferenceCost` from metadata, which is every BYOK provider (DeepSeek,
 * DeepInfra) and has been since BYOK was attached. The row is still written — ledger-first,
 * cost null — and `generation_id` is the handle that makes it repairable. Anthropic and OpenAI
 * report cost in metadata and never need this.
 *
 * Idempotent and safe to run repeatedly: it only touches rows that still have no usable cost and
 * do have a generation id, and it leaves a row alone when the lookup still comes back empty
 * (a genuinely-free call, or one whose usage event has aged out).
 *
 * Returns what it changed so a caller can report it rather than guess.
 */
export async function reconcileMissingCosts(
  admin: ReturnType<typeof createAdminClient>,
  limit = 200,
): Promise<{ examined: number; repaired: number; totalUsd: number }> {
  const { data, error } = await admin
    .from("model_calls")
    .select("id, generation_id, cost_usd")
    .not("generation_id", "is", null)
    .or("cost_usd.is.null,cost_usd.eq.0")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []).filter(
    (r): r is typeof r & { generation_id: string } => r.generation_id != null,
  );
  let repaired = 0;
  let totalUsd = 0;
  for (const row of rows) {
    const cost = await fetchGenerationCost(row.generation_id);
    if (cost == null || cost === 0) continue;
    const { error: updateError } = await admin
      .from("model_calls")
      .update({ cost_usd: cost })
      .eq("id", row.id);
    if (updateError) continue;
    repaired += 1;
    totalUsd += cost;
  }
  return { examined: rows.length, repaired, totalUsd };
}
