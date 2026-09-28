import "server-only";

import { z } from "zod";
import { BudgetRefused, CostUnbounded, reserveCost, settleCost, xBound } from "@/lib/guards/ledger";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeValidHandle } from "@/lib/x/handle";

export type Funding = { monitorId: string } | { reservationId: number };
type Options = {
  token?: "app" | "bot";
  funding: Funding;
  sourceId?: string;
  runId?: string;
  maxPosts: number;
  profiles?: number;
};
const idSchema = z.string().regex(/^\d+$/);
const resourceSchema = z.looseObject({ id: idSchema });
const bodySchema = z.looseObject({
  data: z.union([z.array(z.looseObject({})), z.looseObject({})]).optional(),
  includes: z
    .looseObject({
      tweets: z.array(resourceSchema).optional(),
      users: z.array(resourceSchema).optional(),
    })
    .optional(),
  errors: z.array(z.unknown()).optional(),
});
const X_GAP_MS = 1100;
let xQueue: Promise<unknown> = Promise.resolve();
let xLast = 0;
export function xTurn<T>(work: () => Promise<T>): Promise<T> {
  const next = xQueue.then(async () => {
    const wait = xLast + X_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    xLast = Date.now();
    return work();
  });
  xQueue = next.catch(() => {});
  return next;
}

async function reservationRow(id: number) {
  z.number().int().positive().parse(id);
  const { data, error } = await createAdminClient()
    .from("cost_ledger")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  if (data.service !== "x" || data.settled) throw new Error("X reservation is not open");
  return data;
}

export async function xBill(raw: unknown, reservationId: number, users = false): Promise<void> {
  const body = bodySchema.parse(raw);
  const reservation = await reservationRow(reservationId);
  const db = createAdminClient();
  const resources = new Map<string, { kind: "post" | "user"; id: string; usd: number }>();
  const add = (kind: "post" | "user", raw: unknown) => {
    const { id } = resourceSchema.parse(raw);
    resources.set(`${kind}:${id}`, { kind, id, usd: kind === "post" ? 0.005 : 0.01 });
  };
  for (const item of Array.isArray(body.data) ? body.data : body.data ? [body.data] : [])
    add(users ? "user" : "post", item);
  for (const item of body.includes?.tweets ?? []) add("post", item);
  for (const item of body.includes?.users ?? []) add("user", item);
  for (const resource of resources.values()) {
    const { data, error } = await db
      .from("cost_ledger")
      .insert({
        service: "x",
        kind: resource.kind,
        external_id: resource.id,
        usd: resource.usd,
        usd_reserved: resource.usd,
        settled: false,
        monitor_id: reservation.monitor_id,
        source_id: reservation.source_id,
        run_id: reservation.run_id,
        day: reservation.day,
      })
      .select("id")
      .single();
    if (error?.code === "23505") continue;
    if (error) throw error;
    await settleCost(data.id, { usd: resource.usd, externalId: resource.id });
  }
  await settleCost(reservationId, { usd: 0, units: 0 });
}

