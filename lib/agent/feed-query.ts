import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchTweet } from "react-tweet/api";
import { z } from "zod";
import type { Platform } from "@/lib/agent/desk-config";
import {
  FEED_PAGE_SIZE,
  FEED_REFRESH_CHUNK,
  type FeedCursor,
  type FeedItem,
  type FeedPage,
  type FeedSourceView,
  type FeedStoryBody,
  isFeedCursor,
} from "@/lib/agent/feed-shared";
import type { Database, Json } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export const FEED_ID_CHUNK = 150;
// Genuine ceiling on ids accumulated across .range() pages (see pagedRows below), not a
// per-request row count — hosted Supabase's db-max-rows default (1000) is what forced the
// paging in the first place. Beyond this many ids, older history degrades gracefully.
export const FEED_ID_CAP = 20000;
const FEED_ID_PAGE_SIZE = 1000;

type StoryRow = { id: string; summary: string; created_at: string };
type SourcePost = {
  id: string;
  author_handle: string | null;
  text: string;
  posted_at: string | null;
  x_post_id: string | null;
  source: string;
  source_config_id: string | null;
  url: string | null;
};
type AssignmentRow = { story_id: string; source_post_id: string };
type WinnerRow = {
  id: string;
  story_id: string | null;
  platform: string;
  posted_at: string | null;
  posting_claimed_at: string | null;
  posted_url: string | null;
  created_at: string;
  model_call_id: string | null;
  news_title: string | null;
  news_synthesis: string | null;
  news_points: Json | null;
};

const storedNewsPointsSchema = z
  .array(
    z.object({
      reason: z.string().trim().min(1),
      point: z.string().trim().min(1),
    }),
  )
  .min(1);

function storyBodyOf(newsPoints: Json | null, synthesis: string | null): FeedStoryBody {
  if (newsPoints !== null) {
    const parsed = storedNewsPointsSchema.safeParse(newsPoints);
    if (parsed.success) return { kind: "points", points: parsed.data.map(({ point }) => point) };
    return { kind: "unavailable", sourceAvailable: false };
  }
  if (synthesis?.trim()) return { kind: "legacy", synthesis };
  return { kind: "unavailable", sourceAvailable: false };
}

type LineageRow = {
  id: string;
  parent_draft_id: string | null;
  source_post_id: string;
};

function chunks<T>(values: T[]): T[][] {
  return Array.from({ length: Math.ceil(values.length / FEED_ID_CHUNK) }, (_, i) =>
    values.slice(i * FEED_ID_CHUNK, (i + 1) * FEED_ID_CHUNK),
  );
}
/**
 * Pages an unbounded id-set select with .range() so results stay complete regardless of a
 * PostgREST db-max-rows cap (hosted Supabase defaults to 1000, which would otherwise clip a
 * single .select() and silently misclassify older history). Stops at a short page, or once
 * FEED_ID_CAP ids have accumulated, whichever comes first.
 */
