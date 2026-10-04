import "server-only";

import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { gatewayCost } from "@/lib/ai/cost";
import { ProviderRejected, qwenBound, withCost } from "@/lib/guards/ledger";
import { captureAiGeneration } from "@/lib/observability/posthog-ai";
import { escapeXmlAttribute, escapeXmlText } from "@/lib/xml";
import { decodeText, FeedDeadline, requireTime, rethrowStop } from "./checks";
import { RETRY_INSTRUCTION, WRITER_SYSTEM } from "./prompts";
import {
  type Attempt,
  type Card,
  cardSchema,
  errorMessage,
  type FeedContext,
  type VerifiedCard,
} from "./types";

const MODEL = "alibaba/qwen3.7-flash";
const MAX_OUTPUT_TOKENS = 6000;
const WRITER_ABORT_MS = 120_000;
const personSchema = z.object({ summary: z.string(), interests: z.array(z.string()) });
const dataText = (value: string) => escapeXmlText(decodeText(value));
const attribute = (value: string) => escapeXmlAttribute(decodeText(value));
export function writerMessage(context: FeedContext, previous: VerifiedCard | null): string {
  const person = personSchema.parse(context.brief);
  const item = context.item;
  return [
    `<beat>${dataText(context.beat)}</beat>`,
    `<person>${dataText(JSON.stringify(person))}</person>`,
    `<source why="${attribute(context.source.why)}"></source>`,
    ...(previous
      ? [
          `<previous_card>${dataText(JSON.stringify({ headline: previous.headline, facts: previous.facts.map(({ text, evidence }) => ({ text, evidence })) }))}</previous_card>`,
        ]
      : []),
    `<item id="${attribute(item.id)}" publisher="${attribute(item.publisher)}" title="${attribute(item.title)}" lang="${attribute(item.lang ?? "")}" published="${attribute(item.published_at)}">${dataText(`${item.title}\n${item.text}`)}</item>`,
  ].join("\n");
}
export async function writeDraft(
  context: FeedContext,
  user: string,
  allowedIds: Set<string>,
  attempts: Attempt[],
  repair = false,
): Promise<Card | null> {
  let message = user;
  for (let index = 0; index < (repair ? 1 : 2); index++) {
    requireTime(context);
    const messages = [
      { role: "system" as const, content: WRITER_SYSTEM },
      { role: "user" as const, content: message },
    ];
    const started = Date.now();
    const attempt: Attempt = {
      user: message,
      raw: null,
      error: null,
      latencyMs: 0,
      inputTokens: null,
      outputTokens: null,
      cost: null,
      reasoning: "medium",
      repair,
    };
    let usage: unknown = null;
    let market: number | undefined;
    let generationId: string | null = null;
    try {
      const draft = await withCost(
        {
          service: "gateway",
          kind: repair ? "repair" : "write",
          monitorId: context.monitorId,
          sourceId: context.item.source_id,
          runId: context.runId,
          usdReserved: qwenBound(messages),
        },
        async () => {
          try {
            const result = await generateText({
              model: MODEL,
              messages,
              output: Output.object({ schema: cardSchema }),
              reasoning: "medium",
              temperature: 0,
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              maxRetries: 0,
              abortSignal: AbortSignal.timeout(
                Math.max(1, Math.min(WRITER_ABORT_MS, context.deadline - Date.now())),
              ),
              onStepEnd: (step) => {
                usage = step.usage;
                attempt.raw = step.text;
                attempt.inputTokens = step.usage.inputTokens ?? null;
                attempt.outputTokens = step.usage.outputTokens ?? null;
                generationId = step.response.id;
                const cost = gatewayCost(step.providerMetadata);
                attempt.cost = cost.charged;
                market = cost.market;
              },
            });
            const cost = gatewayCost(result.providerMetadata);
            attempt.cost = cost.charged;
            const parsed = cardSchema.safeParse(result.output);
            if (!parsed.success) {
              attempt.error = parsed.error.message;
              return { value: null, usd: cost.charged };
            }
            if (
              parsed.data.facts.some((fact) =>
                fact.evidence.some((evidence) => !allowedIds.has(evidence.item)),
              )
            ) {
              attempt.error = "evidence names an item the writer was not given";
              return { value: null, usd: cost.charged };
            }
            return { value: parsed.data, usd: cost.charged };
          } catch (error) {
            if (NoObjectGeneratedError.isInstance(error)) {
              attempt.raw = error.text ?? attempt.raw;
              usage = error.usage ?? usage;
              attempt.inputTokens = error.usage?.inputTokens ?? attempt.inputTokens;
              attempt.outputTokens = error.usage?.outputTokens ?? attempt.outputTokens;
              attempt.error = errorMessage(error);
              if (attempt.cost !== null) return { value: null, usd: attempt.cost };
            }
            if (
              APICallError.isInstance(error) &&
              error.statusCode &&
              error.statusCode >= 400 &&
              error.responseBody
            ) {
              let body: unknown;
              try {
                body = JSON.parse(error.responseBody);
              } catch {
                body = null;
              }
              if (z.record(z.string(), z.unknown()).safeParse(body).success)
                throw new ProviderRejected(error.statusCode, error.message);
            }
            throw error;
          }
        },
      );
      if (draft) return draft;
    } catch (error) {
      attempt.error = errorMessage(error);
      rethrowStop(error);
      if (Date.now() >= context.deadline) throw new FeedDeadline();
      if (!NoObjectGeneratedError.isInstance(error)) return null;
    } finally {
      attempt.latencyMs = Date.now() - started;
      attempts.push(attempt);
      captureAiGeneration({
        distinctId: context.monitorId,
        traceId: context.runId,
        spanId: crypto.randomUUID(),
        stage: repair ? "repair" : "write",
        model: MODEL,
        usage,
        latencyMs: attempt.latencyMs,
        streamed: false,
        generationId,
        inputMessages: messages,
        outputText: attempt.raw,
        properties: {
          $ai_session_id: null,
          $ai_total_cost_usd: attempt.cost,
          market_cost_usd: market,
          $ai_is_error: Boolean(attempt.error),
          $ai_error: attempt.error,
          source_id: context.item.source_id,
        },
      });
    }
    message = `${user}\n<retry>${dataText(attempt.error ?? "Invalid card")}</retry>\n${RETRY_INSTRUCTION}`;
  }
  return null;
}
