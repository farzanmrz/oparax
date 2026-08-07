// SERVER-ONLY: this stage reads prompts from lib/sysprompts and must never reach a client
// component.

import { streamText } from "ai";
import { aiTelemetry } from "@/lib/observability/ai-telemetry";
import { DRAFT_TRANSLATE_PROMPT } from "@/lib/sysprompts";
import { resolveCallMeta } from "./call-meta";
import type { CouncilCall, SourceBrief } from "./draft-council-run";
import { QWEN_DRAFT_MODEL, QWEN_DRAFT_PROVIDER_OPTIONS } from "./qwen-draft-config";

const NULL_TRANSLATION_OUTPUT = JSON.stringify({ translation: null });
const NO_TRANSLATION_SENTINEL = "NO_TRANSLATION";
const INACTIVITY_TIMEOUT_MS = 45_000;
const ABSOLUTE_TIMEOUT_MS = 240_000;
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

  const controller = new AbortController();
  let inactivityTimer: ReturnType<typeof setTimeout> | undefined;
  let absoluteTimer: ReturnType<typeof setTimeout> | undefined;
  let timeoutError: Error | undefined;
  const abortForTimeout = (message: string) => {
    timeoutError = new Error(message);
    controller.abort(timeoutError);
  };
  const armInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(
      () => abortForTimeout("Translation stream timed out waiting for activity"),
      INACTIVITY_TIMEOUT_MS,
    );
  };

  const result = streamText({
    model: QWEN_DRAFT_MODEL,
    providerOptions: QWEN_DRAFT_PROVIDER_OPTIONS,
    temperature: 0,
    reasoning: "medium",
    // Plain-text streaming, no `output:`/schema, no `maxOutputTokens`. Measured: `generateText`
    // + JSON output on a ~27k-char source dies with zero bytes flowing — the provider takes
    // >5min to generate, undici's headers-timeout kills the connection, the SDK retries 3x, and
    // the worker redelivers 6x total with no draft ever produced. `streamText` + `Output.object`
    // was tried next and fails at ALL sizes on Alibaba (the server aborts JSON mode once
    // streaming is requested), so the translator streams WITHOUT structured output and a
    // sentinel string carries the null case. Measured: plain-text streaming at 18.6k varied
    // chars completes in 51s with a max inter-chunk gap of 324ms, vs. `generateText` still dead
    // at ~300s. Because bytes now flow continuously, INACTIVITY_TIMEOUT_MS below (reset on every
    // chunk) is the correct death detector — silence genuinely means the call is stuck, matching
    // the abort precedent in lib/voice/extract-guide.ts.
    abortSignal: controller.signal,
    system: DRAFT_TRANSLATE_PROMPT,
    messages: [
      {
        role: "user",
        content: `<source_language>${isUndeterminedLanguage(primary) ? "und" : input.brief.lang}</source_language>\n<source_post>\n${input.brief.text}\n</source_post>`,
      },
    ],
    experimental_telemetry: aiTelemetry("draft_translate", "draft-translate-qwen"),
  });

  // No catch here on purpose: any error, including the inactivity abort above, propagates so
  // `draftForAgent`'s catch releases the claim. An abort mid-stream can still leave partial spend
  // on the provider side; that's repaired by the existing cost-reconciliation sweep
  // (reconcileMissingCosts), not ledgered here.
  try {
    armInactivityTimer();
    absoluteTimer = setTimeout(
      () => abortForTimeout("Translation stream exceeded its 240 second deadline"),
      ABSOLUTE_TIMEOUT_MS,
    );
    // fullStream, not textStream: the reasoning phase emits no TEXT deltas for tens of seconds
    // (probe: 29.8s max gap on a 14k-char source — a near-miss against the 45s window), but its
    // reasoning deltas DO flow here, so thinking keeps resetting the timer and only true wire
    // silence trips the abort.
    for await (const part of result.fullStream) {
      armInactivityTimer();
      if (part.type === "error") {
        throw part.error;
      }
    }
    if (timeoutError) throw timeoutError;
    const [text, finishReason] = await Promise.all([result.text, result.finishReason]);
    if (timeoutError) throw timeoutError;
    if (finishReason !== "stop") {
      throw new Error(`Translation stream ended with finish reason: ${finishReason}`);
    }
    const raw = text.trim();
    const translation = raw === NO_TRANSLATION_SENTINEL || raw === "" ? null : raw;
    const call = await resolveCallMeta({
      kind: "translation",
      stage: "translation",
      role: "translation",
      model: QWEN_DRAFT_MODEL,
      output: translation ?? NULL_TRANSLATION_OUTPUT,
      reasoning: (await result.reasoningText) ?? null,
      usage: await result.usage,
      providerMetadata: await result.providerMetadata,
    });
    return {
      call,
      translation,
      usable: isUndeterminedLanguage(primary) || translation !== null,
    };
  } finally {
    clearTimeout(inactivityTimer);
    clearTimeout(absoluteTimer);
  }
}
