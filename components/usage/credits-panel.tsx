import { Badge } from "@/components/ui/badge";
import { usd2 } from "@/lib/usage/format";
import type { PlatformCredit } from "@/lib/usage/credits";

interface CreditsPanelProps {
  credits: PlatformCredit[];
}

/**
 * Live balances pulled from each platform's billing API on page load (these are
 * free account endpoints). Shows available credit, spend, and any limit per
 * platform — including the Vercel gateway fallback, which should stay near $25
 * (untouched) as long as the BYOK providers are topped up.
 */
export function CreditsPanel({ credits }: CreditsPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">Platform credits & limits</h2>
        <span className="text-xs text-muted-foreground">live · refresh the page to update</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {credits.map((c) => (
          <div
            key={c.platform}
            className="flex flex-col gap-1 rounded-md border border-border bg-background p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{c.platform}</span>
              {c.low ? (
                <Badge variant="destructive">low</Badge>
              ) : c.balance !== null ? (
                <Badge variant="secondary">ok</Badge>
              ) : null}
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold tabular-nums text-foreground">
                {c.balance !== null ? usd2(c.balance) : c.used !== null ? usd2(c.used) : "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {c.balance !== null ? "available" : c.used !== null ? "used" : ""}
              </span>
            </div>

            <div className="text-xs text-muted-foreground">
              {c.balance !== null && c.used !== null ? <span>used {usd2(c.used)} · </span> : null}
              {c.limit !== null ? <span>limit {usd2(c.limit)}</span> : <span>{c.note}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
