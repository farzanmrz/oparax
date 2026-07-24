// lib/agent/feed-query.ts
//
// Pure query + shaping for the Feed page's story/draft card pairs. `source_posts` carries
// deny-all RLS (no SELECT policy at all — verified against the migration and restated in
// AGENTS.md's code map: "deny-all — RLS on, zero policies: (x_accounts, source_posts)"), so
// a request built on the owner-scoped cookie client would silently get ZERO source_posts
// rows back — not an error, just an empty result that would masquerade as "no stories". The
// caller (`page.tsx`, rendering inside `app/agents/[id]/layout.tsx`'s already-enforced
// ownership check on this same `id`) must pass the SERVICE-ROLE client here; every query
// below re-scopes to `experimentId` explicitly anyway, exactly like the cron dispatcher's
// and `lib/x/`'s own admin-client reads. `post_drafts`/`model_calls`/`stories` would also
// work through the owner-scoped RLS client, but splitting the client per table inside one
// function buys nothing — one client, explicit filters everywhere.
//
// `stories` is the query root now (Slice 5, T2.4b clustering is live — every source post that
// reaches drafting is first assigned to a `stories` row, one row per desk-scoped news
// development, not one row per delivery). Four batched reads, never N+1: (1) the bounded
// `stories` page for this experiment, newest first (the SAME row cap the old `post_drafts`-
// rooted query had); (2) the batched `story_assignments` -> `source_posts` read for the
// news-card side, now genuinely a LIST per story (clustering can fold multiple deliveries
// into one story); (3) the batched winning `post_drafts` rows for those stories — now
// potentially MULTIPLE per story, one per platform that produced a winner — joined to their
// `model_calls` row for text/model/cost; (4) council metadata for those same stories in one
// `.in("story_id", ids)` select — existence/cost only (`parent_draft_id`, `judge_verdict`,
// `model_calls(cost_usd)`), never `output`/`reasoning` on a non-winner row, which would leak
// a candidate's reasoning trace into the list payload (only the on-demand "Why this draft"
// dialog, T5's `council-query.ts`, is allowed to fetch that).
//
// Ordering: `stories` carries no `posted_at` of its own (only X's own winning draft ever gets
// one — LinkedIn/Bluesky have no posting mechanism this slice), so "unposted-first" can't be
// expressed as a single `.order()` against the query root the way the old `post_drafts`-rooted
// query could. Fetch the bounded story page newest-created-first, then re-sort once winners
// are known: unposted stories (no X winner, or an X winner not yet posted) sort first, then
// posted stories fall back to most-recently-posted-first — the same feel the old
// `.order("posted_at", {ascending:false, nullsFirst:true})` gave, just computed post-fetch.
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORMS, type Platform } from "@/lib/agent/desk-config";
import type { Database } from "@/lib/supabase/database.types";
import { sumCosts } from "./usage-cost";

type Client = SupabaseClient<Database>;

const STORY_PAGE_LIMIT = 50;

export type FeedStory = {
  storyId: string;
  summary: string; // stories.summary — a short label, useful as a fallback/secondary display
  sourcePosts: {
    id: string;
    authorHandle: string | null; // NOW NULLABLE — a website post may have none
    text: string;
    postedAt: string | null;
  }[];
  winners: Partial<
    Record<
      Platform,
      {
        postDraftId: string;
        text: string;
        model: string;
        postedAt: string | null;
        postedUrl: string | null;
      }
    >
  >; // keyed by platform — only platforms that actually produced a winning draft appear
  council: { memberCount: number; totalCostUsd: number | null }; // keep the existing aggregate
  // shape; aggregated across ALL platforms' calls for this story (simpler and still useful —
  // a per-platform cost breakdown isn't required by the plan text, which only asks for pills
  // plus a switcher, not per-pill cost — documented in task-25-report.md).
};

type StoryRow = { id: string; summary: string; created_at: string };

type SourcePostJoin = {
  id: string;
  author_handle: string | null;
  text: string;
  posted_at: string | null;
};

type AssignmentRow = { story_id: string; source_posts: SourcePostJoin | null };

type WinnerModelCall = { model: string; output: string | null; cost_usd: number | null } | null;

type WinnerRow = {
  id: string;
  story_id: string | null;
  platform: string;
  posted_at: string | null;
  posted_url: string | null;
  model_calls: WinnerModelCall;
};

type CouncilRow = {
  story_id: string | null;
  parent_draft_id: string | null;
  judge_verdict: unknown;
  model_calls: { cost_usd: number | null } | null;
};

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

/** Groups council rows already scoped to one story into the chip's two numbers: the
 *  drafting candidates' count (original, never-judged rows — `parent_draft_id IS NULL` AND
 *  `judge_verdict IS NULL`) and the total spend across those candidates plus the judge row
 *  (`parent_draft_id IS NULL` AND `judge_verdict IS NOT NULL`). A revision's own cost is
 *  never folded in — mirrors T5's `council-query.ts` `buildGroup` exactly, so the feed
 *  chip's total never disagrees with the "Why this draft" dialog it opens into. Rows from
 *  every platform's council are folded into one total per story (see the `FeedStory.council`
 *  comment above). */
