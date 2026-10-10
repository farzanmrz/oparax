"use client";

import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { HANDLE } from "@/v2/deck/data";
import { BandCard } from "./card-band";
import { AppShell, PageLine } from "./shell";

// The Notifications page: one band card, Twitter DMs. The band holds the X mark, the title and the connection state
// at the right; the body holds Message @oparax_ai while alerts are not on, and the product's line for that state
// (lib/monitor/content.ts). The alert hour and the digests are dropped (owner, Oct 9). ?dm=connected|waiting|paused|
// stopped picks the sample state; waiting (not connected yet) is the default.

/** The Oparax bot on Twitter. Alerts arrive as DMs from it once the person has messaged it. */
const BOT = "oparax_ai";

export type DmState = "connected" | "waiting" | "paused" | "stopped";

const word: Record<DmState, string> = { connected: "Connected", waiting: "Not Connected", paused: "Paused", stopped: "Stopped" };
const tone: Record<DmState, string> = {
  connected: "bg-[var(--ok)]",
  waiting: "border border-t3",
  paused: "bg-[var(--caution)]",
  stopped: "bg-[var(--error)]",
};
const line: Record<DmState, string> = {
  connected: "Alerts on. Send STOP to the bot to stop.",
  waiting: `Opens a message to @${BOT} with "Start alerts" typed. Send it from @${HANDLE} to connect alerts; that message is how Oparax confirms the account is yours. The bot will not reply.`,
  paused: "Alerts paused. Send RESUME to the bot to continue.",
  stopped: 'Alerts stopped. Send "Start alerts" from your Twitter account to turn them on again.',
};
const COMMANDS = `Commands, sent to @${BOT} on Twitter: STOP pauses alerts, RESUME turns them back on, and "Start alerts" connects them again after a stop.`;

export function OneNotifications({ dm = "waiting" }: { dm?: DmState }) {
  const on = dm === "connected" || dm === "paused";
  return (
    <AppShell>
      <PageLine title="Notifications" />
      <BandCard
        className="mt-6"
        glyph={<XLogo className="size-4 shrink-0 text-t1" />}
        heading="Twitter DMs"
        action={
          <span className="inline-flex items-center gap-1.5 text-[13px] text-t3">
            <span aria-hidden="true" className={cn("size-2 rounded-full", tone[dm])} />
            {word[dm]}
          </span>
        }
        bodyClassName="px-5 pt-4 pb-5"
      >
        {on ? null : (
          <a
            href={`https://x.com/messages/compose?text=${encodeURIComponent("Start alerts")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <XLogo className="size-3" />
            Message @{BOT}
          </a>
        )}
        <p className={cn("text-[13px] leading-[1.5]", on ? "text-t1" : "mt-3.5 text-t2")}>{line[dm]}</p>
        {on ? <p className="mt-2 text-[12.5px] leading-[1.5] text-t3">{COMMANDS}</p> : null}
      </BandCard>
    </AppShell>
  );
}
