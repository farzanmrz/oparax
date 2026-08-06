// lib/agent/draft-council-run.ts
//
// The drafting pipeline's shared types plus `reviseDraft` — the correction-only call kept for
// `applyCorrection`'s dormant emailed-correction path. Live deliveries now run a deterministic
// language check, an optional translation call, and one Qwen drafting/filtration call; those
// stages live in draft-translate.ts and draft-write.ts.
//
// PURE orchestration — this module does NO persistence; it returns a per-call `calls` array
// and the caller (draft-pipeline.ts) writes one `model_calls` row per element. That is the
// model-call contract every stage in this pipeline owes (AGENTS.md): every model call —
// translation, drafting, a repair, or a correction revision — appears as its own element, carrying
// `output`, `reasoning`, and an explicitly stamped `reasoningWithheldByProvider`. An element
// missing from that array is a call whose trace is lost, which every stage's own module (this
// one, draft-translate.ts, draft-write.ts) exists to prevent.
// SERVER-ONLY (transitively reads fs via lib/sysprompts, which loads its prompts at module
// scope) — never importable from a client component.
import { generateText } from "ai";
import { aiTelemetry } from "@/lib/observability/ai-telemetry";
import { DRAFT_COUNCIL_CONTRACT, DRAFT_REVISE_PROMPT } from "@/lib/sysprompts";
import { X_CHAR_LIMITS } from "./desk-config";
import { resolveGatewayCost } from "./gateway-cost";
import { QWEN_DRAFT_MODEL, QWEN_DRAFT_PROVIDER_OPTIONS, stripMarkdown } from "./qwen-draft-config";
import { reasoningTraceState } from "./reasoning-trace";

export type SourceBrief = {
  sourcePostId: string;
  xPostId: string;
  authorHandle: string;
  text: string;
  /** X's machine-detected BCP-47 code when the worker supplied it; null = unknown (website
   *  sources, correction path, old workers) → the translator stage decides. */
  lang: string | null;
  /** Attached photos (full image) or video/GIF poster frames — descriptors only. The
   *  vision-capable drafter reads these original attachments directly;
   *  correction-only revision calls remain text-only. */
  media: { kind: string; imageUrl: string }[];
};

export type CouncilCall = {
  kind: "draft" | "repair" | "judge" | "revision" | "ground" | "synthesis" | "translation";
  stage: "drafting" | "judge" | "clustering" | "grounding" | "translation"; // model_calls.stage
  role: "primary" | "revision" | "judge" | "grounding" | "translation"; // model_calls.role
  model: string;
  output: string | null; // verbatim; for a structured verdict, the serialized object
  reasoning: string | null;
  reasoningWithheldByProvider: boolean; // ALWAYS set, every element, no exceptions
  usage: unknown;
  costUsd: number | null;
  generationId: string | null;
};

/** ONE helper that builds every `CouncilCall` — the only place `reasoningWithheldByProvider`
 *  gets stamped in THIS file, so it can never be missed on an element built by hand elsewhere.
 *  `lib/agent/call-meta.ts`'s `resolveCallMeta` is the same helper shared by `cluster.ts` and
 *  the live translation/drafting stages — this one stays a local duplicate rather than delegating, tracked as
 *  known leftover (see `call-meta.ts`'s own header comment).
 *  "Withheld" is derived, not assumed: a null trace only means the PROVIDER held it back when
 *  the call actually spent reasoning tokens (`reasoning-trace.ts`). */
async function toCouncilCall(params: {
  kind: CouncilCall["kind"];
  stage: CouncilCall["stage"];
  role: CouncilCall["role"];
  model: string;
  output: string | null;
  reasoning: string | null;
  usage: unknown;
  providerMetadata?: Record<string, unknown>;
}): Promise<CouncilCall> {
  const { costUsd, generationId } = await resolveGatewayCost({
    providerMetadata: params.providerMetadata,
  });
  return {
    kind: params.kind,
    stage: params.stage,
    role: params.role,
    model: params.model,
    output: params.output,
    reasoning: params.reasoning,
    reasoningWithheldByProvider: reasoningTraceState(params.reasoning, params.usage) === "withheld",
    usage: params.usage,
    costUsd,
    generationId,
  };
}

