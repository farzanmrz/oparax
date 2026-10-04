import "server-only";

import { z } from "zod";
import { timelineItems, timelineSchema } from "@/lib/accounts/posts";
import { reserveCost, settleCost, xBound } from "@/lib/guards/ledger";
import { monitorState } from "@/lib/monitor-state";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { xGet } from "@/lib/x/client";
import { normalizeValidHandle } from "@/lib/x/handle";

type Watcher = {
  monitor: Tables<"monitors">;
  account: Tables<"monitor_accounts">;
  floor: string;
};
type Admission = { watcher: Watcher; reservation: number; capacity: number };
const numericId = z.string().regex(/^\d+$/);
const cachedSchema = z.array(
  z.object({ id: z.string().regex(/^x:\d+$/), published_at: z.iso.datetime({ offset: true }) }),
);
const debitSchema = z
  .array(
    z.object({
      attached: z.array(z.string()),
      remaining: z.number().int().nonnegative(),
      paused: z.boolean(),
    }),
  )
  .length(1);
const room = (watcher: Watcher) =>
  Math.max(0, watcher.monitor.pool_limit - watcher.monitor.pool_used);
const compareIds = (a: string, b: string) =>
  BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;

export async function pollAccounts(options: {
  runId: string;
  trialPollingOpen: boolean;
  deadline: number;
}) {
  const db = createAdminClient();
  const now = new Date();
  const counts = { monitors: 0, accounts: 0, posts: 0, paused: 0, cuts: 0, failed: 0 };
  const groups = new Map<string, Watcher[]>();
  for (let offset = 0; Date.now() < options.deadline; offset += 500) {
    const { data: monitors, error } = await db
      .from("monitors")
      .select("*")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    for (const monitor of monitors) {
      const state = monitorState(monitor, now);
      if (!state.poolOpen || (state.state === "trial" && !options.trialPollingOpen)) continue;
      if (
        monitor.tier !== "wire" &&
        Number.parseInt(monitor.id[0], 16) % 5 !== now.getUTCMinutes() % 5
      )
        continue;
      counts.monitors++;
      for (let start = 0; ; start += 500) {
        const { data: accounts, error: accountError } = await db
          .from("monitor_accounts")
          .select("*")
          .eq("monitor_id", monitor.id)
          .eq("watched", true)
          .order("handle")
          .range(start, start + 499);
        if (accountError) throw accountError;
        for (const account of accounts) {
          const handle = normalizeValidHandle(account.handle)?.toLowerCase();
          if (!handle) throw new Error("Invalid watched handle");
          if (account.since_id) numericId.parse(account.since_id);
          const floor = new Date(
            Math.max(
              Date.parse(account.watched_at ?? account.created_at),
              Date.parse(
                monitor.pool_period_start ?? monitor.trial_started_at ?? account.created_at,
              ),
            ),
          ).toISOString();
          const watchers = groups.get(handle) ?? [];
          watchers.push({ monitor, account, floor });
          groups.set(handle, watchers);
        }
        if (accounts.length < 500) break;
      }
    }
    if (monitors.length < 500) break;
  }

  // Finish each handle's reservations before taking any for the next handle.
  for (const [handle, watchers] of groups) {
    if (Date.now() >= options.deadline) break;
    const sourceId = `x-${handle}`;
    const admitted: Admission[] = [];
    let timelineReservation: number | null = null;
    let dispatched = false;
    const reserve = (watcher: Watcher, kind: string, usdReserved: number) =>
      reserveCost({
        service: "x",
        kind,
        usdReserved,
        monitorId: watcher.monitor.id,
        sourceId,
        runId: options.runId,
      });
    try {
      const { error: sourceError } = await db.from("sources").upsert(
        {
          id: sourceId,
          kind: "x_account",
          target: `https://x.com/${handle}`,
          name: watchers[0].account.name || handle,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (sourceError) throw sourceError;
      const { data: source, error } = await db
        .from("sources")
        .select("x_user_id,name,paused_at")
        .eq("id", sourceId)
        .single();
      if (error) throw error;
      if (source.paused_at) {
        counts.paused++;
        continue;
      }
      const eligible = watchers
        .filter((watcher) => room(watcher) > 0)
        .sort((a, b) => room(b) - room(a));
      if (!eligible.length) continue;
      const maxResults = Math.max(
        5,
        Math.min(room(eligible[0]), eligible.some((w) => w.monitor.tier === "free") ? 20 : 100),
      );
      let funder: Watcher | undefined;
      let lookupReservation: number | null = null;
      for (const watcher of eligible) {
        const funding = await reserve(watcher, "request", xBound(2 * maxResults));
        if ("refused" in funding) continue;
        timelineReservation = funding.id;
        if (!source.x_user_id) {
          const lookup = await reserve(watcher, "request", xBound(0, 1));
          if ("refused" in lookup) {
            await settleCost(funding.id, { usd: 0, units: 0 });
            timelineReservation = null;
            continue;
          }
          lookupReservation = lookup.id;
        }
        funder = watcher;
        break;
      }
      if (!funder || timelineReservation === null) continue;
      let userId = source.x_user_id;
      let name = source.name;
      if (lookupReservation !== null) {
        const lookup = await xGet(
          `users/by/username/${handle}`,
          {},
          {
            funding: { reservationId: lookupReservation },
            maxPosts: 0,
            sourceId,
            runId: options.runId,
          },
        );
        if (lookup.uncertain || lookup.status < 200 || lookup.status >= 300)
          throw new Error(`X lookup ${lookup.status}`);
        const user = z
          .object({ data: z.object({ id: numericId, name: z.string() }) })
          .parse(lookup.body).data;
        userId = user.id;
        name = user.name;
        const { error: saveError } = await db
          .from("sources")
          .update({ x_user_id: userId, name })
          .eq("id", sourceId);
        if (saveError) throw saveError;
      }
      userId = numericId.parse(userId);
      for (const watcher of eligible) {
        if (watcher === funder) continue;
        const capacity = Math.min(room(watcher), maxResults);
        const share = await reserve(watcher, "post_share", xBound(capacity));
        if (!("refused" in share)) admitted.push({ watcher, reservation: share.id, capacity });
      }
      const all = [funder, ...admitted.map((entry) => entry.watcher)];
      const sinceId = all.some((w) => !w.account.since_id)
        ? null
        : all.map((w) => numericId.parse(w.account.since_id)).sort(compareIds)[0];
      const floor = all.map((w) => w.floor).sort()[0];
      const params: Record<string, string> = {
        exclude: "replies,retweets",
        max_results: String(maxResults),
        "tweet.fields":
          "id,text,created_at,author_id,entities,attachments,referenced_tweets,note_tweet,lang",
        expansions: "referenced_tweets.id,attachments.media_keys",
        "media.fields": "type,url",
        ...(sinceId ? { since_id: sinceId } : { start_time: floor }),
      };
      let fetched = 0;
      for (let pageNumber = 0; pageNumber < 2; pageNumber++) {
        if (Date.now() >= options.deadline) {
          await settleCost(timelineReservation, { usd: 0, units: 0 });
          counts.cuts++;
          break;
        }
        dispatched = true;
        const result = await xGet(`users/${userId}/tweets`, params, {
          funding: { reservationId: timelineReservation },
          maxPosts: 2 * Number(params.max_results),
          sourceId,
          runId: options.runId,
        });
        if (result.uncertain || result.status < 200 || result.status >= 300) {
          if (!result.uncertain) {
            for (const entry of admitted) await settleCost(entry.reservation, { usd: 0, units: 0 });
          }
          throw new Error(`X timeline ${result.status}`);
        }
        const page = timelineSchema.parse(result.body);
        const items = timelineItems(page, { handle, name, x_user_id: userId });
        if (items.length) {
          const { error: itemError } = await db
            .from("items")
            .upsert(items, { onConflict: "id", ignoreDuplicates: true });
          if (itemError) throw itemError;
        }
        fetched += page.data.length;
        counts.posts += items.length;
        const full = page.data.length === Number(params.max_results);
        if (!full) break;
        if (
          !page.meta.next_token ||
          pageNumber === 1 ||
          room(funder) <= fetched ||
          Date.now() >= options.deadline
        ) {
          counts.cuts++;
          break;
        }
        const nextSize = Math.max(5, Math.min(maxResults, room(funder) - fetched));
        const next = await reserve(funder, "request", xBound(2 * nextSize));
        if ("refused" in next) {
          counts.cuts++;
          break;
        }
        timelineReservation = next.id;
        dispatched = false;
        params.max_results = String(nextSize);
        params.pagination_token = page.meta.next_token;
      }
      counts.accounts++;
      const cached: z.infer<typeof cachedSchema> = [];
      for (let offset = 0; ; offset += 1000) {
        let query = db
          .from("items")
          .select("id,published_at")
          .eq("source_id", sourceId)
          .eq("kind", "post")
          .order("published_at")
          .order("id")
          .range(offset, offset + 999);
        if (!all.some((watcher) => watcher.account.since_id))
          query = query.gte("published_at", floor);
        const { data, error: cacheError } = await query;
        if (cacheError) throw cacheError;
        cached.push(...cachedSchema.parse(data));
        if (data.length < 1000) break;
      }
      cached.sort((a, b) => compareIds(a.id.slice(2), b.id.slice(2)));
      for (const watcher of all) {
        const cursor = watcher.account.since_id;
        if (cursor) {
          const skipped = cached.filter(
            (post) =>
              Date.parse(post.published_at) < Date.parse(watcher.floor) &&
              compareIds(post.id.slice(2), cursor) > 0,
          );
          const newest = skipped[skipped.length - 1];
          if (newest) {
            const { error: cursorError } = await db
              .from("monitor_accounts")
              .update({ since_id: newest.id.slice(2), x_user_id: userId })
              .eq("monitor_id", watcher.monitor.id)
              .eq("handle", watcher.account.handle)
              .eq("watched", true);
            if (cursorError) throw cursorError;
            watcher.account.since_id = newest.id.slice(2);
          }
        }
        const share = admitted.find((entry) => entry.watcher === watcher);
        let reservation = share?.reservation;
        let capacity = share?.capacity ?? room(watcher);
        const candidates = cached.filter(
          (post) =>
            Date.parse(post.published_at) >= Date.parse(watcher.floor) &&
            (!watcher.account.since_id ||
              compareIds(post.id.slice(2), watcher.account.since_id) > 0),
        );
        if (!candidates.length && reservation !== undefined)
          await settleCost(reservation, { usd: 0, units: 0 });
        for (let offset = 0; offset < candidates.length; ) {
          if (!capacity) break;
          const batch = candidates.slice(offset, offset + capacity);
          const { data, error: debitError } = await db.rpc("debit_posts", {
            p_monitor: watcher.monitor.id,
            p_item_ids: batch.map((post) => post.id),
          });
          if (debitError) throw debitError;
          const debit = debitSchema.parse(data)[0];
          watcher.monitor.pool_used = watcher.monitor.pool_limit - debit.remaining;
          if (reservation !== undefined)
            await settleCost(reservation, {
              usd: xBound(debit.attached.length),
              units: debit.attached.length,
            });
          // Already-attached rows also count as processed after a crash between debit and cursor save.
          const newest = debit.paused ? candidates[candidates.length - 1] : batch[batch.length - 1];
          const { error: cursorError } = await db
            .from("monitor_accounts")
            .update({ since_id: newest.id.slice(2), x_user_id: userId })
            .eq("monitor_id", watcher.monitor.id)
            .eq("handle", watcher.account.handle)
            .eq("watched", true);
          if (cursorError) throw cursorError;
          watcher.account.since_id = newest.id.slice(2);
          offset += batch.length;
          if (debit.paused || offset >= candidates.length) break;
          if (Date.now() >= options.deadline) {
            counts.cuts++;
            break;
          }
          if (share) {
            const nextCapacity = Math.min(debit.remaining, candidates.length - offset, maxResults);
            const next = await reserve(watcher, "post_share", xBound(nextCapacity));
            if ("refused" in next) break;
            reservation = next.id;
            capacity = nextCapacity;
          }
        }
      }
    } catch (error) {
      if (!dispatched) {
        if (timelineReservation !== null)
          await settleCost(timelineReservation, { usd: 0, units: 0 });
        for (const entry of admitted) await settleCost(entry.reservation, { usd: 0, units: 0 });
      }
      counts.failed++;
      reportServerException(error, {
        tags: { area: "accounts", stage: "poll" },
        extra: { sourceId, runId: options.runId },
      });
    }
  }
  return { counts, stoppedAtDeadline: Date.now() >= options.deadline };
}
