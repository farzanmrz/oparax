"use client";

import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { lift } from "@/v2/deck/chrome";
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
        {/* The Settings page's row list (owner, Oct 4: "that card itself doesn't look good"): a label column, the
            line, and one quiet bordered button at the right. */}
        <div className={cn(lift, "max-w-[760px] divide-y divide-line overflow-hidden")} style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
          <section aria-label="X DMs" className="flex min-h-[72px] items-center gap-6 px-5 py-4">
            <span className="w-[96px] shrink-0 text-[13px] text-t3">X DMs</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] text-t1">Oparax messages @{HANDLE} on X when a story matters.</p>
              <p className="mt-1 text-[12.5px] text-t3">Send the bot a message from your account first. Alerts start after that DM.</p>
            </div>
            <a
              href={`https://x.com/messages/compose?recipient_id=${BOT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring"
              style={{ boxShadow: "var(--top-light)" }}
            >
              <XLogo className="size-3.5" />
              Message @{BOT}
            </a>
          </section>
        </div>
      </main>
    </Shell>
  );
}
