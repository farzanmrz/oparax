// lib/voice/extract-guide.ts
//
// The L2 voice-extraction call: ONE anthropic/claude-fable-5 generateText over a reporter's
// corpus, adaptive thinking @ high effort, NO tools, NO schema (the guide is markdown prose).
// Lab-proven config (.voice-lab/sdk-lab/extract-fable80.mjs — measured $0.855/reporter, 10/10).
// SERVER-ONLY: imports lib/sysprompts (readFileSync at module scope) — never import from a
// client component. Script-invoked this slice; not wrapped in any serverless function yet.
import { generateText, streamText } from "ai";
import { resolveGatewayCost, toFiniteOrNull } from "@/lib/agent/gateway-cost";
import { VOICE_EXTRACT_PROMPT } from "@/lib/sysprompts";
import { measuredFacts } from "./measured-facts";

/** The extraction model. Exported so `model_calls.model` records it without a second literal. */
export const EXTRACTION_MODEL = "anthropic/claude-fable-5";

const EXTRACT_MAX_OUTPUT_TOKENS = 32_000;
// Was 30 min ("far beyond any Vercel function cap") when this call was script-only
// (scripts/extract-voice-guide.ts). The create-agent v2 continuation wired
// extractVoiceGuideStreaming into real routes capped at maxDuration = 300 (create-desk's
// after() call, capReprobe's manual retry) sharing that budget with the corpus-fetch poll
// (lib/web/brightdata.ts's POLL_TIMEOUT_MS) and the DB writes around both — a 30-minute abort
// here never fires before the platform kills the whole invocation with no cleanup. 150s is a
// first-pass budget split, not measured against real generation latency yet — retune both once
// real extraction runs show actual durations. A timeout here still throws out of
// attemptVoiceExtraction's try/catch (releasing the claim for same-day retry via
// releaseClaimOnCorpusFailure) instead of a silent platform kill.
const EXTRACT_TIMEOUT_MS = 150_000;

/** One corpus post, carrying the metadata the extraction prompt grades against. */
export type CorpusPost = {
  id: string;
  date: string;
  text: string;
  likes: number;
  reposts: number;
  long: boolean;
  /** The post this one was replying to/quoting, when the raw corpus recorded one. */
  reactingTo?: { handle: string; text: string } | null;
};

export type VoiceExtraction = {
  guideRaw: string;
  /** The MEASURED STYLE FACTS block exactly as the model saw it — store this, don't recompute. */
  measuredFactsBlock: string;
  /**
   * The reasoning **summary**, persisted to `model_calls.reasoning` (decisions.md L12).
   *
   * Claude never returns its raw chain of thought — that is permanent. What is available is a
   * readable summary, gated on `thinking.display`, which defaults to `"omitted"` on this
   * model. Crucially, `"omitted"` still returns a thinking block, with `text: ""` — so a
   * default-config call looks identical to a model incapable of exposing anything, and emits
   * no warning to say otherwise. Requesting `display: "summarized"` (see the call below) is
   * what populates this field.
   *
   * Still `null` only if the provider genuinely returns nothing; callers stamp
   * `reasoningWithheldByProvider` so that case stays distinguishable from a missed capture.
   */
  reasoning: string | null;
  thinkingTokens: number | null;
  costUsd: number | null;
  usage: unknown;
  generationId: string | null;
};

/** Shared by both call shapes below (plain and streaming) so the prompt they send the model can
 *  never drift apart — extracted rather than duplicated inline a second time.
 *
 * The corpus line format is lab-identical and load-bearing, not cosmetic: the system prompt
 * grades `## RECENCY` off the dates, ranks mode performance off the engagement counts, and
 * describes each mode's "transformation" from the reacted-to post. Dropping any of them makes
 * those dimensions unanswerable and the guide measurably worse for the same spend. */
function buildExtractionPrompt(
  handle: string,
  posts: CorpusPost[],
): { facts: string; prompt: string } {
  // The measured-facts block is prepended and BINDING (the prompt's ## MEASURED FACTS section).
  const facts = measuredFacts(
    handle,
    posts.map((p) => p.text ?? "").filter((t) => t.trim()),
  );
  const lines: string[] = [];
  for (const p of posts) {
    lines.push(
      `[${p.id}] ${p.date} ${p.long ? "LONG " : ""}(♥${p.likes} ↻${p.reposts}): ${p.text}`,
    );
    if (p.reactingTo?.text.trim()) {
      lines.push(
        `    ↳ was REACTING TO @${p.reactingTo.handle}: "${p.reactingTo.text.trim().slice(0, 300)}"`,
      );
    }
  }
  const prompt = `REPORTER: @${handle}\n\n${facts}\n\nTHE CORPUS (most recent first):\n\n${lines.join("\n")}`;
  return { facts, prompt };
}

