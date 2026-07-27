// lib/agent/draft-ground.ts
//
// THE drafting call: one gpt-5-nano pass that looks at the source post (including its images),
// translates a non-English source, judges whether it's on the reporter's beat, and writes the
// draft the reporter sees. The owner collapsed the ground→revise×2→synthesize pipeline to this
// single call (deploy-first, 2026-07-26): the two cheap revisers (deepseek-v4-flash /
// glm-4.7-flashx) failed generateObject schema validation at a rate that broke deliveries
// outright, and one reliable model now beats three unreliable stages later.
//
// PURE orchestration — no persistence. Like `draft-council-run.ts` it returns its `CouncilCall`
// so `draft-pipeline.ts` writes the `model_calls` row and its `usage_events` twin; the contract
// is the same one every model call in this repo owes (AGENTS.md's model-call rule), including
// on the error path: a call that completed and billed must reach the ledger even if a later
// step throws, which is why `groundSourcePost` captures a schema-validation failure's own
// output/usage rather than letting it escape as a bare throw.
//
// SERVER-ONLY (transitively reads fs via lib/sysprompts) — never importable from a client
// component.
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { aiTelemetry } from "@/lib/observability/ai-telemetry";
import { DRAFT_COUNCIL_CONTRACT, DRAFT_GROUND_PROMPT } from "@/lib/sysprompts";
import { resolveCallMeta } from "./call-meta";
import {
  DEEPSEEK_DRAFT_MODEL,
  DEEPSEEK_DRAFT_PROVIDER_OPTIONS,
  stripMarkdown,
} from "./deepseek-draft-config";
import { NON_X_PLATFORM_CHAR_LIMITS, type Platform, X_CHAR_LIMITS } from "./desk-config";
import type { CouncilCall, SourceBrief } from "./draft-council-run";

/** Vision-capable and cheap. This call runs on EVERY delivery — including the off-beat ones it
 *  exists to reject — so it is the one drafting cost every tracked post pays, and it is
 *  deliberately the cheapest model that can actually see an image. Probe-verified
 *  (2026-07-22, this branch): a top-level `reasoning: "low"` returns a readable trace. Do NOT
 *  add `providerOptions.openai.reasoningSummary` — any reasoning key in providerOptions makes
 *  the top-level param silently ignored in full. */
const GROUND_MODEL = "openai/gpt-5-nano";

/** Caps how many images ride along on one grounding call. A post can carry up to 4 media items
 *  on X; this is a ceiling against a pathological payload, not a product limit. */
const MAX_GROUND_IMAGES = 4;

/** X's CDN serves `.jpg` for photos and video/GIF poster frames, `.png` for a minority. Read it
 *  off the url rather than assuming — an incorrect mediaType is rejected. Returns null on an
 *  unparsable url so one bad descriptor drops its image instead of failing the whole call
 *  (mirrors `lib/voice/extract-guide.ts`'s `imageMediaType`, same reasoning). */
