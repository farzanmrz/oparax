import "server-only";

// lib/feed/public-query.ts
//
// Data layer for the PUBLIC feed page (/feed/[handle]) — no auth, no session. Reads run on the
// service-role client with an explicit column allowlist; nothing new is exposed to anon. One
// story renders once with every contributing source post (identity + posted time, oldest →
// newest inside the cluster); the per-story alert flag comes from `alerts`; DM state comes
// from `dm_connections` (the ONE source of truth) by join.

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/** How far back the feed reaches. */
const FEED_WINDOW_HOURS = 48;
/** Hard cap on stories the page will ever serve. */
const FEED_STORY_CAP = 200;
export const PUBLIC_FEED_PAGE_SIZE = 25;
const TRIAL_DAYS = 7;

export type PublicFeedSource = {
  kind: "x" | "website";
  /** "@handle" for X, the site name/hostname for websites — already display-ready. */
  label: string;
  url: string | null;
  postedAt: string | null;
};

export type PublicFeedStory = {
  storyId: string;
  /** When the story landed on the desk (the winner's created_at). */
  landedAt: string;
  title: string;
  points: string[];
  sources: PublicFeedSource[];
  alerted: boolean;
};

export type PublicFeedConnectionState = "none" | "pending" | "active" | "stopped" | "trial_expired";

export type PublicFeedData = {
  agent: {
    id: string;
    name: string | null;
    beat: string;
    publicHandle: string;
  };
  stories: PublicFeedStory[];
  /** Pass back as ?before= for the next page; null when the window is exhausted. */
  nextBefore: string | null;
  /** Source labels with their last-24h story counts, for the rail-as-filter. */
  sourceCounts: { label: string; count: number }[];
  connectionState: PublicFeedConnectionState;
  trialEnded: boolean;
};

