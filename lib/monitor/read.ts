import "server-only";

import { cache } from "react";
import { z } from "zod";
import { feedStats, weekStart } from "@/lib/monitor/present";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

const profileSchema = z.object({
  name: z.string(),
  bio: z.string(),
  image: z.string().nullish(),
  site: z.string().nullish(),
});
const briefSchema = z.object({
  summary: z.string(),
  interests: z.array(z.string()),
  languages: z.array(z.string()),
  topic_terms: z.array(z.string()),
});
const cardSchema = z.object({
  headline: z.string(),
  facts: z.array(
    z.object({
      text: z.string(),
      support: z.number(),
      attribution: z.number(),
      evidence: z.array(z.object({ item: z.string(), span: z.string() })),
    }),
  ),
  publishers: z.array(z.object({ source_id: z.string(), name: z.string(), url: z.string() })),
  image: z.string().nullable(),
  headline_from: z.enum(["writer", "title", "first fact"]),
});
const authorSchema = z.object({ handle: z.string(), name: z.string() });
const logSchema = z.array(
  z.object({ step: z.number().int(), message: z.string(), at: z.string() }),
);
export type VerifiedCard = z.infer<typeof cardSchema>;
export type Profile = Omit<z.infer<typeof profileSchema>, "image" | "site"> & {
  image: string | null;
  site: string | null;
};
export type Brief = z.infer<typeof briefSchema>;
export type BuildLog = z.infer<typeof logSchema>;
export type PublicItem = Pick<
  Tables<"items">,
  "id" | "url" | "title" | "published_at" | "kind" | "lang" | "source_id"
> & {
  author: z.infer<typeof authorSchema> | null;
  publisher: string;
};
export type DisplayStory = Pick<
  Tables<"stories">,
  "id" | "fallback_title" | "last_changed_at" | "image" | "status"
> & {
  card: VerifiedCard | null;
  reports: PublicItem[];
};
export type DisplayItem = { item: PublicItem; card: VerifiedCard | null; score: number | null };

/** The stored X profile, checked; null when it is missing or malformed. */
export function profileOf(raw: unknown): Profile | null {
  const profile = profileSchema.safeParse(raw).data;
  return profile ? { ...profile, image: profile.image ?? null, site: profile.site ?? null } : null;
}

// Explicit columns keep payment identifiers, activation secrets and checkpoints off this surface.
const monitorColumns =
  "id,handle,display_handle,beat,profile,brief,status,build_step,build_tries,build_finished_at,user_id,tier,trial_started_at,paid_through,pool_limit,pool_used,pool_period_start,cadence,subscription_status,budget_exhausted_at,bot_state,digest_github,digest_product_hunt";
/** A source id as the tables store it: a table row id, web-host-hash, or x-handle. */
const sourceIdSchema = z.string().regex(/^[A-Za-z0-9_.:-]{1,300}$/);
const itemColumns = "id,url,title,published_at,kind,lang,source_id,author,sources(name)";
const storyColumns = "id,fallback_title,last_changed_at,image,status,card";

export const readMonitor = cache(async (rawHandle: string) => {
  const handle = normalizeValidHandle(rawHandle);
  if (!handle || isReservedHandle(handle)) return null;
  const { data, error } = await createAdminClient()
    .from("monitors")
    .select(monitorColumns)
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    profile: profileOf(data.profile),
    brief: briefSchema.safeParse(data.brief).data ?? null,
  };
});
export type PublicMonitor = NonNullable<Awaited<ReturnType<typeof readMonitor>>>;

export const readViewer = cache(async () => {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return { userId: user?.id ?? null, signedIn: !!user, email: user?.email ?? null };
});

function publicItem(
  item: Pick<
    Tables<"items">,
    "id" | "url" | "title" | "published_at" | "kind" | "lang" | "source_id" | "author"
  > & { sources: { name: string } | null },
): PublicItem {
  const { sources, author, ...fields } = item;
  return {
    ...fields,
    author: authorSchema.safeParse(author).data ?? null,
    publisher: sources?.name ?? "",
  };
}

