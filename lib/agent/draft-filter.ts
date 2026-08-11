// SERVER-ONLY: this stage reads prompts from lib/sysprompts and must never reach a client component.

import type { GenerateTextStepEndEvent } from "ai";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { aiTelemetry } from "@/lib/observability/ai-telemetry";
import { DRAFT_FILTER_PROMPT } from "@/lib/sysprompts";
import { escapeXmlAttribute, escapeXmlText } from "@/lib/xml";
import { MAX_SITE_GUIDANCE_CHARS } from "../sources/site-guidance";
import { resolveCallMeta } from "./call-meta";
import type { CouncilCall, SourceBrief } from "./draft-council-run";
import {
  QWEN_DRAFT_MODEL,
  QWEN_DRAFT_PROVIDER_OPTIONS,
  QWEN_FILTER_TIMEOUT_MS,
  qwenStageAbortSignal,
} from "./qwen-draft-config";
import { formatSourceIdentity } from "./source-identity";
import { resolveImageMediaType } from "./source-media";

const filterSchema = z.object({
  onBeat: z.boolean(),
  onBeatReason: z.string().trim().min(1).max(750),
});

type FilterContentPart =
  | { type: "text"; text: string }
  | { type: "file"; data: URL; mediaType: string };

const MEDIA_TAGS: Record<string, "photo" | "video" | "animated_gif"> = {
  photo: "photo",
  image: "photo",
  video: "video",
  animated_gif: "animated_gif",
};

export type FilterVerdict = z.infer<typeof filterSchema>;
export type DraftFilterResult = { call: CouncilCall; verdict: FilterVerdict | null };

function clampGuidance(clause: string): string {
  const trimmed = clause.trim();
  return trimmed.length > MAX_SITE_GUIDANCE_CHARS
    ? `${trimmed.slice(0, MAX_SITE_GUIDANCE_CHARS)}…`
    : trimmed;
}

function buildContent(input: {
  brief: SourceBrief;
  beatSpec: string;
  siteGuidance: { onBeat: string; offBeat: string } | null;
}): FilterContentPart[] {
  const source = input.brief;
  const content: FilterContentPart[] = [
    {
      type: "text",
      text: [
        "<beat>",
        escapeXmlText(input.beatSpec.trim() || "(not stated)"),
        "</beat>",
        ...(input.siteGuidance === null
          ? []
          : [
              "",
              "<site_guidance>",
              `On-beat: ${escapeXmlText(clampGuidance(input.siteGuidance.onBeat))}`,
              `Off-beat: ${escapeXmlText(clampGuidance(input.siteGuidance.offBeat))}`,
              "</site_guidance>",
            ]),
        "",
        `<source lang="${escapeXmlAttribute(source.lang ?? "und")}" publisher="${escapeXmlAttribute(formatSourceIdentity(source.identity))}">`,
        ...(source.title ? ["<title>", escapeXmlText(source.title), "</title>"] : []),
        "<text>",
        escapeXmlText(source.text),
        "</text>",
      ].join("\n"),
    },
  ];

  const mediaParts: FilterContentPart[] = [];
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
      // Media has already passed the ingress probe. Keep the filter resilient to a malformed URL.
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

export async function filterSourcePost(input: {
  brief: SourceBrief;
  beatSpec: string;
  siteGuidance: { onBeat: string; offBeat: string } | null;
  deadlineAt?: number;
}): Promise<DraftFilterResult> {
  const completedStepRef: { value: GenerateTextStepEndEvent | null } = { value: null };
  try {
    const result = await generateText({
      model: QWEN_DRAFT_MODEL,
      providerOptions: QWEN_DRAFT_PROVIDER_OPTIONS,
      temperature: 0,
      reasoning: "low",
      abortSignal: qwenStageAbortSignal(QWEN_FILTER_TIMEOUT_MS, input.deadlineAt),
      output: Output.object({ name: "FilterVerdict", schema: filterSchema }),
      system: DRAFT_FILTER_PROMPT,
      messages: [
        {
          role: "user",
          content: buildContent(input),
        },
      ],
      onStepEnd: (event) => {
        completedStepRef.value = event;
      },
      experimental_telemetry: aiTelemetry("draft_filter", "draft-filter-qwen"),
    });
    const verdict = { ...result.output, onBeatReason: result.output.onBeatReason.trim() };
    const call = await resolveCallMeta({
      kind: "filter",
      stage: "filtering",
      role: "filter",
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
        kind: "filter",
        stage: "filtering",
        role: "filter",
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
