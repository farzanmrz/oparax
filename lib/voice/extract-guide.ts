// lib/voice/extract-guide.ts
//
// The L2 voice-extraction call: ONE anthropic/claude-sonnet-5 call over a reporter's corpus,
// adaptive thinking @ medium effort, NO schema (the guide is markdown prose), and exactly ONE
// tool — `exclude_off_beat_posts`, a pure local recompute of the measured-facts block over the
// on-beat subset (see buildScopeTool for why it is not the web search `.claude/rules/voice.md`
// rules out, and for the three guardrails that bound it).
// Config ported from the lab's extract-fable80.mjs (measured $0.855/reporter
// on Fable 5); Sonnet 5 is the lower-cost trial model — see EXTRACTION_MODEL.
// SERVER-ONLY: imports lib/sysprompts (readFileSync at module scope) — never import from a
// client component. Script-invoked this slice; not wrapped in any serverless function yet.
import { stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { resolveGatewayCost, toFiniteOrNull } from "@/lib/agent/gateway-cost";
import { resolveImageMediaType } from "@/lib/agent/source-media";
import { aiTelemetry } from "@/lib/observability/ai-telemetry";
import { VOICE_EXTRACT_PROMPT } from "@/lib/sysprompts";
import { escapeXmlAttribute, escapeXmlText } from "@/lib/xml";
import type {
  ExtractionReasoningByStage,
  ExtractionReasoningStage,
  ExtractionTextByStage,
  ExtractionToolActivity,
} from "./extraction-progress-reasoning";
import { measuredFacts } from "./measured-facts";

/** The extraction model. Exported so `model_calls.model` records it without a second literal.
 *
 *  Sonnet 5 is temporarily replacing Opus 5 while the extraction stream is exercised live. The
 *  Gateway catalog gives both models the same contract this call consumes (1M context, 128K
 *  output, image input, tools, reasoning, streamed text); Sonnet is cheaper, but guide quality
 *  remains an eval question rather than something capability metadata can establish.
 *
 *  Thinking is adaptive by default on Sonnet 5. Because this call also needs Anthropic's
 *  summarized display, effort lives inside the SAME provider thinking object; a competing flat
 *  `reasoning` setting can be accepted yet ignored once provider-specific reasoning options are
 *  present. */
export const EXTRACTION_MODEL = "anthropic/claude-sonnet-5";

/** UNDER INVESTIGATION — do not treat the current value as settled.
 *
 *  `maxOutputTokens` caps thinking AND response text TOGETHER, so this was carried at 32k, then
 *  64k on the Opus 5 switch, on the theory that adaptive/high thinking could eat a tight budget
 *  and truncate the guide. `undefined` sends no ceiling at all, which is the right default under
 *  adaptive thinking: the model sizes its own budget, so a number here can only ever be too small,
 *  never too generous. Whether omitting it makes the gateway substitute a provider default (the
 *  Anthropic API requires `max_tokens`) was measured, not assumed: a run that read
 *  `finishReason` and `outputTokens` back off the response rather than trusting the request
 *  shape. Re-measure the same way before changing this — the request shape does not tell you. */
const EXTRACT_MAX_OUTPUT_TOKENS: number | undefined = undefined;
// The measured baseline: a fully instrumented run on a 100-post corpus
// (uncapped output) took **200.4s wall-clock** — first
// REASONING delta at 5.8s, first TEXT delta at 60.5s, 4,016 thinking tokens, 14,372 output
// tokens, $0.436. But per-corpus variance is real and the tail is long: a live run
// (2026-07-26, @ReshadRahman's corpus, QC's create-agent journey) was STILL mid-reasoning at
// the previous 280s ceiling and aborted with an empty guide — a billed call, no guide, and a
// retry that would rerun the same corpus against the same too-small ceiling.
//
// So the ceiling moved to Vercel Pro's Fluid Compute maximum: the extraction routes
// (app/agents/new/page.tsx, app/agents/[id]/voice/page.tsx) now export maxDuration = 800, and
// this abort sits at 770s — ~30s reserved for the corpus fetch (~0.6s) and the ledger/run-row
// writes on either side of the call. That is ~3.8x the measured run, which is headroom over the
// TAIL rather than the mean. The abort must stay strictly inside maxDuration: an abort that
// fires is CAUGHT (runExtractionSpendPhase's try/catch stamps the run row failed via
// finishRun, so the UI shows a real failure + retry), whereas the platform killing the
// invocation at 800s leaves a run row stuck "running" and no cleanup at all.
//
// This is a stuck-run guard now, not a latency budget — `stopWhen: stepCountIs(3)` already
// bounds the tool loop, and this bounds a hung stream. If a real corpus ever needs longer than
// this, the fix is not a bigger number: it is splitting extraction out of a request-scoped
// function entirely (a queue/background job), which also survives redeploys.
const EXTRACT_TIMEOUT_MS = 770_000;

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
 *  of MAX_POSTS (50) posts would otherwise ship 200 images into a single call — images are the
 *  expensive part of a multimodal request, and extraction has no spend gate to catch it (owner
 *  decision, AGENTS.md). At a measured ~40% media rate that is ~20 for a 50-post corpus, so this
 *  now rarely binds; when it does, the prompt SAYS so rather than letting the model infer that
 *  the unshown posts had no media. */
const MAX_CORPUS_IMAGES = 60;

/** The most of a corpus the model may exclude as off-beat before the tool refuses outright.
 *
 *  This is the guardrail on the one real hazard of letting the model choose the subset its own
 *  binding numbers are computed over: a model that excludes most of a timeline can manufacture
 *  whatever style profile it likes, and `measuredFacts` — which exists precisely BECAUSE reading
 *  under-counts sparse habits — would then be counting a set the reading already biased. Half is
 *  deliberately generous (a genuinely mixed timeline can be a third off-beat) while still making
 *  "exclude nearly everything" impossible. On refusal the tool returns the FULL-corpus block and
 *  says why, so the run continues honestly rather than failing. */
const MAX_OFF_BEAT_SHARE = 0.5;

/** How many round trips the extraction call may take. One tool call plus the guide is two steps;
 *  three leaves room for a single retry after a refusal and makes an unbounded tool loop
 *  impossible on a call that has no spend gate above it. */
const MAX_EXTRACTION_STEPS = 3;

/** What the scope tool did, carried out of the call so it can be persisted, shown, and audited.
 *  `applied: false` with a populated `postIds` is the refusal case — the model asked, the
 *  guardrail said no, and the guide was written against the full corpus after all. */
export type ScopeExclusion = {
  postIds: string[];
  reason: string;
  applied: boolean;
  note: string;
};

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
  /** The `error` part the stream emitted, if any — the underlying provider/gateway error behind
   *  a `finishReason: "error"` run. streamText never throws these into the consuming loop; it
   *  yields them as parts and moves on, so without capturing here the only trace of WHY a stream
   *  died is the SDK's default console log, which ages out with the platform's runtime logs
   *  (lived through 2026-08-09: a production `gateway_stream_terminated` was recoverable only
   *  because the logs were pulled minutes after the failure). */
  streamError: unknown;
  /** What the off-beat scope tool did, or `null` when the model never called it (in which case
   *  the guide was written against the full corpus — the pre-tool behaviour, and a valid run). */
  scopeExclusion: ScopeExclusion | null;
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

/**
 * The one tool the extraction call gets, plus the mutable slot its result is captured into.
 *
 * WHY A TOOL AT ALL, on a call whose config is otherwise measured-not-authored. A corpus is a
 * whole timeline, so it carries posts outside the reporter's beat — gaming clips and personal
 * asides sit beside transfer news. `measuredFacts` is computed in CODE over every post and the
 * prompt makes its numbers binding, so without this the model is handed an emoji inventory and a
 * length distribution describing a mix of beat writing and off-beat noise, and told it may not
 * contradict them. The guide then teaches that mixture as the reporter's news voice. Letting the
 * model name the off-beat posts and recompute the block over what remains is what makes the
 * binding numbers describe the thing the guide is actually about.
 *
 * This is deliberately NOT the web-search tool `.claude/rules/voice.md` rules out: it adds no
 * external fact and reaches no network. It is the same pure function already used to build the
 * prompt, re-run over a subset.
 *
 * Three guardrails live HERE rather than in the prompt, because a prompt can be ignored and an
 * `execute` cannot:
 *   1. Unknown ids are reported back, never silently dropped — a model excluding ids that do not
 *      exist is a model that has lost track of the corpus, and it should be told so.
 *   2. Excluding more than `MAX_OFF_BEAT_SHARE` is REFUSED outright (see that constant).
 *   3. Refusal returns the full-corpus block and an explanation instead of throwing, so a bad
 *      tool call costs a round trip rather than the whole extraction.
 */
function buildScopeTool(
  handle: string,
  posts: CorpusPost[],
  onEvent?: (e: ScopeExclusion) => void | Promise<void>,
) {
  const byId = new Map(posts.map((p) => [p.id, p]));
  let captured: ScopeExclusion | null = null;

  const factsFor = (subset: CorpusPost[]) =>
    `<measured_style_facts>\n${measuredFacts(
      handle,
      subset.map((p) => p.text ?? "").filter((t) => t.trim()),
    )}\n</measured_style_facts>`;

  const scopeTool = tool({
    description:
      'Exclude <post id="…"> elements that fall outside the reporter\'s stated beat, then ' +
      "recompute the <measured_style_facts> block over only the posts that remain. Call this " +
      "ONCE, after you have read the whole <corpus> and before you write the guide. The block " +
      "this returns REPLACES the one in your input and is the binding one. If every post is on " +
      "beat, do not call this at all.",
    inputSchema: z.object({
      offBeatPostIds: z
        .array(z.string())
        .describe('The values of the <post id="…"> attributes that fall outside the stated beat.'),
      reason: z
        .string()
        .describe(
          "One sentence naming the categories being excluded, e.g. 'gaming clips and personal " +
            "posts, neither of which is Barcelona football news'.",
        ),
    }),
    execute: async ({ offBeatPostIds, reason }) => {
      const unknown = offBeatPostIds.filter((id) => !byId.has(id));
      const known = [...new Set(offBeatPostIds.filter((id) => byId.has(id)))];
      const share = posts.length > 0 ? known.length / posts.length : 0;

      if (share > MAX_OFF_BEAT_SHARE) {
        const note =
          `REFUSED: ${known.length} of ${posts.length} posts (${Math.round(share * 100)}%) is over ` +
          `the ${Math.round(MAX_OFF_BEAT_SHARE * 100)}% ceiling on how much of a corpus may be ` +
          `excluded. The <measured_style_facts> block below is unchanged and still covers every post. ` +
          `Write the guide against it, and record the off-beat categories under Beat & Scope's ` +
          `Excludes instead.`;
        captured = { postIds: known, reason, applied: false, note };
        await onEvent?.(captured);
        return { applied: false, note, measuredFacts: factsFor(posts) };
      }

      const kept = posts.filter((p) => !known.includes(p.id));
      const note =
        `Excluded ${known.length} of ${posts.length} posts. The <measured_style_facts> block below is ` +
        `recomputed over the remaining ${kept.length} and REPLACES the one in your input.` +
        (unknown.length > 0
          ? ` NOTE: ${unknown.length} id(s) you listed are not in this corpus and were ignored: ${unknown.join(", ")}.`
          : "");
      captured = { postIds: known, reason, applied: true, note };
      await onEvent?.(captured);
      return { applied: true, note, measuredFacts: factsFor(kept) };
    },
  });

  return { tools: { exclude_off_beat_posts: scopeTool }, read: () => captured };
}

/** Shared by both call shapes below (plain and streaming) so the prompt they send the model can
 *  never drift apart — extracted rather than duplicated inline a second time.
 *
 * The corpus XML format is lab-identical and load-bearing, not cosmetic: the system prompt
 * grades `## RECENCY` off the dates, ranks mode performance off the engagement counts, and
 * describes each mode's "transformation" from the reacted-to post. Dropping any of them makes
 * those dimensions unanswerable and the guide measurably worse for the same spend. */
function buildExtractionContent(
  handle: string,
  posts: CorpusPost[],
  beat: string,
): { facts: string; content: ExtractionContentPart[] } {
  // The measured-facts block is prepended and BINDING (the prompt's ## MEASURED FACTS section).
  const facts = measuredFacts(
    handle,
    posts.map((p) => p.text ?? "").filter((t) => t.trim()),
  );
  const corpusPosts: string[] = [];
  for (const p of posts) {
    const media = p.media ?? [];
    const attributes = [
      `id="${escapeXmlAttribute(p.id)}"`,
      `date="${escapeXmlAttribute(p.date)}"`,
      `likes="${p.likes}"`,
      `reposts="${p.reposts}"`,
      ...(p.long ? ['long="true"'] : []),
      ...(media.length
        ? [`media="${escapeXmlAttribute(media.map((item) => item.kind).join(","))}"`]
        : []),
    ].join(" ");
    const reactingTo = p.reactingTo?.text.trim()
      ? [
          `<reacting_to author="@${escapeXmlAttribute(p.reactingTo.handle)}">`,
          escapeXmlText(p.reactingTo.text.trim()),
          "</reacting_to>",
        ].join("\n")
      : null;
    corpusPosts.push(
      [`<post ${attributes}>`, escapeXmlText(p.text), reactingTo, "</post>"]
        .filter((part): part is string => part !== null)
        .join("\n"),
    );
  }

  const content: ExtractionContentPart[] = [
    {
      type: "text",
      // The reporter's OWN words for what they want monitored. It governs `## Beat & Scope`'s
      // boundary; the corpus below only adds precision inside it (see voice-extract.md). Passing
      // the corpus without it would leave the extractor inferring scope from activity alone,
      // which widens the beat to whatever the reporter happens to post about.
      text: [
        `<reporter>@${escapeXmlText(handle)}</reporter>`,
        "",
        "<beat>",
        escapeXmlText(beat.trim() || "(not stated)"),
        "</beat>",
        "",
        "<measured_style_facts>",
        facts,
        "</measured_style_facts>",
        "",
        "<corpus>",
        corpusPosts.join("\n\n"),
        "</corpus>",
      ].join("\n"),
    },
  ];

  // Attached media, as real images the model looks at. A post id labels each one so an image is
  // unambiguously bound to its corpus element — the corpus block above is a single text part and
  // could not carry that binding on its own.
  const withMedia = posts.filter((p) => (p.media ?? []).length > 0);
  if (withMedia.length > 0) {
    const shown: { id: string; kind: string; imageUrl: string }[] = [];
    let dropped = 0;
    for (const p of withMedia) {
      for (const m of p.media ?? []) {
        // A malformed url can't be shown either way — count it against the same "dropped" note
        // rather than silently vanishing, so the model still knows this post carried media it
        // couldn't inspect instead of reading as having none.
        if (resolveImageMediaType(m.imageUrl) === null) {
          dropped++;
          continue;
        }
        if (shown.length < MAX_CORPUS_IMAGES) shown.push({ id: p.id, ...m });
        else dropped++;
      }
    }
    content.push({
      type: "text",
      text:
        `\nATTACHED MEDIA — the images below are the attachments on posts with media attributes above. ` +
        `Each image is preceded by its post id. A video or GIF is represented by its poster frame.` +
        (dropped > 0
          ? `\n\nNOTE: ${dropped} further attachment(s) exist on these posts and are NOT shown here — treat their posts as having media you could not inspect, not as having none.`
          : ""),
    });
    for (const s of shown) {
      // Already validated when `shown` was built, but re-checked here defensively rather than
      // trusting that invariant across the two loops — a skip here is still a skip, not a crash.
      const mediaType = resolveImageMediaType(s.imageUrl);
      let fileUrl: URL;
      try {
        fileUrl = new URL(s.imageUrl);
      } catch (e) {
        console.error(
          `extract-guide: skipping media with unparsable url (post ${s.id}): ${s.imageUrl}`,
          e,
        );
        continue;
      }
      if (mediaType === null) continue;
      content.push({ type: "text", text: `[${s.id}] ${s.kind}:` });
      content.push({ type: "file", data: fileUrl, mediaType });
    }
  }

  return { facts, content };
}

/** One step of this call's multi-step run, narrowed to only what `reconstructFromSteps` needs —
 *  matches both `generateText`'s and `streamText`'s step shape (`DefaultStepResult` in the
 *  installed `ai@7.0.14`) without importing an SDK-internal type. */
type ExtractionStep = {
  text: string;
  reasoningText: string | undefined;
  providerMetadata?: Record<string, unknown>;
};

/**
 * ai@7's multi-step `generateText`/`streamText` results expose `.text`, `.reasoningText`, and
 * `.providerMetadata` as LAST-STEP-ONLY getters — confirmed by reading the installed
 * `node_modules/ai/dist/index.js` rather than assumed: `DefaultGenerateTextResult.text` returns
 * `this.finalStep.text` where `finalStep` is `this.steps.at(-1)`, `DefaultStreamTextResult.text`
 * resolves `this.finalStep.then(step => step.text)` the same way, and both classes' `.usage`
 * getter is the one exception — it returns `this.totalUsage`, which the SDK genuinely aggregates
 * across every step as the stream/steps resolve. For this call — `stopWhen: stepCountIs(3)`,
 * one tool (`exclude_off_beat_posts`) the model may call BEFORE writing the guide — that
 * mismatch is two real bugs, not one:
 *
 *   1. A step that calls the tool has NO text content (`step.text` filters its `content` array
 *      for `type: "text"` parts), so if the model's LAST step is itself a tool call — it hits
 *      the step cap mid-loop, or calls the tool a second time for no reason — `finalStep.text`
 *      is `""`. The run then throws "extraction produced an empty guide"
 *      (`create-desk-extraction.ts`) AFTER the whole run already billed. This walks the step
 *      list backward for the last one that actually produced text, instead of assuming it's the
 *      last step.
 *   2. `finalStep.reasoningText` silently drops every earlier step's reasoning — here, that is
 *      the reasoning that decided the beat/exclusions in step 1, breaching AGENTS.md's "every
 *      model call records its reasoning" rule on the single most expensive call in the product.
 *      This concatenates every step's reasoning instead of reading only the last.
 *
 * Cost and thinking-token count are summed per step rather than read off one — each step is its
 * own real request to the model, so each carries its own gateway `providerMetadata` (cost,
 * generation id) and its own Anthropic-specific thinking-token count. This is a genuine
 * improvement over the old behavior (which silently dropped every non-final step's cost and
 * thinking-token count entirely), but stops short of being fully exact for cost specifically —
 * see the comment on `generationId` below for what's still approximated and why.
 */
async function reconstructFromSteps(steps: ExtractionStep[]): Promise<{
  text: string;
  reasoning: string | null;
  thinkingTokens: number | null;
  costUsd: number | null;
  generationId: string | null;
}> {
  let text = "";
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].text.trim()) {
      text = steps[i].text;
      break;
    }
  }

  const reasoning = steps
    .map((s) => s.reasoningText?.trim())
    .filter((r): r is string => !!r)
    .join("\n\n");

  let costUsd: number | null = null;
  let costResolved = false;
  // `model_calls.generation_id` is a single column, so only ONE step's id can be persisted —
  // the last step's, matching the pre-fix behavior for whichever id gets stored. If an EARLIER
  // step's cost misses its synchronous gateway lookup (the gateway's own usage event is
  // unqueryable for ~19s after a call returns — see `resolveGatewayCost`'s comment) and never
  // resolves, `reconcileMissingCosts` (lib/agent/gateway-cost.ts) can only repair the cost
  // attached to the id it has, which is the LAST step's — so a summed total that included an
  // unrepaired earlier-step miss can under-count forever. That is a real gap in the
  // reconciliation path (it would need a schema change — multiple generation ids per
  // `model_calls` row — to close), not something this function can fix; recorded here so it
  // isn't silently forgotten.
  let generationId: string | null = null;
  let thinkingTokens: number | null = null;
  for (const step of steps) {
    const resolved = await resolveGatewayCost(step);
    if (resolved.generationId) generationId = resolved.generationId;
    if (resolved.costUsd != null) {
      costUsd = (costUsd ?? 0) + resolved.costUsd;
      costResolved = true;
    }

    const anthropic = step.providerMetadata?.anthropic as
      | { usage?: { output_tokens_details?: { thinking_tokens?: unknown } } }
      | undefined;
    const stepThinking = toFiniteOrNull(anthropic?.usage?.output_tokens_details?.thinking_tokens);
    if (stepThinking != null) thinkingTokens = (thinkingTokens ?? 0) + stepThinking;
  }
  if (!costResolved) costUsd = null;

  return { text, reasoning: reasoning || null, thinkingTokens, costUsd, generationId };
}

