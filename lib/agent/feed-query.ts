import type { Tweet } from "react-tweet/api";
import { fetchTweet } from "react-tweet/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORMS, type Platform } from "@/lib/agent/desk-config";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export const FEED_PAGE_SIZE = 25;
export const FEED_ID_CHUNK = 150;
export const FEED_REFRESH_CHUNK = 100;
export const FEED_REFRESH_MAX_CHUNKS = 5;
export const FEED_FILTER_ID_CAP = 1000;

export type FeedStatusFilter = "all" | "pending" | "posted";
export type FeedFilterState = {
  status: FeedStatusFilter;
  account: string | null;
  from: string | null;
  to: string | null;
  q: string | null;
};
export type FeedCursor = { createdAt: string; id: string };
export type FeedDraft = {
  draftId: string;
  text: string;
  model: string;
  createdAt: string;
  postedAt: string | null;
  postedUrl: string | null;
  synthesis: string | null;
  translation: string | null;
  judgeNotes: string | null;
  correctedFields: string[];
};
export type FeedSourceView = {
  kind: "x" | "article" | "headline";
  id: string;
  authorHandle: string | null;
  authorName: string | null;
  siteName: string | null;
  faviconUrl: string | null;
  title: string | null;
  url: string | null;
  postedAt: string | null;
  text: string;
  lang: string | null;
  gone: boolean;
  avatarUrl: string | null;
  mediaUrls: string[];
  mediaThumbs: { thumbUrl: string; kind: "photo" | "video" }[];
  urlEntities: { url: string; expanded_url: string; display_url: string }[];
};
export type FeedItem = {
  storyId: string;
  createdAt: string;
  headline: string;
  summary: string;
  source: FeedSourceView;
  extraSourceCount: number;
  winners: Partial<Record<Platform, FeedDraft>>;
  councilMemberCount: number;
};
export type FeedPage = { items: FeedItem[]; nextCursor: FeedCursor | null };

