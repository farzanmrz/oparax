import "server-only";

import { waitUntil } from "@vercel/functions";

import { aiContentAllowed } from "@/lib/observability/ai-telemetry";
import { getPostHogServerClient } from "@/lib/observability/posthog-server";

const MAX_MESSAGE_CODE_POINTS = 20_000;

export type TelemetryMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

type CaptureAiGenerationInput = {
  distinctId: string;
  traceId: string;
  stage: string;
  spanId: string;
  model: string;
  usage: unknown;
  latencyMs: number | null;
  streamed: boolean;
  generationId: string | null;
  inputMessages: TelemetryMessage[] | null;
  outputText: string | null;
  properties?: Readonly<Record<string, unknown>>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function cappedContent(content: string): { content: string; truncated: boolean } {
  const points = Array.from(content);
  if (points.length <= MAX_MESSAGE_CODE_POINTS) return { content, truncated: false };
  return {
    content: points.slice(0, MAX_MESSAGE_CODE_POINTS).join(""),
    truncated: true,
  };
}

/** Send one PostHog AI generation without ever delaying or failing paid work. */
export function captureAiGeneration(input: CaptureAiGenerationInput): void {
  try {
    const client = getPostHogServerClient();
    if (!client) return;
    const usage = asRecord(input.usage);
    const inputTokenDetails = asRecord(usage?.inputTokenDetails);
    const slashIndex = input.model.indexOf("/");
    const provider = slashIndex >= 0 ? input.model.slice(0, slashIndex) : undefined;
    const model = slashIndex >= 0 ? input.model.slice(slashIndex + 1) : input.model;
    const properties: Record<string, unknown> = {
      ...input.properties,
      $ai_trace_id: input.traceId,
      $ai_span_id: input.spanId,
      $ai_span_name: input.stage,
      $ai_model: model,
      stage: input.stage,
      source: "server",
    };

    if (provider) properties.$ai_provider = provider;

    const inputTokens = finiteNumber(usage?.inputTokens ?? usage?.promptTokens);
    const outputTokens = finiteNumber(usage?.outputTokens ?? usage?.completionTokens);
    const cacheReadTokens = finiteNumber(inputTokenDetails?.cacheReadTokens);
    const cacheWriteTokens = finiteNumber(inputTokenDetails?.cacheWriteTokens);
    if (inputTokens !== undefined) properties.$ai_input_tokens = inputTokens;
    if (outputTokens !== undefined) properties.$ai_output_tokens = outputTokens;
    if (cacheReadTokens !== undefined) properties.$ai_cache_read_input_tokens = cacheReadTokens;
    if (cacheWriteTokens !== undefined) {
      properties.$ai_cache_creation_input_tokens = cacheWriteTokens;
    }
    if (input.latencyMs !== null && Number.isFinite(input.latencyMs)) {
      properties.$ai_latency = input.latencyMs / 1_000;
    }
    if (input.streamed) properties.$ai_stream = true;
    if (input.generationId !== null) properties.generation_id = input.generationId;

    let contentTruncated = false;
    if (aiContentAllowed(input.stage)) {
      if (input.inputMessages !== null) {
        properties.$ai_input = input.inputMessages.map((message) => {
          const capped = cappedContent(message.content);
          contentTruncated ||= capped.truncated;
          return { role: message.role, content: capped.content };
        });
      }
      if (input.outputText !== null) {
        const capped = cappedContent(input.outputText);
        contentTruncated ||= capped.truncated;
        properties.$ai_output_choices = [{ role: "assistant", content: capped.content }];
      }
    }
    if (contentTruncated) properties.content_truncated = true;

    waitUntil(
      client
        .captureAiImmediate({
          distinctId: input.distinctId,
          event: "$ai_generation",
          properties,
        })
        .catch((error) => console.error("posthog-ai: capture failed", error)),
    );
  } catch (error) {
    console.error("posthog-ai: capture failed", error);
  }
}