function summarizeCouncil(rows: CouncilRow[]): {
  memberCount: number;
  totalCostUsd: number | null;
} {
  const originals = rows.filter((r) => r.parent_draft_id === null);
  const candidates = originals.filter((r) => r.judge_verdict === null);
  const judge = originals.find((r) => r.judge_verdict !== null);
  return {
    memberCount: candidates.length,
    totalCostUsd: sumCosts([
      ...candidates.map((r) => r.model_calls?.cost_usd ?? null),
      judge?.model_calls?.cost_usd ?? null,
    ]),
  };
}

export async function fetchFeedPage(supabase: Client, experimentId: string): Promise<FeedStory[]> {
  const { data: storyData, error: storyError } = await supabase
    .from("stories")
    .select("id, summary, created_at")
    .eq("experiment_id", experimentId)
    .order("created_at", { ascending: false })
    .limit(STORY_PAGE_LIMIT);
  if (storyError) throw storyError;

  const stories = (storyData ?? []) as StoryRow[];
  if (stories.length === 0) return [];

  const storyIds = stories.map((s) => s.id);

  const [assignmentsResult, winnersResult, councilResult] = await Promise.all([
    supabase
      .from("story_assignments")
      // Oldest-assigned-first within a story, so `sourcePosts[0]` (feed-item.tsx's rendered
      // "primary" source post — see its own comment) is the post that actually started the
      // story, not an arbitrary fetch order.
      .select("story_id, source_posts(id, author_handle, text, posted_at)")
      .in("story_id", storyIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("post_drafts")
      .select("id, story_id, platform, posted_at, posted_url, model_calls(model, output, cost_usd)")
      .eq("experiment_id", experimentId)
      .in("story_id", storyIds)
      .eq("is_winner", true),
    supabase
      .from("post_drafts")
      .select("story_id, parent_draft_id, judge_verdict, model_calls(cost_usd)")
      .eq("experiment_id", experimentId)
      .in("story_id", storyIds),
  ]);
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (winnersResult.error) throw winnersResult.error;
  if (councilResult.error) throw councilResult.error;

  const sourcePostsByStoryId = new Map<string, FeedStory["sourcePosts"]>();
  for (const row of (assignmentsResult.data ?? []) as unknown as AssignmentRow[]) {
    if (!row.source_posts) continue; // defensive: an assignment whose source_posts row went missing
    const list = sourcePostsByStoryId.get(row.story_id) ?? [];
    list.push({
      id: row.source_posts.id,
      authorHandle: row.source_posts.author_handle,
      text: row.source_posts.text,
      postedAt: row.source_posts.posted_at,
    });
    sourcePostsByStoryId.set(row.story_id, list);
  }

  const winnersByStoryId = new Map<string, FeedStory["winners"]>();
  for (const winner of (winnersResult.data ?? []) as unknown as WinnerRow[]) {
    if (!winner.story_id || !isPlatform(winner.platform)) continue;
    const entry = winnersByStoryId.get(winner.story_id) ?? {};
    entry[winner.platform] = {
      postDraftId: winner.id,
      text: winner.model_calls?.output ?? "",
      model: winner.model_calls?.model ?? "unknown",
      postedAt: winner.posted_at,
      postedUrl: winner.posted_url,
    };
    winnersByStoryId.set(winner.story_id, entry);
  }

  const councilRowsByStoryId = new Map<string, CouncilRow[]>();
  for (const row of (councilResult.data ?? []) as unknown as CouncilRow[]) {
    if (!row.story_id) continue;
    const list = councilRowsByStoryId.get(row.story_id) ?? [];
    list.push(row);
    councilRowsByStoryId.set(row.story_id, list);
  }

  const result = stories.map((story) => ({
    storyId: story.id,
    summary: story.summary,
    sourcePosts: sourcePostsByStoryId.get(story.id) ?? [],
    winners: winnersByStoryId.get(story.id) ?? {},
    council: summarizeCouncil(councilRowsByStoryId.get(story.id) ?? []),
  }));

  // Unposted-first, then most-recently-posted-first (see the ordering comment at the top of
  // this file). `Array#sort` is stable (guaranteed since ES2019/Node 12+), so ties keep the
  // `stories` query's own created_at-desc order.
  result.sort((a, b) => {
    const aPostedAt = a.winners.x?.postedAt ?? null;
    const bPostedAt = b.winners.x?.postedAt ?? null;
    if (aPostedAt === null || bPostedAt === null) {
      if (aPostedAt === bPostedAt) return 0;
      return aPostedAt === null ? -1 : 1;
    }
    return new Date(bPostedAt).getTime() - new Date(aPostedAt).getTime();
  });

  return result;
}
