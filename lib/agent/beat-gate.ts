import "server-only";

import * as Sentry from "@sentry/nextjs";
import type { GenerateObjectStepEndEvent } from "ai";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { resolveGatewayCost } from "@/lib/agent/gateway-cost";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { BEAT_GATE_PROMPT } from "@/lib/sysprompts";

const MODEL = "anthropic/claude-sonnet-5";

async function insertBeatGateModelCall(
  ownerId: string,
  result: {
    output: string | null;
    reasoning: string | null;
    usage: unknown;
    providerMetadata?: Record<string, unknown>;
  },
) {
  try {
    const admin = createAdminClient();
    const { costUsd, generationId } = await resolveGatewayCost({
      providerMetadata: result.providerMetadata,
    });
    const { error } = await admin.from("model_calls").insert({
      owner_id: ownerId,
      stage: "beat_gate",
      role: "primary",
      model: MODEL,
      output: result.output,
      reasoning: result.reasoning,
      usage: result.usage as Json,
      cost_usd: costUsd,
      generation_id: generationId,
      ref_kind: "owner",
      ref_id: ownerId,
    });
    if (error) throw error;
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
    Sentry.captureException(error);
  }
}

export async function checkBeatIntelligible(
  beat: string,
  ownerId: string,
): Promise<{ pass: boolean }> {
  const stepRef: { value: GenerateObjectStepEndEvent | null } = { value: null };
  try {
    const result = await generateObject({
      model: MODEL,
      schema: z.object({ interpretable: z.boolean(), reason: z.string() }),
      system: BEAT_GATE_PROMPT,
      prompt: beat,
      maxOutputTokens: 500,
      onStepEnd: (event) => {
        stepRef.value = event;
      },
      abortSignal: AbortSignal.timeout(15_000),
    });
    await insertBeatGateModelCall(ownerId, {
      output: JSON.stringify(result.object),
      reasoning: stepRef.value?.reasoning ?? null,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
    });
    return { pass: result.object.interpretable };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      await insertBeatGateModelCall(ownerId, {
        output: stepRef.value?.objectText ?? error.text ?? null,
        reasoning: stepRef.value?.reasoning ?? null,
        usage: stepRef.value?.usage ?? error.usage,
        providerMetadata: stepRef.value?.providerMetadata,
      });
    }
    return { pass: true };
  }
}
