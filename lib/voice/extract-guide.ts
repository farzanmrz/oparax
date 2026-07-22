// lib/voice/extract-guide.ts
//
// The L2 voice-extraction call: ONE anthropic/claude-fable-5 generateText over a reporter's
// corpus, adaptive thinking @ high effort, NO tools, NO schema (the guide is markdown prose).
// Lab-proven config (.voice-lab/sdk-lab/extract-fable80.mjs — measured $0.855/reporter, 10/10).
// SERVER-ONLY: imports lib/sysprompts (readFileSync at module scope) — never import from a
// client component. Script-invoked this slice; not wrapped in any serverless function yet.
import { generateText } from "ai";
import { resolveGatewayCost, toFiniteOrNull } from "@/lib/agent/gateway-cost";
import { VOICE_EXTRACT_PROMPT } from "@/lib/sysprompts";
import { measuredFacts } from "./measured-facts";

/** The extraction model. Exported so `model_calls.model` records it without a second literal. */
export const EXTRACTION_MODEL = "anthropic/claude-fable-5";

const EXTRACT_MAX_OUTPUT_TOKENS = 32_000;
const EXTRACT_TIMEOUT_MS = 1_800_000; // 30 min — a script, far beyond any Vercel function cap

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

/**
 * Extract a raw voice guide for one reporter from their corpus.
 *
 * The corpus line format is lab-identical and load-bearing, not cosmetic: the system prompt
 * grades `## RECENCY` off the dates, ranks mode performance off the engagement counts, and
 * describes each mode's "transformation" from the reacted-to post. Dropping any of them makes
 * those dimensions unanswerable and the guide measurably worse for the same spend.
 */
export async function extractVoiceGuide(
  handle: string,
  posts: CorpusPost[],
): Promise<VoiceExtraction> {
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