type StoryRow = { id: string; summary: string; created_at: string };
type SourcePost = {
  id: string; author_handle: string | null; text: string; posted_at: string | null;
  x_post_id: string | null; raw: unknown; source: string; title: string | null; url: string | null;
};
type AssignmentRow = { story_id: string; source_posts: SourcePost | null };
type WinnerRow = {
  id: string; story_id: string | null; platform: string; posted_at: string | null;
  posted_url: string | null; created_at: string; model_call_id: string; synthesis: string | null;
  translation: string | null; judge_review: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const canonicalIso = (value: string | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value ? value : null;
};

export function parseFeedFilters(sp: Record<string, string | string[] | undefined>): FeedFilterState {
  const status = first(sp.status);
  const account = first(sp.account)?.trim() || null;
  const q = first(sp.q)?.trim() || null;
  return {
    status: status === "pending" || status === "posted" ? status : "all",
    account,
    from: canonicalIso(first(sp.from)),
    to: canonicalIso(first(sp.to)),
    q: q && q.length >= 2 ? q : null,
  };
}
export function feedFilterKey(filters: FeedFilterState) { return JSON.stringify(filters); }
export function hasActiveFilters(filters: FeedFilterState) {
  return filters.status !== "all" || Boolean(filters.account || filters.from || filters.to || filters.q);
}
export function isFeedCursor(value: FeedCursor | null | undefined): value is FeedCursor {
  return Boolean(value && canonicalIso(value.createdAt) === value.createdAt && UUID.test(value.id));
}
function escapeLike(value: string) { return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_"); }
function chunks<T>(values: T[]): T[][] { return Array.from({ length: Math.ceil(values.length / FEED_ID_CHUNK) }, (_, i) => values.slice(i * FEED_ID_CHUNK, (i + 1) * FEED_ID_CHUNK)); }
function isPlatform(value: string): value is Platform { return (PLATFORMS as readonly string[]).includes(value); }
function compareStories(a: StoryRow, b: StoryRow) { return b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id); }
function cursorFor(row: StoryRow): FeedCursor { return { createdAt: row.created_at, id: row.id }; }
function cursorClause(cursor: FeedCursor) { return `created_at.lt.\"${cursor.createdAt}\",and(created_at.eq.\"${cursor.createdAt}\",id.lt.${cursor.id})`; }
function authorName(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const users = (raw as { includes?: { users?: unknown[] } }).includes?.users;
  const name = Array.isArray(users) ? (users[0] as { name?: unknown } | undefined)?.name : null;
  return typeof name === "string" && name.length ? name : null;
}
function rawLang(raw: unknown) {
  const lang = raw && typeof raw === "object" ? (raw as { data?: { lang?: unknown } }).data?.lang : null;
  return typeof lang === "string" ? lang : null;
}
function hostname(url: string | null) { try { return url ? new URL(url).hostname : null; } catch { return null; } }

/** Fetch-level cache only: unstable_cache makes Turbopack downgrade this server render. */
async function getCachedTweet(id: string): Promise<Tweet | undefined> {
  try { return (await fetchTweet(id, { next: { revalidate: 60 * 60 * 24 } } as RequestInit)).data; } catch { return undefined; }
}

async function confirmedIds(supabase: Client, agentId: string) {
  const { data, error } = await supabase.from("drafts").select("story_id").eq("agent_id", agentId).eq("is_winner", true).eq("platform", "x").not("posted_at", "is", null).not("posted_url", "is", null);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.story_id).filter((id): id is string => Boolean(id)));
}
async function winnerIds(supabase: Client, agentId: string) {
  const { data, error } = await supabase.from("drafts").select("story_id").eq("agent_id", agentId).eq("is_winner", true);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.story_id).filter((id): id is string => Boolean(id)));
}
async function assignmentMatches(supabase: Client, agentId: string, pattern: string, exact = false) {
  const { data, error } = await supabase.from("story_assignments").select("story_id, source_post_id").eq("agent_id", agentId);
  if (error) throw error;
  const assignments = data ?? [];
  const matches = new Set<string>();
  for (const part of chunks(assignments.map((row) => row.source_post_id))) {
    if (!part.length) continue;
    let query = supabase.from("source_posts").select("id").in("id", part).ilike("author_handle", pattern);
    const { data: sources, error: sourceError } = await query;
    if (sourceError) throw sourceError;
    const sourceIds = new Set((sources ?? []).map((row) => row.id));
    for (const assignment of assignments) if (sourceIds.has(assignment.source_post_id)) matches.add(assignment.story_id);
  }
  return matches;
}
async function includeIds(supabase: Client, agentId: string, filters: FeedFilterState) {
  const sets: Set<string>[] = [];
  if (filters.account) sets.push(await assignmentMatches(supabase, agentId, escapeLike(filters.account), true));
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    const [stories, syntheses, draftRows, authors] = await Promise.all([
      supabase.from("stories").select("id").eq("agent_id", agentId).ilike("summary", pattern),
      supabase.from("drafts").select("story_id").eq("agent_id", agentId).eq("is_winner", true).ilike("synthesis", pattern),
      supabase.from("drafts").select("story_id, model_call_id").eq("agent_id", agentId).eq("is_winner", true),
      assignmentMatches(supabase, agentId, pattern),
    ]);
    if (stories.error || syntheses.error || draftRows.error) throw stories.error ?? syntheses.error ?? draftRows.error;
    const qIds = new Set<string>([...(stories.data ?? []).map((r) => r.id), ...(syntheses.data ?? []).map((r) => r.story_id).filter((id): id is string => Boolean(id)), ...authors]);
    const pairs = (draftRows.data ?? []).filter((r) => r.story_id && r.model_call_id) as { story_id: string; model_call_id: string }[];
    for (const part of chunks(pairs.map((row) => row.model_call_id))) {
      if (!part.length) continue;
      const { data, error } = await supabase.from("model_calls").select("id").in("id", part).ilike("output", pattern);
      if (error) throw error;
      const matching = new Set((data ?? []).map((row) => row.id));
      for (const pair of pairs) if (matching.has(pair.model_call_id)) qIds.add(pair.story_id);
    }
    sets.push(qIds);
  }
  if (!sets.length) return null;
  let result = sets[0];
  for (const set of sets.slice(1)) result = new Set([...result].filter((id) => set.has(id)));
  if (result.size > FEED_FILTER_ID_CAP) console.warn("feed filter id collection exceeded memory guard", { agentId, count: result.size });
  return result;
}
function rootQuery(supabase: Client, agentId: string, filters: FeedFilterState, cursor: FeedCursor | null, limit: number, ids?: string[]) {
  let query = supabase.from("stories").select("id, summary, created_at").eq("agent_id", agentId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lt("created_at", filters.to);
  if (cursor) query = query.or(cursorClause(cursor));
  return ids ? query.in("id", ids) : query;
}
async function rawPage(supabase: Client, agentId: string, filters: FeedFilterState, cursor: FeedCursor | null, limit: number, ids: Set<string> | null) {
  const requests = ids ? chunks([...ids]).map((part) => rootQuery(supabase, agentId, filters, cursor, limit, part)) : [rootQuery(supabase, agentId, filters, cursor, limit)];
  const pages = await Promise.all(requests);
  for (const page of pages) if (page.error) throw page.error;
  const rows = pages.flatMap((page) => page.data ?? []) as StoryRow[];
  const sorted = rows.sort(compareStories).slice(0, limit);
  return { rows: sorted, nextCursor: sorted.length === limit ? cursorFor(sorted.at(-1)!) : null };
}
async function hydrate(supabase: Client, agentId: string, stories: StoryRow[]): Promise<FeedItem[]> {
  if (!stories.length) return [];
  const storyIds = stories.map((story) => story.id);
  const [assignmentResult, winnerResult, councilResult] = await Promise.all([
    supabase.from("story_assignments").select("story_id, source_posts(id, author_handle, text, posted_at, x_post_id, raw, source, title, url)").eq("agent_id", agentId).in("story_id", storyIds).order("created_at", { ascending: true }),
    supabase.from("drafts").select("id, story_id, platform, posted_at, posted_url, created_at, model_call_id, synthesis, translation, judge_review").eq("agent_id", agentId).in("story_id", storyIds).eq("is_winner", true).order("created_at", { ascending: true }),
    supabase.from("drafts").select("story_id, parent_draft_id, judge_verdict").eq("agent_id", agentId).in("story_id", storyIds),
  ]);
  if (assignmentResult.error || winnerResult.error || councilResult.error) throw assignmentResult.error ?? winnerResult.error ?? councilResult.error;
  const assignments = (assignmentResult.data ?? []) as unknown as AssignmentRow[];
  const winnerRows = (winnerResult.data ?? []) as WinnerRow[];
  const modelCalls = new Map<string, { model: string; output: string | null }>();
  for (const part of chunks(winnerRows.map((row) => row.model_call_id))) {
    if (!part.length) continue;
    const { data, error } = await supabase.from("model_calls").select("id, model, output").in("id", part);
    if (error) throw error;
    for (const call of data ?? []) modelCalls.set(call.id, call);
  }
  const sources = new Map<string, SourcePost[]>();
  for (const assignment of assignments) if (assignment.source_posts) sources.set(assignment.story_id, [...(sources.get(assignment.story_id) ?? []), assignment.source_posts]);
  const winners = new Map<string, FeedItem["winners"]>();
  for (const row of winnerRows) {
    if (!row.story_id || !isPlatform(row.platform)) continue;
    const review = row.judge_review && typeof row.judge_review === "object" ? row.judge_review as { judgeNotes?: unknown; correctedFields?: unknown } : {};
    winners.set(row.story_id, { ...(winners.get(row.story_id) ?? {}), [row.platform]: { draftId: row.id, text: modelCalls.get(row.model_call_id)?.output ?? "", model: modelCalls.get(row.model_call_id)?.model ?? "unknown", createdAt: row.created_at, postedAt: row.posted_at, postedUrl: row.posted_url, synthesis: row.synthesis, translation: row.translation, judgeNotes: typeof review.judgeNotes === "string" ? review.judgeNotes : null, correctedFields: Array.isArray(review.correctedFields) ? review.correctedFields.filter((field): field is string => typeof field === "string") : [] } });
  }
  const councils = new Map<string, number>();
  for (const row of councilResult.data ?? []) if (row.story_id && row.parent_draft_id === null && row.judge_verdict === null) councils.set(row.story_id, (councils.get(row.story_id) ?? 0) + 1);
  const primary = stories.map((story) => ({ story, source: sources.get(story.id)?.[0] })).filter((entry): entry is { story: StoryRow; source: SourcePost } => {
    if (!entry.source) console.warn("Skipping orphaned feed story", { agentId, storyId: entry.story.id });
    return Boolean(entry.source);
  });
  const tweets = await Promise.all(primary.map(({ source }) => source.x_post_id ? getCachedTweet(source.x_post_id) : undefined));
  return primary.map(({ story, source }, index) => {
    const tweet = tweets[index];
    const kind = source.source === "x" ? "x" : source.text ? "article" : "headline";
    const media = tweet?.mediaDetails?.slice(0, 4) ?? [];
    const sourceView: FeedSourceView = { kind, id: source.id, authorHandle: source.author_handle, authorName: authorName(source.raw), siteName: kind === "x" ? null : hostname(source.url), faviconUrl: null, title: source.title, url: kind === "x" && source.x_post_id && source.author_handle ? `https://x.com/${source.author_handle}/status/${source.x_post_id}` : source.url, postedAt: source.posted_at, text: source.text, lang: tweet?.lang ?? rawLang(source.raw), gone: Boolean(source.x_post_id) && !tweet, avatarUrl: tweet?.user.profile_image_url_https?.startsWith("data:") ? null : tweet?.user.profile_image_url_https ?? null, mediaUrls: tweet?.entities?.media?.map((entry) => entry.url) ?? [], mediaThumbs: media.map((entry) => ({ thumbUrl: `${entry.media_url_https}?name=small`, kind: entry.type === "photo" ? "photo" as const : "video" as const })), urlEntities: tweet?.entities?.urls ?? [] };
    return { storyId: story.id, createdAt: story.created_at, headline: source.title ?? story.summary, summary: story.summary, source: sourceView, extraSourceCount: (sources.get(story.id)?.length ?? 1) - 1, winners: winners.get(story.id) ?? {}, councilMemberCount: councils.get(story.id) ?? 0 };
  });
}

export async function fetchFeedPage(supabase: Client, agentId: string, opts: { filters: FeedFilterState; cursor?: FeedCursor | null; limit?: number }): Promise<FeedPage> {
  const limit = Math.max(1, Math.min(opts.limit ?? FEED_PAGE_SIZE, FEED_REFRESH_CHUNK));
  const cursor = isFeedCursor(opts.cursor) ? opts.cursor : null;
  const include = await includeIds(supabase, agentId, opts.filters);
  if (include?.size === 0) return { items: [], nextCursor: null };
  const confirmed = opts.filters.status === "all" ? null : await confirmedIds(supabase, agentId);
  if (opts.filters.status === "posted") {
    const ids = new Set([...include ?? [], ...(!include ? confirmed! : [])]);
    if (include) for (const id of ids) if (!confirmed!.has(id)) ids.delete(id);
    const page = await rawPage(supabase, agentId, opts.filters, cursor, limit, ids);
    return { items: await hydrate(supabase, agentId, page.rows), nextCursor: page.nextCursor };
  }
  if (opts.filters.status === "pending") {
    const rows: StoryRow[] = []; let walk = cursor; let nextCursor: FeedCursor | null = cursor;
    for (let iteration = 0; iteration < 4 && rows.length < limit; iteration++) {
      const page = await rawPage(supabase, agentId, opts.filters, walk, 50, include);
      rows.push(...page.rows.filter((row) => !confirmed!.has(row.id)).slice(0, limit - rows.length));
      nextCursor = page.nextCursor;
      if (!page.nextCursor) break;
      walk = page.nextCursor;
    }
    return { items: await hydrate(supabase, agentId, rows), nextCursor };
  }
  const page = await rawPage(supabase, agentId, opts.filters, cursor, limit, include);
  return { items: await hydrate(supabase, agentId, page.rows), nextCursor: page.nextCursor };
}

export async function fetchFeedCounts(supabase: Client, agentId: string) {
  const [{ count, error }, winners, confirmed] = await Promise.all([
    supabase.from("stories").select("id", { count: "exact", head: true }).eq("agent_id", agentId), winnerIds(supabase, agentId), confirmedIds(supabase, agentId),
  ]);
  if (error) throw error;
  return { totalStories: count ?? 0, readyToReview: [...winners].filter((id) => !confirmed.has(id)).length };
}
