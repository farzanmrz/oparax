// lib/agent/draft-council-run.ts
//
// The two-family drafting council + judge. PURE orchestration — this module does NO
// persistence; it returns a per-call `calls` array and the caller (draft-pipeline.ts)
// writes one `model_calls` row per element. That is the L12 contract: every model call
// here — both family drafts, any repair call, the judge, and a revision — appears as its
// own element in `calls`, carrying `output`, `reasoning`, and an explicitly stamped
// `reasoningWithheldByProvider`. An element missing from that array is a model call whose
// trace is lost, which is the exact failure this slice exists to prevent (decisions.md L12).
// SERVER-ONLY (transitively reads fs via lib/sysprompts, which loads its prompts at module
// scope) — never importable from a client component.
import { generateObject, generateText, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { DRAFT_COUNCIL_CONTRACT, DRAFT_JUDGE_PROMPT, DRAFT_REVISE_PROMPT } from "@/lib/sysprompts";
import {
  DEEPSEEK_DRAFT_MODEL,
  DEEPSEEK_DRAFT_PROVIDER_OPTIONS,
  stripMarkdown,
} from "./deepseek-draft-config";
import { X_CHAR_LIMITS } from "./desk-config";
import { resolveGatewayCost } from "./gateway-cost";

// Probe-verified (2026-07-22, this branch): a top-level `reasoning: "low"` on gpt-5-nano
// returns 641 chars of readable trace. Do NOT add `providerOptions.openai.reasoningSummary` —
// any reasoning key in providerOptions makes the top-level param silently ignored in full.
const GPT5_NANO_MODEL = "openai/gpt-5-nano";

export type SourceBrief = {
  sourcePostId: string;
  xPostId: string;
  authorHandle: string;
  text: string;
};

export type CouncilCall = {
  kind: "draft" | "repair" | "judge" | "revision";
  stage: "drafting" | "judge"; // model_calls.stage
  role: "primary" | "revision" | "judge"; // model_calls.role
  model: string;
  output: string | null; // verbatim; for the judge, the serialized verdict
  reasoning: string | null;
  reasoningWithheldByProvider: boolean; // ALWAYS set, every element, no exceptions
  usage: unknown;
  costUsd: number | null;
  generationId: string | null;
};

/** Index into `calls` of the call whose text is this member's final draft. */
export type CouncilMember = {
  finalCallIndex: number;
  model: string;
  text: string;
  isWinner: boolean;
};

export type CouncilResult = {
  calls: CouncilCall[];
  members: CouncilMember[];
  judge: { callIndex: number; verdict: Json } | null; // null when the judge was skipped
  winningText: string;
  winningModel: string;
  degraded: boolean; // true when a family failed and was dropped
};

/** ONE helper that builds every `CouncilCall` — the only place `reasoningWithheldByProvider`
 *  gets stamped, so it can never be missed on an element built by hand elsewhere. */
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
    reasoningWithheldByProvider: params.reasoning == null,
    usage: params.usage,
    costUsd,
    generationId,
  };
}

function formatSourceBrief(brief: SourceBrief): string {
  return `Source post by @${brief.authorHandle}:\n${brief.text}`;
}

