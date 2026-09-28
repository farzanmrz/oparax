import Link from "next/link";
import { PayButtons } from "@/components/monitor/pay-buttons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { monitorContent as copy } from "@/lib/monitor/content";
import type { PublicMonitor } from "@/lib/monitor/read";
import type { MonitorState } from "@/lib/monitor-state";

export function StateBanner({
  monitor,
  state,
  signedIn,
}: {
  monitor: PublicMonitor;
  state: MonitorState;
  signedIn: boolean;
}) {
  return (
    <div className="space-y-4">
      {state.state === "trial" ? (
        <p
          className={
            state.daysLeft !== null && state.daysLeft < 3
              ? "text-amber-800 dark:text-amber-300"
              : "text-muted-foreground"
          }
        >
          {copy.trial(state.daysLeft ?? 0)}
        </p>
      ) : null}
      {state.state === "paused" ? (
        <Alert>
          <AlertDescription>{copy.paused}</AlertDescription>
        </Alert>
      ) : null}
      {state.state === "exhausted" ? (
        <Alert>
          <AlertDescription>{copy.exhausted}</AlertDescription>
        </Alert>
      ) : null}
      {state.state === "frozen" ? (
        <>
          <Alert variant="destructive">
            <AlertTitle>
              <h2 className="font-heading text-lg font-bold">{copy.frozenTitle}</h2>
            </AlertTitle>
            <AlertDescription className="text-sm">{copy.frozen}</AlertDescription>
          </Alert>
          <PayButtons monitorId={monitor.id} />
        </>
      ) : null}
      {state.state === "lapsed" ? (
        <Alert variant="destructive">
          <AlertDescription className="space-y-3 text-sm">
            <p>{copy.lapsed}</p>
            {signedIn ? (
              <form method="post" action="/api/stripe/portal">
                <input type="hidden" name="monitorId" value={monitor.id} />
                <Button className="min-h-11 desk:min-h-6">{copy.updateCard}</Button>
              </form>
            ) : (
              <Button asChild className="min-h-11 desk:min-h-6">
                <Link href={`/login?next=${encodeURIComponent(`/${monitor.handle}`)}`}>
                  {copy.updateCard}
                </Link>
              </Button>
            )}
            <PayButtons monitorId={monitor.id} />
          </AlertDescription>
        </Alert>
      ) : null}
      {state.state === "paid" || state.state === "trial" ? (
        <p className="font-mono text-sm">{copy.pool(monitor.pool_used, monitor.pool_limit)}</p>
      ) : null}
      {(state.state === "paid" || state.state === "trial") && !state.poolOpen ? (
        <p className="text-sm text-amber-800 dark:text-amber-300">
          {state.state === "trial"
            ? copy.trialPoolPaused
            : copy.poolPaused(
                monitor.paid_through
                  ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
                      new Date(monitor.paid_through),
                    )
                  : copy.renewal,
              )}
        </p>
      ) : null}
    </div>
  );
}
