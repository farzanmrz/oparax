import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BrandIcon } from "@/components/brand-icon";
import { column, OneShell } from "@/components/one/shell";
import { lift } from "@/components/one/stage";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { monitorContent } from "@/lib/monitor/content";
import { readMonitor, readViewer } from "@/lib/monitor/read";
import { monitorState } from "@/lib/monitor-state";
import { cn } from "@/lib/utils";

const copy = monitorContent.notifications;

export const metadata: Metadata = {
  title: copy.title,
  robots: { index: false, follow: false },
};

// The owner's notification channels (design preview v2/one/notifications.tsx); one today, X DMs. The switch shows
// bot_state. Turning it on posts the existing activation form, which opens the "Start alerts" message to the bot;
// alerts turn on when that message arrives, so the switch stays as it is until bot_state changes. Off, pause and
// resume are the bot's own commands.
export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [monitor, viewer] = await Promise.all([readMonitor(handle), readViewer()]);
  if (!monitor) notFound();
  if (viewer.userId === null || viewer.userId !== monitor.user_id) redirect(`/${monitor.handle}`);
  const state = monitorState(monitor).state;
  const open = state === "trial" || state === "paid";
  const on = monitor.bot_state === "active";
  const paused = monitor.bot_state === "paused";
  const canTurnOn = open && !on && !paused;
  const line = on
    ? monitorContent.botActive
    : paused
      ? monitorContent.botPaused
      : !open
        ? monitorContent.activationUnavailable
        : monitor.bot_state === "stopped"
          ? monitorContent.botStopped
          : monitorContent.botHelp(monitor.display_handle);

  return (
    <OneShell email={viewer.email} monitor={monitor}>
      <PostHogUserContext id={viewer.userId} />
      <main className={`${column} relative flex-1 pt-7 pb-24`}>
        <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">
          {copy.title}
        </h1>
        <section aria-labelledby="xdm-title" className={cn(lift, "mt-6 max-w-[560px] p-4")}>
          <form method="post" action="/api/activation" className="flex items-center gap-3">
            <input type="hidden" name="monitorId" value={monitor.id} />
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-well text-t1">
              <BrandIcon name="x" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p id="xdm-title" className="text-[14px] font-semibold text-t1">
                {copy.xdm}
              </p>
              <p className="text-[12.5px] text-t3">{copy.xdmLine(monitor.display_handle)}</p>
            </div>
            <button
              type="submit"
              role="switch"
              aria-checked={on}
              aria-labelledby="xdm-title"
              aria-describedby="xdm-state"
              disabled={!canTurnOn}
              className={cn(
                "relative h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default",
                on ? "bg-[var(--brand)]" : "bg-[var(--line-strong)]",
                !canTurnOn && !on && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
                  on && "translate-x-4",
                )}
              />
            </button>
          </form>
          <p id="xdm-state" className="mt-4 text-[12.5px] leading-relaxed text-t2">
            {line}
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-t3">{copy.commands}</p>
        </section>
      </main>
    </OneShell>
  );
}