function imageMediaType(url: string): string | null {
  let ext: string | undefined;
  try {
    ext = new URL(url).pathname.split(".").pop()?.toLowerCase();
  } catch (e) {
    console.error(`draft-ground: skipping media with unparsable url: ${url}`, e);
    return null;
  }
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

/** The grounding verdict. Field-by-field this mirrors `lib/sysprompts/draft-ground.md`, which
 *  names each one imperatively — the prompt and this schema are a matched pair and must change
 *  together. `.nullable()` on mediaDescription/translation is load-bearing: the prompt tells the
 *  model to write `null` (not a guess) when no image is attached / the source is already English,
 *  and a non-nullable schema would force it to invent something instead. */
const groundVerdictSchema = z.object({
  mediaDescription: z
    .string()
    .nullable()
    .describe("What the attached images actually show, or null when no image was attached."),
  language: z.string().describe("BCP-47 code of the source post's language."),
  translation: z
    .string()
    .nullable()
    .describe("Faithful English rendering, or null when the source is already English."),
  onBeat: z.boolean().describe("Whether this is something the reporter would actually cover."),
  onBeatReason: z.string().describe("One specific sentence saying why."),
  needsContext: z
    .boolean()
    .describe("Whether drafting accurately requires a fact absent from the post."),
  firstDraft: z
    .string()
    .describe("One post in the reporter's voice, from the source's facts only."),
});

type GroundVerdict = z.infer<typeof groundVerdictSchema>;

export type GroundResult = {
  /** ALWAYS present when the call completed and billed — even when the verdict failed schema
   *  validation, in which case `verdict` is null and this row carries the raw output. The caller
   *  must ledger this before acting on `verdict`. */
  call: CouncilCall;
  /** null when the model's output failed schema validation — the call still billed. */
  verdict: GroundVerdict | null;
};

function buildGroundPrompt(input: {
  brief: SourceBrief;
  beat: string;
  voiceGuidance: string;
  ceiling: number;
}): string {
  return [
    `Character ceiling for the draft: ${input.ceiling} (a ceiling, never a target).`,
    "",
    "THE BEAT, IN THE REPORTER'S OWN WORDS:",
    input.beat.trim() || "(not stated)",
    "",
    "THE REPORTER'S VOICE GUIDANCE:",
    input.voiceGuidance,
    "",
    "DRAFTING CONTRACT:",
    DRAFT_COUNCIL_CONTRACT,
    "",
    `SOURCE POST by @${input.brief.authorHandle}:`,
    input.brief.text,
  ].join("\n");
}

/**
 * Runs the grounding/beat gate for one source post.
 *
 * Returns `{ call, verdict }` rather than throwing on a schema failure, because the call has
 * already billed by then: the caller ledgers `call` unconditionally, then decides. A verdict of
 * null means "the classifier's output was unusable" — the caller treats that as an error path
 * (release the claim, let the worker retry), NOT as an off-beat verdict, since silently dropping
 * a post because a classifier stuttered is exactly the draft-and-hide failure this gate exists to
 * avoid.
 *
 * A transport/429/5xx failure — where the call never completed and never billed — still throws:
 * there is no completed call to ledger, and recording one would be a phantom row.
 */
export async function groundSourcePost(input: {
  brief: SourceBrief;
  beat: string;
  voiceGuidance: string;
  platform: Platform;
  accountTier: "standard" | "premium";
}): Promise<GroundResult> {
  const { brief, beat, voiceGuidance, platform, accountTier } = input;
  const ceiling =
    platform === "x" ? X_CHAR_LIMITS[accountTier] : NON_X_PLATFORM_CHAR_LIMITS[platform];

  // Text first, then each image labelled with its kind — the same shape the extraction path
  // uses (lib/voice/extract-guide.ts), so a poster frame is never mistaken for a photo.
  const content: (
    | { type: "text"; text: string }
    | { type: "file"; data: URL; mediaType: string }
  )[] = [{ type: "text", text: buildGroundPrompt({ brief, beat, voiceGuidance, ceiling }) }];

  const usable = brief.media.slice(0, MAX_GROUND_IMAGES);
  if (usable.length > 0) {
    content.push({
      type: "text",
      text: "\nATTACHED MEDIA — the images below are this post's attachments. A video or GIF is represented by its poster frame.",
    });
    for (const m of usable) {
      const mediaType = imageMediaType(m.imageUrl);
      if (mediaType === null) continue;
      let fileUrl: URL;
      try {
        fileUrl = new URL(m.imageUrl);
      } catch (e) {
        console.error(`draft-ground: skipping media with unparsable url: ${m.imageUrl}`, e);
        continue;
      }
      content.push({ type: "text", text: `${m.kind}:` });
      content.push({ type: "file", data: fileUrl, mediaType });
    }
  }

  // Shared success-path builder: this call's draft IS the post the reporter sees, and
  // post_drafts.model_call_id points straight at this row — so `output` must be the PLAIN post
  // text (the provenance UI and posting both render model_calls.output verbatim). The verdict's
  // other fields become readable prose in `reasoning`, alongside the model's own trace.
  const buildResult = async (
    model: string,
    result: {
      object: GroundVerdict;
      reasoning?: string | null;
      usage: unknown;
      providerMetadata?: Record<string, unknown>;
    },
  ): Promise<GroundResult> => {
    const verdict: GroundVerdict = {
      ...result.object,
      firstDraft: stripMarkdown(result.object.firstDraft.trim()),
    };
    const verdictNotes = [
      `On beat: ${verdict.onBeat ? "yes" : "no"} — ${verdict.onBeatReason}`,
      `Language: ${verdict.language}`,
      verdict.translation ? `Translation:\n${verdict.translation}` : null,
      verdict.mediaDescription ? `Media: ${verdict.mediaDescription}` : null,
      verdict.needsContext ? "Flagged as needing context absent from the post." : null,
    ]
      .filter(Boolean)
      .join("\n");
    const call = await resolveCallMeta({
      kind: "ground",
      stage: "grounding",
      role: "grounding",
      model,
      output: verdict.firstDraft,
      reasoning: result.reasoning ? `${result.reasoning}\n\n${verdictNotes}` : verdictNotes,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
    });
    return { call, verdict };
  };

  // Shared completed-but-unparseable path: the call BILLED, so it still gets a ledgerable row
  // (cost degrades to null — the error doesn't surface gateway metadata in the shape
  // resolveGatewayCost reads). verdict null = "unusable output", the caller's error path.
  const buildFailedResult = async (
    model: string,
    err: InstanceType<typeof NoObjectGeneratedError>,
  ): Promise<GroundResult> => {
    const call = await resolveCallMeta({
      kind: "ground",
      stage: "grounding",
      role: "grounding",
      model,
      output: err.text ?? null,
      reasoning: null,
      usage: err.usage,
    });
    return { call, verdict: null };
  };

  try {
    const result = await generateObject({
      model: GROUND_MODEL,
      // Top-level `reasoning: "low"`, NO `providerOptions.openai` key (see GROUND_MODEL above).
      reasoning: "low",
      schema: groundVerdictSchema,
      system: DRAFT_GROUND_PROMPT,
      messages: [{ role: "user", content }],
      experimental_telemetry: aiTelemetry("draft_ground", "draft-ground-gpt5-nano"),
    });
    return await buildResult(GROUND_MODEL, result);
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      // gpt-5-nano completed but its output was unusable — the model is UP, so a whole-delivery
      // retry (the caller's error path) gets nano again; no reason to burn the fallback here.
      console.error("draft-ground: verdict failed schema validation", err);
      return buildFailedResult(GROUND_MODEL, err);
    }

    // The nano call never completed — a transport failure, or the AI Gateway's own credits
    // running dry. Fall back to DeepSeek: the owner's BYOK DeepSeek key is linked in the
    // gateway, so deepseek/* calls keep billing through that key even when gateway credits are
    // exhausted. Text-only — deepseek-v4-flash cannot see images — using the documented 4-part
    // generateObject recipe (.claude/rules/agent.md): reasoning "none", the imperatively
    // field-naming prompt (draft-ground.md), a high maxOutputTokens ceiling; the "retry" leg is
    // the caller's whole-delivery retry on a null verdict.
    console.error(
      "draft-ground: gpt-5-nano call failed, falling back to DeepSeek (text-only)",
      err,
    );
    const mediaNote =
      usable.length > 0
        ? `\n\n(${usable.length} image attachment(s) were on this post. You cannot analyze images — treat this as a post whose images you could not see and write mediaDescription as null.)`
        : "";
    const fallbackContent = [
      {
        type: "text" as const,
        text: buildGroundPrompt({ brief, beat, voiceGuidance, ceiling }) + mediaNote,
      },
    ];
    try {
      const result = await generateObject({
        model: DEEPSEEK_DRAFT_MODEL,
        providerOptions: DEEPSEEK_DRAFT_PROVIDER_OPTIONS,
        reasoning: "none",
        maxOutputTokens: 8192,
        schema: groundVerdictSchema,
        system: DRAFT_GROUND_PROMPT,
        messages: [{ role: "user", content: fallbackContent }],
        experimental_telemetry: aiTelemetry("draft_ground", "draft-ground-deepseek-fallback"),
      });
      return await buildResult(DEEPSEEK_DRAFT_MODEL, result);
    } catch (fallbackErr) {
      if (NoObjectGeneratedError.isInstance(fallbackErr)) {
        console.error("draft-ground: DeepSeek fallback failed schema validation", fallbackErr);
        return buildFailedResult(DEEPSEEK_DRAFT_MODEL, fallbackErr);
      }
      // Neither call completed — nothing billed, nothing to ledger; propagate the FALLBACK's
      // error (the nano failure is already logged above).
      throw fallbackErr;
    }
  }
}