function hostnameOf(url: string | null): string | null {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

function pointsOf(newsPoints: unknown): string[] {
  if (!Array.isArray(newsPoints)) return [];
  return newsPoints.flatMap((entry) => {
    const point =
      entry !== null && typeof entry === "object" ? (entry as Record<string, unknown>).point : null;
    return typeof point === "string" && point.trim() ? [point] : [];
  });
}

export async function fetchPublicAgent(
  admin: AdminClient,
  handle: string,
): Promise<PublicFeedData["agent"] | null> {
  const normalized = handle.trim().replace(/^@/, "").toLowerCase();
  if (!normalized) return null;
  const { data, error } = await admin
    .from("agents")
    .select("id, name, beat, public_handle")
    .eq("public_handle", normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data?.public_handle) return null;
  return { id: data.id, name: data.name, beat: data.beat, publicHandle: data.public_handle };
}

export async function fetchPublicFeed(
  admin: AdminClient,
  handle: string,
  opts: { before?: string | null; limit?: number } = {},
): Promise<PublicFeedData | null> {
  const agent = await fetchPublicAgent(admin, handle);
  if (!agent) return null;

  const limit = Math.max(1, Math.min(opts.limit ?? PUBLIC_FEED_PAGE_SIZE, PUBLIC_FEED_PAGE_SIZE));
  const windowStart = new Date(Date.now() - FEED_WINDOW_HOURS * 3_600_000).toISOString();
  const beforeMs = opts.before ? Date.parse(opts.before) : Number.NaN;
  const before = Number.isNaN(beforeMs) ? null : new Date(beforeMs).toISOString();

  let winnersQuery = admin
    .from("drafts")
    .select("story_id, news_title, news_points, created_at")
    .eq("agent_id", agent.id)
    .eq("is_winner", true)
    .not("story_id", "is", null)
    .gt("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit + 1, FEED_STORY_CAP));
  if (before) winnersQuery = winnersQuery.lt("created_at", before);
  const { data: winners, error: winnersError } = await winnersQuery;
  if (winnersError) throw winnersError;

  const pageWinners = (winners ?? []).slice(0, limit);
  const hasMore = (winners ?? []).length > limit;
  const storyIds = pageWinners.map((row) => row.story_id).filter((id): id is string => id !== null);

  const [assignmentsResult, alertsResult, connectionResult, trialResult] = await Promise.all([
    storyIds.length
      ? admin
          .from("story_assignments")
          .select("story_id, source_post_id, created_at")
          .eq("agent_id", agent.id)
          .in("story_id", storyIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    storyIds.length
      ? admin
          .from("alerts")
          .select("story_id")
          .eq("agent_id", agent.id)
          .eq("status", "sent")
          .in("story_id", storyIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("dm_connections")
      .select("state")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("agents").select("trial_started_at, plan").eq("id", agent.id).maybeSingle(),
  ]);
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (alertsResult.error) throw alertsResult.error;
  if (connectionResult.error) throw connectionResult.error;
  if (trialResult.error) throw trialResult.error;

  const assignments = assignmentsResult.data ?? [];
  const sourcePostIds = [...new Set(assignments.map((row) => row.source_post_id))];
  const sourcePosts = new Map<
    string,
    {
      id: string;
      author_handle: string | null;
      posted_at: string | null;
      x_post_id: string | null;
      source: string;
      source_config_id: string | null;
      url: string | null;
    }
  >();
  for (let i = 0; i < sourcePostIds.length; i += 150) {
    const part = sourcePostIds.slice(i, i + 150);
    const { data, error } = await admin
      .from("source_posts")
      .select("id, author_handle, posted_at, x_post_id, source, source_config_id, url")
      .in("id", part);
    if (error) throw error;
    for (const post of data ?? []) sourcePosts.set(post.id, post);
  }

  // Website display names come from this desk's config lineage, like the app feed.
  const siteNames = new Map<string, string>();
  {
    const { data, error } = await admin
      .from("source_configs")
      .select("id, display_name")
      .eq("agent_id", agent.id);
    if (error) console.error("public-query: source_configs label read failed", error);
    for (const row of data ?? []) {
      if (row.display_name) siteNames.set(row.id, row.display_name);
    }
  }

  const alertedStoryIds = new Set((alertsResult.data ?? []).map((row) => row.story_id));

  const sourcesByStory = new Map<string, PublicFeedSource[]>();
  for (const assignment of assignments) {
    const post = sourcePosts.get(assignment.source_post_id);
    if (!post) continue;
    const isX = post.source === "x";
    const source: PublicFeedSource = {
      kind: isX ? "x" : "website",
      label: isX
        ? post.author_handle
          ? `@${post.author_handle}`
          : "X source"
        : ((post.source_config_id ? siteNames.get(post.source_config_id) : undefined) ??
          hostnameOf(post.url) ??
          "News source"),
      url:
        isX && post.x_post_id && post.author_handle
          ? `https://x.com/${post.author_handle}/status/${post.x_post_id}`
          : post.url,
      postedAt: post.posted_at,
    };
    sourcesByStory.set(assignment.story_id, [
      ...(sourcesByStory.get(assignment.story_id) ?? []),
      source,
    ]);
  }

  const stories: PublicFeedStory[] = pageWinners.flatMap((winner) => {
    if (!winner.story_id) return [];
    return [
      {
        storyId: winner.story_id,
        landedAt: winner.created_at,
        title: winner.news_title?.trim() || "Untitled story",
        points: pointsOf(winner.news_points),
        sources: sourcesByStory.get(winner.story_id) ?? [],
        alerted: alertedStoryIds.has(winner.story_id),
      },
    ];
  });

  // Per-source counts over the last 24 hours, computed from the fetched window.
  const dayStart = Date.now() - 24 * 3_600_000;
  const counts = new Map<string, number>();
  for (const story of stories) {
    if (Date.parse(story.landedAt) < dayStart) continue;
    const seen = new Set<string>();
    for (const source of story.sources) {
      if (seen.has(source.label)) continue;
      seen.add(source.label);
      counts.set(source.label, (counts.get(source.label) ?? 0) + 1);
    }
  }

  const connectionState: PublicFeedConnectionState =
    (connectionResult.data?.state as PublicFeedConnectionState | undefined) ?? "none";
  const trial = trialResult.data;
  const trialEnded = Boolean(
    trial &&
      !trial.plan &&
      trial.trial_started_at &&
      Date.now() - Date.parse(trial.trial_started_at) >= TRIAL_DAYS * 24 * 3_600_000,
  );

  const last = pageWinners.at(-1);
  return {
    agent,
    stories,
    nextBefore: hasMore && last ? last.created_at : null,
    sourceCounts: [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    connectionState,
    trialEnded,
  };
}