export async function readBuildLog(monitorId: string): Promise<BuildLog> {
  const { data, error } = await createAdminClient()
    .from("monitors")
    .select("build_log")
    .eq("id", monitorId)
    .single();
  if (error) throw error;
  return logSchema.safeParse(data.build_log).data ?? [];
}

export async function readFeed(
  monitor: PublicMonitor,
  options: {
    before?: string;
    beforeId?: string;
    view?: string;
    storyId?: string;
    /** A source id from the feed's aside: only stories and articles with an item from it. */
    source?: string;
  } = {},
) {
  const db = createAdminClient();
  const source = sourceIdSchema.safeParse(options.source).data;
  const before = z.iso.datetime({ offset: true }).safeParse(options.before).data;
  const articlesView = options.view === "articles" && !options.storyId;
  const storyCursor = z.uuid().safeParse(options.beforeId).data;
  const itemCursor = z
    .string()
    .regex(/^(?:[a-f0-9]{40}|x:\d+)$/)
    .safeParse(options.beforeId).data;
  let storiesQuery = db
    .from("stories")
    .select(storyColumns)
    .eq("monitor_id", monitor.id)
    .or("status.eq.written,and(status.eq.no_card,fallback_title.neq.)")
    .order("last_changed_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(30);
  if (source) {
    // The stories holding an item seen from this source, newest first; the page then reads them as usual.
    const { data, error } = await db
      .from("story_items")
      .select("story_id,stories!inner(monitor_id),items!inner(source_ids)")
      .eq("stories.monitor_id", monitor.id)
      .contains("items.source_ids", [source])
      .order("added_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    storiesQuery = storiesQuery.in("id", [...new Set(data.map((row) => row.story_id))]);
  }
  if (before && !articlesView) {
    storiesQuery = storyCursor
      ? storiesQuery.or(
          `and(or(status.eq.written,and(status.eq.no_card,fallback_title.neq.)),or(last_changed_at.lt.${before},and(last_changed_at.eq.${before},id.lt.${storyCursor})))`,
        )
      : storiesQuery.lt("last_changed_at", before);
  }
  let articlesQuery = db
    .from("monitor_items")
    .select(`fit_score,card,items!inner(${itemColumns})`)
    .eq("monitor_id", monitor.id)
    .eq("fit_band", "on")
    .in("card_status", ["written", "no_card", "write_failed"])
    .order("items(published_at)", { ascending: false })
    .order("items(id)", { ascending: false })
    .limit(30);
  if (source) articlesQuery = articlesQuery.contains("items.source_ids", [source]);
  if (before && articlesView) {
    articlesQuery = itemCursor
      ? articlesQuery.or(
          `published_at.lt.${before},and(published_at.eq.${before},id.lt.${itemCursor})`,
          { referencedTable: "items" },
        )
      : articlesQuery.lt("items.published_at", before);
  }
  const [stories, articles, skipped, pending, failed, digests, selected] = await Promise.all([
    storiesQuery,
    articlesQuery,
    db
      .from("monitor_items")
      .select(`fit_score,items!inner(${itemColumns})`)
      .eq("monitor_id", monitor.id)
      .eq("status", "skipped")
      .order("items(published_at)", { ascending: false })
      .limit(30),
    db
      .from("monitor_items")
      .select("item_id", { count: "exact", head: true })
      .eq("monitor_id", monitor.id)
      .eq("status", "pending"),
    db
      .from("monitor_items")
      .select("item_id", { count: "exact", head: true })
      .eq("monitor_id", monitor.id)
      .eq("status", "failed"),
    db
      .from("digest_items")
      .select("id,kind,name,url,why_now,description,created_at")
      .eq("monitor_id", monitor.id)
      .order("created_at", { ascending: false })
      .limit(30),
    options.storyId
      ? db
          .from("stories")
          .select(storyColumns)
          .eq("monitor_id", monitor.id)
          .eq("id", options.storyId)
          .in("status", ["written", "no_card"])
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  for (const result of [stories, articles, skipped, pending, failed, digests, selected]) {
    if (result.error) throw result.error;
  }
  const storyRows = selected.data
    ? [selected.data, ...(stories.data ?? []).filter((story) => story.id !== selected.data?.id)]
    : (stories.data ?? []);
  const reports = storyRows.length
    ? await db
        .from("story_items")
        .select(`story_id,items!inner(${itemColumns})`)
        .in(
          "story_id",
          storyRows.map((story) => story.id),
        )
        .order("added_at")
    : { data: [], error: null };
  if (reports.error) throw reports.error;
  return {
    stories: storyRows.map(
      (story): DisplayStory => ({
        ...story,
        card: cardSchema.safeParse(story.card).data ?? null,
        reports: (reports.data ?? [])
          .filter((report) => report.story_id === story.id)
          .map((report) => publicItem(report.items)),
      }),
    ),
    articles: (articles.data ?? []).map(
      (row): DisplayItem => ({
        item: publicItem(row.items),
        card: cardSchema.safeParse(row.card).data ?? null,
        score: row.fit_score,
      }),
    ),
    skipped: (skipped.data ?? []).map(
      (row): DisplayItem => ({ item: publicItem(row.items), card: null, score: row.fit_score }),
    ),
    pending: pending.count ?? 0,
    failed: failed.count ?? 0,
    digests: digests.data ?? [],
    storyFound: !!selected.data,
    storiesBeforeId: stories.data?.at(-1)?.id,
    articlesBeforeId: articles.data?.at(-1)?.items.id,
    storiesBefore: stories.data?.length === 30 ? stories.data.at(-1)?.last_changed_at : undefined,
    articlesBefore:
      articles.data?.length === 30 ? articles.data.at(-1)?.items.published_at : undefined,
  };
}
export type MonitorFeed = Awaited<ReturnType<typeof readFeed>>;

/**
 * The owner's feed numbers for the last seven UTC days, read whole (not the page of cards): stories by the day their
 * newest report was published, the matching articles and posts with the sources they were seen from, and the
 * digests written. The caller has already proved the viewer owns this monitor.
 */
export async function readFeedStats(monitor: PublicMonitor) {
  const db = createAdminClient();
  const start = weekStart().toISOString();
  const [stories, items, digests] = await Promise.all([
    db
      .from("stories")
      .select("last_published_at")
      .eq("monitor_id", monitor.id)
      .or("status.eq.written,and(status.eq.no_card,fallback_title.neq.)")
      .gte("last_published_at", start)
      .range(0, 4999),
    db
      .from("monitor_items")
      .select("items!inner(kind,source_ids)")
      .eq("monitor_id", monitor.id)
      .eq("fit_band", "on")
      .in("card_status", ["written", "no_card", "write_failed"])
      .gte("items.published_at", start)
      .range(0, 4999),
    db
      .from("digest_items")
      .select("id", { count: "exact", head: true })
      .eq("monitor_id", monitor.id)
      .gte("created_at", start),
  ]);
  for (const result of [stories, items, digests]) if (result.error) throw result.error;
  return feedStats({
    stories: (stories.data ?? []).map((story) => story.last_published_at),
    items: (items.data ?? []).map((row) => row.items),
    digests: digests.count ?? 0,
  });
}

/** The agent's sites, feeds and X accounts for its Sources page, public like the feed. */
export async function readSources(monitor: PublicMonitor) {
  const db = createAdminClient();
  const [sources, accounts] = await Promise.all([
    db
      .from("monitor_sources")
      .select("source_id,why,sources(id,name,kind,focus,target,unreadable_streak,paused_at)")
      .eq("monitor_id", monitor.id)
      .is("removed_at", null)
      .order("created_at"),
    db
      .from("monitor_accounts")
      .select("handle,name,why,watched")
      .eq("monitor_id", monitor.id)
      .order("created_at"),
  ]);
  if (sources.error) throw sources.error;
  if (accounts.error) throw accounts.error;
  return { sources: sources.data, accounts: accounts.data };
}
export type MonitorSources = Awaited<ReturnType<typeof readSources>>;
