// lib/agent/feed-query.ts
//
// Pure query + shaping for the Feed page's story/draft pairs. `source_posts` carries
// deny-all RLS (no SELECT policy at all — verified against the migration and restated in
// AGENTS.md's code map: "deny-all — RLS on, zero policies: (x_accounts, source_posts)"), so
// a request built on the owner-scoped cookie client would silently get ZERO source_posts
// rows back — not an error, just an empty result that would masquerade as "no stories". The
// caller (`page.tsx`, rendering inside `app/agents/[id]/layout.tsx`'s already-enforced
// ownership check on this same `id`) must pass the SERVICE-ROLE client here; every query
// below re-scopes to `experimentId` explicitly anyway, exactly like the cron dispatcher's
// and `lib/x/`'s own admin-client reads. `post_drafts`/`model_calls` would also work through
// the owner-scoped RLS client, but splitting the client per table inside one function buys
// nothing — one client, explicit filters everywhere.
//
// Three batched reads, never N+1: (1) the winning `post_drafts` rows for this experiment,
// joined to their `model_calls` row for text/model/cost — this drives the whole page, one
// FeedStory per winning draft, newest-need-review-first (`posted_at` NULLS FIRST on a DESC
// order: an unposted draft has no `posted_at` yet, so it sorts ahead of anything already
// posted, then posted stories fall back to most-recently-posted-first); (2) the batched
// `source_posts` read for the news-card side; (3) council metadata for those same stories in
// one `.in("source_post_id", ids)` select — existence/cost only (`id`, `parent_draft_id`,
// `judge_verdict`, `model_calls(cost_usd)`), never `output`/`reasoning` on a non-winner row,
// which would leak a candidate's reasoning trace into the list payload (only the on-demand
// "Why this draft" dialog, T5's `council-query.ts`, is allowed to fetch that).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { sumCosts } from "./usage-cost";

type Client = SupabaseClient<Database>;

export type FeedStory = {
  sourcePosts: { id: string; authorHandle: string; text: string; postedAt: string | null }[]; // LIST — clustering-ready, length 1 today
  winner: {
    postDraftId: string;
    text: string;
    model: string;
    postedAt: string | null;
    postedUrl: string | null;
  } | null;
  council: { memberCount: number; totalCostUsd: number | null }; // metadata only — NO reasoning, NO judge_verdict content
};

type WinnerModelCall = { model: string; output: string | null; cost_usd: number | null } | null;

type WinnerRow = {
  id: string;
  source_post_id: string;
  posted_at: string | null;
  posted_url: string | null;
  model_calls: WinnerModelCall;
};

type CouncilRow = {
  source_post_id: string;
  parent_draft_id: string | null;
  judge_verdict: unknown;
  model_calls: { cost_usd: number | null } | null;
};

/** Groups council rows already scoped to one story into the chip's two numbers: the
 *  drafting candidates' count (original, never-judged rows — `parent_draft_id IS NULL` AND
 *  `judge_verdict IS NULL`) and the total spend across those candidates plus the judge row
 *  (`parent_draft_id IS NULL` AND `judge_verdict IS NOT NULL`). A revision's own cost is
 *  never folded in — mirrors T5's `council-query.ts` `buildGroup` exactly, so the feed
 *  chip's total never disagrees with the "Why this draft" dialog it opens into. */
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
  const { data: winnerData, error: winnerError } = await supabase
    .from("post_drafts")
    .select("id, source_post_id, posted_at, posted_url, model_calls(model, output, cost_usd)")
    .eq("experiment_id", experimentId)
    .eq("is_winner", true)
    .order("posted_at", { ascending: false, nullsFirst: true })
    .limit(50);
  if (winnerError) throw winnerError;

  const winners = (winnerData ?? []) as unknown as WinnerRow[];
  if (winners.length === 0) return [];

  const sourcePostIds = [...new Set(winners.map((w) => w.source_post_id))];

  const [sourcePostsResult, councilResult] = await Promise.all([
    supabase
      .from("source_posts")
      .select("id, author_handle, text, posted_at")
      .in("id", sourcePostIds),
    supabase
      .from("post_drafts")
      .select("source_post_id, parent_draft_id, judge_verdict, model_calls(cost_usd)")
      .eq("experiment_id", experimentId)
      .in("source_post_id", sourcePostIds),
  ]);
  if (sourcePostsResult.error) throw sourcePostsResult.error;
  if (councilResult.error) throw councilResult.error;

  const sourcePostById = new Map(
    (sourcePostsResult.data ?? []).map((row) => [
      row.id,
      { id: row.id, authorHandle: row.author_handle, text: row.text, postedAt: row.posted_at },
    ]),
  );

  const councilRowsBySourcePostId = new Map<string, CouncilRow[]>();
  for (const row of (councilResult.data ?? []) as unknown as CouncilRow[]) {
    const list = councilRowsBySourcePostId.get(row.source_post_id) ?? [];
    list.push(row);
    councilRowsBySourcePostId.set(row.source_post_id, list);
  }

  return winners.map((winner) => {
    const sourcePost = sourcePostById.get(winner.source_post_id);
    return {
      sourcePosts: sourcePost ? [sourcePost] : [],
      winner: {
        postDraftId: winner.id,
        text: winner.model_calls?.output ?? "",
        model: winner.model_calls?.model ?? "unknown",
        postedAt: winner.posted_at,
        postedUrl: winner.posted_url,
      },
      council: summarizeCouncil(councilRowsBySourcePostId.get(winner.source_post_id) ?? []),
    };
  });
}
