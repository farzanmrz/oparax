// lib/agent/cluster.ts
//
// Story clustering — attaches a delivered source post to an existing recent story or creates a
// new one, atomically. PURE-ish orchestration in the same shape as draft-council-run.ts: this
// module owns its own story-table writes (creation + the atomic claim below), but the model
// call's ledger row is NOT this module's job — the caller (a later task, wiring this into
// draft-pipeline.ts's processDelivery) inserts `calls` into `model_calls` ledger-first, same as
// every other CouncilCall producer in this repo (decisions.md L12).
// SERVER-ONLY (transitively reads fs via lib/sysprompts, which loads its prompts at module
// scope) — never importable from a client component.
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import {
  DEEPSEEK_DRAFT_MODEL,
  DEEPSEEK_DRAFT_PROVIDER_OPTIONS,
} from "@/lib/agent/deepseek-draft-config";
// TYPE-ONLY import — this module never imports a function from draft-council-run.ts.
import type { CouncilCall } from "@/lib/agent/draft-council-run";
import { resolveGatewayCost } from "@/lib/agent/gateway-cost";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORY_CLUSTER_PROMPT } from "@/lib/sysprompts";

type AdminClient = ReturnType<typeof createAdminClient>;

// Bounded candidate window: keeps the classifier prompt small and stops a desk's story history
// from growing the prompt unboundedly over its lifetime. 20 is a reasonable recency window for a
// reporter's beat (a desk producing more than ~20 live concurrent story threads is not the
// common case this classifier needs to disambiguate against) — flagged in the report as the
// non-obvious number this brief calls out.
const RECENT_STORY_CANDIDATE_LIMIT = 20;

// Zero-call fallback label length — first ~80 chars of the post text, used only when there is
// nothing to compare against (no candidates) or when the classifier call itself failed schema
// validation (the NoObjectGeneratedError degrade below). The model is the only place a
// contextual one-line label gets generated well; this is deliberately just a truncation.
const DETERMINISTIC_SUMMARY_LENGTH = 80;

export type ClusterResult = {
  storyId: string;
  calls: CouncilCall[]; // 0 or 1 elements: empty on the zero-candidate path (no model call
  // made); otherwise exactly one CouncilCall-shaped element for the classifier call that ran.
};

const clusterVerdictSchema = z.object({
  match: z
    .enum(["existing", "new"])
    .describe(
      '"existing" when the new post continues one of the candidate stories below; "new" when ' +
        "it describes a development none of the candidates cover.",
    ),
  storyIndex: z
    .number()
    .int()
    .describe(
      'The 0-based index of the matching candidate when match is "existing"; -1 when match is ' +
        '"new".',
    ),
  summary: z
    .string()
    .describe(
      "A short one-line summary (roughly 80 characters) of the new development when match is " +
        '"new"; an empty string when match is "existing".',
    ),
});

/** ONE helper that builds every clustering `CouncilCall` — mirrors draft-council-run.ts's own
 *  `toCouncilCall`, the only place `reasoningWithheldByProvider` gets stamped, so it can never
 *  be missed. `stage` on the shared `CouncilCall` type includes "clustering" alongside
 *  draft-council-run.ts's own "drafting"/"judge" stages, so this builds a directly-typed
 *  object with no cast. */
async function buildClusterCall(params: {
  output: string | null;
  reasoning: string | null;
  usage: unknown;
  providerMetadata?: Record<string, unknown>;
}): Promise<CouncilCall> {
  const { costUsd, generationId } = await resolveGatewayCost({
    providerMetadata: params.providerMetadata,
  });
  return {
    kind: "draft",
    stage: "clustering",
    role: "primary",
    model: DEEPSEEK_DRAFT_MODEL,
    output: params.output,
    reasoning: params.reasoning,
    reasoningWithheldByProvider: params.reasoning == null,
    usage: params.usage,
    costUsd,
    generationId,
  };
}

function deterministicSummary(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > DETERMINISTIC_SUMMARY_LENGTH
    ? `${trimmed.slice(0, DETERMINISTIC_SUMMARY_LENGTH).trimEnd()}…`
    : trimmed;
}

function buildClusterPrompt(
  candidates: Array<{ id: string; summary: string }>,
  authorHandle: string,
  text: string,
): string {
  const candidateList = candidates.map((c, i) => `Candidate ${i}: ${c.summary}`).join("\n");
  return ["Candidate stories:", candidateList, "", `New post by @${authorHandle}:`, text].join(
    "\n",
  );
}

