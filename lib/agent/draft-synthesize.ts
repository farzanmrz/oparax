// SERVER-ONLY: this stage reads prompts from lib/sysprompts and must never reach a client component.

import type { GenerateTextStepEndEvent } from "ai";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { aiTelemetry } from "@/lib/observability/ai-telemetry";
import { DRAFT_SYNTHESIZE_PROMPT } from "@/lib/sysprompts";
import { escapeXmlAttribute, escapeXmlText } from "@/lib/xml";
import { resolveCallMeta } from "./call-meta";
import type { CouncilCall, NewsPoint, SourceBrief } from "./draft-council-run";
import {
  QWEN_DRAFT_MODEL,
  QWEN_DRAFT_PROVIDER_OPTIONS,
  QWEN_SYNTHESIZE_TIMEOUT_MS,
  qwenStageAbortSignal,
} from "./qwen-draft-config";
import { formatSourceIdentity } from "./source-identity";
import { resolveImageMediaType } from "./source-media";

export const newsPointSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  point: z.string().trim().min(1).max(2000),
});

export const synthesisSchema = z.object({
  newsPoints: z.array(newsPointSchema).min(1).max(100),
  newsTitle: z.string().trim().min(1),
});

type SynthesisContentPart =
  | { type: "text"; text: string }
  | { type: "file"; data: URL; mediaType: string };

const MEDIA_TAGS: Record<string, "photo" | "video" | "animated_gif"> = {
  photo: "photo",
  image: "photo",
  video: "video",
  animated_gif: "animated_gif",
};

export type SynthesisVerdict = { newsPoints: NewsPoint[]; newsTitle: string };
export type DraftSynthesizeResult = { call: CouncilCall; verdict: SynthesisVerdict | null };

function buildContent(input: {
  brief: SourceBrief;
  sourceText: string;
  sourceLang: string | null;
  originalLang?: string | null;
  sourceTitle?: string;
}): SynthesisContentPart[] {
  const source = input.brief;
  const languageAttributes = [
    `lang="${escapeXmlAttribute(input.sourceLang ?? "und")}"`,
    `type="${escapeXmlAttribute(source.publisherClaimKind)}"`,
    `publisher="${escapeXmlAttribute(formatSourceIdentity(source.identity))}"`,
    ...(input.originalLang ? [`original_lang="${escapeXmlAttribute(input.originalLang)}"`] : []),
  ];
  const content: SynthesisContentPart[] = [
    {
      type: "text",
      text: [
        `<source ${languageAttributes.join(" ")}>`,
        ...(input.sourceTitle ? ["<title>", escapeXmlText(input.sourceTitle), "</title>"] : []),
        "<text>",
        escapeXmlText(input.sourceText),
        "</text>",
      ].join("\n"),
    },
  ];
  const mediaParts: SynthesisContentPart[] = [];
  for (const item of source.media) {
    const tag = MEDIA_TAGS[item.kind];
    const mediaType = resolveImageMediaType(item.imageUrl);
    if (!tag || !mediaType) continue;
    try {
      mediaParts.push(
        { type: "text", text: `<${tag}>` },
        { type: "file", data: new URL(item.imageUrl), mediaType },
        { type: "text", text: `</${tag}>` },
      );
    } catch {
      // Media has already passed the ingress probe. Keep synthesis resilient to a malformed URL.
    }
  }
  if (mediaParts.length > 0) {
    content.push({ type: "text", text: "<attachments>" }, ...mediaParts, {
      type: "text",
      text: "</attachments>",
    });
  }
  content.push({ type: "text", text: "</source>" });
  return content;
}

export async function synthesizeSourcePost(input: {
  brief: SourceBrief;
  sourceText: string;
  sourceLang: string | null;
  originalLang?: string | null;
  sourceTitle?: string;
  deadlineAt?: number;
}): Promise<DraftSynthesizeResult> {
  const completedStepRef: { value: GenerateTextStepEndEvent | null } = { value: null };
  try {
    const result = await generateText({
      model: QWEN_DRAFT_MODEL,
      providerOptions: QWEN_DRAFT_PROVIDER_OPTIONS,
      temperature: 0,
      reasoning: "medium",
      abortSignal: qwenStageAbortSignal(QWEN_SYNTHESIZE_TIMEOUT_MS, input.deadlineAt),
      output: Output.object({ name: "SynthesisVerdict", schema: synthesisSchema }),
      system: DRAFT_SYNTHESIZE_PROMPT,
      messages: [{ role: "user", content: buildContent(input) }],
      onStepEnd: (event) => {
        completedStepRef.value = event;
      },
      experimental_telemetry: aiTelemetry("draft_synthesize", "draft-synthesize-qwen"),
    });
    const verdict = {
      newsPoints: result.output.newsPoints.map((point) => ({
        reason: point.reason.trim(),
        point: point.point.trim(),
      })),
      newsTitle: result.output.newsTitle.trim(),
    };
    const call = await resolveCallMeta({
      kind: "synthesis",
      stage: "synthesis",
      role: "synthesis",
      model: QWEN_DRAFT_MODEL,
      output: JSON.stringify(verdict),
      reasoning: result.reasoningText ?? null,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
    });
    return { call, verdict };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const step = completedStepRef.value;
      const call = await resolveCallMeta({
        kind: "synthesis",
        stage: "synthesis",
        role: "synthesis",
        model: QWEN_DRAFT_MODEL,
        output: step?.text ?? error.text ?? null,
        reasoning: step?.reasoningText ?? null,
        usage: step?.usage ?? error.usage,
        providerMetadata: step?.providerMetadata,
      });
      return { call, verdict: null };
    }
    throw error;
  }
}
