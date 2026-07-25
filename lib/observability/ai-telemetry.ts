// lib/observability/ai-telemetry.ts
//
// The `experimental_telemetry` block every AI SDK call in this repo passes, defined ONCE.
//
// Why a helper rather than a literal per call site: Sentry's Vercel AI integration records
// NOTHING unless each individual call opts in. Unlike the OpenAI/Anthropic integrations, which
// patch the client, this one only listens to telemetry the AI SDK emits about itself — so a call
// that forgets this object is invisible, with no warning, no empty span, and no way to notice
// except by looking for a span that was never going to be there. Eight literals across four files
// is eight chances to forget one; a helper is one.
//
// It also puts the record-content decision in a single table instead of a boolean repeated at
// every call, which matters because that decision is not uniform (see below).
import * as Sentry from "@sentry/nextjs";
import type { TelemetryOptions } from "ai";

/** Every AI stage in the product. Deliberately mirrors `model_calls.stage`, so a span in Sentry
 *  and its ledger row in Postgres name the same thing and can be joined by eye. */
export type AiStage = "voice_extraction" | "story_cluster" | "draft_council" | "draft_judge";

/**
 * Whether a stage's prompt and completion text are recorded, per stage — NOT a global switch.
 *
 * `dataCollection.genAI` in sentry-shared.ts is the outer gate; this is the inner one, and the two
 * together are what make it honest to have turned the outer one on. The split follows what the
 * text actually IS, not how convenient it would be to see:
 *
 * - `voice_extraction` — ON. Input is the reporter's PUBLIC X posts plus our own system prompt;
 *   output is the voice guide, which AGENTS.md argues is derived wholly from public posts. This is
 *   also the stage that produced an unexplained empty guide, which is what this whole setup exists
 *   to make visible.
 * - `story_cluster` — ON. Input is public source posts and existing story headlines; the output is
 *   a classification verdict. Nothing here is the reporter's own writing.
 * - `draft_council` / `draft_judge` — ON outside production, OFF in production. The output is
 *   an UNPUBLISHED DRAFT in the reporter's voice: their unpublished journalism, the single most
 *   sensitive artifact the product handles, and the one thing that must not sit in a third-party
 *   store waiting to leak — so on oparax.ai only token counts, latency, model, cost and finish
 *   reason are recorded. But an invisible drafting stage was undebuggable in practice (owner
 *   request, 2026-07-25: council spans rendered with no input/output at all), and this file
 *   always prescribed the fix: narrow by environment rather than flip the switch. `VERCEL_ENV`
 *   is unset locally and "preview" on the dev/beta deployments, so every debugging surface
 *   records full prompts and completions; only `production` stays words-free.
 */
const DRAFT_CONTENT_ALLOWED = process.env.VERCEL_ENV !== "production";
const RECORDS_CONTENT: Record<AiStage, boolean> = {
  voice_extraction: true,
  story_cluster: true,
  draft_council: DRAFT_CONTENT_ALLOWED,
  draft_judge: DRAFT_CONTENT_ALLOWED,
};

/**
 * Build the `experimental_telemetry` block for one AI call.
 *
 * `functionId` groups calls in Sentry's AI dashboard — pass something stable and specific
 * (`"voice-extraction-stream"`, `"draft-council-deepseek"`), because it is the axis latency and
 * cost get compared along.
 *
 * There is deliberately NO custom-metadata parameter. `experimental_telemetry.metadata` was
 * REMOVED in AI SDK v7 — Sentry's docs, its skill examples and its own bundled `TelemetrySettings`
 * type all still describe it, because they are typed against v5/v6, and passing it here is a
 * compile error rather than a silently ignored key (which is the only reason it was caught).
 * Ids that identify a run — the desk, the handle, the corpus size — go on the WRAPPING span
 * instead: see `withAiSpan`.
 */
export function aiTelemetry(stage: AiStage, functionId: string): TelemetryOptions {
  const recordsContent = RECORDS_CONTENT[stage];
  return {
    isEnabled: true,
    // Set explicitly in both directions rather than relying on the SDK's "enabled by default":
    // the default is what `dataCollection.genAI` overrides, and leaving a stage's most consequential
    // privacy property to the interaction of two defaults is how it silently becomes the wrong one.
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
 *     `oparax.experiment_id` / `oparax.handle` / `oparax.corpus_posts` can live. Those are what
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
