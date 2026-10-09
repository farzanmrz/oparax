"use client";

import { useId, useState } from "react";
import { XLogo } from "@/pro/shared/brand";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { lift } from "@/v2/deck/chrome";
import { HANDLE } from "@/v2/deck/data";
import { AppShell, PageLine } from "./shell";

// The Notifications page, reached from the rail (council on the One's chrome, Oct 8: moved out of Settings). One
// lifted panel in three parts side by side: Twitter DMs (the connection in words, the product's line for that state,
// and Message @oparax_ai while alerts are not on), Alerts (the hour and the timezone with Save) and Digests (the
// GitHub and Product Hunt switches). The copy is the product's (lib/monitor/content.ts, lib/settings/content.ts).
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

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;
const TIMEZONES = ["UTC", "America/Los_Angeles", "America/New_York", "Europe/London", "Europe/Madrid", "Asia/Kolkata", "Asia/Tokyo"];

const heading = "text-[13.5px] font-semibold text-t1";
const field =
  "h-9 w-full rounded-md border border-line-strong bg-[var(--well)] px-2.5 text-[13px] text-t1 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)]";

export function OneNotifications({ dm = "waiting" }: { dm?: DmState }) {
  return (
    <AppShell>
      <PageLine title="Notifications" />
      <div
        className={cn(lift, "mt-6 grid divide-y divide-line lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.8fr)] lg:divide-x lg:divide-y-0")}
        style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
      >
        <TwitterDms state={dm} />
        <Alerts />
        <Digests />
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

/** The alert hour and timezone with Save (a preview: Save confirms in place, nothing is stored). */
function Alerts() {
  const id = useId();
  const [saved, setSaved] = useState(false);
  return (
    <form
      aria-label="Alerts"
      className="p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(true);
      }}
      onChange={() => setSaved(false)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={heading}>Alerts</h2>
        <p className="text-[12.5px] text-t2">Daily</p>
      </div>
      <div className="mt-3.5 grid grid-cols-[92px_minmax(0,1fr)] gap-2.5">
        <label htmlFor={`${id}-hour`} className="grid gap-1.5 text-[12px] text-t3">
          Alert hour
          <select id={`${id}-hour`} name="hour" defaultValue="8" className={cn(field, "tabular-nums")}>
            {HOURS.map((h) => (
              <option key={h} value={String(h)}>
                {hourLabel(h)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-timezone`} className="grid gap-1.5 text-[12px] text-t3">
          Timezone
          <select id={`${id}-timezone`} name="timezone" defaultValue="UTC" className={field}>
            {TIMEZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3.5 flex items-center gap-3">
        <button
          type="submit"
          className="inline-flex h-8 items-center rounded-md border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring"
          style={{ boxShadow: "var(--top-light)" }}
        >
          Save
        </button>
        <p aria-live="polite" className="text-[12.5px] text-[var(--ok)]">
          {saved ? "Saved." : ""}
        </p>
      </div>
    </form>
  );
}

/** The GitHub and Product Hunt digests, each a switch. */
function Digests() {
  return (
    <section aria-label="Digests" className="p-5">
      <h2 className={heading}>Digests</h2>
      <div className="mt-3.5 grid gap-3">
        <Digest label="GitHub digest" />
        <Digest label="Product Hunt digest" />
      </div>
    </section>
  );
}

function Digest({ label }: { label: string }) {
  const id = useId();
  const [on, setOn] = useState(true);
  return (
    <div className="flex items-center gap-2.5">
      <Switch
        id={id}
        checked={on}
        onCheckedChange={setOn}
        className="data-[state=checked]:bg-[var(--primary)] data-[state=unchecked]:bg-line-strong"
      />
      <label htmlFor={id} className="cursor-pointer text-[13px] text-t2">
        {label}
      </label>
    </div>
  );
}
