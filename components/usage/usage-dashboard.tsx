"use client";

import { useMemo, useState } from "react";
import type { PlatformCredit } from "@/lib/usage/credits";
import { pstDay } from "@/lib/usage/format";
import type { Breakdown, EventView, TimePoint, TreeNode, UsageAggregate } from "@/lib/usage/types";
import { AttributionTree } from "./attribution-tree";
import { CreditsPanel } from "./credits-panel";
import { EventsTable } from "./events-table";
import { UsageChart } from "./usage-chart";

interface UsageDashboardProps {
  aggregate: UsageAggregate;
  credits: PlatformCredit[];
}

/** Parse the `u:`/`s:` segments out of a TreeNode id (`u:..|s:..|m:..|t:..|c:..`). */
function focusKeys(id: string): {
  userId?: string;
  sessionId?: string;
} {
  const out: {
    userId?: string;
    sessionId?: string;
  } = {};
  for (const seg of id.split("|")) {
    if (seg.startsWith("u:")) out.userId = seg.slice(2);
    else if (seg.startsWith("s:")) out.sessionId = seg.slice(2);
  }
  return out;
}

/** Events belonging to the focused node's user/session subtree. */
function filterEvents(events: EventView[], focus: TreeNode | null): EventView[] {
  if (!focus) return events;
  const { userId, sessionId } = focusKeys(focus.id);
  return events.filter((e) => {
    if (userId !== undefined && userId !== "_" && (e.userId ?? "_") !== userId) return false;
    if (sessionId !== undefined && sessionId !== "_" && (e.sessionId ?? "_") !== sessionId) {
      return false;
    }
    return true;
  });
}

function breakdownBy(events: EventView[], keyFn: (e: EventView) => string): Breakdown[] {
  const m = new Map<string, Breakdown>();
  for (const e of events) {
    const key = keyFn(e);
    const b = m.get(key) ?? {
      key,
      cost: 0,
      calls: 0,
    };
    b.cost += e.cost;
    b.calls += 1;
    m.set(key, b);
  }
  return [...m.values()].sort((a, b) => b.cost - a.cost);
}

function timeSeriesFrom(events: EventView[]): TimePoint[] {
  const m = new Map<string, TimePoint>();
  for (const e of events) {
    const date = pstDay(e.createdAt);
    const tp = m.get(date) ?? {
      date,
      byProvider: {},
      total: 0,
    };
    tp.byProvider[e.provider] = (tp.byProvider[e.provider] ?? 0) + e.cost;
    tp.total += e.cost;
    m.set(date, tp);
  }
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function userLabel(e: EventView): string {
  return e.userId ? e.userId.slice(0, 8) : "(unattributed)";
}

/**
 * Client shell for the cost explorer. Fixed 30-day window (refresh re-pulls
 * live data). Focusing a tree node re-roots the chart and table client-side;
 * a breakdown click pushes a facet to the table.
 */
export function UsageDashboard({ aggregate, credits }: UsageDashboardProps) {
  const [focus, setFocus] = useState<TreeNode | null>(null);
  const [facet, setFacet] = useState<
    | {
        kind?: string;
        provider?: string;
      }
    | undefined
  >(undefined);

  const focused = useMemo(() => filterEvents(aggregate.events, focus), [aggregate.events, focus]);

  // Charts + breakdowns re-root to the focused subtree; unfocused uses the
  // server-computed aggregate directly.
  const timeSeries = useMemo(
    () => (focus ? timeSeriesFrom(focused) : aggregate.timeSeries),
    [focus, focused, aggregate.timeSeries],
  );
  const byKind = useMemo(
    () => (focus ? breakdownBy(focused, (e) => e.kind) : aggregate.byKind),
    [focus, focused, aggregate.byKind],
  );
  const byProvider = useMemo(
    () => (focus ? breakdownBy(focused, (e) => e.provider) : aggregate.byProvider),
    [focus, focused, aggregate.byProvider],
  );
  const byUser = useMemo(
    () => (focus ? breakdownBy(focused, userLabel) : aggregate.byUser),
    [focus, focused, aggregate.byUser],
  );

  return (
    <div className="mt-5 flex flex-col gap-4">
      <AttributionTree tree={aggregate.tree} focus={focus} onFocus={setFocus} />

      <CreditsPanel credits={credits} />

      <EventsTable events={focused} facet={facet} />

      <UsageChart
        timeSeries={timeSeries}
        byKind={byKind}
        byProvider={byProvider}
        byUser={byUser}
        onSelect={(dim, key) =>
          setFacet(
            dim === "kind" ? { kind: key } : dim === "provider" ? { provider: key } : undefined,
          )
        }
      />
    </div>
  );
}
