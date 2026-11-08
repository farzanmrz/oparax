import { BrandIcon } from "@/components/brand-icon";
import { BandCard } from "@/components/one/band-card";
import { primaryButton } from "@/components/one/stage";
import { monitorContent } from "@/lib/monitor/content";
import { settingsContent } from "@/lib/settings/content";
import { cn } from "@/lib/utils";

// The Notifications page (owner, Oct 10: "Notifications look fine", locked; lab v2/one/notifications.tsx): one band
// card, Twitter DMs. The band holds the X mark, the title and the connection state at the right; the body holds
// Message @oparax_ai while alerts are not on (the existing activation form, which opens the "Start alerts" message to
// the bot), and the product's line for that state. The alert hour and the digests are dropped (owner, Oct 9).

const dm = monitorContent.notifications;
const stateTone: Record<string, string> = {
  active: "bg-[var(--ok)]",
  paused: "bg-[var(--caution)]",
  stopped: "bg-[var(--error)]",
};

export function NotificationsPage({
  monitorId,
  displayHandle,
  botState,
  open,
  failedDeliveries,
}: {
  monitorId: string;
  displayHandle: string;
  botState: string;
  /** The free week or a paid plan is running, so the connection can open. */
  open: boolean;
  /** Null when the delivery read failed. */
  failedDeliveries: number | null;
}) {
  const on = botState === "active";
  const paused = botState === "paused";
  const word =
    botState === "active" || botState === "paused" || botState === "stopped"
      ? dm.states[botState]
      : dm.states.none;
  const line = on
    ? monitorContent.botActive
    : paused
      ? monitorContent.botPaused
      : !open
        ? monitorContent.activationUnavailable
        : botState === "stopped"
          ? monitorContent.botStopped
          : monitorContent.botHelp(displayHandle);
  return (
    <BandCard
      className="mt-6"
      glyph={<BrandIcon name="x" className="size-4 shrink-0 text-t1" />}
      heading={dm.xdm}
      action={
        <span className="inline-flex items-center gap-1.5 text-[13px] text-t3">
          <span
            aria-hidden="true"
            className={cn("size-2 rounded-full", stateTone[botState] ?? "border border-t3")}
          />
          {word}
        </span>
      }
      bodyClassName="px-5 pt-4 pb-5"
    >
      {open && !on && !paused ? (
        <form method="post" action="/api/activation">
          <input type="hidden" name="monitorId" value={monitorId} />
          <button type="submit" className={cn(primaryButton, "h-9 px-3.5 text-[13px]")}>
            <BrandIcon name="x" className="size-3" />
            {dm.message}
          </button>
        </form>
      ) : null}
      <p
        className={cn(
          "text-[13px] leading-[1.5]",
          on || paused ? "text-t1" : "text-t2",
          open && !on && !paused && "mt-3.5",
        )}
      >
        {line}
      </p>
      {failedDeliveries ? (
        <p role="alert" className="mt-2 text-[12.5px] leading-[1.5] text-[var(--error)]">
          {settingsContent.alerts.deliveries(failedDeliveries)}
        </p>
      ) : null}
      {on || paused ? (
        <p className="mt-2 text-[12.5px] leading-[1.5] text-t3">{dm.commands}</p>
      ) : null}
    </BandCard>
  );
}