/** One accumulated snapshot of the in-flight stream. Reasoning is separated by the SDK's real
 * model-step boundary: the first step decides scope; a post-tool step writes the guide. This is
 * deliberately not inferred from a text character or a client poll, either of which can split a
 * word between UI stages. */
export type ExtractionStreamSnapshot = {
  text: string;
  reasoningByStage: ExtractionReasoningByStage;
  textByStage: ExtractionTextByStage;
  toolActivities: ExtractionToolActivity[];
  activeStage: ExtractionReasoningStage;
};

/** Every part `fullStream` yields, handed over untouched and unfiltered.
 *
 *  Separate from `onProgress` on purpose. `onProgress` reports the accumulated user-facing
 *  reasoning, text, tool activity, and semantic stage. It still cannot answer the wire-level
 *  question "in what exact order did every raw part arrive?". This observer is the
 *  unabridged record — `start`, `start-step`, `reasoning-start`/`-delta`/`-end`,
 *  `text-start`/`-delta`/`-end`, `finish-step`, `finish`, `error`, `abort`, anything the SDK adds
 *  later — so the stream can be read back part by part instead of inferred from a total. */
export type ExtractionRawPartObserver = (
  part: Record<string, unknown> & { type: string },
) => void | Promise<void>;

/**
 * The extraction call. A single `streamText` pass — adaptive/medium thinking, no output
 * ceiling — so the create-desk path can persist live progress while it runs.
 *
 * A non-streaming twin (`extractVoiceGuide`, plain `generateText`) existed alongside this for
 * a CLI path that had no progress UI to feed. That script shipped its slice and was deleted,
 * leaving the twin with no caller, so it went too: one extractor, no second copy of the
 * model/config to keep byte-identical by review.
 * `onProgress` fires on model-step boundaries and every content-bearing reasoning, text, and
 * tool event with the accumulated-so-far snapshot;
 * consuming the stream this way is also what resolves `result.text`/`result.usage`/etc. below,
 * so no separate `consumeStream()` call is needed.
 *
 * `onRawPart` is the unfiltered witness — see `ExtractionRawPartObserver`. Production passes it
 * nothing; it exists for a recorder to attach when a stream needs reading part by part.
 */
