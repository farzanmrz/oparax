import type { Database } from "@/lib/types/database";

export type UsageRow = Database["public"]["Tables"]["api_usage_events"]["Row"];
export type UsageKind = Database["public"]["Enums"]["usage_kind"];

/** Summable cost + quantity bundle, shared by every aggregation level. */
export interface CostQty {
  cost: number; // USD
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

export type TreeLevel = "user" | "session" | "message" | "tool" | "call";

export interface TreeNode extends CostQty {
  id: string; // stable, level-prefixed key
  level: TreeLevel;
  label: string;
  kind?: UsageKind; // present at the call (leaf) level
  children: TreeNode[];
}

export interface Breakdown {
  key: string; // kind | provider | user label
  cost: number;
  calls: number;
}

export interface TimePoint {
  date: string; // YYYY-MM-DD (PST calendar day)
  byProvider: Record<string, number>; // provider -> cost
  total: number;
}

export interface ReconRow {
  provider: string;
  estimatedUsd: number;
  providerUsd: number | null;
  driftPct: number | null;
  syncedAt: string;
}

export interface EventView {
  id: string;
  createdAt: string; // ISO
  kind: UsageKind;
  provider: string; // resolved_provider ?? provider
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number;
  userId: string | null;
  sessionId: string | null;
  toolName: string | null;
}

export interface UsageTotals extends CostQty {
  topDriver: { kind: UsageKind | null; cost: number; pct: number };
}

export interface UsageAggregate {
  totals: UsageTotals;
  prevTotalCost: number; // previous equal-length window, for Δ
  timeSeries: TimePoint[];
  byKind: Breakdown[];
  byProvider: Breakdown[];
  byUser: Breakdown[];
  tree: TreeNode[]; // roots = users
  events: EventView[]; // flat leaf rows for the table
  reconciliations: ReconRow[];
}
