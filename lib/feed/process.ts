import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { BudgetRefused, CostUnbounded } from "@/lib/guards/ledger";
import { checkSourceSpend } from "@/lib/guards/watchdog";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables, TablesUpdate } from "@/lib/supabase/database.types";
import { ADDS_LINE, addsToStory } from "./adds";
import { FeedDeadline, requireTime } from "./checks";
import { fitItem } from "./fit";
import { groupItem, JOIN_LINE, WINDOW_H } from "./group";
import { writeCard } from "./repair";
import {
  errorMessage,
  type FeedContext,
  type ItemView,
  itemViewSchema,
  type StoryView,
  verifiedCardSchema,
} from "./types";

export const ITEMS_PER_MONITOR = 40;
export type FeedCounts = {
  judged: number;
  on: number;
  skipped: number;
  stories: number;
  cards: number;
  failed: number;
};
export const emptyCounts = (): FeedCounts => ({
  judged: 0,
  on: 0,
  skipped: 0,
  stories: 0,
  cards: 0,
  failed: 0,
});
type DB = ReturnType<typeof createAdminClient>;
type Story = Tables<"stories">;
const scoreMap = z.record(z.string(), z.number().min(0).max(1));
const savedSchema = z.object({
  item: z.string(),
  group: scoreMap,
  adds: scoreMap,
  save: z.object({
    role: z.enum(["opened", "joined", "attached"]),
    join_score: z.number().nullable(),
    adds_score: z.number().nullable(),
    patch: z.object({
      version: z.number().int().positive(),
      card: verifiedCardSchema.nullable(),
      headline: z.string().nullable(),
      image: z.string().nullable(),
      last_published_at: z.string(),
      last_changed_at: z.string(),
      status: z.enum(["written", "no_card", "write_failed"]),
    }),
  }),
});
type Saved = z.infer<typeof savedSchema>;
const authorSchema = z.object({ handle: z.string(), name: z.string() });

