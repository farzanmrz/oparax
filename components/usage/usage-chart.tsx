"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { usd } from "@/lib/usage/format";
import type { Breakdown, TimePoint } from "@/lib/usage/types";
import { colorForKey, providerColor } from "./charts/provider-colors";

type Dimension = "time" | "kind" | "provider" | "user";
type ChartType = "area" | "bar" | "line" | "pie";

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "time", label: "Over time" },
  { value: "kind", label: "By kind" },
  { value: "provider", label: "By provider" },
  { value: "user", label: "By user" },
];

const TYPES_FOR: Record<Dimension, ChartType[]> = {
  time: ["area", "bar", "line"],
  kind: ["bar", "pie"],
  provider: ["bar", "pie"],
  user: ["bar", "pie"],
};

const TYPE_LABEL: Record<ChartType, string> = {
  area: "Area",
  bar: "Bar",
  line: "Line",
  pie: "Pie",
};

interface UsageChartProps {
  timeSeries: TimePoint[];
  byKind: Breakdown[];
  byProvider: Breakdown[];
  byUser: Breakdown[];
  /** Click a category (bar/slice) to push a table facet. */
  onSelect?: (dimension: Exclude<Dimension, "time">, key: string) => void;
}

/** Distinct providers across the window, ordered by total cost desc. */
function providersIn(data: TimePoint[]): string[] {
  const totals = new Map<string, number>();
  for (const p of data) {
    for (const [k, v] of Object.entries(p.byProvider)) totals.set(k, (totals.get(k) ?? 0) + v);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

const AXIS = { tickLine: false, axisLine: false, fontSize: 11 } as const;

/**
 * One configurable chart for the whole dashboard: switch the dimension (over
 * time / by kind / by provider / by user) and the chart type (area/bar/line for
 * time; bar/pie for categories). Replaces the former four separate charts.
 */
export function UsageChart({ timeSeries, byKind, byProvider, byUser, onSelect }: UsageChartProps) {
  const [dimension, setDimension] = useState<Dimension>("time");
  const [type, setType] = useState<ChartType>("area");

  function pickDimension(d: Dimension) {
    setDimension(d);
    setType(TYPES_FOR[d][0]);
  }

  const rows = useMemo(
    () => timeSeries.map((p) => ({ date: p.date, ...p.byProvider })),
    [timeSeries],
  );
  const providers = useMemo(() => providersIn(timeSeries), [timeSeries]);
  const breakdown = dimension === "kind" ? byKind : dimension === "provider" ? byProvider : byUser;
  const categorical = dimension !== "time";
  const colorAt = (key: string, i: number) =>
    dimension === "provider" ? providerColor(key) : colorForKey(key, i);
  const empty = categorical ? breakdown.length === 0 : rows.length === 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {DIMENSIONS.map((d) => (
            <Button
              key={d.value}
              type="button"
              size="sm"
              variant={dimension === d.value ? "secondary" : "ghost"}
              onClick={() => pickDimension(d.value)}
            >
              {d.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {TYPES_FOR[dimension].map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={type === t ? "secondary" : "ghost"}
              onClick={() => setType(t)}
            >
              {TYPE_LABEL[t]}
            </Button>
          ))}
        </div>
      </div>

      {empty ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No usage in this window.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  function renderChart() {
    if (dimension === "time" && type === "line") {
      return (
        <LineChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.15} />
          <XAxis dataKey="date" minTickGap={24} {...AXIS} />
          <YAxis width={56} tickFormatter={(v: number) => usd(v)} {...AXIS} />
          <Tooltip formatter={(v) => usd(Number(v))} />
          <Legend />
          {providers.map((p) => (
            <Line key={p} dataKey={p} stroke={providerColor(p)} dot={false} strokeWidth={1.75} />
          ))}
        </LineChart>
      );
    }

    if (dimension === "time" && type === "bar") {
      return (
        <BarChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.15} />
          <XAxis dataKey="date" minTickGap={24} {...AXIS} />
          <YAxis width={56} tickFormatter={(v: number) => usd(v)} {...AXIS} />
          <Tooltip formatter={(v) => usd(Number(v))} />
          <Legend />
          {providers.map((p) => (
            <Bar key={p} dataKey={p} stackId="c" fill={providerColor(p)} />
          ))}
        </BarChart>
      );
    }

    if (dimension === "time") {
      return (
        <AreaChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.15} />
          <XAxis dataKey="date" minTickGap={24} {...AXIS} />
          <YAxis width={56} tickFormatter={(v: number) => usd(v)} {...AXIS} />
          <Tooltip formatter={(v) => usd(Number(v))} />
          <Legend />
          {providers.map((p) => (
            <Area
              key={p}
              dataKey={p}
              type="monotone"
              stackId="c"
              stroke={providerColor(p)}
              fill={providerColor(p)}
              fillOpacity={0.25}
            />
          ))}
        </AreaChart>
      );
    }

    const onClick = onSelect
      ? (key: string) => onSelect(dimension as Exclude<Dimension, "time">, key)
      : undefined;

    if (type === "pie") {
      return (
        <PieChart>
          <Tooltip formatter={(v) => usd(Number(v))} />
          <Legend />
          <Pie data={breakdown} dataKey="cost" nameKey="key" outerRadius={100}>
            {breakdown.map((b, i) => (
              <Cell
                key={b.key}
                fill={colorAt(b.key, i)}
                cursor={onClick ? "pointer" : undefined}
                onClick={() => onClick?.(b.key)}
              />
            ))}
          </Pie>
        </PieChart>
      );
    }

    return (
      <BarChart data={breakdown} layout="vertical" margin={{ left: 8, right: 16, top: 4 }}>
        <CartesianGrid horizontal={false} strokeOpacity={0.15} />
        <XAxis type="number" tickFormatter={(v: number) => usd(v)} {...AXIS} />
        <YAxis type="category" dataKey="key" width={150} {...AXIS} />
        <Tooltip formatter={(v) => usd(Number(v))} />
        <Bar dataKey="cost">
          {breakdown.map((b, i) => (
            <Cell
              key={b.key}
              fill={colorAt(b.key, i)}
              cursor={onClick ? "pointer" : undefined}
              onClick={() => onClick?.(b.key)}
            />
          ))}
        </Bar>
      </BarChart>
    );
  }
}
