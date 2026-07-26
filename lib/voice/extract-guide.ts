// lib/voice/extract-guide.ts
//
// The L2 voice-extraction call: ONE anthropic/claude-opus-5 call over a reporter's corpus,
// adaptive thinking @ high effort, NO tools, NO schema (the guide is markdown prose).
// Config ported from the lab (.voice-lab/sdk-lab/extract-fable80.mjs, measured $0.855/reporter
// on Fable 5); the model moved to Opus 5 at half the per-token price — see EXTRACTION_MODEL.
// SERVER-ONLY: imports lib/sysprompts (readFileSync at module scope) — never import from a
// client component. Script-invoked this slice; not wrapped in any serverless function yet.
import { generateText, streamText } from "ai";
import { resolveGatewayCost, toFiniteOrNull } from "@/lib/agent/gateway-cost";
import { aiTelemetry } from "@/lib/observability/ai-telemetry";
import { VOICE_EXTRACT_PROMPT } from "@/lib/sysprompts";
import { measuredFacts } from "./measured-facts";

/** The extraction model. Exported so `model_calls.model` records it without a second literal.
 *
 *  Opus 5, not Fable 5, as of this change. Fable won the original 8-model on-task panel, but
 *  Opus 5 postdates that panel entirely — it wasn't a contestant, so this isn't re-auditioning a
 *  settled decision. It is HALF the price ($5/$25 per MTok vs Fable's $10/$50), which should put
 *  a reporter's extraction near ~$0.43 against Fable's measured $0.855 — an expected figure, not
 *  a reserved or enforced one: there is no spend gate or cap on extraction (owner decision; see
 *  AGENTS.md's settled decisions). Same reasoning surface: adaptive thinking, and
 *  `display: "summarized"` still required because it also defaults to "omitted" here. */
export const EXTRACTION_MODEL = "anthropic/claude-opus-5";

/** UNDER INVESTIGATION — do not treat the current value as settled.
 *
 *  `maxOutputTokens` caps thinking AND response text TOGETHER, so this was carried at 32k, then
 *  64k on the Opus 5 switch, on the theory that adaptive/high thinking could eat a tight budget
 *  and truncate the guide. `undefined` sends no ceiling at all, which is the right default under
 *  adaptive thinking: the model sizes its own budget, so a number here can only ever be too small,
 *  never too generous. Whether omitting it makes the gateway substitute a provider default (the
 *  Anthropic API requires `max_tokens`) is being measured, not assumed — see
 *  `scripts/diagnose-extraction.ts`, which reads `finishReason` and `outputTokens` back rather
 *  than trusting the request shape. */
const EXTRACT_MAX_OUTPUT_TOKENS: number | undefined = undefined;
// Was 30 min ("far beyond any Vercel function cap") when this call was script-only
// (scripts/extract-voice-guide.ts). The create-agent v2 continuation wired
// extractVoiceGuideStreaming into real routes capped at maxDuration = 300 (create-desk's
// after() call, the Voice tab's manual retry) sharing that budget with the corpus-fetch poll
// (lib/x/timeline.ts's request timeout, ~0.6s) and the DB writes around both — a 30-minute abort
// here never fires before the platform kills the whole invocation with no cleanup.
//
// 280s is MEASURED, and the measurement moved twice — record the numbers, not a rule of thumb.
// A fully instrumented run on a 100-post corpus (scripts/diagnose-extraction.ts, uncapped output)
// took **200.4s wall-clock**: first REASONING delta at 5.8s, first TEXT delta at 60.5s, 4,016
// thinking tokens, 14,372 output tokens, 23,261 characters of guide, $0.436. An earlier estimate
// of 134s was wrong, and the 150s ceiling before that aborted a genuinely-still-streaming run at
// 151s — which is a full 50s before this run had produced its first character of guide.
//
// So the headroom that mattered was never over the mean, it was over the point where text STARTS.
// 240s would have been only 1.2x a real run, which is not headroom on a model whose latency varies
// per corpus. 280s is 1.4x, and sits inside the route's maxDuration = 300 with 20s left for the
// corpus read (~0.6s) and the ledger writes — deliberately tight against the platform ceiling,
// because being killed by Vercel mid-invocation leaves no cleanup at all, whereas this abort is
// caught. If a run ever needs longer than this, the fix is not a bigger number here: it is
// splitting the work out of a request-scoped function.
//
// A timeout here still throws out of runExtractionSpendPhase's try/catch, which catches it and
// stamps the run row failed via finishRun — there is no claim to release, since extraction
// carries no spend reservation.
const EXTRACT_TIMEOUT_MS = 280_000;

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
  /** Attached media as still images, passed to the model as real image parts (see
   *  `buildExtractionContent`). Optional so a corpus source without media still typechecks. */
  media?: { kind: "photo" | "video" | "animated_gif"; imageUrl: string }[];
};