async function createStory(
  admin: AdminClient,
  experimentId: string,
  summary: string,
): Promise<string> {
  const { data, error } = await admin
    .from("stories")
    .insert({ experiment_id: experimentId, summary })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** The atomic claim (D16 rail) — story_assignments carries UNIQUE(source_post_id), so this
 *  insert IS the race guarantee, not the classification above. Mirrors draft-pipeline.ts's
 *  `draftForExperiment` insert-then-branch-on-23505 shape. On a 23505 unique-violation, another
 *  concurrent delivery of this exact sourcePostId already won the claim — read ITS story_id back
 *  rather than the one this call attempted (the race-loser path; whatever story this call may
 *  have just created above stays orphaned, unassigned, and is not cleaned up here — the plan
 *  text's contract is the claim, not the candidate it lost against). */
async function claimStoryAssignment(
  admin: AdminClient,
  sourcePostId: string,
  storyId: string,
): Promise<string> {
  const { error } = await admin
    .from("story_assignments")
    .insert({ source_post_id: sourcePostId, story_id: storyId })
    .select("id");
  if (!error) return storyId;
  if (error.code !== "23505") throw error;

  const { data: winner, error: winnerError } = await admin
    .from("story_assignments")
    .select("story_id")
    .eq("source_post_id", sourcePostId)
    .single();
  if (winnerError) throw winnerError;
  return winner.story_id;
}

async function createAndClaimNewStory(
  admin: AdminClient,
  experimentId: string,
  sourcePostId: string,
  summary: string,
): Promise<string> {
  const storyId = await createStory(admin, experimentId, summary);
  return claimStoryAssignment(admin, sourcePostId, storyId);
}

/** Attach sourcePostId to an existing recent story, or create a new one, atomically.
 *  The caller (a later task, wiring this into draft-pipeline.ts's processDelivery) is
 *  responsible for inserting `calls` into model_calls (ledger-first, ownerId is the caller's
 *  concern — this function does not know or need the experiment's owner_id) and is
 *  responsible for handling any error this function throws (a non-billing DB error propagates
 *  normally; do not swallow it here). */
export async function assignToStory(input: {
  experimentId: string;
  sourcePostId: string;
  authorHandle: string;
  text: string;
}): Promise<ClusterResult> {
  const { experimentId, sourcePostId, authorHandle, text } = input;
  const admin = createAdminClient();

  // Bounded recent-story candidates: narrow columns, limited window (see the module-scope
  // constant's comment) — this runs server-side with no user session, so the admin client is
  // required regardless (`stories` is select-only via RLS for the owner).
  const { data: candidates, error: candidatesError } = await admin
    .from("stories")
    .select("id, summary")
    .eq("experiment_id", experimentId)
    .order("created_at", { ascending: false })
    .limit(RECENT_STORY_CANDIDATE_LIMIT);
  if (candidatesError) throw candidatesError;

  if (!candidates || candidates.length === 0) {
    const storyId = await createAndClaimNewStory(
      admin,
      experimentId,
      sourcePostId,
      deterministicSummary(text),
    );
    return { storyId, calls: [] };
  }

  // DeepSeek generateObject recipe (.claude/rules/agent.md, this brief's 4-leg copy): leg 1
  // `reasoning: "none"` + `DEEPSEEK_DRAFT_PROVIDER_OPTIONS` (leg 1); `story-cluster.md` names
  // `match`/`storyIndex`/`summary` imperatively under its Output heading (leg 2); leg 3 is the
  // deterministic degrade in the catch block below, not a retry (a temp-0 failure isn't sampling
  // variance, matching the judge's own reasoning); `maxOutputTokens: 2000` is leg 4.
  try {
    const verdictResult = await generateObject({
      model: DEEPSEEK_DRAFT_MODEL,
      providerOptions: DEEPSEEK_DRAFT_PROVIDER_OPTIONS,
      reasoning: "none",
      temperature: 0,
      maxOutputTokens: 2000,
      schema: clusterVerdictSchema,
      system: STORY_CLUSTER_PROMPT,
      prompt: buildClusterPrompt(candidates, authorHandle, text),
    });

    const call = await buildClusterCall({
      output: JSON.stringify(verdictResult.object),
      reasoning: verdictResult.reasoning ?? null,
      usage: verdictResult.usage,
      providerMetadata: verdictResult.providerMetadata,
    });

    let storyId: string;
    if (verdictResult.object.match === "existing") {
      const index = Math.min(Math.max(0, verdictResult.object.storyIndex), candidates.length - 1);
      storyId = await claimStoryAssignment(admin, sourcePostId, candidates[index].id);
    } else {
      const summary = verdictResult.object.summary.trim() || deterministicSummary(text);
      storyId = await createAndClaimNewStory(admin, experimentId, sourcePostId, summary);
    }

    return { storyId, calls: [call] };
  } catch (err) {
    // Same discriminator as draft-council-run.ts's judge catch: NoObjectGeneratedError means the
    // call COMPLETED and billed but its output failed schema validation — that call still owes a
    // ledger row (decisions.md L12), captured off the error (cost degrades to null, no
    // generationId — the error doesn't surface gateway metadata in resolveGatewayCost's shape).
    // Degrade deterministically to a new one-source story, matching the zero-candidate path.
    // Any OTHER error means the call did NOT complete or bill — propagate it, create no story,
    // return no calls, so the caller's ledger-first ordering never sees a phantom billed call.
    if (NoObjectGeneratedError.isInstance(err)) {
      console.error(
        "cluster: classifier output failed schema validation; degrading to a new one-source story",
        err,
      );
      const call = await buildClusterCall({
        output: err.text ?? null,
        reasoning: null,
        usage: err.usage,
      });
      const storyId = await createAndClaimNewStory(
        admin,
        experimentId,
        sourcePostId,
        deterministicSummary(text),
      );
      return { storyId, calls: [call] };
    }
    throw err;
  }
}
