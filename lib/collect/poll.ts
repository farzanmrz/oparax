import "server-only";

import { articleId, type CollectedArticle, collectArticle } from "@/lib/collect/item";
import { parseListingEntries } from "@/lib/collect/listing";
import { reportServerException } from "@/lib/observability/posthog-server";
import { fetchSafeSourceWithFinalUrl, readHtmlWithinLimit } from "@/lib/sources/discovery";
import { parseFeedEntries } from "@/lib/sources/feed";
import type { SourceSampleEntry } from "@/lib/sources/sitemap";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

type Database = ReturnType<typeof createAdminClient>;
export type SourceWatcher = { monitor_id: string; source_id: string; prefilled_at: string | null };
export type CollectionCounts = { sources: number; items: number; unreadable: number };

// One cron claim owns article writes. Only sightings of the same article must serialize.
const itemWrites = new Map<string, Promise<void>>();

async function withItemWrite<T>(id: string, write: () => Promise<T>): Promise<T> {
  const previous = itemWrites.get(id);
  let release = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  itemWrites.set(id, current);
  await previous;
  try {
    return await write();
  } finally {
    release();
    if (itemWrites.get(id) === current) itemWrites.delete(id);
  }
}

async function saveSighting(db: Database, article: CollectedArticle, sourceId: string) {
  return withItemWrite(article.row.id, async () => {
    const { data: inserted, error } = await db
      .from("items")
      .upsert(
        { ...article.row, source_id: sourceId, source_ids: [] },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("*");
    if (error) throw error;
    const { data: row, error: readError } = await db
      .from("items")
      .select("*")
      .eq("id", article.row.id)
      .single();
    if (readError) throw readError;
    const firstSighting = inserted.length > 0 || !row.source_ids.includes(sourceId);
    return { row, inserted: inserted.length > 0, firstSighting };
  });
}

async function cachedCandidates(db: Database, entries: SourceSampleEntry[]) {
  const cached = new Map<string, Tables<"items">>();
  for (let offset = 0; offset < entries.length; offset += 100) {
    const chunk = entries.slice(offset, offset + 100);
    const results = await Promise.all([
      db
        .from("items")
        .select("*")
        .in(
          "id",
          chunk.map((entry) => articleId(entry.url)),
        ),
      db
        .from("items")
        .select("*")
        .in(
          "url",
          chunk.map((entry) => entry.url),
        ),
    ]);
    for (const { data, error } of results) {
      if (error) throw error;
      for (const row of data) {
        cached.set(row.id, row);
        cached.set(row.url, row);
      }
    }
  }
  return cached;
}

async function attachItems(db: Database, watchers: SourceWatcher[], ids: string[]) {
  for (const watcher of watchers) {
    for (let offset = 0; offset < ids.length; offset += 100) {
      const { error } = await db.from("monitor_items").upsert(
        ids
          .slice(offset, offset + 100)
          .map((item_id) => ({ monitor_id: watcher.monitor_id, item_id, status: "pending" })),
        { onConflict: "monitor_id,item_id", ignoreDuplicates: true },
      );
      if (error) throw error;
    }
  }
}

function bodySignature(text: string): string {
  return text
    .replace(/\[quote\]|\[end quote\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function pollSource(
  source: Tables<"sources">,
  watchers: SourceWatcher[],
  signal?: AbortSignal,
): Promise<CollectionCounts> {
  const db = createAdminClient();
  const counts: CollectionCounts = { sources: 0, items: 0, unreadable: 0 };
  const now = new Date();
  const pending = watchers.filter((watcher) => watcher.prefilled_at === null);
  const headers = new Headers();
  if (!pending.length) {
    if (source.etag) headers.set("If-None-Match", source.etag);
    if (source.last_modified) headers.set("If-Modified-Since", source.last_modified);
  }
  try {
    const fetched = await fetchSafeSourceWithFinalUrl(
      "Collect",
      source.target,
      new URL(source.target).hostname,
      signal,
      headers,
    );
    if (fetched.res.status === 304) {
      const { error } = await db
        .from("sources")
        .update({
          last_fetched_at: now.toISOString(),
          next_fetch_at: new Date(now.getTime() + 60_000).toISOString(),
        })
        .eq("id", source.id);
      if (error) throw error;
      counts.sources = 1;
      return counts;
    }
    if (fetched.res.status !== 200) {
      await fetched.res.body?.cancel();
      throw new Error(`Collect ${source.target} ${fetched.res.status}`);
    }
    const body = await readHtmlWithinLimit(fetched.res, source.target);
    const entries =
      source.kind === "rss"
        ? parseFeedEntries(body, fetched.finalUrl)
        : parseListingEntries(body, fetched.finalUrl);
    const cached = await cachedCandidates(db, entries);
    const sightings = new Map<string, CollectedArticle>();
    const candidates = new Map<string, SourceSampleEntry>();
    for (const entry of entries) {
      const row = cached.get(articleId(entry.url)) ?? cached.get(entry.url);
      if (row) sightings.set(row.id, { row, body: "", via: row.text_from ?? "cached" });
      else candidates.set(articleId(entry.url), entry);
    }
    let fresh = [...candidates.values()];
    const backlog = source.kind === "website" && fresh.length > 40;
    if (backlog) {
      // Undated pages have no item row, so rotating windows prevent them blocking later links.
      const window = Math.floor(now.getTime() / 60_000) % Math.ceil(fresh.length / 40);
      fresh = fresh.slice(window * 40, window * 40 + 40);
    }
    const collected: CollectedArticle[] = [];
    let incomplete = false;
    for (let offset = 0; offset < fresh.length; offset += 8) {
      if (signal?.aborted) {
        incomplete = true;
        break;
      }
      const chunk = await Promise.all(
        fresh.slice(offset, offset + 8).map(async (entry) => {
          try {
            return await collectArticle(entry, source, signal);
          } catch (error) {
            if (!signal?.aborted) throw error;
            incomplete = true;
            return null;
          }
        }),
      );
      for (const article of chunk) {
        if (article && !sightings.has(article.row.id)) {
          sightings.set(article.row.id, article);
          collected.push(article);
        }
      }
    }
    const bodies = new Map<string, Set<string>>();
    for (const row of new Map([...cached.values()].map((row) => [row.id, row])).values()) {
      if (!row.source_ids.includes(source.id) && row.source_id !== source.id) continue;
      const signature = bodySignature(row.text.replace(`${row.title}\n\n`, ""));
      if (!signature) continue;
      const ids = bodies.get(signature) ?? new Set<string>();
      ids.add(row.id);
      bodies.set(signature, ids);
    }
    for (const article of collected) {
      const signature = bodySignature(article.body);
      if (!signature) continue;
      const ids = bodies.get(signature) ?? new Set<string>();
      ids.add(article.row.id);
      bodies.set(signature, ids);
    }
    for (const article of collected) {
      if ((bodies.get(bodySignature(article.body))?.size ?? 0) > 1) {
        article.row.outcome = "unreadable";
        article.row.unreadable_reason = "furniture";
      }
    }
    let streak = source.unreadable_streak;
    let lastItemAt = source.last_item_at;
    const newSightingIds: string[] = [];
    for (const article of [...sightings.values()].sort(
      (a, b) => Date.parse(a.row.published_at) - Date.parse(b.row.published_at),
    )) {
      const saved = await saveSighting(db, article, source.id);
      const publishedAt = Date.parse(saved.row.published_at);
      if (
        (saved.inserted || saved.firstSighting) &&
        publishedAt >= now.getTime() - 2 * 86_400_000 &&
        publishedAt <= now.getTime()
      )
        newSightingIds.push(saved.row.id);
      if (!lastItemAt || saved.row.published_at > lastItemAt) lastItemAt = saved.row.published_at;
      if (saved.inserted) {
        counts.items += 1;
        if (saved.row.outcome === "unreadable") counts.unreadable += 1;
      }
      if (saved.firstSighting) streak = saved.row.outcome === "unreadable" ? streak + 1 : 0;
    }
    const { error: attachError } = await db.rpc("attach_sightings", {
      p_source: source.id,
      p_monitor_ids: watchers
        .filter((watcher) => watcher.prefilled_at !== null)
        .map((watcher) => watcher.monitor_id),
      p_new_item_ids: newSightingIds,
      p_seen_item_ids: [...sightings.keys()],
    });
    if (attachError) throw attachError;
    if (pending.length && !incomplete && !backlog) {
      const { data: recent, error } = await db
        .from("items")
        .select("id")
        .contains("source_ids", [source.id])
        .gte("published_at", new Date(now.getTime() - 2 * 86_400_000).toISOString())
        .lte("published_at", now.toISOString())
        .order("published_at", { ascending: false })
        .order("id")
        .limit(10);
      if (error) throw error;
      await attachItems(
        db,
        pending,
        recent.map((item) => item.id),
      );
      const { error: prefillError } = await db
        .from("monitor_sources")
        .update({ prefilled_at: now.toISOString() })
        .eq("source_id", source.id)
        .in(
          "monitor_id",
          pending.map((watcher) => watcher.monitor_id),
        )
        .is("removed_at", null)
        .is("prefilled_at", null);
      if (prefillError) throw prefillError;
    }
    const { error } = await db
      .from("sources")
      .update({
        etag: backlog || incomplete ? null : fetched.etag,
        last_modified: backlog || incomplete ? null : fetched.lastModified,
        last_fetched_at: now.toISOString(),
        next_fetch_at: new Date(now.getTime() + 60_000).toISOString(),
        unreadable_streak: streak,
        last_item_at: lastItemAt,
      })
      .eq("id", source.id);
    if (error) throw error;
    counts.sources = 1;
    return counts;
  } catch (error) {
    reportServerException(error, {
      tags: { area: "collect", stage: "source" },
      extra: { source_id: source.id },
    });
    const { error: updateError } = await db
      .from("sources")
      .update({ next_fetch_at: new Date(Date.now() + 300_000).toISOString() })
      .eq("id", source.id);
    if (updateError)
      reportServerException(updateError, {
        tags: { area: "collect", stage: "backoff" },
        extra: { source_id: source.id },
      });
    return counts;
  }
}
