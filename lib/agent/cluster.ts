// lib/agent/cluster.ts
//
// Story creation — attaches a delivered source post to its own new story, atomically. The
// shipped flow is deliberately post-per-story: a tracked X post arrives, gets drafted, and is
// its own story on the feed. `stories` and `story_assignments` remain load-bearing (every
// draft still needs a `story_id` for the feed to group and render it); only the many-posts-
// into-one-story classifier that used to run here was never switched on and has been removed.
//
// PURE-ish orchestration in the same shape as draft-council-run.ts: this module owns its own
// story-table writes (creation + the atomic claim below). It makes no model call, so it has no
// ledger row of its own to hand back — the caller's CouncilCall array is always empty.
// SERVER-ONLY (transitively reads fs via lib/sysprompts, which loads its prompts at module
// scope) — never importable from a client component.
import type { CouncilCall } from "@/lib/agent/draft-council-run";
import type { SourceIdentity } from "@/lib/agent/source-identity";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Zero-call summary length — first ~80 chars of the post text, the only summary source now that
// there is no classifier to generate a contextual one-line label.
const DETERMINISTIC_SUMMARY_LENGTH = 80;

export type ClusterResult = {
  storyId: string;
  calls: CouncilCall[]; // always empty — story creation makes no model call.
};

function deterministicSummary(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > DETERMINISTIC_SUMMARY_LENGTH
    ? `${trimmed.slice(0, DETERMINISTIC_SUMMARY_LENGTH).trimEnd()}…`
    : trimmed;
}

async function createStory(admin: AdminClient, agentId: string, summary: string): Promise<string> {
  const { data, error } = await admin
    .from("stories")
    .insert({ agent_id: agentId, summary })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** The atomic claim (D16 rail) — story_assignments carries UNIQUE(source_post_id,
 *  agent_id), so this insert IS the race guarantee, not the caller's own logic.
 *  Scoped per desk, not just per post: `source_posts` dedupes GLOBALLY (L4 — shared stream
 *  rules mean overlapping tracking across desks), so the same post reaches
 *  `draftForAgent` independently for every desk that tracks its author. Each desk claims
 *  it into its OWN story; a global UNIQUE(source_post_id) would let desk B's claim collide
 *  with desk A's on the shared post and silently inherit A's story_id (fixed post-QC — see
 *  supabase/migrations/20260724010000_story_assignments_scope_per_desk.sql). Mirrors
 *  draft-pipeline.ts's `draftForAgent` insert-then-branch-on-23505 shape. On a 23505
 *  unique-violation, another concurrent delivery of this exact (sourcePostId, agentId)
 *  pair already won the claim — read ITS story_id back rather than the one this call attempted
 *  (the race-loser path). This function alone never knows whether the `storyId` it was handed
 *  was just freshly created, so it does not attempt cleanup itself — `createAndClaimNewStory`
 *  below, the only caller, deletes its own orphan when it loses here. */
async function claimStoryAssignment(
  admin: AdminClient,
  sourcePostId: string,
  agentId: string,
  storyId: string,
): Promise<string> {
  const { error } = await admin
    .from("story_assignments")
    .insert({ source_post_id: sourcePostId, agent_id: agentId, story_id: storyId })
    .select("id");
  if (!error) return storyId;
  if (error.code !== "23505") throw error;

  const { data: winner, error: winnerError } = await admin
    .from("story_assignments")
    .select("story_id")
    .eq("source_post_id", sourcePostId)
    .eq("agent_id", agentId)
    .single();
  if (winnerError) throw winnerError;
  return winner.story_id;
}

async function createAndClaimNewStory(
  admin: AdminClient,
  agentId: string,
  sourcePostId: string,
  summary: string,
): Promise<string> {
  const storyId = await createStory(admin, agentId, summary);
  const winnerId = await claimStoryAssignment(admin, sourcePostId, agentId, storyId);
  if (winnerId !== storyId) {
    // Lost the race: another concurrent delivery of this exact (sourcePostId, agentId)
    // pair already claimed a story before our insert landed (the retry-after-later-failure case
    // this comment documents — the SAME sourcePostId reaching draftForAgent a second time
    // after a downstream failure released draft_claims). The story row created just above is now
    // orphaned — no story_assignments row will ever point at it, since the claim went to the
    // race winner's story instead — so delete it here rather than leaving dead weight that
    // fetchFeedPage would still surface as a card with nothing to show. Best-effort: a failed
    // delete is non-fatal (the winner's story_id below is still correct to return), just logged
    // so an undeleted orphan stays visible rather than silently swallowed.
    const { error: cleanupError } = await admin.from("stories").delete().eq("id", storyId);
    if (cleanupError) {
      console.error("cluster: failed to delete orphaned story after losing the claim race", {
        storyId,
        error: cleanupError,
      });
    }
  }
  return winnerId;
}

/** Attach sourcePostId to its own new story, atomically. The caller (draft-pipeline.ts's
 *  draftForAgent) is responsible for handling any error this function throws (a non-billing
 *  DB error propagates normally; do not swallow it here). */
export async function assignToStory(input: {
  agentId: string;
  sourcePostId: string;
  sourceIdentity: SourceIdentity;
  text: string;
}): Promise<ClusterResult> {
  const { agentId, sourcePostId, text } = input;
  const admin = createAdminClient();
  const storyId = await createAndClaimNewStory(
    admin,
    agentId,
    sourcePostId,
    deterministicSummary(text),
  );
  return { storyId, calls: [] };
}