/** Ceiling on how many images one extraction sends. A reporter posting four photos on every one
 *  of 100 posts would otherwise ship 400 images into a single call — images are the expensive
 *  part of a multimodal request, and extraction has no spend gate to catch it (owner decision,
 *  AGENTS.md). At a typical ~50 this never binds; when it does, the prompt SAYS so rather than
 *  letting the model infer that the unshown posts had no media. */
const MAX_CORPUS_IMAGES = 60;

export type VoiceExtraction = {
  guideRaw: string;
  /** The MEASURED STYLE FACTS block exactly as the model saw it — store this, don't recompute. */
  measuredFactsBlock: string;
  /**
   * The reasoning **summary**, persisted to `model_calls.reasoning` (AGENTS.md's model-call rule).
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
  /** Why the model stopped. Carried because an EMPTY guide is meaningless without it: `"length"`
   *  means a ceiling clipped the answer, `"stop"` means the model chose to end having written
   *  nothing, and those two failures need opposite fixes. */
  finishReason: string | null;
};

/** One part of the user message. The corpus is no longer a plain string: attached media rides
 *  along as real image parts, so the call is multimodal.
 *
 *  A `file` part, NOT the older `image` part — the SDK deprecates `image` in favour of `file`
 *  with an explicit `mediaType`, and warns on every use at runtime. X serves both photo urls and
 *  video/GIF poster frames as JPEG. */
type ExtractionContentPart =
  | { type: "text"; text: string }
  | { type: "file"; data: URL; mediaType: string };

/** X's CDN serves `.jpg` for photos and for video/GIF poster frames, and `.png` for a minority of
 *  uploads. Read it off the url rather than assuming, since an incorrect mediaType is rejected. */