function buildDraftPrompt(brief: SourceBrief, ceiling: number): string {
  return [
    `Character ceiling: ${ceiling} (a ceiling, never a target).`,
    "Draft ONE X post using ONLY the facts in the source post below.",
    "",
    formatSourceBrief(brief),
  ].join("\n");
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

/** One drafting family: a closure over its own model + config, so the repair call reuses
 *  exactly the same config as the original draft with no re-derivation. */
type Family = {
  model: string;
  generate: (system: string, prompt: string) => ReturnType<typeof generateText>;
};

const FAMILIES: Family[] = [
  {
    model: DEEPSEEK_DRAFT_MODEL,
    // No `reasoning` param: DeepSeek V4 thinks by default and self-scales effort — the SDK's
    // low/medium both coerce to its high, so an explicit level is a no-op (agent.ts).
    generate: (system, prompt) =>
      generateText({
        model: DEEPSEEK_DRAFT_MODEL,
        providerOptions: DEEPSEEK_DRAFT_PROVIDER_OPTIONS,
        system,
        prompt,
      }),
  },
  {
    model: GPT5_NANO_MODEL,
    // Top-level `reasoning: "low"`, NO `providerOptions.openai` key — any reasoning key there
    // silently suppresses the top-level param in full (probe-verified, see header comment).
    generate: (system, prompt) =>
      generateText({ model: GPT5_NANO_MODEL, reasoning: "low", system, prompt }),
  },
];

async function draftFamily(
  family: Family,
  system: string,
  draftPrompt: string,
  ceiling: number,
): Promise<{ calls: CouncilCall[]; text: string }> {
  const calls: CouncilCall[] = [];

  const draft = await family.generate(system, draftPrompt);
  calls.push(
    await toCouncilCall({
      kind: "draft",
      stage: "drafting",
      role: "primary",
      model: family.model,
      output: draft.text,
      reasoning: draft.reasoningText ?? null,
      usage: draft.usage,
      providerMetadata: draft.providerMetadata,
    }),
  );

  let finalText = draft.text;
  const violations = checkViolations(finalText, ceiling);
  if (violations.length > 0) {
    // A repair failure must never discard the original draft's CouncilCall pushed above — that
    // call already completed and was already paid for (decisions.md L12). Without this guard, a
    // throw here propagates out of draftFamily entirely, and Promise.allSettled's caller sees only
    // a rejection reason — the local `calls` array (holding the paid-for original) never reaches
    // the returned CouncilResult. Degrade instead: keep the original draft, violations and all.
    try {
      const repair = await family.generate(
        system,
        buildRepairPrompt(draftPrompt, violations, finalText),
      );
      calls.push(
        await toCouncilCall({
          kind: "repair",
          stage: "drafting",
          role: "revision",
          model: family.model,
          output: repair.text,
          reasoning: repair.reasoningText ?? null,
          usage: repair.usage,
          providerMetadata: repair.providerMetadata,
        }),
      );
      finalText = repair.text;
    } catch (err) {
      console.error(`draft council: repair call failed for ${family.model}`, err);
    }
  }

  return { calls, text: stripMarkdown(finalText.trim()) };
}

const judgeVerdictSchema = z.object({
  winner: z.number().int().describe("The 0-based index of the winning candidate."),
  rationale: z
    .string()
    .describe(
      "One to two sentences naming the deciding factor — a contract violation or the " +
        "specific voice trait the winner nailed.",
    ),
});

function buildJudgePrompt(
  guideDeploy: string,
  brief: SourceBrief,
  members: CouncilMember[],
): string {
  const candidates = members.map((m, i) => `Candidate ${i}:\n${m.text}`).join("\n\n");
  return [
    "Reporter's voice guide:",
    guideDeploy,
    "",
    "Drafting contract:",
    DRAFT_COUNCIL_CONTRACT,
    "",
    formatSourceBrief(brief),
    "",
    "Candidates:",
    candidates,
  ].join("\n");
}

export async function runDraftCouncil(input: {
  guideDeploy: string;
  accountTier: "standard" | "premium";
  brief: SourceBrief;
}): Promise<CouncilResult> {
  const { guideDeploy, accountTier, brief } = input;
  const ceiling = X_CHAR_LIMITS[accountTier];
  const system = `${guideDeploy}\n\n${DRAFT_COUNCIL_CONTRACT}`;
  const draftPrompt = buildDraftPrompt(brief, ceiling);

  const settled = await Promise.allSettled(
    FAMILIES.map((family) => draftFamily(family, system, draftPrompt, ceiling)),
  );

  const calls: CouncilCall[] = [];
  const members: CouncilMember[] = [];

  settled.forEach((outcome, i) => {
    if (outcome.status === "rejected") {
      console.error(`draft council: family ${FAMILIES[i].model} failed`, outcome.reason);
      return;
    }
    const finalCallIndex = calls.length + outcome.value.calls.length - 1;
    calls.push(...outcome.value.calls);
    members.push({
      finalCallIndex,
      model: FAMILIES[i].model,
      text: outcome.value.text,
      isWinner: false,
    });
  });

  if (members.length === 0) {
    throw new Error("draft council: both families failed — no draft survived");
  }

  const degraded = members.length < FAMILIES.length;
  let judge: CouncilResult["judge"] = null;
  let winnerIndex = 0;

  if (members.length >= 2) {
    // DeepSeek generateObject recipe (.claude/rules/agent.md): leg 1 `reasoning:"none"` +
    // leg 2 a field-naming prompt (DRAFT_JUDGE_PROMPT names `winner`/`rationale` imperatively —
    // without it the model dumps prose into a malformed envelope and returns `{}`). Legs 3/4
    // (retry, high maxOutputTokens) don't apply here: a temp-0 `{}` is deterministic so
    // re-sampling can't help, and a two-field verdict can't truncate — the discriminated catch
    // below handles a residual failure instead of a retry.
    try {
      const verdictResult = await generateObject({
        model: DEEPSEEK_DRAFT_MODEL,
        providerOptions: DEEPSEEK_DRAFT_PROVIDER_OPTIONS,
        reasoning: "none",
        temperature: 0,
        schema: judgeVerdictSchema,
        system: DRAFT_JUDGE_PROMPT,
        prompt: buildJudgePrompt(guideDeploy, brief, members),
      });

      const verdict: Json = {
        winner: verdictResult.object.winner,
        rationale: verdictResult.object.rationale,
      };
      const judgeCallIndex = calls.length;
      calls.push(
        await toCouncilCall({
          kind: "judge",
          stage: "judge",
          role: "judge",
          model: DEEPSEEK_DRAFT_MODEL,
          output: JSON.stringify(verdict),
          reasoning: verdictResult.reasoning ?? null,
          usage: verdictResult.usage,
          providerMetadata: verdictResult.providerMetadata,
        }),
      );
      judge = { callIndex: judgeCallIndex, verdict };
      winnerIndex = Math.min(Math.max(0, verdictResult.object.winner), members.length - 1);
    } catch (err) {
      // Two failure shapes reach here, and L12 treats them differently — the discriminator matters:
      //   - NoObjectGeneratedError: the judge call COMPLETED and was billed, but its output failed
      //     schema validation (observed live: deepseek-v4-flash emitting a literal `{}`,
      //     finishReason "stop", 3 output tokens). L12 owes a completed paid call its ledger row —
      //     capture the raw `text`/`usage` off the error (cost degrades to null; the error doesn't
      //     surface gateway metadata in the shape resolveGatewayCost reads).
      //   - Any OTHER error (transport, 429/5xx, abort): the call did NOT complete or bill, so it
      //     gets NO row — a ledger entry here would be a phantom record of a call that never
      //     landed, and asserting "completed and paid" of it would be a lie.
      // Both degrade to a deterministic winner (candidate 0) rather than throw: A1's lesson — a
      // judge failure must never discard the two already-paid draft calls. Whether the empty
      // verdict is deterministic under L3's locked judge config is a separate question for the
      // spec owner — not something this error path decides.
      if (NoObjectGeneratedError.isInstance(err)) {
        console.error(
          "draft council: judge output failed schema validation; degrading to candidate 0",
          err,
        );
        const judgeCallIndex = calls.length;
        calls.push(
          await toCouncilCall({
            kind: "judge",
            stage: "judge",
            role: "judge",
            model: DEEPSEEK_DRAFT_MODEL,
            output: err.text ?? null,
            reasoning: null,
            usage: err.usage,
          }),
        );
        judge = { callIndex: judgeCallIndex, verdict: null };
      } else {
        // No completed call to record — surface the failure distinctly so a real outage isn't
        // masked as a routine deterministic-winner degrade.
        console.error(
          "draft council: judge call failed before completing (no ledger row); degrading to candidate 0",
          err,
        );
        judge = null;
      }
      winnerIndex = 0;
    }
  }

  members[winnerIndex].isWinner = true;

  return {
    calls,
    members,
    judge,
    winningText: members[winnerIndex].text,
    winningModel: members[winnerIndex].model,
    degraded,
  };
}

/** One revision call applying a reporter's emailed correction to a previous draft. Returns the
 *  same shape so the caller persists it identically. Same DeepSeek config as the drafting
 *  families — no `reasoning` param, native adaptive thinking. */
export async function reviseDraft(input: {
  guideDeploy: string;
  accountTier: "standard" | "premium";
  brief: SourceBrief;
  previousDraft: string;
  feedback: string;
}): Promise<{ calls: CouncilCall[]; finalCallIndex: number; text: string }> {
  const { guideDeploy, accountTier, brief, previousDraft, feedback } = input;
  const ceiling = X_CHAR_LIMITS[accountTier];
  const system = `${guideDeploy}\n\n${DRAFT_COUNCIL_CONTRACT}\n\n${DRAFT_REVISE_PROMPT}`;
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
      model: DEEPSEEK_DRAFT_MODEL,
      providerOptions: DEEPSEEK_DRAFT_PROVIDER_OPTIONS,
      system,
      prompt: p,
    });

  const calls: CouncilCall[] = [];
  const revision = await generate(prompt);
  calls.push(
    await toCouncilCall({
      kind: "revision",
      stage: "drafting",
      role: "revision",
      model: DEEPSEEK_DRAFT_MODEL,
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
          model: DEEPSEEK_DRAFT_MODEL,
          output: repair.text,
          reasoning: repair.reasoningText ?? null,
          usage: repair.usage,
          providerMetadata: repair.providerMetadata,
        }),
      );
      finalText = repair.text;
    } catch (err) {
      console.error(`draft council: revision repair call failed for ${DEEPSEEK_DRAFT_MODEL}`, err);
    }
  }

  return {
    calls,
    finalCallIndex: calls.length - 1,
    text: stripMarkdown(finalText.trim()),
  };
}
