import "server-only";

import { cache } from "react";
import { z } from "zod";
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

// Explicit columns keep payment identifiers, activation secrets and checkpoints off this surface.
const monitorColumns =
  "id,handle,display_handle,beat,profile,brief,status,build_step,build_tries,build_finished_at,user_id,tier,trial_started_at,paid_through,pool_limit,pool_used,pool_period_start,cadence,subscription_status,budget_exhausted_at,bot_state,digest_github,digest_product_hunt";
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
  const profile = profileSchema.safeParse(data.profile).data;
  return {
    ...data,
    profile: profile
      ? { ...profile, image: profile.image ?? null, site: profile.site ?? null }
      : null,
    brief: briefSchema.safeParse(data.brief).data ?? null,
  };
});
export type PublicMonitor = NonNullable<Awaited<ReturnType<typeof readMonitor>>>;

export const readViewer = cache(async () => {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return { userId: user?.id ?? null, signedIn: !!user };
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
  options: { before?: string; beforeId?: string; view?: string; storyId?: string } = {},
) {
  const db = createAdminClient();
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
  if (before && articlesView) {
    articlesQuery = itemCursor
      ? articlesQuery.or(
          `published_at.lt.${before},and(published_at.eq.${before},id.lt.${itemCursor})`,
          { referencedTable: "items" },
        )
      : articlesQuery.lt("items.published_at", before);
  }
  const [sources, accounts, stories, articles, skipped, pending, failed, digests, selected] =
    await Promise.all([
      db
        .from("monitor_sources")
        .select("source_id,why,score,sources(id,name,focus,target,unreadable_streak,paused_at)")
        .eq("monitor_id", monitor.id)
        .is("removed_at", null)
        .order("created_at"),
      db
        .from("monitor_accounts")
        .select("handle,name,why,watched,score")
        .eq("monitor_id", monitor.id)
        .order("created_at"),
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
  for (const result of [
    sources,
    accounts,
    stories,
    articles,
    skipped,
    pending,
    failed,
    digests,
    selected,
  ]) {
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
    sources: sources.data ?? [],
    accounts: accounts.data ?? [],
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