function imageMediaType(url: string): string {
  const ext = new URL(url).pathname.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

/** Shared by both call shapes below (plain and streaming) so the prompt they send the model can
 *  never drift apart — extracted rather than duplicated inline a second time.
 *
 * The corpus line format is lab-identical and load-bearing, not cosmetic: the system prompt
 * grades `## RECENCY` off the dates, ranks mode performance off the engagement counts, and
 * describes each mode's "transformation" from the reacted-to post. Dropping any of them makes
 * those dimensions unanswerable and the guide measurably worse for the same spend. */
function buildExtractionContent(
  handle: string,
  posts: CorpusPost[],
): { facts: string; content: ExtractionContentPart[] } {
  // The measured-facts block is prepended and BINDING (the prompt's ## MEASURED FACTS section).
  const facts = measuredFacts(
    handle,
    posts.map((p) => p.text ?? "").filter((t) => t.trim()),
  );
  const lines: string[] = [];
  for (const p of posts) {
    const media = p.media ?? [];
    // The marker tells the model a post's link resolves to an attachment BEFORE it reaches the
    // images, so a `🚨 https://t.co/…` line is never read as a bare link post.
    const mediaMark = media.length
      ? ` [MEDIA: ${media.map((m) => m.kind).join(", ")} — shown below]`
      : "";
    lines.push(
      `[${p.id}] ${p.date} ${p.long ? "LONG " : ""}(♥${p.likes} ↻${p.reposts})${mediaMark}: ${p.text}`,
    );
    if (p.reactingTo?.text.trim()) {
      lines.push(
        `    ↳ was REACTING TO @${p.reactingTo.handle}: "${p.reactingTo.text.trim().slice(0, 300)}"`,
      );
    }
  }

  const content: ExtractionContentPart[] = [
    {
      type: "text",
      text: `REPORTER: @${handle}\n\n${facts}\n\nTHE CORPUS (most recent first):\n\n${lines.join("\n")}`,
    },
  ];

  // Attached media, as real images the model looks at. A post id labels each one so an image is
  // unambiguously bound to its corpus line — the corpus block above is a single text part and
  // could not carry that binding on its own.
  const withMedia = posts.filter((p) => (p.media ?? []).length > 0);
  if (withMedia.length > 0) {
    const shown: { id: string; kind: string; imageUrl: string }[] = [];
    let dropped = 0;
    for (const p of withMedia) {
      for (const m of p.media ?? []) {
        if (shown.length < MAX_CORPUS_IMAGES) shown.push({ id: p.id, ...m });
        else dropped++;
      }
    }
    content.push({
      type: "text",
      text:
        `\nATTACHED MEDIA — the images below are the attachments on the posts marked [MEDIA] above. ` +
        `Each image is preceded by its post id. A video or GIF is represented by its poster frame.` +
        (dropped > 0
          ? `\n\nNOTE: ${dropped} further attachment(s) exist on these posts and are NOT shown here — treat their posts as having media you could not inspect, not as having none.`
          : ""),
    });
    for (const s of shown) {
      content.push({ type: "text", text: `[${s.id}] ${s.kind}:` });
      content.push({
        type: "file",
        data: new URL(s.imageUrl),
        mediaType: imageMediaType(s.imageUrl),
      });
    }
  }

  return { facts, content };
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
  const { facts, content } = buildExtractionContent(handle, posts);

  const result = await generateText({
    model: EXTRACTION_MODEL,
    system: VOICE_EXTRACT_PROMPT,
    messages: [{ role: "user", content }],
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
    experimental_telemetry: aiTelemetry("voice_extraction", "voice-extraction-oneshot"),
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
    finishReason: result.finishReason ?? null,
  };
}

/** One accumulated snapshot of the in-flight stream, handed to `onProgress` as text/reasoning
 *  deltas arrive — the caller (create-desk-extraction.ts) throttles how often it actually
 *  persists these, this function just reports every delta it sees. */
export type ExtractionStreamSnapshot = { text: string; reasoning: string };

/** Every part `fullStream` yields, handed over untouched and unfiltered.
 *
 *  Separate from `onProgress` on purpose. `onProgress` fires only on text/reasoning deltas and
 *  reports an ACCUMULATION, which is precisely why a live empty-guide run could not be explained:
 *  a callback that fires on either kind of delta cannot answer "did any TEXT arrive at all?", and
 *  an accumulator cannot answer "in what order, and what else came through?". This one is the
 *  unabridged record — `start`, `start-step`, `reasoning-start`/`-delta`/`-end`,
 *  `text-start`/`-delta`/`-end`, `finish-step`, `finish`, `error`, `abort`, anything the SDK adds
 *  later — so the stream can be read back part by part instead of inferred from a total. */
export type ExtractionRawPartObserver = (
  part: Record<string, unknown> & { type: string },
) => void | Promise<void>;

export type ExtractionStreamOptions = {
  onProgress?: (snapshot: ExtractionStreamSnapshot) => void | Promise<void>;
  onRawPart?: ExtractionRawPartObserver;
};

/**
 * Same extraction call as `extractVoiceGuide` above — byte-identical model/config — but as a
 * `streamText` call instead of `generateText`, so the create-desk path can persist live
 * progress while a single extraction call (adaptive/high thinking, no output ceiling) runs.
 * `onProgress` fires on every text/reasoning delta with the accumulated-so-far snapshot;
 * consuming the stream this way is also what resolves `result.text`/`result.usage`/etc. below,
 * so no separate `consumeStream()` call is needed.
 *
 * `onRawPart` is the unfiltered witness — see `ExtractionRawPartObserver`. Production passes it
 * nothing; `scripts/diagnose-extraction.ts` passes a recorder.
 */
export async function extractVoiceGuideStreaming(
  handle: string,
  posts: CorpusPost[],
  onProgress?: (snapshot: ExtractionStreamSnapshot) => void | Promise<void>,
  onRawPart?: ExtractionRawPartObserver,
): Promise<VoiceExtraction> {
  const { facts, content } = buildExtractionContent(handle, posts);

  const result = streamText({
    model: EXTRACTION_MODEL,
    system: VOICE_EXTRACT_PROMPT,
    messages: [{ role: "user", content }],
    maxOutputTokens: EXTRACT_MAX_OUTPUT_TOKENS,
    // Same reasoning as extractVoiceGuide's call above — kept byte-identical on purpose.
    providerOptions: {
      anthropic: { thinking: { type: "adaptive", effort: "high", display: "summarized" } },
    },
    // NO `tools` key — enforced by review, invisible to the type system.
    abortSignal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
    // Identifying attributes (handle, corpus size) ride on the WRAPPING span, not here — see
    // aiTelemetry's note on v7 dropping telemetry metadata.
    experimental_telemetry: aiTelemetry("voice_extraction", "voice-extraction-stream"),
  });

  let textSoFar = "";
  let reasoningSoFar = "";
  for await (const part of result.fullStream) {
    // The raw observer sees EVERY part, before any filtering — it is the only witness to the
    // parts the accumulation below discards, which is where an unexplained empty guide hides.
    if (onRawPart) await onRawPart(part as unknown as Record<string, unknown> & { type: string });
    if (part.type === "text-delta") textSoFar += part.text;
    else if (part.type === "reasoning-delta") reasoningSoFar += part.text;
    else continue;
    if (onProgress) await onProgress({ text: textSoFar, reasoning: reasoningSoFar });
  }

  const [text, reasoningText, usage, providerMetadata, finishReason] = await Promise.all([
    result.text,
    result.reasoningText,
    result.usage,
    result.providerMetadata,
    result.finishReason,
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
    finishReason: finishReason ?? null,
  };
}
