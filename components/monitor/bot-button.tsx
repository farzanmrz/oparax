import { Button } from "@/components/ui/button";
import { monitorContent as copy } from "@/lib/monitor/content";
import type { MonitorState } from "@/lib/monitor-state";

export function BotButton({
  monitorId,
  handle,
  botState,
  state,
}: {
  monitorId: string;
  handle: string;
  botState: string;
  state: MonitorState["state"];
}) {
  if (state !== "trial" && state !== "paid") return null;
  return (
    <div className="flex flex-col items-start gap-2">
      {botState === "active" ? <p>{copy.botActive}</p> : null}
      {botState === "paused" ? <p>{copy.botPaused}</p> : null}
      {botState === "stopped" ? <p>{copy.botStopped}</p> : null}
      {botState !== "active" && botState !== "paused" ? (
        <>
          <form method="post" action="/api/activation">
            <input type="hidden" name="monitorId" value={monitorId} />
            <Button className="min-h-11 desk:min-h-7">{copy.bot}</Button>
          </form>
          <p className="text-sm text-muted-foreground">{copy.botHelp(handle)}</p>
        </>
      ) : null}
      <Button asChild variant="outline" className="min-h-11 desk:min-h-7">
        <a href={`/${handle}`}>{copy.checkConnection}</a>
      </Button>
    </div>
  );
}
