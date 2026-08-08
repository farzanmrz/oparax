// SERVER-ONLY: this stage reads prompts from lib/sysprompts and must never reach a client
// component.

import type { GenerateTextStepEndEvent } from "ai";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { aiTelemetry } from "@/lib/observability/ai-telemetry";
import { DRAFT_COUNCIL_CONTRACT, DRAFT_WRITE_PROMPT } from "@/lib/sysprompts";
import { escapeXmlAttribute, escapeXmlText } from "@/lib/xml";
import { MAX_SITE_GUIDANCE_CHARS } from "../sources/site-guidance";
import { resolveCallMeta } from "./call-meta";
import { NON_X_PLATFORM_CHAR_LIMITS, type Platform, X_CHAR_LIMITS } from "./desk-config";
import {
  type DraftConstruction,
  draftConstructionSchema,
  normalizeDraftOnBeatReason,
} from "./draft-construction";
import type { CouncilCall, SourceBrief } from "./draft-council-run";
import {
  QWEN_DRAFT_MODEL,
  QWEN_DRAFT_PROVIDER_OPTIONS,
  QWEN_DRAFT_TIMEOUT_MS,
  stripMarkdown,
} from "./qwen-draft-config";
import { formatSourceIdentity } from "./source-identity";
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
  // Construction is reporter-facing provenance, not core delivery data. Keeping the raw
  // field permissive means a malformed or omitted account cannot discard a valid draft.
  construction: z
    .unknown()
    .optional()
    .describe("A concise reporter-facing editorial account, or null when off-beat."),
});

type RawDraftVerdict = z.infer<typeof draftVerdictSchema>;

type DraftWriteContentPart =
  | { type: "text"; text: string }
  | { type: "file"; data: URL; mediaType: string };

/** The drafter gets source provenance and media, never the original-language text or metadata. */
type DraftSourceContext = Pick<SourceBrief, "identity" | "media">;

const MEDIA_TAGS: Record<string, "photo" | "video" | "animated_gif"> = {
  photo: "photo",
  image: "photo",
  video: "video",
  animated_gif: "animated_gif",
};

export type DraftVerdict = Omit<RawDraftVerdict, "construction"> & {
  construction: DraftConstruction | null;
};
export type DraftWriteResult = { call: CouncilCall; verdict: DraftVerdict | null };

function clampGuidance(clause: string): string {
  const trimmed = clause.trim();
  return trimmed.length > MAX_SITE_GUIDANCE_CHARS
    ? `${trimmed.slice(0, MAX_SITE_GUIDANCE_CHARS)}…`
    : trimmed;
}

function buildContent(input: {
  source: DraftSourceContext;
  englishSourceText: string;
  beatSpec: string;
  siteGuidance: { onBeat: string; offBeat: string } | null;
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
        // Site-specific beat disambiguation written by onboarding (#105) — absent for X
        // sources and for websites onboarded before guidance existed; the prompt documents
        // it as untrusted data. Null degrades to exactly the beat-only prompt above.
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
        `<character_ceiling>${input.ceiling}</character_ceiling>`,
        "",
        input.source.identity.kind === "x"
          ? `<post platform="${input.platform}" author="${escapeXmlAttribute(formatSourceIdentity(input.source.identity))}">`
          : `<source platform="${input.platform}" publisher="${escapeXmlAttribute(formatSourceIdentity(input.source.identity))}">`,
        ...(input.source.identity.kind === "website"
          ? ["Website publisher metadata is provenance, not an X mention; never prefix it with @."]
          : []),
        "<english_source>",
        escapeXmlText(input.englishSourceText),
        "</english_source>",
      ].join("\n"),
    },
  ];
  const mediaParts: DraftWriteContentPart[] = [];

  for (const item of input.source.media) {
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
  content.push({
    type: "text",
    text: input.source.identity.kind === "x" ? "</post>" : "</source>",
  });
  return content;
}

function normalizeVerdict(raw: RawDraftVerdict): DraftVerdict {
  // Only persist construction when it is a complete, valid reporter-facing account.
  const construction = draftConstructionSchema.safeParse(raw.construction);
  return {
    ...raw,
    onBeatReason: normalizeDraftOnBeatReason(raw.onBeatReason) ?? "",
    draft:
      raw.onBeat === false
        ? null
        : raw.draft === null
          ? null
          : stripMarkdown(raw.draft.trim()) || null,
    construction: raw.onBeat && construction.success ? construction.data : null,
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
  source: DraftSourceContext;
  englishSourceText: string;
  beatSpec: string;
  siteGuidance: { onBeat: string; offBeat: string } | null;
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
      // NO `maxOutputTokens`: the ceiling capped thinking AND the verdict together, so a long
      // reasoning pass could truncate the object and cost a whole re-billed delivery. The draft
      // itself is bounded by `checkXPostable`, not by a token budget. The abort below is what
      // keeps an uncapped call inside the request budget — see QWEN_DRAFT_TIMEOUT_MS.
      abortSignal: AbortSignal.timeout(QWEN_DRAFT_TIMEOUT_MS),
      output: Output.object({ name: "DraftVerdict", schema: draftVerdictSchema }),
      system: `${DRAFT_WRITE_PROMPT}\n\n<draft_contract>\n${DRAFT_COUNCIL_CONTRACT}\n</draft_contract>\n\n<voice_guide>\n${input.voiceGuidance.trim()}\n</voice_guide>`,
      messages: [
        {
          role: "user",
          content: buildContent({
            source: input.source,
            englishSourceText: input.englishSourceText,
            beatSpec: input.beatSpec,
            siteGuidance: input.siteGuidance,
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
      draftConstruction: verdict.construction,
      draftOnBeatReason: verdict.onBeatReason || null,
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
