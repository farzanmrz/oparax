// lib/x/xaa.ts
//
// Typed raw-fetch client for X's Activity API (XAA): webhook registration/validation/replay and
// per-handle activity subscriptions. Mirrors lib/x/api.ts's raw-fetch precedent — env read
// fail-fast, AbortSignal.timeout, non-OK -> Error with status + truncated body. Pure module: no
// Supabase, no Next.js, no React, no I/O beyond fetch.
//
// Auth: the app-only bearer (`X_BEARER_TOKEN`) — the 2026-08-28 live test proved per-handle
// public post.create subscriptions succeed on it. The bot's own `xcbot_` bearer
// (`X_BOT_TOKEN`) is accepted as an override for the DM-subscription registration attempt
// (build-time check 2's ordered path in the reconcile route).

const X_API = "https://api.x.com/2";
const REQUEST_TIMEOUT_MS = 20_000;

export function appBearerToken(): string {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN is not set");
  // Used RAW — URL-decoding the portal's %2B/%3D escapes produces a 401 (.claude/rules/x.md).
  return token;
}

export class XaaRequestError extends Error {
  readonly status: number;
  constructor(endpoint: string, status: number, body: string) {
    super(`XAA ${endpoint} failed: HTTP ${status} — ${body.slice(0, 300)}`);
    this.name = "XaaRequestError";
    this.status = status;
  }
}

async function xaaFetch(
  endpoint: string,
  init: RequestInit & { bearer?: string },
): Promise<unknown> {
  const { bearer, ...rest } = init;
  const res = await fetch(`${X_API}${endpoint}`, {
    ...rest,
    headers: {
      authorization: `Bearer ${bearer ?? appBearerToken()}`,
      ...(rest.body ? { "content-type": "application/json" } : {}),
      ...rest.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) throw new XaaRequestError(endpoint, res.status, text);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export type XaaWebhook = { id: string; url: string; valid: boolean };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function dataArray(value: unknown): Record<string, unknown>[] {
  const record = asRecord(value);
  const data = record?.data;
  if (Array.isArray(data)) return data.map((item) => asRecord(item) ?? {});
  const single = asRecord(data);
  return single ? [single] : [];
}

export async function listWebhooks(): Promise<XaaWebhook[]> {
  const body = await xaaFetch("/webhooks", { method: "GET" });
  return dataArray(body).flatMap((row) => {
    const id = typeof row.id === "string" ? row.id : null;
    const url = typeof row.url === "string" ? row.url : null;
    if (!id || !url) return [];
    return [{ id, url, valid: row.valid !== false }];
  });
}

export async function createWebhook(url: string): Promise<XaaWebhook | null> {
  const body = await xaaFetch("/webhooks", { method: "POST", body: JSON.stringify({ url }) });
  const row = asRecord(asRecord(body)?.data);
  const id = typeof row?.id === "string" ? row.id : null;
  return id ? { id, url, valid: true } : null;
}

/** Re-trigger the CRC check on a registered webhook X has marked invalid. */
export async function revalidateWebhook(webhookId: string): Promise<void> {
  await xaaFetch(`/webhooks/${encodeURIComponent(webhookId)}`, { method: "PUT" });
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  await xaaFetch(`/webhooks/${encodeURIComponent(webhookId)}`, { method: "DELETE" });
}

/** Ask X to redeliver events for a bounded window (minute precision, UTC, yyyymmddHHMM). */
export async function replayWebhook(webhookId: string, from: Date, to: Date): Promise<void> {
  const stamp = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
      d.getUTCDate(),
    ).padStart(2, "0")}${String(d.getUTCHours()).padStart(2, "0")}${String(
      d.getUTCMinutes(),
    ).padStart(2, "0")}`;
  await xaaFetch(
    `/webhooks/replay?webhook_id=${encodeURIComponent(webhookId)}&from_date=${stamp(from)}&to_date=${stamp(to)}`,
    { method: "POST" },
  );
}

export type XaaSubscription = {
  id: string;
  eventType: string;
  userId: string | null;
};

export async function listSubscriptions(): Promise<XaaSubscription[]> {
  const body = await xaaFetch("/activity/subscriptions", { method: "GET" });
  return dataArray(body).flatMap((row) => {
    const id = typeof row.id === "string" ? row.id : null;
    const eventType =
      typeof row.event_type === "string"
        ? row.event_type
        : typeof row.eventType === "string"
          ? row.eventType
          : null;
    if (!id || !eventType) return [];
    const userId =
      typeof row.user_id === "string"
        ? row.user_id
        : typeof row.filter === "object" &&
            row.filter !== null &&
            typeof (row.filter as Record<string, unknown>).user_id === "string"
          ? ((row.filter as Record<string, unknown>).user_id as string)
          : null;
    return [{ id, eventType, userId }];
  });
}

export async function createSubscription(params: {
  eventType: string;
  userId: string;
  /** chat.received takes a conversation-type qualifier ("direct"). */
  conversationType?: string;
  /** Override bearer (the bot token attempt for its own DM subscription). */
  bearer?: string;
}): Promise<string | null> {
  const body = await xaaFetch("/activity/subscriptions", {
    method: "POST",
    bearer: params.bearer,
    body: JSON.stringify({
      event_type: params.eventType,
      user_id: params.userId,
      ...(params.conversationType ? { conversation_type: params.conversationType } : {}),
    }),
  });
  const row = asRecord(asRecord(body)?.data);
  return typeof row?.id === "string" ? row.id : null;
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await xaaFetch(`/activity/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "DELETE",
  });
}
