// lib/alerts/judge.ts
//
// The two model judgments in the alert path (Part D of #131): DM-worthiness (is this breaking,
// materially new, on-beat news worth an interruption?) and duplicate-echo (against stories the
// recipient was alerted about in the last 30 minutes). Both run on the shared qwen config and
// hand back CouncilCalls (stage "alert_judge") for the caller to ledger.
// SERVER-ONLY: reads prompts from lib/sysprompts.

import type { GenerateTextStepEndEvent } from "ai";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { resolveCallMeta } from "@/lib/agent/call-meta";
import type { CouncilCall, NewsPoint } from "@/lib/agent/draft-council-run";
import {
  QWEN_DRAFT_MODEL,
  QWEN_DRAFT_PROVIDER_OPTIONS,
  QWEN_DRAFT_TIMEOUT_MS,
  qwenStageAbortSignal,
} from "@/lib/agent/qwen-draft-config";
import { aiContentAllowed, aiTelemetry } from "@/lib/observability/ai-telemetry";
import type { TelemetryMessage } from "@/lib/observability/posthog-ai";
import { ALERT_ECHO_PROMPT, ALERT_JUDGE_PROMPT } from "@/lib/sysprompts";
import { escapeXmlText } from "@/lib/xml";

const worthinessSchema = z.object({
  worthAlert: z.boolean(),
  reason: z.string().trim().min(1).max(750),
});

const echoSchema = z.object({
  duplicate: z.boolean(),
  reason: z.string().trim().min(1).max(750),
});

export type AlertedStory = { title: string; points: string[] };

function candidateBlock(title: string, points: NewsPoint[]): string[] {
  return [
    "<candidate>",
    `<title>${escapeXmlText(title)}</title>`,
    ...points.map((point) => `<fact>${escapeXmlText(point.point)}</fact>`),
    "</candidate>",
  ];
}

async function runJudge<T>(input: {
  system: string;
  prompt: string;
  schemaName: string;
  schema: z.ZodType<T>;
  deadlineAt?: number;
}): Promise<{ call: CouncilCall; verdict: T | null }> {
  const completedStepRef: { value: GenerateTextStepEndEvent | null } = { value: null };
  const telemetryInput: TelemetryMessage[] | null = aiContentAllowed("alert_judge")
    ? [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt },
      ]
    : null;
  const requestStartedAtMs = Date.now();
  try {
    const result = await generateText({
      model: QWEN_DRAFT_MODEL,
      providerOptions: QWEN_DRAFT_PROVIDER_OPTIONS,
      temperature: 0,
      reasoning: "low",
      abortSignal: qwenStageAbortSignal(QWEN_DRAFT_TIMEOUT_MS, input.deadlineAt),
      output: Output.object({ name: input.schemaName, schema: input.schema }),
      system: input.system,
      prompt: input.prompt,
      onStepEnd: (event) => {
        completedStepRef.value = event;
      },
      experimental_telemetry: aiTelemetry("alert_judge", "alert-judge-qwen"),
    });
    const call = await resolveCallMeta({
      kind: "alert_judge",
      stage: "alert_judge",
      role: "alert_judge",
      model: QWEN_DRAFT_MODEL,
      output: JSON.stringify(result.output),
      reasoning: result.reasoningText ?? null,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
      latencyMs: Date.now() - requestStartedAtMs,
      telemetryInput,
    });
    return { call, verdict: result.output };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const step = completedStepRef.value;
      const call = await resolveCallMeta({
        kind: "alert_judge",
        stage: "alert_judge",
        role: "alert_judge",
        model: QWEN_DRAFT_MODEL,
        output: step?.text ?? error.text ?? null,
        reasoning: step?.reasoningText ?? null,
        usage: step?.usage ?? error.usage,
        providerMetadata: step?.providerMetadata,
        latencyMs: Date.now() - requestStartedAtMs,
        telemetryInput,
      });
      return { call, verdict: null };
    }
    throw error;
  }
}

/** Is this story worth an interruption at all? An unusable verdict means "no" — a missed alert
 *  still shows on the feed page, while a junk alert erodes every future one. */
export async function judgeAlertWorthiness(input: {
  beat: string;
  candidateTitle: string;
  candidatePoints: NewsPoint[];
  deadlineAt?: number;
}): Promise<{ call: CouncilCall; worthAlert: boolean; reason: string | null }> {
  const prompt = [
    "<beat>",
    escapeXmlText(input.beat),
    "</beat>",
    "",
    ...candidateBlock(input.candidateTitle, input.candidatePoints),
  ].join("\n");
  const { call, verdict } = await runJudge({
    system: ALERT_JUDGE_PROMPT,
    prompt,
    schemaName: "AlertWorthiness",
    schema: worthinessSchema,
    deadlineAt: input.deadlineAt,
  });
  return { call, worthAlert: verdict?.worthAlert ?? false, reason: verdict?.reason ?? null };
}

/** Duplicate echo of a recently alerted story, or genuinely new facts? An unusable verdict
 *  means "duplicate" — the conservative branch for the same reason as above. */
export async function judgeDuplicateEcho(input: {
  candidateTitle: string;
  candidatePoints: NewsPoint[];
  recentlyAlerted: AlertedStory[];
  deadlineAt?: number;
}): Promise<{ call: CouncilCall; duplicate: boolean; reason: string | null }> {
  const lines = [
    ...candidateBlock(input.candidateTitle, input.candidatePoints),
    "",
    "<recently_alerted>",
  ];
  for (const story of input.recentlyAlerted) {
    lines.push("<story>");
    lines.push(`<title>${escapeXmlText(story.title)}</title>`);
    for (const point of story.points) lines.push(`<fact>${escapeXmlText(point)}</fact>`);
    lines.push("</story>");
  }
  lines.push("</recently_alerted>");
  const { call, verdict } = await runJudge({
    system: ALERT_ECHO_PROMPT,
    prompt: lines.join("\n"),
    schemaName: "AlertEcho",
    schema: echoSchema,
    deadlineAt: input.deadlineAt,
  });
  return { call, duplicate: verdict?.duplicate ?? true, reason: verdict?.reason ?? null };
}
