"use client";

import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { lift } from "@/v2/deck/chrome";
import { HANDLE } from "@/v2/deck/data";
import { AppShell, PageLine } from "./shell";

// The Notifications page, reached from the rail (council on the One's chrome, Oct 8: moved out of Settings). One
// lifted block: Twitter DMs, the connection in words, the product's line for that state, and Message @oparax_ai while
// alerts are not on. The alert hour and the digests are dropped (owner, Oct 9: "Drop alert R and digest for now. Just
// drop it."). The copy is the product's (lib/monitor/content.ts).
// ?dm=connected|waiting|paused|stopped picks the sample state; waiting (not connected yet) is the default, as the
// lab's settings showed it.

/** The Oparax bot on Twitter. Alerts arrive as DMs from it once the person has messaged it. */
const BOT = "oparax_ai";

export type DmState = "connected" | "waiting" | "paused" | "stopped";

const word: Record<DmState, string> = { connected: "Connected", waiting: "Not connected", paused: "Paused", stopped: "Stopped" };
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

const heading = "text-[13.5px] font-semibold text-t1";

export function OneNotifications({ dm = "waiting" }: { dm?: DmState }) {
  return (
    <AppShell>
      <PageLine title="Notifications" />
      <div className={cn(lift, "mt-6 max-w-[640px]")} style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
        <TwitterDms state={dm} />
      </div>
    </AppShell>
  );
}

/** The Twitter DM connection in words, the product's line for that state, and the action while alerts are not on. */
function TwitterDms({ state }: { state: DmState }) {
  const on = state === "connected" || state === "paused";
  return (
    <section aria-label="Twitter DMs" className="p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-6 place-items-center rounded-md border border-line-strong bg-[var(--raised)]" style={{ boxShadow: "var(--top-light)" }}>
          <XLogo className="size-3 text-t1" />
        </span>
        <h2 className={heading}>Twitter DMs</h2>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-t2">
          <span aria-hidden="true" className={cn("size-2 rounded-full", tone[state])} />
          {word[state]}
        </span>
      </div>
      <p className="mt-2 text-[12.5px] text-t3">Oparax messages @{HANDLE} on Twitter when a story matters.</p>
      {on ? null : (
        <a
          href={`https://x.com/messages/compose?text=${encodeURIComponent("Start alerts")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3.5 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <XLogo className="size-3" />
          Message @{BOT}
        </a>
      )}
      <p className={cn("mt-3 text-[12.5px] leading-[1.5]", state === "connected" ? "text-t1" : "text-t2")}>{line[state]}</p>
      {on ? <p className="mt-2 text-[12.5px] leading-[1.5] text-t3">{COMMANDS}</p> : null}
    </section>
  );
}
