import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const X_API = "https://api.x.com/2";

export type HandleCheckFailure = {
  handle: string;
  status: "not_found" | "suspended";
};

type XUser = { id: string; username: string };
type XError = { value?: string; title?: string; detail?: string };

function bearerToken(): string {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN is not set");
  return token;
}

async function lookupHandles(handles: string[]): Promise<{ users: XUser[]; errors: XError[] }> {
  const params = new URLSearchParams({ usernames: handles.join(",") });
  const response = await fetch(`${X_API}/users/by?${params}`, {
    headers: { Authorization: `Bearer ${bearerToken()}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`X handle lookup failed (${response.status})`);
  const payload = (await response.json()) as { data?: XUser[]; errors?: XError[] };
  return { users: payload.data ?? [], errors: payload.errors ?? [] };
}

function classifiedErrors(errors: XError[], requested: Map<string, string>): HandleCheckFailure[] {
  const invalid: HandleCheckFailure[] = [];
  for (const error of errors) {
    const lower = error.value?.toLowerCase();
    const ownerCasing = lower ? requested.get(lower) : undefined;
    if (!lower || !ownerCasing) continue;
    const title = error.title?.toLowerCase() ?? "";
    const detail = error.detail?.toLowerCase() ?? "";
    const status = detail.includes("suspend")
      ? "suspended"
      : title.includes("not found") || title.includes("resource not found")
        ? "not_found"
        : null;
    if (status) invalid.push({ handle: ownerCasing, status });
  }
  return invalid;
}

async function storeLookup(
  ownerId: string,
  requested: Map<string, string>,
  users: XUser[],
  invalid: HandleCheckFailure[],
) {
  const admin = createAdminClient();
  const checkedAt = new Date().toISOString();
  const rows = [
    ...users.map((user) => ({
      handle: user.username,
      handle_lower: user.username.toLowerCase(),
      x_user_id: user.id,
      status: "valid" as const,
      checked_at: checkedAt,
    })),
    ...invalid.map((item) => ({
      handle: item.handle,
      handle_lower: item.handle.toLowerCase(),
      x_user_id: null,
      status: item.status,
      checked_at: checkedAt,
    })),
  ];
  if (rows.length) {
    const { error } = await admin.from("x_handle_checks").upsert(rows, {
      onConflict: "handle_lower",
    });
    if (error) console.error("handle-check: cache upsert failed", error);
  }
  const { error: meterError } = await admin.from("usage_events").insert({
    owner_id: ownerId,
    kind: "x_handle_lookup",
    units: requested.size,
    cost_usd: null,
  });
  if (meterError) console.error("handle-check: usage stamp failed", meterError);
}

export async function checkHandlesExist(
  handles: string[],
  ownerId: string,
): Promise<{ ok: true; invalid: HandleCheckFailure[] } | { ok: false }> {
  const requested = new Map(handles.map((handle) => [handle.toLowerCase(), handle]));
  const lowers = [...requested.keys()];
  if (!lowers.length) return { ok: true, invalid: [] };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("x_handle_checks")
    .select("handle_lower, status")
    .in("handle_lower", lowers);
  if (error) return { ok: false };
  const validHits = new Set(
    (data ?? []).filter((row) => row.status === "valid").map((row) => row.handle_lower),
  );
  const toCheck = lowers.filter((handle) => !validHits.has(handle));
  if (!toCheck.length) return { ok: true, invalid: [] };
  const lookupMap = new Map(toCheck.map((lower) => [lower, requested.get(lower) ?? lower]));
  try {
    const lookup = await lookupHandles([...lookupMap.values()]);
    const invalid = classifiedErrors(lookup.errors, lookupMap);
    await storeLookup(ownerId, lookupMap, lookup.users, invalid);
    return { ok: true, invalid };
  } catch (error) {
    console.error("handle-check: lookup failed", error);
    return { ok: false };
  }
}

/**
 * Resolve handles to numeric X user ids through the same x_handle_checks cache the existence
 * check maintains (the old timeline resolver died with drafting). Cache hits cost nothing; the
 * misses go through one batched /2/users/by lookup and land back in the cache via storeLookup.
 * Returns a map keyed by LOWERCASE handle; handles that do not resolve are simply absent.
 */
export async function resolveXUserIds(
  handles: string[],
  ownerId: string,
): Promise<Map<string, string>> {
  const requested = new Map(handles.map((handle) => [handle.toLowerCase(), handle]));
  const resolved = new Map<string, string>();
  const lowers = [...requested.keys()];
  if (!lowers.length) return resolved;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("x_handle_checks")
    .select("handle_lower, status, x_user_id")
    .in("handle_lower", lowers);
  if (error) {
    console.error("handle-check: resolver cache read failed", error);
    return resolved;
  }
  for (const row of data ?? []) {
    if (row.status === "valid" && row.x_user_id) resolved.set(row.handle_lower, row.x_user_id);
  }
  // A cached "valid" row from before ids were stored can carry a null x_user_id — those count
  // as missing too, so they get re-looked-up and their id lands in the cache this time.
  const missing = lowers.filter((lower) => !resolved.has(lower));
  if (!missing.length) return resolved;
  const lookupMap = new Map(missing.map((lower) => [lower, requested.get(lower) ?? lower]));
  try {
    const lookup = await lookupHandles([...lookupMap.values()]);
    const invalid = classifiedErrors(lookup.errors, lookupMap);
    await storeLookup(ownerId, lookupMap, lookup.users, invalid);
    for (const user of lookup.users) resolved.set(user.username.toLowerCase(), user.id);
  } catch (error) {
    console.error("handle-check: resolver lookup failed", error);
  }
  return resolved;
}

export async function refreshStaleHandleChecks(ownerId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from("x_handle_checks")
      .select("*", { count: "exact", head: true })
      .lt("checked_at", cutoff);
    if (countError || (count ?? 0) < 100) return;
    const { data, error } = await admin
      .from("x_handle_checks")
      .select("handle")
      .lt("checked_at", cutoff)
      .order("checked_at", { ascending: true })
      .limit(100);
    if (error || !data?.length) return;
    const requested = new Map(data.map((row) => [row.handle.toLowerCase(), row.handle]));
    const lookup = await lookupHandles([...requested.values()]);
    await storeLookup(ownerId, requested, lookup.users, classifiedErrors(lookup.errors, requested));
  } catch (error) {
    console.error("handle-check: stale refresh failed", error);
  }
}
