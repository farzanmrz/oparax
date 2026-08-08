// lib/agent/call-meta.ts
//
// ONE shared implementation of the derived-metadata trio every `CouncilCall` builder needs:
// `costUsd`/`generationId` via `resolveGatewayCost`, and `reasoningWithheldByProvider` via
// `reasoningTraceState(...) === "withheld"`. `cluster.ts`'s `buildClusterCall` calls this.
// `draft-council-run.ts`'s `toCouncilCall` still computes the same trio inline for correction
// revisions. The duplication is a known, tracked leftover, not an oversight; a future pass can
// point `toCouncilCall` at this helper once that risk has passed.
import type { CouncilCall } from "@/lib/agent/draft-council-run";
import { resolveGatewayCost } from "@/lib/agent/gateway-cost";
import { reasoningTraceState } from "@/lib/agent/reasoning-trace";

/** Resolves the shared derived-metadata trio and assembles a full `CouncilCall`. Every field but
 *  the trio passes straight through from `params`. "Withheld" is derived, not assumed: a null
 *  trace only means the PROVIDER held it back when the call actually spent reasoning tokens — a
 *  call that deliberately ran with reasoning off (e.g. `reasoning: "none"`) has no trace by
 *  design, which `reasoningTraceState` tells apart (`reasoning-trace.ts`). */
export async function resolveCallMeta(params: {
  kind: CouncilCall["kind"];
  stage: CouncilCall["stage"];
  role: CouncilCall["role"];
  model: string;
  output: string | null;
  reasoning: string | null;
  usage: unknown;
  providerMetadata?: Record<string, unknown>;
  draftConstruction?: CouncilCall["draftConstruction"];
  draftOnBeatReason?: CouncilCall["draftOnBeatReason"];
}): Promise<CouncilCall> {
  const { costUsd, generationId } = await resolveGatewayCost({
    providerMetadata: params.providerMetadata,
  });
  return {
    kind: params.kind,
    stage: params.stage,
    role: params.role,
    model: params.model,
    output: params.output,
    reasoning: params.reasoning,
    reasoningWithheldByProvider: reasoningTraceState(params.reasoning, params.usage) === "withheld",
    usage: params.usage,
    costUsd,
    generationId,
    ...(params.draftConstruction === undefined
      ? {}
      : { draftConstruction: params.draftConstruction }),
    ...(params.draftOnBeatReason === undefined
      ? {}
      : { draftOnBeatReason: params.draftOnBeatReason }),
  };
}