/**
 * Extract a raw voice guide for one reporter from their corpus. Plain `generateText` — used by
 * scripts/extract-voice-guide.ts's CLI/manual path, which has no progress UI to feed. The live
 * create-desk path uses `extractVoiceGuideStreaming` below instead; both share the exact same
 * model/config, only how the result is consumed differs.
 */
export async function extractVoiceGuide(
  handle: string,
  posts: CorpusPost[],
): Promise<VoiceExtraction> {
  const { facts, prompt } = buildExtractionPrompt(handle, posts);

  const result = await generateText({
    model: EXTRACTION_MODEL,
    system: VOICE_EXTRACT_PROMPT,
    prompt,
    maxOutputTokens: EXTRACT_MAX_OUTPUT_TOKENS,
    // `display: "summarized"` is what makes the reasoning readable. It defaults to "omitted"
    // on this model, and "omitted" still returns a thinking block — with `text: ""`, which
    // reads exactly like a model that cannot expose its reasoning. Probed: summarized yields
    // real text, omitted yields none, with zero warnings either way.
    // Effort sits INSIDE `thinking` (the SDK's shape); `outputConfig` is the REST shape.
    // Never add a top-level `reasoning` param alongside this — the two are never merged, and
    // any reasoning key in providerOptions makes the top-level one silently ignored in full.
    providerOptions: {
      anthropic: { thinking: { type: "adaptive", effort: "high", display: "summarized" } },
    },
    // NO `tools` key — enforced by review, invisible to the type system.
    abortSignal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
  });

  const anthropic = result.providerMetadata?.anthropic as
    | { usage?: { output_tokens_details?: { thinking_tokens?: unknown } } }
    | undefined;
  const thinkingTokens = toFiniteOrNull(anthropic?.usage?.output_tokens_details?.thinking_tokens);

  const { costUsd, generationId } = await resolveGatewayCost(result);

  return {
    guideRaw: result.text,
    measuredFactsBlock: facts,
    reasoning: result.reasoningText ?? null,
    thinkingTokens,
    costUsd,
    usage: result.usage,
    generationId,
  };
}

/** One accumulated snapshot of the in-flight stream, handed to `onProgress` as text/reasoning
 *  deltas arrive — the caller (create-desk-extraction.ts) throttles how often it actually
 *  persists these, this function just reports every delta it sees. */
export type ExtractionStreamSnapshot = { text: string; reasoning: string };

/**
 * Same extraction call as `extractVoiceGuide` above — byte-identical model/config — but as a
 * `streamText` call instead of `generateText`, so the create-desk path can persist live
 * progress while a single extraction call (adaptive/high thinking, 32k output ceiling) runs.
 * `onProgress` fires on every text/reasoning delta with the accumulated-so-far snapshot;
 * consuming the stream this way is also what resolves `result.text`/`result.usage`/etc. below,
 * so no separate `consumeStream()` call is needed.
 */
export async function extractVoiceGuideStreaming(
  handle: string,
  posts: CorpusPost[],
  onProgress?: (snapshot: ExtractionStreamSnapshot) => void | Promise<void>,
): Promise<VoiceExtraction> {
  const { facts, prompt } = buildExtractionPrompt(handle, posts);

  const result = streamText({
    model: EXTRACTION_MODEL,
    system: VOICE_EXTRACT_PROMPT,
    prompt,
    maxOutputTokens: EXTRACT_MAX_OUTPUT_TOKENS,
    // Same reasoning as extractVoiceGuide's call above — kept byte-identical on purpose.
    providerOptions: {
      anthropic: { thinking: { type: "adaptive", effort: "high", display: "summarized" } },
    },
    // NO `tools` key — enforced by review, invisible to the type system.
    abortSignal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
  });

  let textSoFar = "";
  let reasoningSoFar = "";
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") textSoFar += part.text;
    else if (part.type === "reasoning-delta") reasoningSoFar += part.text;
    else continue;
    if (onProgress) await onProgress({ text: textSoFar, reasoning: reasoningSoFar });
  }

  const [text, reasoningText, usage, providerMetadata] = await Promise.all([
    result.text,
    result.reasoningText,
    result.usage,
    result.providerMetadata,
  ]);

  const anthropic = providerMetadata?.anthropic as
    | { usage?: { output_tokens_details?: { thinking_tokens?: unknown } } }
    | undefined;
  const thinkingTokens = toFiniteOrNull(anthropic?.usage?.output_tokens_details?.thinking_tokens);

  const { costUsd, generationId } = await resolveGatewayCost({ providerMetadata });

  return {
    guideRaw: text,
    measuredFactsBlock: facts,
    reasoning: reasoningText ?? null,
    thinkingTokens,
    costUsd,
    usage,
    generationId,
  };
}
