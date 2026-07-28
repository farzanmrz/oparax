// lib/agent/reasoning-trace.ts
//
// The ONE reading of "why does this model call carry no reasoning trace?". AGENTS.md's
// model-call rule requires "withheld" to stay distinguishable from "not captured" — and a call
// that deliberately ran with reasoning OFF is a third thing again: the DeepSeek grounding
// fallback and clustering classifier use `reasoning: "none"` by design, while the live delivery
// judge uses `reasoning: "high"` and can expose its trace. Reporting a deliberate no-trace call
// as a model that cannot expose one is simply false.
//
// The discriminator is the reasoning-token count the AI SDK already records on every call
// (`LanguageModelUsage.outputTokenDetails.reasoningTokens`, persisted verbatim inside
// `model_calls.usage`): tokens spent with no readable text back means the provider withheld the
// trace; zero tokens means the call did no reasoning to begin with. That count is already on
// every row ever written, so this classification is retroactive — it needs no new column and no
// backfill.
//
// Pure — no imports, no I/O — so the server-only capture path (`draft-council-run.ts`,
// `cluster.ts`) and the read-only shaping path (`council-query.ts`, which deliberately imports
// neither the drafting council nor `lib/sysprompts`) can share one derivation instead of
// restating it and drifting.

export type ReasoningTraceState =
  /** A readable trace was captured. */
  | "present"
  /** The model spent reasoning tokens but returned no readable trace — the provider withheld it. */
  | "withheld"
  /** The call did no reasoning at all (zero reasoning tokens) — e.g. a `reasoning: "none"` call. */
  | "none"
  /** The call reported no reasoning-token count, so neither of the above is provable. */
  | "unknown";

/** Reads `outputTokenDetails.reasoningTokens` off an in-flight `LanguageModelUsage` or off the
 *  `model_calls.usage` JSON it was persisted into. Null when the count is absent — an absent
 *  count is not a zero count, and collapsing the two is exactly what makes a missing trace
 *  undiagnosable after the fact. */
function reasoningTokensOf(usage: unknown): number | null {
  const tokens = (usage as { outputTokenDetails?: { reasoningTokens?: unknown } } | null)
    ?.outputTokenDetails?.reasoningTokens;
  return typeof tokens === "number" ? tokens : null;
}

/** Classifies why a call does or doesn't carry a reasoning trace. An empty-string trace counts
 *  as absent: a provider that returns a reasoning envelope with no text inside looks exactly
 *  like one that returned nothing, so the token count decides both cases the same way. */
export function reasoningTraceState(
  reasoning: string | null | undefined,
  usage: unknown,
): ReasoningTraceState {
  if (reasoning != null && reasoning.length > 0) return "present";
  const tokens = reasoningTokensOf(usage);
  if (tokens === null) return "unknown";
  return tokens > 0 ? "withheld" : "none";
}
