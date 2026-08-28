// lib/agent/ledger.ts
//
// THE model-call and usage ledger writers, extracted from draft-pipeline.ts so downstream
// stages (the alert flow) can ledger their own CouncilCalls without importing the pipeline
// (which would be an import cycle). The cross-cutting invariants (AGENTS.md's metering +
// model-call rules) live here:
//   - every element of a `calls` array becomes exactly one `model_calls` row, carrying
//     `output`, `reasoning`, and `usage` (including `reasoningWithheldByProvider`).
//   - every touch point stamps `usage_events`.
// Ledger-first ordering is the callers' responsibility: `model_calls` rows are written before
// the story rows that depend on their results.

import type { CouncilCall } from "@/lib/agent/draft-council-run";
import { captureAiGeneration } from "@/lib/observability/posthog-ai";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;

/** The ONE place a `CouncilCall` becomes a `model_calls` row. Inserted one row at a time (not
 *  batched) so the returned ids are guaranteed aligned with `calls` BY INDEX — a batched
 *  insert's returned order is not a contract PostgREST makes, and a misaligned join would
 *  silently attribute a call to the wrong model. `distinctId` is the PostHog identity the AI
 *  generation is attributed to — the pilot person (`x:<handle>`) when the desk has a public
 *  feed, else the owning user. */
export type LedgerAttribution = {
  /** PostHog identity for the AI generation (e.g. `x:<handle>`); defaults to the owner id. */
  distinctId?: string;
  /** The pilot person's handle, attached as a property when known. */
  pilotHandle?: string | null;
};

export async function insertModelCalls(
  admin: AdminClient,
  ownerId: string,
  agentId: string,
  calls: CouncilCall[],
  sourcePostId: string,
  attribution: LedgerAttribution = {},
): Promise<string[]> {
  const ids: string[] = [];
  for (const call of calls) {
    const usage =
      call.usage !== null && typeof call.usage === "object"
        ? (call.usage as Record<string, unknown>)
        : {};
    const outputTokenDetails =
      usage.outputTokenDetails !== null && typeof usage.outputTokenDetails === "object"
        ? (usage.outputTokenDetails as Record<string, unknown>)
        : {};
    const finiteToken = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) ? value : undefined;
    const inputTokens = finiteToken(usage.inputTokens);
    const outputTokens = finiteToken(usage.outputTokens);
    const totalTokens = finiteToken(usage.totalTokens);
    const reasoningTokens = finiteToken(outputTokenDetails.reasoningTokens);
    const { data, error } = await admin
      .from("model_calls")
      .insert({
        owner_id: ownerId,
        stage: call.stage,
        role: call.role,
        model: call.model,
        output: call.output,
        reasoning: null,
        usage: {
          ...(inputTokens === undefined ? {} : { inputTokens }),
          ...(outputTokens === undefined ? {} : { outputTokens }),
          ...(totalTokens === undefined ? {} : { totalTokens }),
          outputTokenDetails: {
            ...(reasoningTokens === undefined ? {} : { reasoningTokens }),
          },
          reasoningWithheldByProvider: call.reasoningWithheldByProvider,
        } as unknown as Json,
        cost_usd: call.costUsd,
        generation_id: call.generationId,
        ref_kind: "source_post",
        ref_id: sourcePostId,
      })
      .select("id")
      .single();
    if (error) throw error;
    ids.push(data.id);
    captureAiGeneration({
      distinctId: attribution.distinctId ?? ownerId,
      traceId: `${agentId}:${sourcePostId}`,
      spanId: data.id,
      stage: call.stage,
      model: call.model,
      usage: call.usage,
      latencyMs: call.latencyMs,
      streamed: false,
      generationId: call.generationId,
      inputMessages: call.telemetryInput,
      outputText: call.output,
      properties: {
        agent_id: agentId,
        source_post_id: sourcePostId,
        ...(attribution.pilotHandle ? { pilot_handle: attribution.pilotHandle } : {}),
      },
    });
  }
  return ids;
}

export async function stampUsageEvent(
  admin: AdminClient,
  row: { owner_id: string; kind: string; units: number; cost_usd: number | null; ref_id: string },
): Promise<void> {
  const { error } = await admin.from("usage_events").insert(row);
  // stream_delivery is idempotent on (owner_id, ref_id) in the database. A lost ingest
  // response can redeliver the same source post; that duplicate is success, while every other
  // ledger error remains fatal.
  const isDuplicateStreamDelivery =
    row.kind === "stream_delivery" &&
    error?.code === "23505" &&
    error.details?.includes("Key (owner_id, ref_id)=");
  if (error && !isDuplicateStreamDelivery) throw error;
}
