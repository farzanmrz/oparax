// lib/observability/ai-telemetry.ts
//
// The `experimental_telemetry` block every AI SDK call in this repo passes, defined ONCE.
//
// The manual PostHog AI consumer uses the ledger-stage policy below. This AI SDK block remains
// the stable per-stage privacy contract for any SDK telemetry integration registered later.
import type { TelemetryOptions } from "ai";

/** Every AI stage in the product. Deliberately mirrors `model_calls.stage`. */
export type AiStage =
  | "story_cluster"
  | "draft_filter"
  | "draft_synthesize"
  | "alert_judge"
  | "onboarding_agent";

/**
 * Whether a stage's prompt and completion text are recorded, per stage — NOT a global switch.
 *
 * Every remaining stage carries public source posts, synthesized public news, or public
 * profile data — no unpublished journalism flows through any of them since drafting was
 * removed, so content is recordable everywhere.
 *
 * `functionId` groups calls for a future telemetry consumer. Pass something stable and specific
 * (`"draft-filter-qwen"`, `"onboarding-agent-grok"`), because it is the axis latency and
 * cost get compared along.
 *
 * There is deliberately no custom-metadata parameter because `experimental_telemetry.metadata`
 * was removed in AI SDK v7.
 */
const RECORDS_CONTENT: Record<AiStage, boolean> = {
  story_cluster: true,
  draft_filter: true,
  draft_synthesize: true,
  alert_judge: true,
  onboarding_agent: true,
};

const PUBLIC_LEDGER_STAGES = new Set([
  "beat_gate",
  "source_onboarding",
  "source_narrowing",
  "filtering",
  "synthesis",
  "story_group",
  "alert_judge",
  "onboarding_agent",
]);

/** Content policy for model_calls.stage names. Unknown stages stay closed in production. */
export function aiContentAllowed(ledgerStage: string): boolean {
  return PUBLIC_LEDGER_STAGES.has(ledgerStage);
}

export function aiTelemetry(stage: AiStage, functionId: string): TelemetryOptions {
  const recordsContent = RECORDS_CONTENT[stage];
  return {
    isEnabled: true,
    recordInputs: recordsContent,
    recordOutputs: recordsContent,
    functionId,
  };
}
