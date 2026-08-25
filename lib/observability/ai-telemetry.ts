// lib/observability/ai-telemetry.ts
//
// The `experimental_telemetry` block every AI SDK call in this repo passes, defined ONCE.
//
// The manual PostHog AI consumer uses the ledger-stage policy below. This AI SDK block remains
// the stable per-stage privacy contract for any SDK telemetry integration registered later.
import type { TelemetryOptions } from "ai";

/** Every AI stage in the product. Deliberately mirrors `model_calls.stage`. */
export type AiStage =
  | "voice_extraction"
  | "story_cluster"
  | "draft_filter"
  | "draft_synthesize"
  | "draft_translate"
  | "draft_council"
  | "draft_write";

/**
 * Whether a stage's prompt and completion text are recorded, per stage — NOT a global switch.
 *
 * Public extraction and classification content may be recorded by a future consumer, but
 * unpublished drafts must not enter third-party telemetry in production.
 *
 * `voice_extraction` and `story_cluster` carry public posts or classification output. The drafting
 * stages carry unpublished journalism, so their content is disabled only in production.
 *
 * `functionId` groups calls for a future telemetry consumer. Pass something stable and specific
 * (`"voice-extraction-stream"`, `"draft-write-qwen"`), because it is the axis latency and
 * cost get compared along.
 *
 * There is deliberately no custom-metadata parameter because `experimental_telemetry.metadata`
 * was removed in AI SDK v7.
 */
const DRAFT_CONTENT_ALLOWED = process.env.VERCEL_ENV !== "production";
const RECORDS_CONTENT: Record<AiStage, boolean> = {
  voice_extraction: true,
  story_cluster: true,
  draft_filter: DRAFT_CONTENT_ALLOWED,
  draft_synthesize: DRAFT_CONTENT_ALLOWED,
  draft_translate: DRAFT_CONTENT_ALLOWED,
  draft_council: DRAFT_CONTENT_ALLOWED,
  draft_write: DRAFT_CONTENT_ALLOWED,
};

const PUBLIC_LEDGER_STAGES = new Set([
  "beat_gate",
  "source_onboarding",
  "source_narrowing",
  "voice_extraction",
]);

/** Content policy for model_calls.stage names. Unknown stages stay closed in production. */
export function aiContentAllowed(ledgerStage: string): boolean {
  return PUBLIC_LEDGER_STAGES.has(ledgerStage) || DRAFT_CONTENT_ALLOWED;
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
