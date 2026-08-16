// lib/observability/ai-telemetry.ts
//
// The `experimental_telemetry` block every AI SDK call in this repo passes, defined ONCE.
//
// Why a helper rather than a literal per call site: production registers no global AI SDK
// telemetry integration, so Sentry records nothing unless each call opts in. This helper supplies
// the stable function id and the per-stage input/output privacy policy Sentry honors. Eight
// literals across four files is eight chances to drift; a helper is one.
import * as Sentry from "@sentry/nextjs";
import type { TelemetryOptions } from "ai";

/** Every AI stage in the product. Deliberately mirrors `model_calls.stage`, so a span in Sentry
 *  and its ledger row in Postgres name the same thing and can be joined by eye. */
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
 * `dataCollection.genAI` in sentry-shared.ts is the outer gate; this is the inner one. Public
 * extraction and classification content may be recorded, but unpublished drafts must not enter
 * third-party error reports in production. Preview/local keep draft content visible for debugging.
 *
 * `voice_extraction` and `story_cluster` carry public posts or classification output. The drafting
 * stages carry unpublished journalism, so their content is disabled only in production.
 *
 * `functionId` groups calls in Sentry's AI dashboard — pass something stable and specific
 * (`"voice-extraction-stream"`, `"draft-write-qwen"`), because it is the axis latency and
 * cost get compared along.
 *
 * There is deliberately NO custom-metadata parameter. `experimental_telemetry.metadata` was
 * REMOVED in AI SDK v7 — Sentry's docs, its skill examples and its own bundled `TelemetrySettings`
 * type all still describe it, because they are typed against v5/v6, and passing it here is a
 * compile error rather than a silently ignored key (which is the only reason it was caught).
 * Ids that identify a run — the desk, the handle, the corpus size — go on the WRAPPING span
 * instead: see `withAiSpan`.
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

export function aiTelemetry(stage: AiStage, functionId: string): TelemetryOptions {
  const recordsContent = RECORDS_CONTENT[stage];
  return {
    isEnabled: true,
    recordInputs: recordsContent,
    recordOutputs: recordsContent,
    functionId,
  };
}

/** Attribute values OpenTelemetry accepts. Objects and null are invalid and produce undefined
 *  behavior rather than an error, so the type is the guard. */
export type SpanAttributeValue = string | number | boolean;

/**
 * Run one pipeline stage inside a Sentry span that carries its identifying attributes, and tag
 * every AI call inside it with a conversation id.
 *
 * This does three jobs one `experimental_telemetry` block used to be expected to do:
 *
 *  1. **Attributes.** Since v7 dropped telemetry metadata (above), this span is the only place
 *     `oparax.agent_id` / `oparax.handle` / `oparax.corpus_posts` can live. Those are what
 *     make a Sentry search answer "show me every extraction over 90 posts" instead of "show me
 *     every extraction".
 *  2. **A parent.** The AI SDK's spans become children of a named stage rather than floating
 *     directly under an HTTP route, so a trace reads as the pipeline actually runs.
 *  3. **Conversations.** `setConversationId` writes to the ISOLATION scope, which is per-request —
 *     so it is set here, scoped to the stage, rather than globally where a later unrelated call
 *     would inherit it.
 *
 * The span is named `op: "gen_ai.invoke_agent"` deliberately: that is the operation Sentry's AI
 * dashboard treats as an agent run, so the stage shows up as a run rather than as an anonymous
 * custom span.
 */
export async function withAiSpan<T>(
  options: {
    name: string;
    conversationId: string;
    attributes: Record<string, SpanAttributeValue>;
  },
  body: () => Promise<T>,
): Promise<T> {
  Sentry.setConversationId(options.conversationId);
  return Sentry.startSpan(
    {
      op: "gen_ai.invoke_agent",
      name: options.name,
      attributes: { "gen_ai.operation.name": "invoke_agent", ...options.attributes },
    },
    body,
  );
}
