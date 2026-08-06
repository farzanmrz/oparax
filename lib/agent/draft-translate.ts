// SERVER-ONLY: this stage reads prompts from lib/sysprompts and must never reach a client
// component.

import type { GenerateTextStepEndEvent } from "ai";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { aiTelemetry } from "@/lib/observability/ai-telemetry";
import { DRAFT_TRANSLATE_PROMPT } from "@/lib/sysprompts";
import { resolveCallMeta } from "./call-meta";
import type { CouncilCall, SourceBrief } from "./draft-council-run";
import {
  QWEN_DRAFT_MODEL,
  QWEN_DRAFT_PROVIDER_OPTIONS,
  QWEN_DRAFT_TIMEOUT_MS,
} from "./qwen-draft-config";

const translationSchema = z.object({ translation: z.string().nullable() });
const NULL_TRANSLATION_OUTPUT = JSON.stringify({ translation: null });
const UNDETERMINED_LANGUAGE_CODES = new Set(["und", "zxx", "qme", "qst", "qht", "qam"]);

export type TranslateResult = {
  /** Null when the English fast path skipped the model entirely — nothing to ledger. */
  call: CouncilCall | null;
  translation: string | null;
  /** False means the call billed but its output is unusable; the caller ledgers it, then throws. */
  usable: boolean;
};

function primaryLanguage(lang: string | null): string | null {
  const primary = lang?.trim().toLowerCase().split("-")[0];
  return primary || null;
}

function isUndeterminedLanguage(lang: string | null): boolean {
  return lang === null || UNDETERMINED_LANGUAGE_CODES.has(lang);
}

export async function translateSourcePost(input: { brief: SourceBrief }): Promise<TranslateResult> {
  const primary = primaryLanguage(input.brief.lang);
  if (primary === "en") {
    return { call: null, translation: null, usable: true };
  }

  const completedStepRef: { value: GenerateTextStepEndEvent | null } = { value: null };
  try {
    const result = await generateText({
      model: QWEN_DRAFT_MODEL,
      providerOptions: QWEN_DRAFT_PROVIDER_OPTIONS,
      temperature: 0,
      reasoning: "medium",
      // NO `maxOutputTokens`: the complete translation of an arbitrarily long article is the
      // whole output, so any ceiling here can only ever be too small — a truncated object throws
      // NoObjectGeneratedError, releases the claim, and re-bills the retry. Matches the measured
      // precedent in lib/voice/extract-guide.ts — INCLUDING its abort, which is what makes an
      // uncapped call safe to run inside a request budget (see QWEN_DRAFT_TIMEOUT_MS).
      abortSignal: AbortSignal.timeout(QWEN_DRAFT_TIMEOUT_MS),
      output: Output.object({ name: "Translation", schema: translationSchema }),
      system: DRAFT_TRANSLATE_PROMPT,
      messages: [
        {
          role: "user",
          content: `<source_language>${isUndeterminedLanguage(primary) ? "und" : input.brief.lang}</source_language>\n<source_post>\n${input.brief.text}\n</source_post>`,
        },
      ],
      onStepEnd: (event) => {
        completedStepRef.value = event;
      },
      experimental_telemetry: aiTelemetry("draft_translate", "draft-translate-qwen"),
    });
    const translation = result.output.translation?.trim() || null;
    const call = await resolveCallMeta({
      kind: "translation",
      stage: "translation",
      role: "translation",
      model: QWEN_DRAFT_MODEL,
      output: translation ?? NULL_TRANSLATION_OUTPUT,
      reasoning: result.reasoningText ?? null,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
    });
    return {
      call,
      translation,
      usable: isUndeterminedLanguage(primary) || translation !== null,
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const step = completedStepRef.value;
      const call = await resolveCallMeta({
        kind: "translation",
        stage: "translation",
        role: "translation",
        model: QWEN_DRAFT_MODEL,
        output: step?.text ?? error.text ?? NULL_TRANSLATION_OUTPUT,
        reasoning: step?.reasoningText ?? null,
        usage: step?.usage ?? error.usage,
        providerMetadata: step?.providerMetadata,
      });
      return { call, translation: null, usable: false };
    }
    throw error;
  }
}