export async function extractVoiceGuideStreaming(
  handle: string,
  posts: CorpusPost[],
  beat: string,
  onProgress?: (snapshot: ExtractionStreamSnapshot) => void | Promise<void>,
  onRawPart?: ExtractionRawPartObserver,
  onScope?: (e: ScopeExclusion) => void | Promise<void>,
  // Overridable ONLY downward, for the auto-retry after a transient stream death: the second
  // attempt must fit the route budget MINUS what the dead first attempt already spent, and the
  // caller is the one who knows that remainder. A no-arg call keeps the measured default.
  timeoutMs: number = EXTRACT_TIMEOUT_MS,
): Promise<VoiceExtraction> {
  const { facts, content } = buildExtractionContent(handle, posts, beat);
  const scope = buildScopeTool(handle, posts, onScope);

  const result = streamText({
    model: EXTRACTION_MODEL,
    system: VOICE_EXTRACT_PROMPT,
    messages: [{ role: "user", content }],
    maxOutputTokens: EXTRACT_MAX_OUTPUT_TOKENS,
    tools: scope.tools,
    stopWhen: stepCountIs(MAX_EXTRACTION_STEPS),
    providerOptions: {
      anthropic: { thinking: { type: "adaptive", effort: "medium", display: "summarized" } },
    },
    // The scope tool is intentionally passed through `scope.tools` above.
    abortSignal: AbortSignal.timeout(Math.min(timeoutMs, EXTRACT_TIMEOUT_MS)),
    // Identifying attributes (handle, corpus size) ride on the WRAPPING span, not here — see
    // aiTelemetry's note on v7 dropping telemetry metadata.
    experimental_telemetry: aiTelemetry("voice_extraction", "voice-extraction-stream"),
  });

  let textSoFar = "";
  let modelStep = -1;
  let streamError: unknown;
  let streamedFinishReason: string | null = null;
  let activeReasoningStage: ExtractionReasoningStage = "scope";
  const reasoningByStage: ExtractionReasoningByStage = {};
  const textByStage: ExtractionTextByStage = {};
  const toolActivities = new Map<string, ExtractionToolActivity>();

  const reportProgress = async () => {
    if (!onProgress) return;
    await onProgress({
      text: textSoFar,
      reasoningByStage: { ...reasoningByStage },
      textByStage: { ...textByStage },
      toolActivities: [...toolActivities.values()].map((activity) => ({ ...activity })),
      activeStage: activeReasoningStage,
    });
  };

  try {
    for await (const part of result.fullStream) {
      // The raw observer sees EVERY part, before any filtering — it is the only witness to the
      // parts the accumulation below discards, which is where an unexplained empty guide hides.
      if (onRawPart) await onRawPart(part as unknown as Record<string, unknown> & { type: string });
      if (part.type === "start-step") {
        modelStep += 1;
        activeReasoningStage = modelStep === 0 ? "scope" : "extract";
        await reportProgress();
        continue;
      }
      if (part.type === "text-start") {
        // The tool is optional when every post is on-beat, so guide generation can begin in the
        // first SDK step. Ordinary output text is always the guide, regardless of step count.
        activeReasoningStage = "extract";
        await reportProgress();
        continue;
      }
      if (part.type === "text-delta") {
        activeReasoningStage = "extract";
        textSoFar += part.text;
        textByStage[activeReasoningStage] = (textByStage[activeReasoningStage] ?? "") + part.text;
      } else if (part.type === "reasoning-delta") {
        reasoningByStage[activeReasoningStage] =
          (reasoningByStage[activeReasoningStage] ?? "") + part.text;
      } else if (part.type === "tool-input-start") {
        toolActivities.set(part.id, {
          id: part.id,
          toolName: part.toolName,
          stage: activeReasoningStage,
          state: "input-streaming",
          inputText: "",
        });
      } else if (part.type === "tool-input-delta") {
        const activity = toolActivities.get(part.id);
        if (activity) activity.inputText += part.delta;
      } else if (part.type === "tool-input-end") {
        const activity = toolActivities.get(part.id);
        if (activity) activity.state = "input-available";
      } else if (part.type === "tool-call") {
        const previous = toolActivities.get(part.toolCallId);
        toolActivities.set(part.toolCallId, {
          id: part.toolCallId,
          toolName: part.toolName,
          stage: previous?.stage ?? activeReasoningStage,
          state: "input-available",
          inputText: previous?.inputText ?? JSON.stringify(part.input),
          input: part.input,
        });
      } else if (part.type === "tool-result") {
        const previous = toolActivities.get(part.toolCallId);
        toolActivities.set(part.toolCallId, {
          id: part.toolCallId,
          toolName: part.toolName,
          stage: previous?.stage ?? activeReasoningStage,
          state: "output-available",
          inputText: previous?.inputText ?? JSON.stringify(part.input),
          input: part.input,
          output: part.output,
        });
      } else if (part.type === "tool-error") {
        const previous = toolActivities.get(part.toolCallId);
        toolActivities.set(part.toolCallId, {
          id: part.toolCallId,
          toolName: part.toolName,
          stage: previous?.stage ?? activeReasoningStage,
          state: "output-error",
          inputText: previous?.inputText ?? JSON.stringify(part.input),
          input: part.input,
          errorText: part.error instanceof Error ? part.error.message : String(part.error),
        });
      } else if (part.type === "finish") {
        streamedFinishReason = part.finishReason ?? null;
        continue;
      } else if (part.type === "error") {
        // Keep the FIRST error — a dying stream can emit a cascade, and the first part is the
        // proximate cause the later ones echo.
        if (streamError === undefined) streamError = part.error;
        continue;
      } else {
        continue;
      }
      await reportProgress();
    }
  } catch (error) {
    // Some provider failures reject the iterable instead of yielding an `error` part. Keep that
    // error, then inspect the result promises individually: their rejection must not erase any
    // usage or finish state the SDK did settle before the stream died.
    if (streamError === undefined) streamError = error;
  }

  // `result.steps` resolves the same underlying per-step array `generateText`'s does (it's a
  // promise here only because streamText's result is lazy) — by this point the loop above has
  // already fully drained `fullStream`, so it resolves immediately. See `reconstructFromSteps`
  // for why this replaces the old `result.text`/`.reasoningText`/`.providerMetadata` reads, which
  // are last-step-only getters on this SDK version.
  const [stepsResult, usageResult, finishReasonResult] = await Promise.allSettled([
    result.steps,
    result.usage,
    result.finishReason,
  ]);
  if (streamError === undefined) {
    const rejected = [stepsResult, usageResult, finishReasonResult].find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (rejected) streamError = rejected.reason;
  }
  const steps = stepsResult.status === "fulfilled" ? stepsResult.value : [];
  const usage = usageResult.status === "fulfilled" ? usageResult.value : null;
  const finishReason =
    finishReasonResult.status === "fulfilled" ? finishReasonResult.value : streamedFinishReason;
  const { text, reasoning, thinkingTokens, costUsd, generationId } =
    await reconstructFromSteps(steps);

  const scopeExclusion = scope.read();
  return {
    guideRaw: text || textSoFar,
    measuredFactsBlock: scopeExclusion?.applied
      ? measuredFacts(
          handle,
          posts
            .filter((p) => !scopeExclusion.postIds.includes(p.id))
            .map((p) => p.text ?? "")
            .filter((t) => t.trim()),
        )
      : facts,
    scopeExclusion,
    reasoning: reasoning || Object.values(reasoningByStage).join("\n\n") || null,
    thinkingTokens,
    costUsd,
    usage,
    generationId,
    finishReason: finishReason ?? null,
    streamError,
  };
}
