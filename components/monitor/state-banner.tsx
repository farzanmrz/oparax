import { PayButtons } from "@/components/monitor/pay-buttons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { monitorContent as copy } from "@/lib/monitor/content";
import type { PublicMonitor } from "@/lib/monitor/read";
import type { MonitorState } from "@/lib/monitor-state";

export function StateBanner({
  monitor,
  state,
  isOwner,
}: {
  monitor: PublicMonitor;
  state: MonitorState;
  isOwner: boolean;
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
      {state.state === "exhausted" ? (
        <Alert>
          <AlertDescription>{isOwner ? copy.exhausted : copy.publicFrozen}</AlertDescription>
        </Alert>
      ) : null}
      {state.state === "frozen" ? (
        <>
          <Alert variant={isOwner ? "destructive" : "default"}>
            {isOwner ? (
              <AlertTitle>
                <h2 className="font-heading text-lg font-bold">{copy.frozenTitle}</h2>
              </AlertTitle>
            ) : null}
            <AlertDescription className="text-sm">
              {isOwner ? copy.frozen : copy.publicFrozen}
            </AlertDescription>
          </Alert>
          {isOwner ? <PayButtons monitorId={monitor.id} /> : null}
        </>
      ) : null}
      {state.state === "lapsed" ? (
        <Alert variant={isOwner ? "destructive" : "default"}>
          <AlertDescription className="space-y-3 text-sm">
            <p>{isOwner ? copy.lapsed : copy.publicFrozen}</p>
            {isOwner ? (
              <>
                <form method="post" action="/api/stripe/portal">
                  <input type="hidden" name="monitorId" value={monitor.id} />
                  <Button className="min-h-11 desk:min-h-6">{copy.updateCard}</Button>
                </form>
                <PayButtons monitorId={monitor.id} />
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {state.state === "paid" || state.state === "trial" ? (
        <p className="text-sm">
          {state.state === "trial"
            ? copy.trialPool(monitor.pool_used, monitor.pool_limit)
            : copy.pool(monitor.pool_used, monitor.pool_limit)}
        </p>
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
