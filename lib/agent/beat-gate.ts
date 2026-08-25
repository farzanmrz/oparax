import "server-only";

import { randomUUID } from "node:crypto";
import type { GenerateObjectStepEndEvent } from "ai";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { resolveGatewayCost } from "@/lib/agent/gateway-cost";
import { captureAiGeneration, type TelemetryMessage } from "@/lib/observability/posthog-ai";
import { reportServerLog } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { BEAT_GATE_PROMPT } from "@/lib/sysprompts";

const MODEL = "anthropic/claude-sonnet-5";
// Adaptive thinking and the JSON response share this ceiling. Keep enough headroom for Sonnet
// to finish thinking before emitting the verdict; see the identical onboarding bound.
const SONNET_BEAT_GATE_MAX_OUTPUT_TOKENS = 16_000;
const SONNET_BEAT_GATE_PROVIDER_OPTIONS = {
  anthropic: { thinking: { type: "adaptive", effort: "medium" } },
};

async function insertBeatGateModelCall(
  ownerId: string,
  traceId: string,
  latencyMs: number,
  inputMessages: TelemetryMessage[],
  result: {
    output: string | null;
    usage: unknown;
    providerMetadata?: Record<string, unknown>;
  },
) {
  try {
    const admin = createAdminClient();
    const { costUsd, generationId } = await resolveGatewayCost({
      providerMetadata: result.providerMetadata,
    });
    const usage =
      result.usage !== null && typeof result.usage === "object"
        ? (result.usage as Record<string, unknown>)
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
        stage: "beat_gate",
        role: "primary",
        model: MODEL,
        output: result.output,
        reasoning: null,
        usage: {
          ...(inputTokens === undefined ? {} : { inputTokens }),
          ...(outputTokens === undefined ? {} : { outputTokens }),
          ...(totalTokens === undefined ? {} : { totalTokens }),
          outputTokenDetails: {
            ...(reasoningTokens === undefined ? {} : { reasoningTokens }),
          },
        } as Json,
        cost_usd: costUsd,
        generation_id: generationId,
        ref_kind: "owner",
        ref_id: ownerId,
      })
      .select("id")
      .single();
    if (error) throw error;
    captureAiGeneration({
      distinctId: ownerId,
      traceId,
      spanId: data.id,
      stage: "beat_gate",
      model: MODEL,
      usage: result.usage,
      latencyMs,
      streamed: false,
      generationId,
      inputMessages,
      outputText: result.output,
      properties: { owner_id: ownerId },
    });
    const { error: meterError } = await admin.from("usage_events").insert({
      owner_id: ownerId,
      kind: "beat_gate",
      units: 1,
      cost_usd: costUsd,
      ref_id: ownerId,
    });
    if (meterError) throw meterError;
  } catch (error) {
    console.error("beat-gate: ledger insert failed", error);
    reportServerLog("beat-gate: ledger insert failed", { error, scope: "beat_gate_ledger" });
  }
}

export async function checkBeatIntelligible(
  beat: string,
  ownerId: string,
): Promise<{ pass: boolean }> {
  const stepRef: { value: GenerateObjectStepEndEvent | null } = { value: null };
  const traceId = randomUUID();
  const inputMessages: TelemetryMessage[] = [
    { role: "system", content: BEAT_GATE_PROMPT },
    { role: "user", content: beat },
  ];
  const requestStartedAtMs = Date.now();
  try {
    const result = await generateObject({
      model: MODEL,
      providerOptions: SONNET_BEAT_GATE_PROVIDER_OPTIONS,
      reasoning: "medium",
      schema: z.object({ interpretable: z.boolean(), reason: z.string() }),
      system: BEAT_GATE_PROMPT,
      prompt: beat,
      maxOutputTokens: SONNET_BEAT_GATE_MAX_OUTPUT_TOKENS,
      onStepEnd: (event) => {
        stepRef.value = event;
      },
      abortSignal: AbortSignal.timeout(15_000),
    });
    await insertBeatGateModelCall(
      ownerId,
      traceId,
      Date.now() - requestStartedAtMs,
      inputMessages,
      {
        output: JSON.stringify(result.object),
        usage: result.usage,
        providerMetadata: result.providerMetadata,
      },
    );
    return { pass: result.object.interpretable };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      await insertBeatGateModelCall(
        ownerId,
        traceId,
        Date.now() - requestStartedAtMs,
        inputMessages,
        {
          output: stepRef.value?.objectText ?? error.text ?? null,
          usage: stepRef.value?.usage ?? error.usage,
          providerMetadata: stepRef.value?.providerMetadata,
        },
      );
    } else if (stepRef.value) {
      // A timeout can arrive after the provider completed a billed step. Preserve its captured
      // usage even though no object was returned to this request.
      await insertBeatGateModelCall(
        ownerId,
        traceId,
        Date.now() - requestStartedAtMs,
        inputMessages,
        {
          output: stepRef.value.objectText ?? null,
          usage: stepRef.value.usage,
          providerMetadata: stepRef.value.providerMetadata,
        },
      );
    }
    return { pass: true };
  }
}
