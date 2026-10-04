"use client";

import { useState } from "react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { HANDLE } from "@/v2/deck/data";
import { Expand, Shell } from "./rail";

// The Notifications page: the channels Oparax can alert the person on. One today, X DMs (owner, Oct 4: "the
// notification itself is a section... the notifications themselves can be by X, by a bunch of other stuff we can add").

export function OneNotifications() {
  const [xdm, setXdm] = useState(false);
  return (
    <Shell
      header={
        <header className="flex items-center gap-3">
          <Expand />
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Notifications</h1>
        </header>
      }
    >
      <main className="min-w-0 pb-20">
        <div className={cn(lift, "max-w-[560px] p-4")} style={liftStyle}>
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-[var(--well)] text-t1">
              <XLogo className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-t1">X DMs</p>
              <p className="text-[12.5px] text-t3">Oparax messages @{HANDLE} on X when a story matters.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={xdm}
              aria-label="X DMs"
              onClick={() => setXdm(!xdm)}
              className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-ring", xdm ? "bg-[var(--brand)]" : "bg-[var(--line-strong)]")}
            >
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", xdm ? "left-0.5 translate-x-4" : "left-0.5")} />
            </button>
          </div>
          <p className="mt-4 text-[12.5px] text-t3">{xdm ? "On. Your agent will DM you." : "Off. Turn it on and the first DM arrives with the next story that matters."}</p>
        </div>
      </main>
    </Shell>
  );
}