async function pagedRows<T>(
  agentId: string,
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += FEED_ID_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + FEED_ID_PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < FEED_ID_PAGE_SIZE) break;
    if (rows.length >= FEED_ID_CAP) {
      console.warn("feed id collection exceeded memory guard", {
        agentId,
        count: rows.length,
      });
      break;
    }
  }
  return rows;
}
function isPlatform(value: string): value is Platform {
  return value === "x";
}
function compareStories(a: StoryRow, b: StoryRow) {
  return b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);
}
function cursorFor(row: StoryRow): FeedCursor {
  return { createdAt: new Date(row.created_at).toISOString(), id: row.id };
}
function cursorClause(cursor: FeedCursor) {
  return `created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`;
}
function hostname(url: string | null) {
  try {
    // www-stripped so site labels read "mundodeportivo.com" whichever host variant the
    // sitemap resolved, matching draft-pipeline's hostnameOf match rule.
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

type TweetLookup = { state: "available" | "gone" | "unavailable" };
type TweetCacheEntry = TweetLookup & { expiresAt: number };
const TWEET_CACHE_MAX = 2_000;
const TWEET_CACHE_TTL = 24 * 60 * 60 * 1_000;
const TWEET_RETRY_TTL = 60 * 1_000;
const tweetCache = new Map<string, TweetCacheEntry>();
const pendingTweets = new Map<string, Promise<TweetLookup>>();

function cacheTweet(id: string, lookup: TweetLookup) {
  const oldest = tweetCache.keys().next().value;
  if (tweetCache.size >= TWEET_CACHE_MAX && oldest) tweetCache.delete(oldest);
  tweetCache.set(id, {
    ...lookup,
    expiresAt: Date.now() + (lookup.state === "unavailable" ? TWEET_RETRY_TTL : TWEET_CACHE_TTL),
  });
}

/** Process-local cache also covers server actions, where Next's fetch cache is intentionally inert. */
async function getCachedTweet(id: string): Promise<TweetLookup> {
  const cached = tweetCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached;
  const pending = pendingTweets.get(id);
  if (pending) return pending;
  const lookup = (async () => {
    try {
      const result = await fetchTweet(id);
      return { state: result.tombstone || result.notFound ? "gone" : "available" } as const;
    } catch {
      return { state: "unavailable" } as const;
    }
  })();
  pendingTweets.set(id, lookup);
  try {
    const result = await lookup;
    cacheTweet(id, result);
    return result;
  } finally {
    pendingTweets.delete(id);
  }
}

async function confirmedIds(supabase: Client, agentId: string) {
  const rows = await pagedRows<{ story_id: string | null }>(agentId, (from, to) =>
    supabase
      .from("drafts")
      .select("story_id")
      .eq("agent_id", agentId)
      .eq("is_winner", true)
      .eq("platform", "x")
      .not("posted_at", "is", null)
      .not("posted_url", "is", null)
      .order("id", { ascending: true })
      .range(from, to),
  );
  return new Set(rows.map((row) => row.story_id).filter((id): id is string => Boolean(id)));
}
async function winnerIds(supabase: Client, agentId: string) {
  const rows = await pagedRows<{ story_id: string | null }>(agentId, (from, to) =>
    supabase
      .from("drafts")
      .select("story_id")
      .eq("agent_id", agentId)
      .eq("is_winner", true)
      .order("id", { ascending: true })
      .range(from, to),
  );
  return new Set(rows.map((row) => row.story_id).filter((id): id is string => Boolean(id)));
}
async function rawPage(
  supabase: Client,
  agentId: string,
  cursor: FeedCursor | null,
  limit: number,
) {
  let query = supabase
    .from("stories")
    .select("id, summary, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (cursor) query = query.or(cursorClause(cursor));
  const page = await query;
  if (page.error) throw page.error;
  const rows = (page.data ?? []) as StoryRow[];
  const sorted = rows.sort(compareStories).slice(0, limit);
  const last = sorted.at(-1);
  return { rows: sorted, nextCursor: last && sorted.length === limit ? cursorFor(last) : null };
}
async function hydrate(
  supabase: Client,
  agentId: string,
  stories: StoryRow[],
): Promise<FeedItem[]> {
  if (!stories.length) return [];
  const storyIds = stories.map((story) => story.id);
  const [assignmentResult, winnerResult] = await Promise.all([
    supabase
      .from("story_assignments")
      .select("story_id, source_post_id")
      .eq("agent_id", agentId)
      .in("story_id", storyIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("drafts")
      .select(
        "id, story_id, platform, posted_at, posting_claimed_at, posted_url, model_call_id, news_title, news_synthesis, news_points",
      )
      .eq("agent_id", agentId)
      .in("story_id", storyIds)
      .eq("is_winner", true)
      .order("created_at", { ascending: true }),
  ]);
  if (assignmentResult.error || winnerResult.error)
    throw assignmentResult.error ?? winnerResult.error;
  const assignments = (assignmentResult.data ?? []) as unknown as AssignmentRow[];
  const winnerRows = (winnerResult.data ?? []) as unknown as WinnerRow[];
  const modelCalls = new Map<string, { output: string | null }>();
  for (const part of chunks(
    winnerRows.map((row) => row.model_call_id).filter((id): id is string => id !== null),
  )) {
    if (!part.length) continue;
    const { data, error } = await supabase.from("model_calls").select("id, output").in("id", part);
    if (error) throw error;
    for (const call of data ?? []) modelCalls.set(call.id, call);
  }
  const sourcePosts = new Map<string, SourcePost>();
  for (const part of chunks(assignments.map((row) => row.source_post_id))) {
    if (!part.length) continue;
    const { data, error } = await supabase
      .from("source_posts")
      .select("id, author_handle, text, posted_at, x_post_id, source, source_config_id, url")
      .in("id", part);
    if (error) throw error;
    for (const post of data ?? []) sourcePosts.set(post.id, post);
  }
  const lineageById = new Map<string, LineageRow>();
  for (const part of chunks([...new Set(assignments.map((row) => row.source_post_id))])) {
    if (!part.length) continue;
    const rows = await pagedRows<LineageRow>(agentId, (from, to) =>
      supabase
        .from("drafts")
        .select("id, parent_draft_id, source_post_id")
        .eq("agent_id", agentId)
        .in("source_post_id", part)
        .order("id", { ascending: true })
        .range(from, to),
    );
    for (const row of rows) lineageById.set(row.id, row);
  }
  function versionCount(winningDraftId: string): number {
    const visited = new Set<string>();
    let cursor: string | null = winningDraftId;
    let count = 0;
    while (cursor && !visited.has(cursor)) {
      visited.add(cursor);
      const parentDraftId: string | null = lineageById.get(cursor)?.parent_draft_id ?? null;
      if (!parentDraftId) break;
      count++;
      cursor = parentDraftId;
    }
    return count;
  }
  const sources = new Map<string, SourcePost[]>();
  for (const assignment of assignments) {
    const post = sourcePosts.get(assignment.source_post_id);
    if (post) sources.set(assignment.story_id, [...(sources.get(assignment.story_id) ?? []), post]);
  }
  const winners = new Map<string, FeedItem["winners"]>();
  const titleByStory = new Map<string, string | null>();
  for (const row of winnerRows) {
    if (!row.story_id || !isPlatform(row.platform)) continue;
    const previousTitle = titleByStory.get(row.story_id);
    if (previousTitle === undefined || row.platform === "x") {
      titleByStory.set(row.story_id, row.news_title);
    }
    winners.set(row.story_id, {
      ...(winners.get(row.story_id) ?? {}),
      [row.platform]: {
        draftId: row.id,
        draftText: row.model_call_id ? (modelCalls.get(row.model_call_id)?.output ?? "") : null,
        postedAt: row.posted_at,
        postingClaimedAt: row.posting_claimed_at,
        postedUrl: row.posted_url,
        body: storyBodyOf(row.news_points, row.news_synthesis),
        versionCount: row.model_call_id ? versionCount(row.id) : 0,
      },
    });
  }
  const primary = stories
    .map((story) => ({ story, source: sources.get(story.id)?.[0] }))
    .filter((entry): entry is { story: StoryRow; source: SourcePost } => {
      if (!entry.source)
        console.warn("Skipping orphaned feed story", { agentId, storyId: entry.story.id });
      return Boolean(entry.source);
    });
  // Reporter-facing site labels are resolved through the delivery's config lineage, never by
  // hostname. The agent filter prevents another desk's config from affecting this feed; absent
  // lineage (including configs deleted with ON DELETE SET NULL) keeps the hostname fallback.
  // Non-fatal on error: a missing label must never take the feed down with it.
  const siteNamesByConfigId = new Map<string, string>();
  {
    const { data, error } = await supabase
      .from("source_configs")
      .select("id, display_name")
      .eq("agent_id", agentId);
    if (error) console.error("fetchFeedPage: source_configs label read failed", error);
    for (const row of data ?? []) {
      if (row.display_name) siteNamesByConfigId.set(row.id, row.display_name);
    }
  }
  const tweets = await Promise.all(
    primary.map(({ source }) => (source.x_post_id ? getCachedTweet(source.x_post_id) : undefined)),
  );
  return primary.map(({ story, source }, index) => {
    const lookup = tweets[index];
    const kind = source.source === "x" ? "x" : source.text ? "article" : "headline";
    const host = hostname(source.url);
    const sourceView: FeedSourceView = {
      kind,
      authorHandle: source.author_handle,
      siteName:
        kind === "x"
          ? null
          : ((source.source_config_id
              ? siteNamesByConfigId.get(source.source_config_id)
              : undefined) ?? host),
      siteDomain: kind === "x" ? null : hostname(source.url),
      url:
        kind === "x" && source.x_post_id && source.author_handle
          ? `https://x.com/${source.author_handle}/status/${source.x_post_id}`
          : source.url,
      postedAt: source.posted_at,
      gone: lookup?.state === "gone",
      fresh: Date.now() - new Date(source.posted_at ?? story.created_at).getTime() < 3_600_000,
    };
    const storyWinners = winners.get(story.id) ?? {};
    const sourceAvailable = Boolean(sourceView.url && !sourceView.gone);
    const sourceAwareWinners: FeedItem["winners"] = {};
    for (const [platform, draft] of Object.entries(storyWinners)) {
      if (!draft) continue;
      sourceAwareWinners[platform as Platform] =
        draft.body.kind === "unavailable"
          ? { ...draft, body: { ...draft.body, sourceAvailable } }
          : draft;
    }
    return {
      storyId: story.id,
      createdAt: story.created_at,
      // Owner decision: no fallback to stories.summary — a null title renders the literal
      // placeholder. The 100-post replay backfills real titles for recent history; anything
      // older shows the placeholder.
      newsTitle: titleByStory.get(story.id) ?? "NO TITLE",
      source: sourceView,
      winners: sourceAwareWinners,
    };
  });
}

export async function fetchFeedPage(
  supabase: Client,
  agentId: string,
  opts: { cursor?: FeedCursor | null; limit?: number } = {},
): Promise<FeedPage> {
  const limit = Math.max(1, Math.min(opts.limit ?? FEED_PAGE_SIZE, FEED_REFRESH_CHUNK));
  const cursor = isFeedCursor(opts.cursor) ? opts.cursor : null;
  // A card exists once an on-beat story has landed as a winner row, drafted or not.
  const winners = await winnerIds(supabase, agentId);

  let cursorValue: FeedCursor | null = cursor;
  let nextCursor: FeedCursor | null = cursor;
  const rows: StoryRow[] = [];

  for (let iteration = 0; iteration < 4 && rows.length < limit; iteration++) {
    const page = await rawPage(supabase, agentId, cursorValue, Math.max(50, limit));
    const kept = page.rows.filter((row) => winners.has(row.id)).slice(0, limit - rows.length);
    rows.push(...kept);

    if (rows.length >= limit && rows.at(-1)) {
      const last = rows.at(-1);
      if (last) nextCursor = cursorFor(last);
      break;
    }

    nextCursor = page.nextCursor;
    if (!page.nextCursor) break;

    cursorValue = page.nextCursor;
  }

  return { items: await hydrate(supabase, agentId, rows), nextCursor };
}

export async function fetchFeedCounts(supabase: Client, agentId: string) {
  const [{ count, error }, winners, confirmed] = await Promise.all([
    supabase.from("stories").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
    winnerIds(supabase, agentId),
    confirmedIds(supabase, agentId),
  ]);
  if (error) throw error;
  return {
    totalStories: count ?? 0,
    readyToReview: [...winners].filter((id) => !confirmed.has(id)).length,
  };
}