async function request(
  path: string,
  params: Record<string, string> | null,
  body: unknown,
  opts: Options,
) {
  if (!/^[a-zA-Z0-9_/-]+$/.test(path) || path.includes("..")) throw new Error("Invalid X path");
  const token = process.env[opts.token === "bot" ? "X_BOT_BEARER_TOKEN" : "X_BEARER_TOKEN"];
  if (!token) throw new Error("Missing X token");
  const dm = path.startsWith("dm_conversations/");
  const counts = path.startsWith("tweets/counts/");
  const users = path.startsWith("users/") && !path.endsWith("/tweets");
  if (
    (!params && !dm) ||
    (params &&
      !users &&
      !counts &&
      path !== "tweets" &&
      !path.endsWith("/tweets") &&
      !path.startsWith("tweets/search/"))
  )
    throw new CostUnbounded("Unsupported X endpoint");
  const profiles =
    opts.profiles ?? (users ? 1 : params?.expansions?.includes("author_id") ? opts.maxPosts : 0);
  const bound = dm ? 0.015 : counts ? 0.005 : xBound(opts.maxPosts, profiles);
  const kind = dm ? "dm_send" : counts ? "counts" : "request";
  let funding = opts.funding;
  for (let attempt = 0; ; attempt++) {
    const held = "reservationId" in funding ? await reservationRow(funding.reservationId) : null;
    if (held && held.usd_reserved < bound) throw new CostUnbounded("X reservation is too small");
    const reserved = held
      ? { id: held.id }
      : await reserveCost({
          service: "x",
          kind,
          usdReserved: bound,
          monitorId: "monitorId" in funding ? funding.monitorId : undefined,
          sourceId: opts.sourceId,
          runId: opts.runId,
        });
    if ("refused" in reserved)
      throw new BudgetRefused("monitorId" in funding ? funding.monitorId : undefined);
    const response = await xTurn(() =>
      fetch(`https://api.x.com/2/${path}${params ? `?${new URLSearchParams(params)}` : ""}`, {
        method: params ? "GET" : "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        ...(params ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      }),
    );
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      return { status: response.status, body: null, uncertain: true };
    }
    const parsed = bodySchema.safeParse(raw);
    if (!response.ok) {
      const definite = z.record(z.string(), z.unknown()).safeParse(raw).success;
      if (definite) await settleCost(reserved.id, { usd: 0 });
      if (response.status === 429 && attempt === 0 && definite) {
        const reset = response.headers.get("x-rate-limit-reset");
        const wait = reset ? Math.max(0, Number(reset) * 1000 - Date.now()) : Number.NaN;
        if (Number.isFinite(wait) && wait <= 5000) {
          const monitorId = held?.monitor_id ?? ("monitorId" in funding ? funding.monitorId : null);
          if (monitorId) {
            funding = { monitorId };
            await new Promise((resolve) => setTimeout(resolve, wait));
            continue;
          }
        }
      }
      return { status: response.status, body: raw, uncertain: !definite };
    }
    if (!parsed.success) return { status: response.status, body: null, uncertain: true };
    try {
      if (dm) {
        const result = z.object({ data: z.object({ dm_event_id: idSchema }) }).parse(raw);
        await settleCost(reserved.id, { usd: 0.015, externalId: result.data.dm_event_id });
      } else if (counts) {
        await settleCost(reserved.id, { usd: 0.005 });
      } else {
        await xBill(raw, reserved.id, users);
      }
    } catch (error) {
      // Billing persistence must not make a caller repeat a successful DM send.
      reportServerException(error, {
        tags: { area: "x", stage: "settle" },
        extra: { reservationId: reserved.id },
      });
    }
    return { status: response.status, body: raw, uncertain: false };
  }
}

export function xGet(path: string, params: Record<string, string>, opts: Options) {
  return request(path, params, undefined, opts);
}
export function xPost(path: string, body: unknown, opts: Options) {
  return request(path, null, body, opts);
}

export async function xCounts(handle: string, funding: Funding): Promise<number | null> {
  try {
    const valid = normalizeValidHandle(handle);
    if (!valid) return null;
    const result = await xGet(
      "tweets/counts/recent",
      {
        query: `from:${valid} -is:reply -is:retweet`,
        granularity: "day",
      },
      { funding, maxPosts: 0 },
    );
    if (result.status !== 200 || result.uncertain) return null;
    return (
      z
        .object({ meta: z.object({ total_tweet_count: z.number().int().nonnegative() }) })
        .parse(result.body).meta.total_tweet_count / 7
    );
  } catch (error) {
    reportServerException(error, { tags: { area: "x", stage: "counts" } });
    return null;
  }
}

export async function xSendDm(
  recipientXUserId: string,
  text: string,
  funding: Funding,
): Promise<
  { ok: true; dmEventId: string } | { ok: false; status: number; error: string; uncertain: boolean }
> {
  idSchema.parse(recipientXUserId);
  z.string().min(1).parse(text);
  try {
    const result = await xPost(
      `dm_conversations/with/${recipientXUserId}/messages`,
      { text },
      { token: "bot", funding, maxPosts: 0 },
    );
    if (result.status >= 200 && result.status < 300 && !result.uncertain) {
      const parsed = z.object({ data: z.object({ dm_event_id: idSchema }) }).safeParse(result.body);
      if (parsed.success) return { ok: true, dmEventId: parsed.data.data.dm_event_id };
      return {
        ok: false,
        status: result.status,
        error: "X did not return a DM event id",
        uncertain: true,
      };
    }
    return {
      ok: false,
      status: result.status,
      error: `X DM ${result.status}`,
      uncertain: result.uncertain,
    };
  } catch (error) {
    if (error instanceof BudgetRefused || error instanceof CostUnbounded) throw error;
    reportServerException(error, { tags: { area: "x", stage: "dm" } });
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
      uncertain: true,
    };
  }
}
