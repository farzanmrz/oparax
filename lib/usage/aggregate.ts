import { pstDay, pstStamp } from "@/lib/usage/format";
import type {
  Breakdown,
  CostQty,
  EventView,
  ReconRow,
  TimePoint,
  TreeLevel,
  TreeNode,
  UsageAggregate,
  UsageKind,
  UsageRow,
} from "@/lib/usage/types";

function short(id: string | null, n = 8): string {
  return id ? id.slice(0, n) : "";
}
function providerOf(r: UsageRow): string {
  return r.resolved_provider ?? r.provider;
}
function costOf(r: UsageRow): number {
  return Number(r.cost_usd ?? 0);
}
function emptyQty(): CostQty {
  return { cost: 0, calls: 0, inputTokens: 0, outputTokens: 0 };
}
function addQty(acc: CostQty, r: UsageRow): void {
  acc.cost += costOf(r);
  acc.calls += 1;
  acc.inputTokens += r.input_tokens ?? 0;
  acc.outputTokens += r.output_tokens ?? 0;
}

function breakdown(rows: UsageRow[], keyFn: (r: UsageRow) => string): Breakdown[] {
  const m = new Map<string, Breakdown>();
  for (const r of rows) {
    const key = keyFn(r);
    const e = m.get(key) ?? { key, cost: 0, calls: 0 };
    e.cost += costOf(r);
    e.calls += 1;
    m.set(key, e);
  }
  return [...m.values()].sort((a, b) => b.cost - a.cost);
}

/** Friendly platform name for the action leaf (which biller the call went through). */
function platformName(provider: string): string {
  if (provider === "x_api") return "x";
  return provider; // deepseek | deepinfra | xai | gateway | internal
}

/**
 * Build the cost-attribution tree: user (email) → session (agent chat, with its
 * start time) → message (one back-and-forth turn) → action (the API call, shown
 * as `kind · platform`). Cost/calls/tokens sum into every parent. Events without
 * a session/message (older or system) collect under a single "Untracked" bucket
 * so the real sessions stay clean.
 */
function buildTree(rows: UsageRow[], userLabel: (r: UsageRow) => string): TreeNode[] {
  const roots: TreeNode[] = [];
  const reg = new Map<string, TreeNode>();
  const minTime = new Map<string, string>();
  const sample = new Map<string, UsageRow>();

  function ensure(key: string, parent: TreeNode | null, level: TreeLevel): TreeNode {
    let node = reg.get(key);
    if (!node) {
      node = { id: key, level, label: "", children: [], ...emptyQty() };
      reg.set(key, node);
      (parent ? parent.children : roots).push(node);
    }
    return node;
  }

  for (const r of rows) {
    const uKey = `u:${r.user_id ?? "_"}`;
    const sKey = `${uKey}|s:${r.session_id ?? "untracked"}`;
    const mKey = `${sKey}|m:${r.message_id ?? "_"}`;
    const aKey = `${mKey}|a:${r.id}`;

    const nodes = [
      ensure(uKey, null, "user"),
      ensure(sKey, reg.get(uKey) ?? null, "session"),
      ensure(mKey, reg.get(sKey) ?? null, "message"),
      ensure(aKey, reg.get(mKey) ?? null, "call"),
    ];
    nodes[3].kind = r.kind;
    for (const n of nodes) {
      addQty(n, r);
      const cur = minTime.get(n.id);
      if (!cur || r.created_at < cur) minTime.set(n.id, r.created_at);
      if (!sample.has(n.id)) sample.set(n.id, r);
    }
  }

  for (const node of reg.values()) {
    const r = sample.get(node.id);
    const at = minTime.get(node.id);
    if (!r) continue;
    if (node.level === "user") node.label = userLabel(r);
    else if (node.level === "session")
      node.label = r.session_id
        ? `Agent chat · started ${at ? pstStamp(at) : ""}`
        : "Untracked activity";
    else if (node.level === "message")
      node.label = r.message_id ? `Turn · ${at ? pstStamp(at) : ""}` : "(unlinked)";
    else node.label = `${r.kind} · ${platformName(r.resolved_provider ?? r.provider)}`;
  }

  const sortTree = (nodes: TreeNode[]): void => {
    nodes.sort((a, b) => b.cost - a.cost);
    for (const n of nodes) sortTree(n.children);
  };
  sortTree(roots);
  return roots;
}

function toEventView(r: UsageRow): EventView {
  // Prefer the resolved BYOK provider (deepseek/deepinfra/xai). Bare "gateway"
  // only survives for legacy rows logged before per-call routing was captured —
  // tag them so they're not mistaken for live routing.
  const provider = r.resolved_provider
    ? platformName(r.resolved_provider)
    : r.provider === "gateway"
      ? "gateway (legacy)"
      : platformName(r.provider);
  return {
    id: r.id,
    createdAt: r.created_at,
    kind: r.kind,
    provider,
    model: r.model,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    cost: costOf(r),
    userId: r.user_id,
    sessionId: r.session_id,
    toolName: r.tool_name,
  };
}

/**
 * Pure aggregation: turns raw event rows into the dashboard view model.
 * @param rows - events in the selected window (newest first)
 * @param prevRows - events in the previous equal-length window (for Δ)
 * @param recon - latest reconciliation snapshots per provider
 */
export function aggregate(
  rows: UsageRow[],
  prevRows: UsageRow[],
  recon: ReconRow[],
  emailFor: Map<string, string> = new Map(),
): UsageAggregate {
  const userLabel = (r: UsageRow): string =>
    r.user_id ? (emailFor.get(r.user_id) ?? short(r.user_id)) : "(unattributed)";

  const totals: CostQty = emptyQty();
  for (const r of rows) addQty(totals, r);

  const byKind = breakdown(rows, (r) => r.kind);
  const top = byKind[0];
  const topDriver = top
    ? {
        kind: top.key as UsageKind,
        cost: top.cost,
        pct: totals.cost > 0 ? (top.cost / totals.cost) * 100 : 0,
      }
    : { kind: null, cost: 0, pct: 0 };

  const tsMap = new Map<string, TimePoint>();
  for (const r of rows) {
    const date = pstDay(r.created_at);
    const tp = tsMap.get(date) ?? { date, byProvider: {}, total: 0 };
    const p = providerOf(r);
    const c = costOf(r);
    tp.byProvider[p] = (tp.byProvider[p] ?? 0) + c;
    tp.total += c;
    tsMap.set(date, tp);
  }
  const timeSeries = [...tsMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  let prevTotalCost = 0;
  for (const r of prevRows) prevTotalCost += costOf(r);

  return {
    totals: { ...totals, topDriver },
    prevTotalCost,
    timeSeries,
    byKind,
    byProvider: breakdown(rows, providerOf),
    byUser: breakdown(rows, userLabel),
    tree: buildTree(rows, userLabel),
    events: rows.map(toEventView),
    reconciliations: recon,
  };
}
