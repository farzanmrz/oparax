// lib/agent/gateway-cost.ts
//
// THE ONE cost path. Was inline in lib/voice/extract-guide.ts; extracted here so a third copy
// never gets written alongside it and lib/agent/usage-cost.ts's retired path.
// See AGENTS.md's metering + model-call rules (inferenceCost is a STRING — Number() it).
import { getVercelOidcToken } from "@vercel/oidc";
import type { createAdminClient } from "@/lib/supabase/admin";

/** Finite number or null ("unknown") — never NaN, so a junk cost string doesn't suppress the
 *  generation-lookup fallback or write NaN into cost_usd. */
export const toFiniteOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : null;
  return n != null && Number.isFinite(n) ? n : null;
};

const GENERATION_URL = "https://ai-gateway.vercel.sh/v1/generation";

// Mirrors `GATEWAY_AUTH_METHOD_HEADER` from `@ai-sdk/gateway`'s internal `gateway-headers.ts`
// (not part of that package's public export surface, so the literal is copied here rather than
// imported) — the gateway's own provider sends this alongside the bearer token on every request,
// api-key or OIDC alike, so this raw fetch matches that contract rather than inventing its own.
const GATEWAY_AUTH_METHOD_HEADER = "ai-gateway-auth-method";

// Sentry captures errors on its own; this is a one-time, cheap signal for the specific "we can
// never resolve a BYOK cost" gap below, logged at most once per server lifetime so a busy
// reconciliation loop doesn't spam stdout on every miss.
let warnedNoAuth = false;

/**
 * Resolves the bearer token this raw fetch authenticates with, api-key first (local dev),
 * Vercel OIDC second (every deployed environment per AGENTS.md — Vercel OIDC, no
 * `AI_GATEWAY_API_KEY` present there). Mirrors `getGatewayAuthToken` inside
 * `@ai-sdk/gateway`'s `gateway-provider.ts` (that function itself is internal, not exported —
 * this reimplements its two-branch shape against the public `@vercel/oidc` package, which IS
 * exported and is what `@ai-sdk/gateway` itself depends on for the OIDC branch): `getVercelOidcToken()`
 * reads the `x-vercel-oidc-token` request-context header or the `VERCEL_OIDC_TOKEN` env var
 * Vercel injects into every deployed function when the project has OIDC enabled, and refreshes it
 * if expired. It throws when neither is present (plain local dev, OIDC not enabled) — caught here
 * and surfaced as a loud one-time warning rather than a silent, unlogged null, since a
 * production deploy hitting this branch and still getting nothing back means OIDC is not actually
 * enabled for the project and BYOK cost reporting is dark until that's fixed.
 */
async function resolveGatewayAuth(): Promise<{
  token: string;
  authMethod: "api-key" | "oidc";
} | null> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (apiKey) return { token: apiKey, authMethod: "api-key" };
  try {
    const token = await getVercelOidcToken();
    return { token, authMethod: "oidc" };
  } catch (err) {
    if (!warnedNoAuth) {
      warnedNoAuth = true;
      console.warn(
        "gateway-cost: no AI_GATEWAY_API_KEY and no usable Vercel OIDC token — BYOK generation " +
          "cost lookups (fetchGenerationCost/reconcileMissingCosts) will return null for the " +
          "rest of this process's lifetime. In production this means OIDC is not actually " +
          "enabled for the project; local dev without either is expected and harmless.",
        err,
      );
    }
    return null;
  }
}

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
async function fetchGenerationCost(generationId: string): Promise<number | null> {
  const auth = await resolveGatewayAuth();
  if (!auth) return null;
  try {
    const res = await fetch(`${GENERATION_URL}?id=${encodeURIComponent(generationId)}`, {
      headers: {
        authorization: `Bearer ${auth.token}`,
        [GATEWAY_AUTH_METHOD_HEADER]: auth.authMethod,
      },
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
 * KNOWN GAP, investigated and deliberately NOT fixed here: this repairs `model_calls.cost_usd`
 * only. The matching `usage_events` row (the "kind": "clustering" | "drafting" row
 * `draft-pipeline.ts`'s `stampUsageEvent` writes alongside each `model_calls` insert) is stamped
 * with whatever `cost_usd` the call resolved to AT WRITE TIME and is never revisited — so a
 * repaired BYOK call's `model_calls.cost_usd` and its `usage_events.cost_usd` permanently
 * disagree once this function runs. This is not a same-pass fix: `usage_events` carries no
 * column that identifies which specific `model_calls` row a given event came from. Its only
 * candidate correlation key is (`ref_id`, `kind`) — `ref_id` is `sourcePostId`, not a
 * `model_calls.id` — and `draft-pipeline.ts` inserts MULTIPLE `model_calls` rows sharing the
 * same `(ref_id, kind)` pair per delivery (e.g. every drafting-council member across every
 * platform for one source post all stamp `kind: "drafting"` against the same `ref_id`), so
 * `(ref_id, kind)` cannot distinguish one `model_calls` row from its siblings — there is no
 * reliable 1:1 join. Fixing this for real needs a schema addition (a `model_call_id` FK on
 * `usage_events`, or stamping `usage_events` from `insertModelCalls` per-row instead of
 * per-call-in-a-loop-after-the-fact) — a deliberate decision and its own migration, not something
 * to bolt on here with a guessed join.
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
