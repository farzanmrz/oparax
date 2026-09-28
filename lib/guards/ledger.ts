import "server-only";

import { z } from "zod";
import { LUNA_IN, LUNA_OUT } from "@/lib/ai/cost";
import { track } from "@/lib/analytics/events";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";

const money = z.number().finite().nonnegative();
const reserveSchema = z.object({
  service: z.enum(["x", "gateway", "jev", "reservation"]),
  kind: z.string().min(1),
  usdReserved: money,
  monitorId: z.uuid().optional(),
  sourceId: z.string().min(1).optional(),
  runId: z.string().min(1).optional(),
});
const actualSchema = z.object({
  usd: money,
  units: z.number().int().nonnegative().optional(),
  externalId: z.string().min(1).optional(),
});
export type ReserveInput = z.infer<typeof reserveSchema>;
export class BudgetRefused extends Error {
  constructor(public readonly monitorId?: string) {
    super("budget");
    this.name = "BudgetRefused";
  }
}
export class CostUnbounded extends Error {
  constructor(message = "unbounded") {
    super(message);
    this.name = "CostUnbounded";
  }
}
export class ProviderRejected extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProviderRejected";
  }
}

export async function reserveCost(
  input: ReserveInput,
): Promise<{ id: number } | { refused: "budget" }> {
  const p = reserveSchema.parse(input);
  if (!p.monitorId && !(p.service === "x" && ["credits", "dm_received"].includes(p.kind))) {
    throw new CostUnbounded("A funding monitor is required");
  }
  try {
    const { data, error } = await createAdminClient().rpc("reserve_cost", {
      p_service: p.service,
      p_kind: p.kind,
      p_usd: p.usdReserved,
      p_monitor: p.monitorId ?? null,
      p_source: p.sourceId ?? null,
      p_run: p.runId ?? null,
    });
    if (error) throw error;
    return data === null ? { refused: "budget" } : { id: z.number().int().positive().parse(data) };
  } catch (error) {
    reportServerException(error, { tags: { area: "ledger", stage: "reserve" } });
    throw error;
  }
}

// Paginate every sum: the Data API's row limit must never hide spending.
export async function ledgerRows(filters: {
  monitorId?: string;
  sourceId?: string;
  service?: string;
  since?: string;
  day?: string;
}) {
  const db = createAdminClient();
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    let query = db
      .from("cost_ledger")
      .select("*")
      .order("id")
      .range(offset, offset + 999);
    if (filters.monitorId) query = query.eq("monitor_id", filters.monitorId);
    if (filters.sourceId) query = query.eq("source_id", filters.sourceId);
    if (filters.service) query = query.eq("service", filters.service);
    if (filters.since) query = query.gte("created_at", filters.since);
    if (filters.day) query = query.eq("day", filters.day);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function settleCost(id: number, actual: z.infer<typeof actualSchema>): Promise<void> {
  z.number().int().positive().parse(id);
  const input = actualSchema.parse(actual);
  try {
    const db = createAdminClient();
    let result = await db
      .from("cost_ledger")
      .update({
        usd: input.usd,
        settled: true,
        ...(input.units === undefined ? {} : { units: input.units }),
        ...(input.externalId === undefined ? {} : { external_id: input.externalId }),
      })
      .eq("id", id)
      .eq("settled", false)
      .select()
      .maybeSingle();
    if (result.error?.code === "23505" && input.externalId) {
      result = await db
        .from("cost_ledger")
        .update({ usd: 0, settled: true, external_id: null, units: 0 })
        .eq("id", id)
        .eq("settled", false)
        .select()
        .maybeSingle();
    }
    if (result.error) throw result.error;
    const row = result.data;
    if (!row) return;
    track(
      "spend_recorded",
      {
        service: row.service,
        kind: row.kind,
        usd: row.usd,
        monitor_id: row.monitor_id,
        source_id: row.source_id,
      },
      row.monitor_id ?? "server",
    );
    if (!row.monitor_id || row.service === "reservation") return;
    const { data: monitor, error: monitorError } = await db
      .from("monitors")
      .select("tier,budget_exhausted_at")
      .eq("id", row.monitor_id)
      .single();
    if (monitorError) throw monitorError;
    if (monitor.tier !== "free" || monitor.budget_exhausted_at !== null) return;
    const rows = await ledgerRows({ monitorId: row.monitor_id });
    const allocation = rows
      .filter((r) => r.service === "reservation")
      .reduce((n, r) => n + r.usd, 0);
    const spent = rows
      .filter((r) => r.service !== "reservation" && r.settled)
      .reduce((n, r) => n + r.usd, 0);
    if (spent + 0.003 > allocation) {
      const { error } = await db
        .from("monitors")
        .update({ budget_exhausted_at: new Date().toISOString() })
        .eq("id", row.monitor_id)
        .eq("tier", "free")
        .is("budget_exhausted_at", null);
      if (error) throw error;
    }
  } catch (error) {
    reportServerException(error, { tags: { area: "ledger", stage: "settle" }, extra: { id } });
  }
}

export async function withCost<T>(
  input: ReserveInput,
  fn: () => Promise<{
    value: T;
    usd: number;
    units?: number;
    externalId?: string;
  }>,
): Promise<T> {
  if (!Number.isFinite(input.usdReserved) || input.usdReserved < 0) throw new CostUnbounded();
  const reservation = await reserveCost(input);
  if ("refused" in reservation) throw new BudgetRefused(input.monitorId);
  try {
    const { value, ...actual } = await fn();
    await settleCost(reservation.id, actual);
    return value;
  } catch (error) {
    if (error instanceof ProviderRejected) {
      const { error: writeError } = await createAdminClient()
        .from("cost_ledger")
        .update({ kind: `${input.kind}:failed` })
        .eq("id", reservation.id)
        .eq("settled", false);
      if (writeError) reportServerException(writeError, { tags: { area: "ledger" } });
      await settleCost(reservation.id, { usd: 0 });
    }
    // Unknown outcomes retain their full reservation until reconciliation.
    throw error;
  }
}

export function xBound(maxPosts: number, profiles = 0): number {
  if (![maxPosts, profiles].every((n) => Number.isSafeInteger(n) && n >= 0))
    throw new CostUnbounded();
  return maxPosts * 0.005 + profiles * 0.01;
}
export function jevBound(state: object): number {
  if (JSON.stringify(state).length / 2 > 32_000) throw new CostUnbounded("state_too_large");
  return 0.003;
}
function messageSize(messages: unknown): { tokens: number; images: number } {
  const encoded = JSON.stringify(messages);
  if (!encoded) throw new CostUnbounded();
  let images = 0;
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    if ("type" in value && value.type === "image") {
      images++;
      return;
    }
    if ("type" in value && ["file", "audio", "video"].includes(String(value.type)))
      throw new CostUnbounded();
    Object.values(value).forEach(visit);
  };
  visit(messages);
  return { tokens: Math.ceil(encoded.length / 2), images };
}
export function qwenBound(messages: unknown): number {
  const { tokens, images } = messageSize(messages);
  if (images || tokens >= 32_000) throw new CostUnbounded();
  return Math.ceil((tokens + 6000) * 0.13) / 1_000_000;
}
export function lunaBound(messages: unknown): number {
  const { tokens, images } = messageSize(messages);
  // The checked list doubles input pricing beyond this tier; refuse rather than under-reserve.
  if (tokens + images * 4000 >= 272001) throw new CostUnbounded();
  return Math.ceil((tokens + images * 4000 + 6000) * Math.max(LUNA_IN, LUNA_OUT)) / 1_000_000;
}