function formatSourceBrief(brief: SourceBrief): string {
  return `Source post by @${brief.authorHandle}:\n${brief.text}`;
}

function buildRepairPrompt(originalPrompt: string, violations: string[], badDraft: string): string {
  return [
    originalPrompt,
    "",
    "Your previous draft violated the following rules. Fix them and output ONLY the corrected " +
      "post text — no preamble, no explanation.",
    ...violations.map((v) => `- ${v}`),
    "",
    "Previous draft:",
    badDraft,
  ].join("\n");
}

/** Deterministic self-check on a survivor's raw text — plain code between draft and judge,
 *  never a prompt instruction. Returns the violated rules, in prose, so a repair call can be
 *  fed exactly what to fix. */
function checkViolations(text: string, ceiling: number): string[] {
  const violations: string[] = [];
  if (text.includes("**")) {
    violations.push("contains markdown bold (`**`)");
  }
  if (/<\/?post>/i.test(text)) {
    violations.push("contains a <post> or </post> tag");
  }
  if (/^\s*(here'?s|sure,|draft:)/i.test(text)) {
    violations.push('opens with a leading preamble ("Here\'s…", "Sure,", "Draft:")');
  }
  const length = [...text].length;
  if (length > ceiling) {
    violations.push(
      `exceeds the ${ceiling}-character ceiling (${length} chars, counted by code point)`,
    );
  }
  return violations;
}

/** One revision call applying a reporter's emailed correction to a previous draft. Returns the
 *  same shape so the caller persists it identically. */
export async function reviseDraft(input: {
  voiceGuidance: string;
  accountTier: "standard" | "premium";
  brief: SourceBrief;
  previousDraft: string;
  feedback: string;
}): Promise<{ calls: CouncilCall[]; finalCallIndex: number; text: string }> {
  const { voiceGuidance, accountTier, brief, previousDraft, feedback } = input;
  const ceiling = X_CHAR_LIMITS[accountTier];
  const system = `${voiceGuidance}\n\n${DRAFT_COUNCIL_CONTRACT}\n\n${DRAFT_REVISE_PROMPT}`;
  const prompt = [
    `Character ceiling: ${ceiling} (a ceiling, never a target).`,
    formatSourceBrief(brief),
    "",
    "Previous draft:",
    previousDraft,
    "",
    "Reporter's correction:",
    feedback,
  ].join("\n");

  const generate = (p: string) =>
    generateText({
      model: QWEN_DRAFT_MODEL,
      providerOptions: QWEN_DRAFT_PROVIDER_OPTIONS,
      system,
      prompt: p,
      experimental_telemetry: aiTelemetry("draft_council", "draft-revision-qwen"),
    });

  const calls: CouncilCall[] = [];
  const revision = await generate(prompt);
  calls.push(
    await toCouncilCall({
      kind: "revision",
      stage: "drafting",
      role: "revision",
      model: QWEN_DRAFT_MODEL,
      output: revision.text,
      reasoning: revision.reasoningText ?? null,
      usage: revision.usage,
      providerMetadata: revision.providerMetadata,
    }),
  );

  let finalText = revision.text;
  const violations = checkViolations(finalText, ceiling);
  if (violations.length > 0) {
    // Same shape as draftFamily above: a repair failure must not discard the revision call's
    // CouncilCall already pushed — it already completed and was already paid for (L12). A throw
    // here would otherwise propagate out of reviseDraft entirely, and applyCorrection's caller
    // never sees the revision call it just paid for. Degrade to the (unrepaired) revision.
    try {
      const repair = await generate(buildRepairPrompt(prompt, violations, finalText));
      calls.push(
        await toCouncilCall({
          kind: "repair",
          stage: "drafting",
          role: "revision",
          model: QWEN_DRAFT_MODEL,
          output: repair.text,
          reasoning: repair.reasoningText ?? null,
          usage: repair.usage,
          providerMetadata: repair.providerMetadata,
        }),
      );
      finalText = repair.text;
    } catch (err) {
      console.error(`draft council: revision repair call failed for ${QWEN_DRAFT_MODEL}`, err);
    }
  }

  return {
    calls,
    finalCallIndex: calls.length - 1,
    text: stripMarkdown(finalText.trim()),
  };
}
