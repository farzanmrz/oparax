// SERVER-ONLY: this stage reads prompts from lib/sysprompts and must never reach a client
// component.

import type { GenerateTextStepEndEvent } from "ai";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { escapeXmlAttribute, escapeXmlText } from "@/lib/xml";
import { aiTelemetry } from "@/lib/observability/ai-telemetry";
import { DRAFT_COUNCIL_CONTRACT, DRAFT_WRITE_PROMPT } from "@/lib/sysprompts";
import { resolveCallMeta } from "./call-meta";
import { NON_X_PLATFORM_CHAR_LIMITS, type Platform, X_CHAR_LIMITS } from "./desk-config";
import type { CouncilCall, SourceBrief } from "./draft-council-run";
import { QWEN_DRAFT_MODEL, QWEN_DRAFT_PROVIDER_OPTIONS, stripMarkdown } from "./qwen-draft-config";
import { resolveImageMediaType } from "./source-media";

const draftVerdictSchema = z.object({
  onBeat: z.boolean().describe("Whether this is something the reporter would actually cover."),
  onBeatReason: z
    .string()
    .describe("One specific sentence citing the beat clause that decided it."),
  newsTitle: z
    .string()
    .describe(
      "One neutral, factual English news headline — never reporter-voice copy, never an excerpt of the source post.",
    ),
  newsSynthesis: z
    .string()
    .describe(
      "2-4 plain English sentences explaining the source as understandable news — what happened, who is involved, why it matters.",
    ),
  draft: z.string().nullable().describe("One post in the reporter's voice, or null when off-beat."),
});

type DraftWriteContentPart =
  | { type: "text"; text: string }
  | { type: "file"; data: URL; mediaType: string };

const MEDIA_TAGS: Record<string, "photo" | "video" | "animated_gif"> = {
  photo: "photo",
  image: "photo",
  video: "video",
  animated_gif: "animated_gif",
};

export type DraftVerdict = z.infer<typeof draftVerdictSchema>;
export type DraftWriteResult = { call: CouncilCall; verdict: DraftVerdict | null };

function buildContent(input: {
  brief: SourceBrief;
  translation: string | null;
  beatSpec: string;
  platform: Platform;
  ceiling: number;
}): DraftWriteContentPart[] {
  const content: DraftWriteContentPart[] = [
    {
      type: "text",
      text: [
        "<beat>",
        escapeXmlText(input.beatSpec.trim() || "(not stated)"),
        "</beat>",
        "",
        `<character_ceiling>${input.ceiling}</character_ceiling>`,
        "",
        `<post platform=\"${input.platform}\" author=\"@${escapeXmlAttribute(input.brief.authorHandle)}\">`,
        `<source_language>${escapeXmlText(input.brief.lang ?? "und")}</source_language>`,
        "<content>",
        escapeXmlText(input.brief.text),
        "</content>",
        ...(input.translation === null
          ? []
          : ["<translation>", escapeXmlText(input.translation), "</translation>"]),
      ].join("\n"),
    },
  ];
  const mediaParts: DraftWriteContentPart[] = [];
  let attachedImageCount = 0;

  for (const item of input.brief.media) {
    if (attachedImageCount >= 4) break;
    const mediaTag = MEDIA_TAGS[item.kind];
    if (!mediaTag) {
      console.warn(`draft-write: skipping unsupported media kind ${item.kind}`);
      continue;
    }
    const mediaType = resolveImageMediaType(item.imageUrl);
    if (!mediaType) {
      console.warn(`draft-write: skipping media with unrecognized URL ${item.imageUrl}`);
      continue;
    }
    try {
      mediaParts.push(
        { type: "text", text: `<${mediaTag}>` },
        { type: "file", data: new URL(item.imageUrl), mediaType },
        { type: "text", text: `</${mediaTag}>` },
      );
      attachedImageCount += 1;
    } catch (error) {
      console.warn(`draft-write: skipping media with unparsable URL ${item.imageUrl}`, error);
    }
  }

  if (mediaParts.length > 0) {
    content.push({ type: "text", text: "<attachments>" }, ...mediaParts, {
      type: "text",
      text: "</attachments>",
    });
  }
  content.push({ type: "text", text: "</post>" });
  return content;
}

function normalizeVerdict(raw: DraftVerdict): DraftVerdict {
  return {
    ...raw,
    draft:
      raw.onBeat === false
        ? null
        : raw.draft === null
          ? null
          : stripMarkdown(raw.draft.trim()) || null,
  };
}

function isUsableVerdict(verdict: DraftVerdict): boolean {
  if (!verdict.onBeatReason.trim() || !verdict.newsTitle.trim() || !verdict.newsSynthesis.trim()) {
    return false;
  }
  return !verdict.onBeat || verdict.draft !== null;
}

function verdictNotes(verdict: DraftVerdict): string {
  return [
    `On beat: ${verdict.onBeat ? "yes" : "no"} — ${verdict.onBeatReason}`,
    `Title:\n${verdict.newsTitle}`,
    `Synthesis:\n${verdict.newsSynthesis}`,
  ].join("\n");
}

export async function draftSourcePost(input: {
  brief: SourceBrief;
  translation: string | null;
  beatSpec: string;
  voiceGuidance: string;
  platform: Platform;
  accountTier: "standard" | "premium";
}): Promise<DraftWriteResult> {
  const ceiling =
    input.platform === "x"
      ? X_CHAR_LIMITS[input.accountTier]
      : NON_X_PLATFORM_CHAR_LIMITS[input.platform];
  const completedStepRef: { value: GenerateTextStepEndEvent | null } = { value: null };

  try {
    const result = await generateText({
      model: QWEN_DRAFT_MODEL,
      providerOptions: QWEN_DRAFT_PROVIDER_OPTIONS,
      temperature: 0,
      reasoning: "medium",
      maxOutputTokens: 8192,
      output: Output.object({ name: "DraftVerdict", schema: draftVerdictSchema }),
      system: `${DRAFT_WRITE_PROMPT}\n\n<draft_contract>\n${DRAFT_COUNCIL_CONTRACT}\n</draft_contract>\n\n<voice_guide>\n${input.voiceGuidance.trim()}\n</voice_guide>`,
      messages: [
        {
          role: "user",
          content: buildContent({
            brief: input.brief,
            translation: input.translation,
            beatSpec: input.beatSpec,
            platform: input.platform,
            ceiling,
          }),
        },
      ],
      onStepEnd: (event) => {
        completedStepRef.value = event;
      },
      experimental_telemetry: aiTelemetry("draft_write", "draft-write-qwen"),
    });
    const verdict = normalizeVerdict(result.output);
    const call = await resolveCallMeta({
      kind: "draft",
      stage: "drafting",
      role: "primary",
      model: QWEN_DRAFT_MODEL,
      output: verdict.draft ?? JSON.stringify(verdict),
      reasoning: result.reasoningText
        ? `${result.reasoningText}\n\n${verdictNotes(verdict)}`
        : verdictNotes(verdict),
      usage: result.usage,
      providerMetadata: result.providerMetadata,
    });
    if (!isUsableVerdict(verdict)) {
      console.error("draft-write: Qwen returned an incomplete semantic verdict");
      return { call, verdict: null };
    }
    return { call, verdict };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const step = completedStepRef.value;
      const call = await resolveCallMeta({
        kind: "draft",
        stage: "drafting",
        role: "primary",
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
