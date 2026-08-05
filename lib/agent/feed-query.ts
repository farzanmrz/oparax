import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchTweet } from "react-tweet/api";
import { PLATFORMS, type Platform } from "@/lib/agent/desk-config";
import {
  FEED_PAGE_SIZE,
  FEED_REFRESH_CHUNK,
  type FeedCursor,
  type FeedFilterState,
  type FeedItem,
  type FeedPage,
  type FeedSourceView,
  isFeedCursor,
} from "@/lib/agent/feed-shared";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export const FEED_ID_CHUNK = 150;
// Genuine ceiling on ids accumulated across .range() pages (see pagedRows below), not a
// per-request row count — hosted Supabase's db-max-rows default (1000) is what forced the
// paging in the first place. Beyond this many ids, older history degrades gracefully.
export const FEED_FILTER_ID_CAP = 20000;
const FEED_ID_PAGE_SIZE = 1000;

type StoryRow = { id: string; summary: string; created_at: string };
type SourcePost = {
  id: string;
  author_handle: string | null;
  text: string;
  posted_at: string | null;
  x_post_id: string | null;
  source: string;
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
  model_call_id: string;
  synthesis: string | null;
};

function escapeLike(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
function chunks<T>(values: T[]): T[][] {
  return Array.from({ length: Math.ceil(values.length / FEED_ID_CHUNK) }, (_, i) =>
    values.slice(i * FEED_ID_CHUNK, (i + 1) * FEED_ID_CHUNK),
  );
}
/**
 * Pages an unbounded id-set select with .range() so results stay complete regardless of a
 * PostgREST db-max-rows cap (hosted Supabase defaults to 1000, which would otherwise clip a
 * single .select() and silently misclassify older history). Stops at a short page, or once
 * FEED_FILTER_ID_CAP ids have accumulated, whichever comes first.
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
    if (rows.length >= FEED_FILTER_ID_CAP) {
      console.warn("feed filter id collection exceeded memory guard", {
        agentId,
        count: rows.length,
      });
      break;
    }
  }
  return rows;
}
function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
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
    return url ? new URL(url).hostname : null;
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
async function assignmentMatches(supabase: Client, agentId: string, pattern: string) {
  const assignments = await pagedRows<{ story_id: string; source_post_id: string }>(
    agentId,
    (from, to) =>
      supabase
        .from("story_assignments")
        .select("story_id, source_post_id")
        .eq("agent_id", agentId)
        .order("id", { ascending: true })
        .range(from, to),
  );
  const matches = new Set<string>();
  for (const part of chunks(assignments.map((row) => row.source_post_id))) {
    if (!part.length) continue;
    const query = supabase
      .from("source_posts")
      .select("id")
      .in("id", part)
      .ilike("author_handle", pattern);
    const { data: sources, error: sourceError } = await query;
    if (sourceError) throw sourceError;
    const sourceIds = new Set((sources ?? []).map((row) => row.id));
    for (const assignment of assignments)
      if (sourceIds.has(assignment.source_post_id)) matches.add(assignment.story_id);
  }
  return matches;
}
async function includeIds(supabase: Client, agentId: string, filters: FeedFilterState) {
  const sets: Set<string>[] = [];
  if (filters.account)
    sets.push(await assignmentMatches(supabase, agentId, escapeLike(filters.account)));
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    const [stories, syntheses, draftRows, authors] = await Promise.all([
      pagedRows<{ id: string }>(agentId, (from, to) =>
        supabase
          .from("stories")
          .select("id")
          .eq("agent_id", agentId)
          .ilike("summary", pattern)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      pagedRows<{ story_id: string | null }>(agentId, (from, to) =>
        supabase
          .from("drafts")
          .select("story_id")
          .eq("agent_id", agentId)
          .eq("is_winner", true)
          .ilike("synthesis", pattern)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      pagedRows<{ story_id: string | null; model_call_id: string | null }>(agentId, (from, to) =>
        supabase
          .from("drafts")
          .select("story_id, model_call_id")
          .eq("agent_id", agentId)
          .eq("is_winner", true)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      assignmentMatches(supabase, agentId, pattern),
    ]);
    const qIds = new Set<string>([
      ...stories.map((r) => r.id),
      ...syntheses.map((r) => r.story_id).filter((id): id is string => Boolean(id)),
      ...authors,
    ]);
    const pairs = draftRows.filter((r) => r.story_id && r.model_call_id) as {
      story_id: string;
      model_call_id: string;
    }[];
    for (const part of chunks(pairs.map((row) => row.model_call_id))) {
      if (!part.length) continue;
      const { data, error } = await supabase
        .from("model_calls")
        .select("id")
        .in("id", part)
        .ilike("output", pattern);
      if (error) throw error;
      const matching = new Set((data ?? []).map((row) => row.id));
      for (const pair of pairs) if (matching.has(pair.model_call_id)) qIds.add(pair.story_id);
    }
    sets.push(qIds);
  }
  if (!sets.length) return null;
  let result = sets[0];
  for (const set of sets.slice(1)) result = new Set([...result].filter((id) => set.has(id)));
  if (result.size > FEED_FILTER_ID_CAP)
    console.warn("feed filter id collection exceeded memory guard", {
      agentId,
      count: result.size,
    });
  return result;
}
function rootQuery(
  supabase: Client,
  agentId: string,
  filters: FeedFilterState,
  cursor: FeedCursor | null,
  limit: number,
  ids?: string[],
) {
  let query = supabase
    .from("stories")
    .select("id, summary, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lt("created_at", filters.to);
  if (cursor) query = query.or(cursorClause(cursor));
  return ids ? query.in("id", ids) : query;
}
async function rawPage(
  supabase: Client,
  agentId: string,
  filters: FeedFilterState,
  cursor: FeedCursor | null,
  limit: number,
  ids: Set<string> | null,
) {
  const requests = ids
    ? chunks([...ids]).map((part) => rootQuery(supabase, agentId, filters, cursor, limit, part))
    : [rootQuery(supabase, agentId, filters, cursor, limit)];
  const pages = await Promise.all(requests);
  for (const page of pages) if (page.error) throw page.error;
  const rows = pages.flatMap((page) => page.data ?? []) as StoryRow[];
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
        "id, story_id, platform, posted_at, posting_claimed_at, posted_url, model_call_id, synthesis",
      )
      .eq("agent_id", agentId)
      .in("story_id", storyIds)
      .eq("is_winner", true)
      .order("created_at", { ascending: true }),
  ]);
  if (assignmentResult.error || winnerResult.error)
    throw assignmentResult.error ?? winnerResult.error;
  const assignments = (assignmentResult.data ?? []) as unknown as AssignmentRow[];
  const winnerRows = (winnerResult.data ?? []) as WinnerRow[];
  const modelCalls = new Map<string, { output: string | null }>();
  for (const part of chunks(winnerRows.map((row) => row.model_call_id))) {
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
      .select("id, author_handle, text, posted_at, x_post_id, source, url")
      .in("id", part);
    if (error) throw error;
    for (const post of data ?? []) sourcePosts.set(post.id, post);
  }
  const sources = new Map<string, SourcePost[]>();
  for (const assignment of assignments) {
    const post = sourcePosts.get(assignment.source_post_id);
    if (post) sources.set(assignment.story_id, [...(sources.get(assignment.story_id) ?? []), post]);
  }
  const winners = new Map<string, FeedItem["winners"]>();
  for (const row of winnerRows) {
    if (!row.story_id || !isPlatform(row.platform)) continue;
    winners.set(row.story_id, {
      ...(winners.get(row.story_id) ?? {}),
      [row.platform]: {
        draftId: row.id,
        text: modelCalls.get(row.model_call_id)?.output ?? "",
        postedAt: row.posted_at,
        postingClaimedAt: row.posting_claimed_at,
        postedUrl: row.posted_url,
        synthesis: row.synthesis,
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
  const tweets = await Promise.all(
    primary.map(({ source }) => (source.x_post_id ? getCachedTweet(source.x_post_id) : undefined)),
  );
  return primary.map(({ story, source }, index) => {
    const lookup = tweets[index];
    const kind = source.source === "x" ? "x" : source.text ? "article" : "headline";
    const sourceView: FeedSourceView = {
      kind,
      authorHandle: source.author_handle,
      siteName: kind === "x" ? null : hostname(source.url),
      url:
        kind === "x" && source.x_post_id && source.author_handle
          ? `https://x.com/${source.author_handle}/status/${source.x_post_id}`
          : source.url,
      postedAt: source.posted_at,
      gone: lookup?.state === "gone",
    };
    return {
      storyId: story.id,
      createdAt: story.created_at,
      headline: story.summary,
      source: sourceView,
      winners: winners.get(story.id) ?? {},
    };
  });
}

export async function fetchFeedPage(
  supabase: Client,
  agentId: string,
  opts: { filters: FeedFilterState; cursor?: FeedCursor | null; limit?: number },
): Promise<FeedPage> {
  const limit = Math.max(1, Math.min(opts.limit ?? FEED_PAGE_SIZE, FEED_REFRESH_CHUNK));
  const cursor = isFeedCursor(opts.cursor) ? opts.cursor : null;
  const include = await includeIds(supabase, agentId, opts.filters);
  if (include?.size === 0) return { items: [], nextCursor: null };
  const needConfirmed = opts.filters.status === "posted" || opts.filters.status === "pending";
  const confirmed = needConfirmed ? await confirmedIds(supabase, agentId) : null;
  const needWinners = opts.filters.status === "all" || opts.filters.status === "pending";
  const winners = needWinners ? await winnerIds(supabase, agentId) : null;

  async function walkPage(
    keep: (row: StoryRow) => boolean,
  ): Promise<{ rows: StoryRow[]; nextCursor: FeedCursor | null }> {
    let cursorValue: FeedCursor | null = cursor;
    let nextCursor: FeedCursor | null = cursor;
    const rows: StoryRow[] = [];

    for (let iteration = 0; iteration < 4 && rows.length < limit; iteration++) {
      const page = await rawPage(
        supabase,
        agentId,
        opts.filters,
        cursorValue,
        Math.max(50, limit),
        include,
      );
      const kept = page.rows.filter(keep).slice(0, limit - rows.length);
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

    return { rows, nextCursor };
  }

  if (opts.filters.status === "all") {
    if (!winners) return { items: [], nextCursor: null };
    const page = await walkPage((row) => winners.has(row.id));
    return { items: await hydrate(supabase, agentId, page.rows), nextCursor: page.nextCursor };
  }

  if (opts.filters.status === "pending") {
    if (!confirmed || !winners) return { items: [], nextCursor: null };
    const page = await walkPage((row) => winners.has(row.id) && !confirmed.has(row.id));
    return { items: await hydrate(supabase, agentId, page.rows), nextCursor: page.nextCursor };
  }

  if (opts.filters.status === "posted") {
    if (!confirmed) return { items: [], nextCursor: null };
    const page = await walkPage((row) => confirmed.has(row.id));
    return { items: await hydrate(supabase, agentId, page.rows), nextCursor: page.nextCursor };
  }

  const page = await walkPage(() => true);
  return { items: await hydrate(supabase, agentId, page.rows), nextCursor: page.nextCursor };
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
