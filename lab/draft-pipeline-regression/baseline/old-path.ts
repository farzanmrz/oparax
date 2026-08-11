import { execFileSync } from "node:child_process";
import { generateText, Output, streamText } from "ai";
import { z } from "zod";
import { resolveDeskTier, X_CHAR_LIMITS } from "@/lib/agent/desk-config";
import {
  QWEN_DRAFT_MODEL,
  QWEN_DRAFT_PROVIDER_OPTIONS,
  QWEN_DRAFT_TIMEOUT_MS,
  stripMarkdown,
} from "@/lib/agent/qwen-draft-config";
import { formatSourceIdentity } from "@/lib/agent/source-identity";
import { resolveImageMediaType } from "@/lib/agent/source-media";
import { MAX_SITE_GUIDANCE_CHARS } from "@/lib/sources/site-guidance";
import { resolveDraftingPrompt, type VoiceRule } from "@/lib/voice/rules";
import { escapeXmlAttribute, escapeXmlText } from "@/lib/xml";
import type { RegressionFixture } from "../cases";

const BASELINE_SHA = "1ce4d55";
const oldDraftSchema = z.object({
  onBeat: z.boolean(),
  onBeatReason: z.string(),
  newsTitle: z.string(),
  newsSynthesis: z.string(),
  draft: z.string().nullable(),
  construction: z.unknown().optional(),
});

type OldContentPart =
  | { type: "text"; text: string }
  | { type: "file"; data: URL; mediaType: string };

const MEDIA_TAGS: Record<string, "photo" | "video" | "animated_gif"> = {
  photo: "photo",
  image: "photo",
  video: "video",
  animated_gif: "animated_gif",
};

function frozenPrompt(path: string): string {
  return execFileSync("git", ["show", `${BASELINE_SHA}:${path}`], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

const oldWritePrompt = frozenPrompt("lib/sysprompts/draft-write.md");
const oldContract = frozenPrompt("lib/sysprompts/draft-council-contract.md");
const oldTranslatePrompt = frozenPrompt("lib/sysprompts/draft-translate.md");

function englishDocument(fixture: RegressionFixture): string {
  return fixture.source.title
    ? `${fixture.source.title}\n\n${fixture.source.text}`
    : fixture.source.text;
}

function primaryLanguage(lang: string | null): string | null {
  const primary = lang?.trim().toLowerCase().split("-")[0];
  return primary || null;
}

function clampGuidance(clause: string): string {
  const trimmed = clause.trim();
  return trimmed.length > MAX_SITE_GUIDANCE_CHARS
    ? `${trimmed.slice(0, MAX_SITE_GUIDANCE_CHARS)}…`
    : trimmed;
}

async function oldEnglishSource(fixture: RegressionFixture): Promise<string> {
  if (primaryLanguage(fixture.source.lang) === "en") return englishDocument(fixture);
  const result = streamText({
    model: QWEN_DRAFT_MODEL,
    providerOptions: QWEN_DRAFT_PROVIDER_OPTIONS,
    temperature: 0,
    reasoning: "medium",
    abortSignal: AbortSignal.timeout(240_000),
    system: oldTranslatePrompt,
    messages: [
      {
        role: "user",
        content: `<source_language>${fixture.source.lang ?? "und"}</source_language>${fixture.source.title ? `\n<source_title>\n${fixture.source.title}\n</source_title>` : ""}\n<source_post>\n${fixture.source.text}\n</source_post>`,
      },
    ],
  });
  for await (const part of result.fullStream) {
    if (part.type === "error") throw part.error;
  }
  const translated = (await result.text).trim();
  return translated === "NO_TRANSLATION" || translated === ""
    ? englishDocument(fixture)
    : translated;
}

function oldContent(fixture: RegressionFixture, englishSourceText: string): OldContentPart[] {
  const identity = fixture.source.identity;
  const ceiling =
    X_CHAR_LIMITS[resolveDeskTier(fixture.context.reporterTier, fixture.context.accountTier)];
  const content: OldContentPart[] = [
    {
      type: "text",
      text: [
        "<beat>",
        escapeXmlText(fixture.context.beat.trim() || "(not stated)"),
        "</beat>",
        ...(fixture.context.siteGuidance === null
          ? []
          : [
              "",
              "<site_guidance>",
              `On-beat: ${escapeXmlText(clampGuidance(fixture.context.siteGuidance.onBeat))}`,
              `Off-beat: ${escapeXmlText(clampGuidance(fixture.context.siteGuidance.offBeat))}`,
              "</site_guidance>",
            ]),
        "",
        `<character_ceiling>${ceiling}</character_ceiling>`,
        "",
        identity.kind === "x"
          ? `<post platform="x" author="${escapeXmlAttribute(formatSourceIdentity(identity))}">`
          : `<source platform="x" publisher="${escapeXmlAttribute(formatSourceIdentity(identity))}">`,
        ...(identity.kind === "website"
          ? ["Website publisher metadata is provenance, not an X mention; never prefix it with @."]
          : []),
        "<english_source>",
        escapeXmlText(englishSourceText),
        "</english_source>",
      ].join("\n"),
    },
  ];
  const mediaParts: OldContentPart[] = [];
  for (const item of fixture.source.media) {
    const tag = MEDIA_TAGS[item.kind];
    const mediaType = resolveImageMediaType(item.imageUrl);
    if (!tag || !mediaType) continue;
    mediaParts.push(
      { type: "text", text: `<${tag}>` },
      { type: "file", data: new URL(item.imageUrl), mediaType },
      { type: "text", text: `</${tag}>` },
    );
  }
  if (mediaParts.length > 0) {
    content.push({ type: "text", text: "<attachments>" }, ...mediaParts, {
      type: "text",
      text: "</attachments>",
    });
  }
  content.push({ type: "text", text: identity.kind === "x" ? "</post>" : "</source>" });
  return content;
}

/** Immutable lab-only reproduction of beta's translator-plus-fused Qwen path at 1ce4d55. */
export async function runOldPath(fixture: RegressionFixture) {
  const englishSourceText = await oldEnglishSource(fixture);
  const voiceGuidance = resolveDraftingPrompt(
    fixture.context.voiceGuide.rules as VoiceRule[],
    fixture.context.voiceGuide.measuredFacts,
    fixture.context.voiceGuide.guideDeploy,
  );
  const result = await generateText({
    model: QWEN_DRAFT_MODEL,
    providerOptions: QWEN_DRAFT_PROVIDER_OPTIONS,
    temperature: 0,
    reasoning: "medium",
    abortSignal: AbortSignal.timeout(QWEN_DRAFT_TIMEOUT_MS),
    output: Output.object({ name: "DraftVerdict", schema: oldDraftSchema }),
    system: `${oldWritePrompt}\n\n<draft_contract>\n${oldContract}\n</draft_contract>\n\n<voice_guide>\n${voiceGuidance.trim()}\n</voice_guide>`,
    messages: [{ role: "user", content: oldContent(fixture, englishSourceText) }],
  });
  return {
    ...result.output,
    draft: result.output.draft ? stripMarkdown(result.output.draft) : null,
  };
}
