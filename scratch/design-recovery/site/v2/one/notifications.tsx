"use client";

import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { HANDLE } from "@/v2/deck/data";
import { Shell } from "./rail";

// The Notifications page: the channels Oparax can alert the person on. One today, X DMs, with no toggle (owner,
// Oct 4: "there won't be a toggle. There'll be a button because the plan is that this takes them to their X
// website, where they have to DM the bot").

const BOT = "oparax_ai";

export function OneNotifications() {
  return (
    <Shell
      header={
        <header className="flex items-center gap-3">
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Notifications</h1>
        </header>
      }
    >
      <main className="min-w-0 pb-20">
        <div className={cn(lift, "max-w-[640px] p-4")} style={liftStyle}>
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-[var(--well)] text-t1">
              <XLogo className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-t1">X DMs</p>
              <p className="text-[12.5px] text-t3">Oparax messages @{HANDLE} on X when a story matters.</p>
            </div>
            <a
              href={`https://x.com/messages/compose?recipient_id=${BOT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <XLogo className="size-3" />
              Message @{BOT} on X
            </a>
          </div>
          <p className="mt-3 border-t border-line pt-3 pl-12 text-[12.5px] text-t3">Send the bot a message from your account. Alerts start after that first DM.</p>
        </div>
      </main>
    </Shell>
  );
}
