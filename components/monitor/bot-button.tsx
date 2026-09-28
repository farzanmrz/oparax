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
  if (botState === "active") return <p>{copy.botActive}</p>;
  if (botState === "paused") return <p>{copy.botPaused}</p>;
  return (
    <div className="space-y-2">
      {botState === "stopped" ? <p>{copy.botStopped}</p> : null}
      <form method="post" action="/api/activation">
        <input type="hidden" name="monitorId" value={monitorId} />
        <Button className="min-h-11 desk:min-h-6">{copy.bot}</Button>
      </form>
      <p className="text-sm text-muted-foreground">{copy.botHelp(handle)}</p>
    </div>
  );
}
