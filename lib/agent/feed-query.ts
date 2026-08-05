// lib/agent/feed-query.ts
//
// Pure query + shaping for the Feed page's story/draft card pairs. `source_posts` carries
// deny-all RLS (no SELECT policy at all — verified against the migration and restated in
// AGENTS.md's code map: "deny-all — RLS on, zero policies: (x_accounts, source_posts)"), so
// a request built on the owner-scoped cookie client would silently get ZERO source_posts
// rows back — not an error, just an empty result that would masquerade as "no stories". The
// caller (`page.tsx`, rendering inside `app/agents/[id]/layout.tsx`'s already-enforced
// ownership check on this same `id`) must pass the SERVICE-ROLE client here; every query
// below re-scopes to `agentId` explicitly anyway, exactly like the cron dispatcher's
// and `lib/x/`'s own admin-client reads. `drafts`/`model_calls`/`stories` would also
// work through the owner-scoped RLS client, but splitting the client per table inside one
// function buys nothing — one client, explicit filters everywhere.
//
// `stories` is the query root now (Slice 5, T2.4b clustering is live — every source post that
// reaches drafting is first assigned to a `stories` row, one row per desk-scoped news
// development, not one row per delivery). Four batched reads, never N+1: (1) the bounded
// `stories` page for this agent, newest first (the SAME row cap the old `drafts`-
// rooted query had); (2) the batched `story_assignments` -> `source_posts` read for the
// news-card side, now genuinely a LIST per story (clustering can fold multiple deliveries
// into one story); (3) the batched winning `drafts` rows for those stories — now
// potentially MULTIPLE per story, one per platform that produced a winner; (4) council
// metadata for those same stories in one `.in("story_id", ids)` select; and (5) one batched
// `model_calls` read by the collected draft foreign keys. The last read supplies winner
// text/model/cost and council cost without relying on PostgREST relationship embeds, which
// are not available in every deployed schema cache. It never selects `output`/`reasoning` for
// a non-winner row, so a candidate's reasoning trace cannot leak into the list payload (only
// the on-demand "Why this draft" dialog, T5's `council-query.ts`, is allowed to fetch that).
//
// Ordering: `stories` carries no `posted_at` of its own (only X's own winning draft ever gets
// one — LinkedIn/Bluesky have no posting mechanism this slice), so "unconfirmed-first" can't be
// expressed as a single `.order()` against the query root the way the old `drafts`-rooted
// query could. Fetch the bounded story page newest-created-first, then re-sort once winners
// are known: unconfirmed stories (no X winner, an X winner not yet posted, or an AMBIGUOUS X
// winner — postedAt set but postedUrl null, meaning X may have accepted the post but the
// outcome stamp failed) sort first, then confirmed stories (postedAt AND postedUrl both set)
// fall back to most-recently-confirmed-first — the same feel the old
// `.order("posted_at", {ascending:false, nullsFirst:true})` gave, just computed post-fetch.
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORMS, type Platform } from "@/lib/agent/desk-config";
import type { Database } from "@/lib/supabase/database.types";
import { sumCosts } from "./usage-cost";

type Client = SupabaseClient<Database>;

const STORY_PAGE_LIMIT = 50;

/** The poster's display name ("Fabrizio Romano"), dug out of the stored stream payload's
 *  `includes.users[0].name`. The stream is asked for `expansions=author_id&user.fields=username`
 *  (ingest/src/stream.ts), so the name rides along in every X delivery but has no column of its
 *  own — this reads it back out rather than adding one for a purely presentational field. Returns
 *  null for a website source, an older row stored before this shape, or any payload that doesn't
 *  match; every caller must treat the name as optional. */
export function authorNameFromRaw(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const includes = (raw as { includes?: unknown }).includes;
  if (typeof includes !== "object" || includes === null) return null;
  const users = (includes as { users?: unknown }).users;
  if (!Array.isArray(users) || users.length === 0) return null;
  const name = (users[0] as { name?: unknown }).name;
  return typeof name === "string" && name.length > 0 ? name : null;
}

