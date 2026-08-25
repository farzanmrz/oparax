// SERVER-ONLY: this stage reads prompts from lib/sysprompts and must never reach a client component.

import type { GenerateTextStepEndEvent } from "ai";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { aiContentAllowed, aiTelemetry } from "@/lib/observability/ai-telemetry";
import type { TelemetryMessage } from "@/lib/observability/posthog-ai";
import { DRAFT_COUNCIL_CONTRACT, DRAFT_WRITE_PROMPT } from "@/lib/sysprompts";
import { escapeXmlAttribute, escapeXmlText } from "@/lib/xml";
import { resolveCallMeta } from "./call-meta";
import { type Platform, X_CHAR_LIMITS } from "./desk-config";
import { type DraftConstruction, draftConstructionSchema } from "./draft-construction";
import type { CouncilCall, NewsPoint } from "./draft-council-run";
import {
  GEMINI_WRITE_MODEL,
  GEMINI_WRITE_TIMEOUT_MS,
  geminiStageAbortSignal,
  geminiWriteProviderOptions,
} from "./gemini-write-config";
import { stripMarkdown } from "./qwen-draft-config";
import { formatSourceIdentity, type SourceIdentity } from "./source-identity";

const draftVerdictSchema = z.object({
  draft: z.string().trim().min(1),
  // Construction is reporter-facing provenance, not proof or chain-of-thought. Keeping the raw
  // field permissive means a malformed account cannot discard an otherwise publishable draft.
  construction: z.unknown().optional().describe("A concise reporter-facing editorial account."),
});

type RawDraftVerdict = z.infer<typeof draftVerdictSchema>;

export type DraftVerdict = {
  draft: string;
  construction: DraftConstruction | null;
};
export type DraftWriteResult = { call: CouncilCall; verdict: DraftVerdict | null };

function buildContent(input: {
  identity: SourceIdentity;
  newsTitle: string;
  newsPoints: NewsPoint[];
  platform: Platform;
  ceiling: number;
}): string {
  return [
    `<character_ceiling>${input.ceiling}</character_ceiling>`,
    "",
    `<story platform="${escapeXmlAttribute(input.platform)}" publisher="${escapeXmlAttribute(formatSourceIdentity(input.identity))}">`,
    "<title>",
    escapeXmlText(input.newsTitle),
    "</title>",
    "<news_points>",
    ...input.newsPoints.flatMap((newsPoint) => [
      "<news_point>",
      "<reason>",
      escapeXmlText(newsPoint.reason),
      "</reason>",
      "<point>",
      escapeXmlText(newsPoint.point),
      "</point>",
      "</news_point>",
    ]),
    "</news_points>",
    "</story>",
  ].join("\n");
}

function normalizeVerdict(raw: RawDraftVerdict): DraftVerdict | null {
  const draft = stripMarkdown(raw.draft.trim());
  if (!draft) return null;
  const construction = draftConstructionSchema.safeParse(raw.construction);
  if (raw.construction != null && !construction.success) {
    console.warn("draft-write: discarded malformed construction");
  }
  return { draft, construction: construction.success ? construction.data : null };
}

export async function draftSourcePost(input: {
  identity: SourceIdentity;
  newsTitle: string;
  newsPoints: NewsPoint[];
  voiceGuidance: string;
  platform: Platform;
  accountTier: "standard" | "premium";
  ownerId: string;
  deadlineAt?: number;
}): Promise<DraftWriteResult> {
  const ceiling = X_CHAR_LIMITS[input.accountTier];
  const completedStepRef: { value: GenerateTextStepEndEvent | null } = { value: null };
  const systemPrompt = `${DRAFT_WRITE_PROMPT}\n\n<draft_contract>\n${DRAFT_COUNCIL_CONTRACT}\n</draft_contract>\n\n<voice_guide>\n${input.voiceGuidance.trim()}\n</voice_guide>`;
  const userPrompt = buildContent({
    identity: input.identity,
    newsTitle: input.newsTitle,
    newsPoints: input.newsPoints,
    platform: input.platform,
    ceiling,
  });
  const telemetryInput: TelemetryMessage[] | null = aiContentAllowed("drafting")
    ? [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]
    : null;
  const requestStartedAtMs = Date.now();

  try {
    const result = await generateText({
      model: GEMINI_WRITE_MODEL,
      providerOptions: geminiWriteProviderOptions(input.ownerId),
      temperature: 0,
      reasoning: "medium",
      // No maxOutputTokens: the reportable draft is bounded by the character gate, while the
      // abort signal keeps an uncapped structured generation inside the route budget.
      abortSignal: geminiStageAbortSignal(GEMINI_WRITE_TIMEOUT_MS, input.deadlineAt),
      output: Output.object({ name: "DraftVerdict", schema: draftVerdictSchema }),
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      onStepEnd: (event) => {
        completedStepRef.value = event;
      },
      experimental_telemetry: aiTelemetry("draft_write", "draft-write-gemini"),
    });
    const verdict = normalizeVerdict(result.output);
    const call = await resolveCallMeta({
      kind: "draft",
      stage: "drafting",
      role: "primary",
      model: GEMINI_WRITE_MODEL,
      // Draft histories and feed reads point at this call, so its output stays publishable text.
      output: verdict?.draft ?? null,
      reasoning: result.reasoningText ?? null,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
      latencyMs: Date.now() - requestStartedAtMs,
      telemetryInput,
      draftConstruction: verdict?.construction ?? null,
    });
    if (!verdict) {
      console.error("draft-write: Gemini returned an unusable draft");
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
        model: GEMINI_WRITE_MODEL,
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
