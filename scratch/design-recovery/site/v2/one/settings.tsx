"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { profile } from "@/next/data/onboarding";
import { cn } from "@/lib/utils";
import { lift } from "@/v2/deck/chrome";
import { HANDLE, status } from "@/v2/deck/data";
import { Segments } from "@/v2/deck/marks";
import { BASE } from "./card";
import { Shell } from "./rail";

// The Settings page, thin (owner, Oct 4: "there also needs to be a settings page, maybe because that's where
// subscription and all will also come"): one lifted panel with the account, the plan, notifications and Sign out.
// Reached from the Settings link on the account row of the bubble menu. Notifications is a row here, not its own page
// (owner, Oct 4: "I don't understand why the notifications panel is so awkward"): the Notifications route renders
// this same page with that row lit once.

// Preview account email: the sample account has no stored address, so the form's placeholder domain is used.
const EMAIL = "farzan@newsroom.com";
/** The Oparax bot on X. Alerts arrive as DMs from it once the person has messaged it. */
const BOT = "oparax_ai";
/** How long the Notifications row stays lit when the Notifications route opens this page. */
const LIT_MS = 1500;

export function OneSettings({ highlight }: { highlight?: "notifications" }) {
  const [lit, setLit] = useState(highlight === "notifications");
  useEffect(() => {
    if (!lit) return;
    const t = window.setTimeout(() => setLit(false), LIT_MS);
    return () => window.clearTimeout(t);
  }, [lit]);
  return (
    <Shell
      header={
        <header className="flex items-center gap-3">
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Settings</h1>
        </header>
      }
    >
      <main className="min-w-0 pb-24">
        <div className={cn(lift, "max-w-[640px] divide-y divide-line overflow-hidden")} style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
          <Row label="Account">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white">{profile.name[0]}</span>
              <div className="min-w-0 leading-tight">
                <p className="text-[14px] font-semibold text-t1">{profile.name}</p>
                <p className="mt-0.5 truncate text-[12.5px] text-t3">
                  <span className="text-[var(--kind-post)]">@{HANDLE}</span>
                  <span className="mx-1.5 text-t4">·</span>
                  {EMAIL}
                </p>
              </div>
            </div>
          </Row>
          <Row label="Plan">
            <div className="flex min-w-0 flex-1 items-center gap-5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-t1">
                  <span className="font-semibold">Free week</span>, {status.daysLeft} days left
                </p>
                <div className="mt-2 max-w-[240px]">
                  <Segments total={status.trialDays} filled={status.daysLeft} />
                </div>
                <p className="mt-1.5 text-[11.5px] tabular-nums text-t3">
                  {status.poolUsed} of {status.poolLimit} watched X posts used
                </p>
              </div>
              <Link href={`${BASE}/landing#pricing`} className="shrink-0 rounded-sm text-[13px] text-t2 underline-offset-4 transition-colors hover:text-t1 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                Plans
              </Link>
            </div>
          </Row>
          <Row label="Notifications" id="notifications" className={cn("transition-colors duration-700 ease-out", lit && "bg-[var(--brand-soft)] duration-0")}>
            {/* The title and the button share the first line so the sentence keeps one line at 640px. */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line-strong bg-[var(--raised)]" style={{ boxShadow: "var(--top-light)" }}>
                  <XLogo className="size-3 text-t1" />
                </span>
                <p className="min-w-0 flex-1 text-[14px] font-semibold text-t1">X DMs</p>
                <a
                  href={`https://x.com/messages/compose?recipient_id=${BOT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Message @{BOT}
                </a>
              </div>
              <p className="mt-1 pl-10 text-[12.5px] whitespace-nowrap text-t3">Oparax messages @{HANDLE} on X when a story matters.</p>
            </div>
          </Row>
          <Row label="">
            <Link
              href={`${BASE}/login`}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring"
              style={{ boxShadow: "var(--top-light)" }}
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Sign out
            </Link>
          </Row>
        </div>
      </main>
    </Shell>
  );
}

function Row({ label, children, id, className }: { label: string; children: React.ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} aria-label={label || undefined} className={cn("flex min-h-[72px] items-center gap-6 px-5 py-4", className)}>
      <p className="w-[92px] shrink-0 text-[13px] font-medium text-t3">{label}</p>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </section>
  );
}
