"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, Plus } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { profile, SITES_MAX } from "@/next/data/onboarding";
import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { groups, HANDLE, sources as initialSources, status, type Group, type Source } from "@/v2/deck/data";
import { GroupGlyph, Segments, SourceMark, XAvatar } from "@/v2/deck/marks";
import { BASE } from "./card";
import { AppShell, PageLine } from "./shell";

// The one Settings page: account, plan, sources and notifications (owner, Oct 4: "Why are you making notifications
// and sources this separate shit?"). Two columns on Deck's ground. Left, wide: the source groups as lifted sections
// of their own, each a heading with its glyph and Add source, rows of logo, name and handle or address on one line,
// Remove on hover and focus, the reason under the row on click; no counts except the shared limit for websites and
// feeds, said once. Right, sticky: one identity block holding the person, the plan, X DMs and Sign out.

// Preview account email: the sample account has no stored address, so the form's placeholder domain is used.
const EMAIL = "farzan@newsroom.com";
/** The Oparax bot on X. Alerts arrive as DMs from it once the person has messaged it. */
const BOT = "oparax_ai";

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function OneSettings() {
  const [list, setList] = useState<Source[]>(initialSources);
  const [open, setOpen] = useState<string | null>(null);
  const sitesAndFeeds = list.filter((s) => s.group === "rss" || s.group === "website").length;
  const remove = (id: string) => {
    setList((prev) => prev.filter((s) => s.id !== id));
    if (open === id) setOpen(null);
  };
  return (
    <AppShell>
      <PageLine title="Settings" />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3">
          {groups.map((g) => {
            const members = list.filter((s) => s.group === g.id);
            return (
              <section key={g.id} aria-label={g.label} className={cn(lift, "px-3 pt-3.5 pb-2.5")} style={liftStyle}>
                <div className="flex items-center gap-2.5 px-2">
                  <span className="grid size-5 place-items-center text-t3">
                    <GroupGlyph group={g.id} className="size-3.5" />
                  </span>
                  <h2 className="text-[15px] font-semibold text-t1">{g.label}</h2>
                  <button
                    type="button"
                    className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-[var(--window)] px-2.5 text-[12.5px] font-medium text-t2 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
                    style={{ boxShadow: "var(--top-light)" }}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Add source
                  </button>
                </div>
                {g.id === "rss" ? (
                  <p className="mt-0.5 pl-[38px] text-[12px] tabular-nums text-t3">
                    {sitesAndFeeds} of {SITES_MAX} websites and feeds
                  </p>
                ) : null}
                <ul className="mt-2">
                  {members.map((s) => (
                    <SourceRow key={s.id} source={s} group={g.id} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} onRemove={() => remove(s.id)} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <aside aria-label="Account" className="lg:sticky lg:top-[84px]">
          <div className={cn(lift, "divide-y divide-line")} style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
            <div className="p-5">
              <XAvatar handle={HANDLE} size={44} />
              <p className="mt-3 truncate text-[14.5px]">
                <span className="font-semibold text-t1">{profile.name}</span>
                <span className="ml-1.5 text-t3">@{HANDLE}</span>
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-t2">{profile.bio}</p>
              <p className="mt-2 text-[12.5px] text-t3">{EMAIL}</p>
            </div>
            <div className="p-5">
              <div className="flex items-baseline gap-3">
                <p className="text-[13.5px] text-t1">
                  <span className="font-semibold">Free week</span>, {status.daysLeft} days left
                </p>
                <Link
                  href={`${BASE}/landing#pricing`}
                  className="ml-auto shrink-0 rounded-sm text-[13px] text-t2 underline decoration-line-strong underline-offset-4 transition-colors hover:text-t1 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring"
                >
                  Plans
                </Link>
              </div>
              <div className="mt-2.5">
                <Segments total={status.trialDays} filled={status.daysLeft} />
              </div>
              <p className="mt-2 text-[12px] tabular-nums text-t3">
                {status.poolUsed} of {status.poolLimit} watched X posts used
              </p>
            </div>
            <div className="p-5">
              <p className="flex items-center gap-2.5 text-[13.5px] font-semibold text-t1">
                <span className="grid size-6 place-items-center rounded-md border border-line-strong bg-[var(--raised)]" style={{ boxShadow: "var(--top-light)" }}>
                  <XLogo className="size-3 text-t1" />
                </span>
                X DMs
              </p>
              <p className="mt-2 text-[12.5px] text-t3">Oparax messages @{HANDLE} on X when a story matters.</p>
              <a
                href={`https://x.com/messages/compose?recipient_id=${BOT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <XLogo className="size-3" />
                Message @{BOT}
              </a>
            </div>
            <div className="p-5">
              <Link
                href={`${BASE}/login`}
                className="inline-flex h-8 items-center gap-2 rounded-md border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring"
                style={{ boxShadow: "var(--top-light)" }}
              >
                <LogOut className="size-3.5" aria-hidden="true" />
                Sign out
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function SourceRow({ source: s, group, open, onToggle, onRemove }: { source: Source; group: Group; open: boolean; onToggle: () => void; onRemove: () => void }) {
  return (
    <li className={cn("group/row rounded-md transition-colors", open ? "bg-[var(--raised)]" : "hover:bg-raised focus-within:bg-raised")}>
      <div className="flex min-h-10 items-center gap-1 pr-1.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-md px-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
        >
          <SourceMark source={s} size={20} className={group === "x" ? "" : "rounded-[5px]"} />
          <span className="min-w-0 flex-1 truncate">
            <span className="text-[13.5px] font-medium text-t1">{s.name}</span>
            <span className="ml-2 text-[12.5px] text-t3">{s.handle}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${s.name}`}
          className="h-7 shrink-0 rounded-md px-2 text-[12.5px] text-t3 opacity-0 transition-[opacity,color] group-hover/row:opacity-100 group-focus-within/row:opacity-100 hover:text-[var(--error)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
        >
          Remove
        </button>
      </div>
      {open ? (
        <div className="pr-4 pb-3 pl-[44px] text-[13px] leading-[1.5]">
          {s.focus ? <p className="text-t1">{cap(s.focus)}.</p> : null}
          {s.why ? <p className="mt-0.5 text-t2">{s.why}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