export type FeedStory = {
  storyId: string;
  summary: string; // stories.summary — a short label, useful as a fallback/secondary display
  /** `stories.created_at` — when the council for this story actually started, as opposed to
   *  a source post's own `postedAt` (when the tracked account originally posted, which can be
   *  hours or days old for a backfilled/seeded/redelivered post). The mid-council-vs-
   *  permanently-failed staleness check in feed-item.tsx must clock off THIS, never off a
   *  source post's timestamp. */
  createdAt: string;
  sourcePosts: {
    id: string;
    authorHandle: string | null; // NOW NULLABLE — a website post may have none
    authorName: string | null; // the poster's display name, off the stored stream payload
    text: string;
    postedAt: string | null;
    xPostId: string | null; // NULL for a website source — the id the X embed is fetched by
  }[];
  winners: Partial<
    Record<
      Platform,
      {
        draftId: string;
        text: string;
        model: string;
        /** When the council produced this draft — the draft card's own timestamp, distinct
         *  from the source post's publish time shown on the card beside it. */
        createdAt: string;
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
  x_post_id: string | null;
  raw: unknown;
};

type AssignmentRow = { story_id: string; source_posts: SourcePostJoin | null };

type WinnerModelCall = { model: string; output: string | null; cost_usd: number | null } | null;

type WinnerRow = {
  id: string;
  story_id: string | null;
  platform: string;
  posted_at: string | null;
  posted_url: string | null;
  created_at: string;
  model_call_id: string;
  model_calls: WinnerModelCall;
};

type CouncilRow = {
  story_id: string | null;
  parent_draft_id: string | null;
  judge_verdict: unknown;
  model_call_id: string;
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
  // ALL judge rows, not just the first — one per platform once `PLATFORMS` grows past X,
  // so summing (not `.find`-ing) the first match is what keeps this total from silently
  // undercounting the moment a story carries more than one platform's judge.
  const judges = originals.filter((r) => r.judge_verdict !== null);
  return {
    memberCount: candidates.length,
    totalCostUsd: sumCosts([
      ...candidates.map((r) => r.model_calls?.cost_usd ?? null),
      ...judges.map((r) => r.model_calls?.cost_usd ?? null),
    ]),
  };
}

export async function fetchFeedPage(supabase: Client, agentId: string): Promise<FeedStory[]> {
  const { data: storyData, error: storyError } = await supabase
    .from("stories")
    .select("id, summary, created_at")
    .eq("agent_id", agentId)
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
      .select("story_id, source_posts(id, author_handle, text, posted_at, x_post_id, raw)")
      .in("story_id", storyIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("drafts")
      // Oldest-first, for the same reason as the assignments query above: a story that clustered
      // more than one source post carries one is_winner row per (platform, source post) — each
      // delivery's council crowns its own winner and nothing dethrones the last one — so the
      // winners loop below would otherwise keep whichever row PostgREST happened to return last.
      // Ascending means the NEWEST winner is applied last and wins, deterministically.
      .select("id, story_id, platform, posted_at, posted_url, created_at, model_call_id")
      .eq("agent_id", agentId)
      .in("story_id", storyIds)
      .eq("is_winner", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("drafts")
      .select("story_id, parent_draft_id, judge_verdict, model_call_id")
      .eq("agent_id", agentId)
      .in("story_id", storyIds),
  ]);
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (winnersResult.error) throw winnersResult.error;
  if (councilResult.error) throw councilResult.error;

  const winnerRows = winnersResult.data ?? [];
  const councilRows = councilResult.data ?? [];
  const modelCallIds = [
    ...new Set(
      [...winnerRows, ...councilRows]
        .map((row) => row.model_call_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  const modelCallsById = new Map<string, WinnerModelCall>();
  if (modelCallIds.length > 0) {
    const { data: modelCallData, error: modelCallError } = await supabase
      .from("model_calls")
      .select("id, model, output, cost_usd")
      .in("id", modelCallIds);
    if (modelCallError) throw modelCallError;
    for (const call of modelCallData ?? []) {
      modelCallsById.set(call.id, call);
    }
  }

  const sourcePostsByStoryId = new Map<string, FeedStory["sourcePosts"]>();
  for (const row of (assignmentsResult.data ?? []) as unknown as AssignmentRow[]) {
    if (!row.source_posts) continue; // defensive: an assignment whose source_posts row went missing
    const list = sourcePostsByStoryId.get(row.story_id) ?? [];
    list.push({
      id: row.source_posts.id,
      authorHandle: row.source_posts.author_handle,
      authorName: authorNameFromRaw(row.source_posts.raw),
      text: row.source_posts.text,
      postedAt: row.source_posts.posted_at,
      xPostId: row.source_posts.x_post_id,
    });
    sourcePostsByStoryId.set(row.story_id, list);
  }

  const winnersByStoryId = new Map<string, FeedStory["winners"]>();
  const winnersWithModelCalls: WinnerRow[] = winnerRows.map((row) => ({
    ...row,
    model_calls: modelCallsById.get(row.model_call_id) ?? null,
  }));
  for (const winner of winnersWithModelCalls) {
    if (!winner.story_id || !isPlatform(winner.platform)) continue;
    const entry = winnersByStoryId.get(winner.story_id) ?? {};
    entry[winner.platform] = {
      draftId: winner.id,
      text: winner.model_calls?.output ?? "",
      model: winner.model_calls?.model ?? "unknown",
      createdAt: winner.created_at,
      postedAt: winner.posted_at,
      postedUrl: winner.posted_url,
    };
    winnersByStoryId.set(winner.story_id, entry);
  }

  const councilRowsByStoryId = new Map<string, CouncilRow[]>();
  const councilRowsWithModelCalls: CouncilRow[] = councilRows.map((draft) => ({
    ...draft,
    model_calls: modelCallsById.get(draft.model_call_id) ?? null,
  }));
  for (const row of councilRowsWithModelCalls) {
    if (!row.story_id) continue;
    const list = councilRowsByStoryId.get(row.story_id) ?? [];
    list.push(row);
    councilRowsByStoryId.set(row.story_id, list);
  }

  const result = stories.map((story) => ({
    storyId: story.id,
    summary: story.summary,
    createdAt: story.created_at,
    sourcePosts: sourcePostsByStoryId.get(story.id) ?? [],
    winners: winnersByStoryId.get(story.id) ?? {},
    council: summarizeCouncil(councilRowsByStoryId.get(story.id) ?? []),
  }));

  // Unconfirmed-first (unposted OR ambiguous), then most-recently-confirmed-first (see the
  // ordering comment at the top of this file). `Array#sort` is stable (guaranteed since
  // ES2019/Node 12+), so ties keep the `stories` query's own created_at-desc order.
  result.sort((a, b) => {
    const aX = a.winners.x;
    const bX = b.winners.x;
    const aConfirmed = aX != null && aX.postedAt != null && aX.postedUrl != null;
    const bConfirmed = bX != null && bX.postedAt != null && bX.postedUrl != null;
    if (!aConfirmed || !bConfirmed || aX == null || bX == null) {
      if (aConfirmed === bConfirmed) return 0;
      return aConfirmed ? 1 : -1;
    }
    return new Date(bX.postedAt as string).getTime() - new Date(aX.postedAt as string).getTime();
  });

  return result;
}