async function itemView(db: DB, row: Tables<"items">): Promise<ItemView> {
  const { data: source, error } = await db
    .from("sources")
    .select("name")
    .eq("id", row.source_id)
    .single();
  if (error) throw error;
  const author = row.kind === "post" ? authorSchema.parse(row.author) : null;
  return itemViewSchema.parse({
    ...row,
    publisher: author ? `@${author.handle.replace(/^@/, "")} (${author.name})` : source.name,
  });
}
function storyView(story: Story): StoryView {
  const card = story.card === null ? null : verifiedCardSchema.parse(story.card);
  return {
    id: story.id,
    headline: card?.headline ?? story.fallback_title,
    facts: card?.facts ?? [],
  };
}
async function updateItem(
  db: DB,
  monitorId: string,
  itemId: string,
  patch: TablesUpdate<"monitor_items">,
) {
  const { error } = await db
    .from("monitor_items")
    .update(patch)
    .eq("monitor_id", monitorId)
    .eq("item_id", itemId);
  if (error) throw error;
}
async function getStory(db: DB, monitorId: string, id: string): Promise<Story> {
  const { data, error } = await db
    .from("stories")
    .select("*")
    .eq("monitor_id", monitorId)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
async function applySaved(db: DB, monitorId: string, storyId: string, saved: Saved) {
  const patch = saved.save.patch;
  const { data, error } = await db
    .from("stories")
    .update(patch)
    .eq("id", storyId)
    .eq("monitor_id", monitorId)
    .eq("version", patch.version - 1)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data && (await getStory(db, monitorId, storyId)).version !== patch.version)
    throw new Error("Story version changed");
  const { error: linkError } = await db.from("story_items").upsert(
    {
      story_id: storyId,
      item_id: saved.item,
      role: saved.save.role,
      join_score: saved.save.join_score,
      adds_score: saved.save.adds_score,
    },
    { onConflict: "story_id,item_id" },
  );
  if (linkError) throw linkError;
}
async function savedWrites(db: DB, context: FeedContext) {
  const records: { storyId: string; saved: Saved }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from("card_versions")
      .select("story_id,record,stories!inner(monitor_id)")
      .eq("stories.monitor_id", context.monitorId)
      .eq("record->>item", context.item.id)
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    for (const row of data) {
      const saved = savedSchema.parse(row.record);
      if (!row.story_id) throw new Error("Saved card has no story");
      await applySaved(db, context.monitorId, row.story_id, saved);
      records.push({ storyId: row.story_id, saved });
    }
    if (data.length < 1000) return records;
  }
}
async function openStories(db: DB, context: FeedContext) {
  const time = Date.parse(context.item.published_at);
  const window = WINDOW_H * 60 * 60 * 1000;
  const stories: Story[] = [];
  for (let offset = 0; ; offset += 1000) {
    requireTime(context);
    const { data, error } = await db
      .from("stories")
      .select("*")
      .eq("monitor_id", context.monitorId)
      .gte("last_published_at", new Date(time - window).toISOString())
      .lte("last_published_at", new Date(time + window).toISOString())
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    stories.push(...data);
    if (data.length < 1000) return stories;
  }
}
function openingStoryId(context: FeedContext) {
  // A stable id covers a stop between inserting the story and linking its opening item.
  const hash = createHash("sha256")
    .update(`feed:${context.monitorId}:${context.item.id}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
async function openStory(db: DB, context: FeedContext) {
  const id = openingStoryId(context);
  const { error } = await db.from("stories").upsert(
    {
      id,
      monitor_id: context.monitorId,
      opened_at: context.item.published_at,
      last_published_at: context.item.published_at,
      last_changed_at: context.item.published_at,
      fallback_title: context.item.title,
      image: context.item.image,
      status: "open",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
  const { error: linkError } = await db
    .from("story_items")
    .upsert(
      { story_id: id, item_id: context.item.id, role: "opened" },
      { onConflict: "story_id,item_id", ignoreDuplicates: true },
    );
  if (linkError) throw linkError;
  return getStory(db, context.monitorId, id);
}
async function storyItems(db: DB, storyId: string, item: ItemView) {
  const items: ItemView[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from("story_items")
      .select("items!inner(*)")
      .eq("story_id", storyId)
      .order("added_at")
      .order("item_id")
      .range(offset, offset + 999);
    if (error) throw error;
    items.push(...(await Promise.all(data.map((row) => itemView(db, row.items)))));
    if (data.length < 1000) break;
  }
  if (!items.some((existing) => existing.id === item.id)) items.push(item);
  return items;
}
async function saveStory(
  db: DB,
  context: FeedContext,
  story: Story,
  role: Saved["save"]["role"],
  group: Record<string, number>,
  adds: Record<string, number>,
  counts: FeedCounts,
) {
  requireTime(context);
  const previous = story.card === null ? null : verifiedCardSchema.parse(story.card);
  const items = await storyItems(db, story.id, context.item);
  const citedIds = new Set([
    context.item.id,
    ...(previous?.facts.flatMap((fact) => fact.evidence.map((evidence) => evidence.item)) ?? []),
  ]);
  const result =
    role === "attached"
      ? null
      : await writeCard(
          context,
          previous,
          items.filter((item) => citedIds.has(item.id)),
          role === "opened" ? "new story" : "adds",
        );
  const card = result?.card ?? previous;
  if (card) {
    const publishers = new Map(
      items.map((item) => [
        item.source_id,
        { source_id: item.source_id, name: item.publisher, url: item.url },
      ]),
    );
    card.publishers = [...publishers.values()];
    card.image = story.image ?? items.find((item) => item.image)?.image ?? null;
  }
  const changed = Boolean(
    result?.card?.facts.some(
      (fact) =>
        !previous?.facts.some(
          (old) =>
            old.text === fact.text &&
            JSON.stringify(old.evidence) === JSON.stringify(fact.evidence),
        ),
    ),
  );
  const saved: Saved = {
    item: context.item.id,
    group,
    adds,
    save: {
      role,
      join_score: group[story.id] ?? null,
      adds_score: adds[story.id] ?? null,
      patch: {
        version: story.version + 1,
        card,
        headline: card?.headline ?? null,
        image: card?.image ?? story.image ?? context.item.image,
        last_published_at: new Date(
          Math.max(Date.parse(story.last_published_at), Date.parse(context.item.published_at)),
        ).toISOString(),
        last_changed_at: changed ? new Date().toISOString() : story.last_changed_at,
        status: card ? "written" : (result?.status ?? "no_card"),
      },
    },
  };
  const record = { ...(result?.record ?? { trigger: "attachment" }), ...saved };
  // Save the complete intended change first; the next run can finish either interrupted write.
  const { error } = await db
    .from("card_versions")
    .insert({ story_id: story.id, version: saved.save.patch.version, card, record });
  if (error) throw error;
  await applySaved(db, context.monitorId, story.id, saved);
  if (result?.card) counts.cards++;
}
async function processGroup(db: DB, context: FeedContext, counts: FeedCounts) {
  const recovered = await savedWrites(db, context);
  const { data: opened, error } = await db
    .from("story_items")
    .select("story_id,stories!inner(monitor_id)")
    .eq("item_id", context.item.id)
    .eq("role", "opened")
    .eq("stories.monitor_id", context.monitorId)
    .maybeSingle();
  if (error) throw error;
  const { data: orphan, error: orphanError } = opened
    ? { data: null, error: null }
    : await db
        .from("stories")
        .select("id")
        .eq("monitor_id", context.monitorId)
        .eq("id", openingStoryId(context))
        .maybeSingle();
  if (orphanError) throw orphanError;
  const openingStory = opened
    ? await getStory(db, context.monitorId, opened.story_id)
    : orphan
      ? await openStory(db, context)
      : null;
  let targets: Story[];
  let group: Record<string, number> = recovered[0]?.saved.group ?? {};
  let adds: Record<string, number> = recovered[0]?.saved.adds ?? {};
  if (openingStory) targets = [openingStory];
  else if (recovered.length)
    targets = await Promise.all(
      Object.entries(group)
        .filter(([, score]) => score >= JOIN_LINE)
        .map(([id]) => getStory(db, context.monitorId, id)),
    );
  else {
    const candidates = await openStories(db, context);
    group = await groupItem(context, candidates.map(storyView));
    targets = candidates.filter((story) => group[story.id] >= JOIN_LINE);
  }
  const opening = Boolean(openingStory) || !targets.length;
  if (!targets.length) {
    targets = [await openStory(db, context)];
    counts.stories++;
  }
  if (!opening && !recovered.length) {
    try {
      adds = Object.fromEntries(
        await Promise.all(
          targets.map(
            async (story) => [story.id, await addsToStory(context, storyView(story))] as const,
          ),
        ),
      );
    } catch (error) {
      if (
        error instanceof BudgetRefused ||
        error instanceof CostUnbounded ||
        error instanceof FeedDeadline
      )
        throw error;
      throw new Error("grouping failed", { cause: error });
    }
  }
  let attachedOnly = !opening;
  for (const story of targets) {
    const role = opening ? "opened" : adds[story.id] >= ADDS_LINE ? "joined" : "attached";
    if (role !== "attached") attachedOnly = false;
    if (!recovered.some((record) => record.storyId === story.id))
      await saveStory(db, context, story, role, group, adds, counts);
  }
  return { story_id: targets[0].id, status: attachedOnly ? "attached" : "storied" };
}

export async function processMonitor(
  monitor: Tables<"monitors">,
  runId: string,
  admitUntil: number,
  deadline: number,
): Promise<FeedCounts> {
  const db = createAdminClient();
  const counts = emptyCounts();
  const pending: (Tables<"monitor_items"> & { items: Tables<"items"> })[] = [];
  let cursor: { publishedAt: string; itemId: string } | null = null;
  let admitted = 0;
  while (admitted < ITEMS_PER_MONITOR && Date.now() < admitUntil) {
    if (!pending.length) {
      let query = db
        .from("monitor_items")
        .select("*,items!inner(*)")
        .eq("monitor_id", monitor.id)
        .eq("status", "pending")
        .order("items(published_at)")
        .order("item_id")
        .limit(ITEMS_PER_MONITOR - admitted);
      if (cursor)
        query = query.or(
          `published_at.gt.${cursor.publishedAt},and(published_at.eq.${cursor.publishedAt},id.gt.${cursor.itemId})`,
          { referencedTable: "items" },
        );
      const { data: rows, error } = await query;
      if (error) throw error;
      if (!rows.length) break;
      pending.push(...rows);
      const last = rows[rows.length - 1];
      cursor = { publishedAt: last.items.published_at, itemId: last.item_id };
    }
    if (Date.now() >= admitUntil) break;
    const row = pending.shift();
    if (!row) break;
    let sourceId = row.items.source_id;
    let why = "";
    let noFilter = false;
    if (row.items.kind === "article") {
      const { data: watch, error: watchError } = await db
        .from("monitor_sources")
        .select("source_id,why,no_filter")
        .eq("monitor_id", monitor.id)
        .in("source_id", [row.items.source_id, ...row.items.source_ids])
        .is("removed_at", null)
        .limit(1)
        .maybeSingle();
      if (watchError) throw watchError;
      if (!watch) {
        await updateItem(db, monitor.id, row.item_id, {
          status: "skipped",
          stage: "done",
          error: null,
        });
        counts.skipped++;
        continue;
      }
      sourceId = watch.source_id;
      why = watch.why;
      noFilter = watch.no_filter;
    }
    if (await checkSourceSpend(sourceId)) continue;
    admitted++;
    const tries = row.tries + 1;
    if (row.tries >= 2 && row.error !== "feed deadline") {
      await updateItem(db, monitor.id, row.item_id, {
        status: "failed",
        error: row.error ?? "interrupted twice",
      });
      counts.failed++;
      continue;
    }
    await updateItem(db, monitor.id, row.item_id, { tries, error: null });
    let stage = row.stage;
    try {
      if (row.items.outcome === "unreadable") {
        await updateItem(db, monitor.id, row.item_id, {
          status: "skipped",
          stage: "done",
          fit_band: null,
          fit_score: null,
          judged_at: new Date().toISOString(),
        });
        counts.skipped++;
        continue;
      }
      const item = await itemView(db, row.items);
      item.source_id = sourceId;
      if (item.kind === "post") {
        const author = authorSchema.parse(row.items.author);
        const { data: account, error: accountError } = await db
          .from("monitor_accounts")
          .select("why")
          .eq("monitor_id", monitor.id)
          .eq("handle", author.handle.replace(/^@/, ""))
          .maybeSingle();
        if (accountError) throw accountError;
        why = account?.why ?? "";
      }
      const { data: source, error: sourceError } = await db
        .from("sources")
        .select("name,focus,description,target")
        .eq("id", sourceId)
        .single();
      if (sourceError) throw sourceError;
      if (item.kind === "article") item.publisher = source.name;
      const context: FeedContext = {
        monitorId: monitor.id,
        runId,
        beat: monitor.beat,
        brief: monitor.brief,
        source: {
          name: source.name,
          focus: item.kind === "post" ? "" : source.focus,
          description: source.description,
          why,
        },
        item,
        deadline,
      };
      if (stage === "fit") {
        const fit = await fitItem(context, noFilter);
        counts.judged++;
        await updateItem(db, monitor.id, item.id, {
          fit_score: fit.score,
          fit_band: fit.band,
          judged_at: new Date().toISOString(),
          stage: fit.band === "on" ? "card" : "done",
          status: fit.band === "on" ? "pending" : "skipped",
        });
        if (fit.band !== "on") {
          counts.skipped++;
          continue;
        }
        stage = "card";
      }
      if (stage === "card") {
        const result = await writeCard(context, null, [item], "single source");
        await updateItem(db, monitor.id, item.id, {
          card: result.card,
          card_status: result.status,
          stage: "group",
        });
        if (result.card) counts.cards++;
        stage = "group";
      }
      if (stage === "group") {
        const grouped = await processGroup(db, context, counts);
        await updateItem(db, monitor.id, item.id, { ...grouped, stage: "done", error: null });
        counts.on++;
      }
    } catch (error) {
      const budget = error instanceof BudgetRefused;
      const unbounded = error instanceof CostUnbounded;
      const deadlineReached = error instanceof FeedDeadline;
      const message = budget
        ? "budget"
        : unbounded && error.message.includes("state")
          ? "state too large"
          : deadlineReached
            ? "feed deadline"
            : stage === "group" && !unbounded
              ? "grouping failed"
              : errorMessage(error);
      const failed = budget || unbounded || (!deadlineReached && tries >= 2);
      await updateItem(db, monitor.id, row.item_id, {
        status: failed ? "failed" : "pending",
        error: message,
      });
      if (failed) counts.failed++;
      // An unresolved earlier report must finish before later reports change its story.
      if (budget || deadlineReached || !failed) break;
    }
  }
  return counts;
}
