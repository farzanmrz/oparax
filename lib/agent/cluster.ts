// lib/agent/cluster.ts
//
// Story grouping — files a delivered source post under the desk's existing story for the same
// news when there is one, and creates a new story otherwise (Part B2 of #131; the shipped flow
// before this was deliberately post-per-story). `stories` and `story_assignments` remain the
// feed's grouping spine; the same-story judgment lives in lib/agent/story-group.ts and the
// atomic mutation in the attach_or_create_story RPC (per-desk advisory lock + the "unseen"
// handshake that stops two parallel posts of one new story from double-creating).
//
// SERVER-ONLY (transitively reads fs via lib/sysprompts through story-group.ts) — never
// importable from a client component.
import type { CouncilCall, NewsPoint } from "@/lib/agent/draft-council-run";
import { judgeSameStory, type StoryCandidate } from "@/lib/agent/story-group";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Zero-call summary length — first ~80 chars of the post text; the winner's headline is the
// display title, this is only the stories.summary fallback.
const DETERMINISTIC_SUMMARY_LENGTH = 80;
/** How many recent stories the judge compares against. */
const GROUPING_WINDOW_HOURS = 24;
const GROUPING_CANDIDATE_CAP = 30;
/** Bounded convergence for the unseen-stories handshake. */
const MAX_GROUPING_ROUNDS = 4;

export type ClusterResult = {
  storyId: string;
  /** True when the post was filed under an existing story — the caller must NOT insert a
   *  second winner and must terminate the claim via complete_claimed_attachment. */
  attached: boolean;
  calls: CouncilCall[];
};

function deterministicSummary(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > DETERMINISTIC_SUMMARY_LENGTH
    ? `${trimmed.slice(0, DETERMINISTIC_SUMMARY_LENGTH).trimEnd()}…`
    : trimmed;
}

function pointsOf(newsPoints: unknown): string[] {
  if (!Array.isArray(newsPoints)) return [];
  return newsPoints.flatMap((entry) => {
    const point =
      entry !== null && typeof entry === "object" ? (entry as Record<string, unknown>).point : null;
    return typeof point === "string" && point.trim() ? [point] : [];
  });
}

async function hydrateStoryCandidates(
  admin: AdminClient,
  agentId: string,
  storyIds: string[],
): Promise<StoryCandidate[]> {
  if (!storyIds.length) return [];
  const [storiesResult, winnersResult] = await Promise.all([
    admin.from("stories").select("id, summary, created_at").in("id", storyIds),
    admin
      .from("drafts")
      .select("story_id, news_title, news_points")
      .eq("agent_id", agentId)
      .eq("is_winner", true)
      .in("story_id", storyIds),
  ]);
  if (storiesResult.error) throw storiesResult.error;
  if (winnersResult.error) throw winnersResult.error;
  const winnersByStory = new Map(
    (winnersResult.data ?? []).map((row) => [row.story_id, row] as const),
  );
  return (storiesResult.data ?? []).map((story) => {
    const winner = winnersByStory.get(story.id);
    return {
      storyId: story.id,
      title: winner?.news_title?.trim() || story.summary,
      points: pointsOf(winner?.news_points),
    };
  });
}

async function fetchRecentStoryIds(admin: AdminClient, agentId: string): Promise<string[]> {
  const since = new Date(Date.now() - GROUPING_WINDOW_HOURS * 3_600_000).toISOString();
  const { data, error } = await admin
    .from("stories")
    .select("id")
    .eq("agent_id", agentId)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(GROUPING_CANDIDATE_CAP);
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

type AttachOrCreateOutcome =
  | { outcome: "attached"; story_id: string }
  | { outcome: "created"; story_id: string }
  | { outcome: "unseen"; story_ids: string[] };

function parseRpcOutcome(value: unknown): AttachOrCreateOutcome {
  const record =
    value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
  if (record.outcome === "unseen" && Array.isArray(record.story_ids)) {
    return {
      outcome: "unseen",
      story_ids: record.story_ids.filter((id): id is string => typeof id === "string"),
    };
  }
  if (
    (record.outcome === "attached" || record.outcome === "created") &&
    typeof record.story_id === "string"
  ) {
    return { outcome: record.outcome, story_id: record.story_id };
  }
  throw new Error(`cluster: unexpected attach_or_create_story outcome ${JSON.stringify(value)}`);
}

/**
 * File `sourcePostId` under the same story as the desk's existing coverage when the judge says
 * it IS the same story, else create its own story — atomically, per desk. Every judge call is
 * returned in `calls` for the pipeline to ledger.
 */
export async function matchOrCreateStory(input: {
  agentId: string;
  sourcePostId: string;
  text: string;
  candidateTitle: string;
  candidatePoints: NewsPoint[];
  deadlineAt?: number;
}): Promise<ClusterResult> {
  const admin = createAdminClient();
  const calls: CouncilCall[] = [];
  const summary = deterministicSummary(input.text);

  const knownStoryIds = new Set<string>(await fetchRecentStoryIds(admin, input.agentId));
  let judgeSet = await hydrateStoryCandidates(admin, input.agentId, [...knownStoryIds]);
  let matchStoryId: string | null = null;

  for (let round = 0; round < MAX_GROUPING_ROUNDS; round++) {
    if (judgeSet.length > 0) {
      const judged = await judgeSameStory({
        candidateTitle: input.candidateTitle,
        candidatePoints: input.candidatePoints,
        stories: judgeSet,
        deadlineAt: input.deadlineAt,
      });
      calls.push(judged.call);
      if (judged.matchStoryId) matchStoryId = judged.matchStoryId;
    }

    const { data, error } = await admin.rpc("attach_or_create_story", {
      p_agent_id: input.agentId,
      p_source_post_id: input.sourcePostId,
      p_summary: summary,
      p_match_story_id: matchStoryId as unknown as string,
      p_known_story_ids: [...knownStoryIds],
    });
    if (error) throw error;
    const outcome = parseRpcOutcome(data);
    if (outcome.outcome === "attached") {
      return { storyId: outcome.story_id, attached: true, calls };
    }
    if (outcome.outcome === "created") {
      return { storyId: outcome.story_id, attached: false, calls };
    }
    // Unseen stories appeared since the fetch (a parallel post of the same breaking news is
    // the whole point of this handshake): judge the candidate against exactly those.
    for (const id of outcome.story_ids) knownStoryIds.add(id);
    judgeSet = await hydrateStoryCandidates(admin, input.agentId, outcome.story_ids);
  }

  // Rounds exhausted under sustained story churn — create rather than drop the post: a
  // duplicate story is redundant, a lost post is missing news. The known set now covers
  // everything seen, so the RPC will create.
  const { data, error } = await admin.rpc("attach_or_create_story", {
    p_agent_id: input.agentId,
    p_source_post_id: input.sourcePostId,
    p_summary: summary,
    p_match_story_id: matchStoryId as unknown as string,
    p_known_story_ids: [...knownStoryIds],
  });
  if (error) throw error;
  const outcome = parseRpcOutcome(data);
  if (outcome.outcome === "unseen") {
    throw new Error("cluster: attach_or_create_story kept returning unseen stories");
  }
  return { storyId: outcome.story_id, attached: outcome.outcome === "attached", calls };
}
