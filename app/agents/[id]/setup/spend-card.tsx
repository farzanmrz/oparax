"use client";

// app/agents/[id]/setup/spend-card.tsx
//
// Setup's Spend card. A pure display leaf: `lib/agent/spend-query.ts`'s
// `loadSpendWindows` precomputes all three period windows server-side (Weekly / Monthly /
// Yearly) in `page.tsx` — this component only switches which precomputed window it renders,
// never queries the DB itself. Spend is owner-wide ("across all your desks") because
// neither `model_calls` nor `usage_events` carries an `experiment_id` — see spend-query.ts's
// header comment.

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SpendPeriod, SpendStage, SpendWindow } from "@/lib/agent/spend-query";
import { SPEND_PERIOD_LABELS } from "@/lib/agent/spend-query";
import { formatCost } from "@/lib/format";

const STAGE_LABEL: Record<SpendStage, string> = {
  drafting: "Drafting",
  judge: "Judging",
  voice_extraction: "Voice extraction",
};

export function SpendCard({ windows }: { readonly windows: Record<SpendPeriod, SpendWindow> }) {
  const [period, setPeriod] = useState<SpendPeriod>("monthly");
  const active = windows[period];
  const deliveryTotal = active.deliveryCount.slack + active.deliveryCount.email;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Spend</CardTitle>
        <div className="flex items-center gap-3">
          <Select onValueChange={(value) => setPeriod(value as SpendPeriod)} value={period}>
            <SelectTrigger className="text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SPEND_PERIOD_LABELS) as SpendPeriod[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {SPEND_PERIOD_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatCost(active.totalUsd)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">Across all your desks.</p>
        <dl className="flex flex-col gap-1.5">
          {active.rollup.map((row) => (
            <div className="flex items-center justify-between text-sm" key={row.stage}>
              <dt className="text-muted-foreground">{STAGE_LABEL[row.stage]}</dt>
              <dd className="font-mono tabular-nums">{formatCost(row.costUsd)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm">
            <dt className="text-muted-foreground">Delivery (Slack, email)</dt>
            <dd className="font-mono text-muted-foreground tabular-nums">{deliveryTotal} sent</dd>
          </div>
        </dl>
        <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
          <span>Total</span>
          <span className="font-mono tabular-nums">{formatCost(active.totalUsd)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
