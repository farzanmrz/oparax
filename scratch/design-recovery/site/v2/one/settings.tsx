"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, X as CloseIcon } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { profile, SITES_MAX } from "@/next/data/onboarding";
import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { groups, HANDLE, sources as initialSources, status, type Group, type Source } from "@/v2/deck/data";
import { GroupGlyph, Segments, SourceMark, XAvatar } from "@/v2/deck/marks";
import { BASE } from "./card";
import { ACCOUNT_EMAIL as EMAIL, AppShell, PageLine, SignOut } from "./shell";

// The one Settings page: account, plan, sources and notifications (owner, Oct 4: "Why are you making notifications
// and sources this separate shit?"). Two columns in the page's one column. Left, the body: the sources as ONE lifted
// panel, four sections divided by hairlines (X accounts, RSS feeds, Websites, GitHub), each a heading line (the kind
// mark, the kind name, Add source at the right) over one-line rows (logo, name, handle or address; an x at the right
// on hover and focus; the reason under the row on click). No counts except the shared limit for websites and feeds,
// said once. Right, a 360px sticky block, one object: the person, the plan, X DMs and Sign out.

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
        <div className={cn(lift, "divide-y divide-line")} style={liftStyle}>
          {groups.map((g) => {
            const members = list.filter((s) => s.group === g.id);
            return (
              <section key={g.id} aria-label={g.label} className="px-3 pt-3.5 pb-2.5">
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
                <ul className="mt-2 grid items-start gap-x-4 xl:grid-cols-2">
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
              <div className="flex items-center gap-3">
                <XAvatar handle={HANDLE} size={48} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] leading-tight font-semibold text-t1">{profile.name}</p>
                  <p className="mt-0.5 truncate text-[13px] leading-tight text-t3">@{HANDLE}</p>
                </div>
              </div>
              <p className="mt-3 truncate text-[12.5px] text-t2">{EMAIL}</p>
            </div>
            <div className="p-5">
              <div className="flex items-baseline gap-3">
                <p className="text-[13.5px] font-semibold text-t1">Free week</p>
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
              <p className="mt-2 flex justify-between gap-3 text-[12px] tabular-nums text-t3">
                <span>
                  <span className="font-medium text-t1">{status.daysLeft}</span> days left
                </span>
                <span>
                  {status.poolUsed} of {status.poolLimit} watched X posts used
                </span>
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
              <SignOut />
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
          className="grid size-7 shrink-0 place-items-center rounded-md text-t3 opacity-0 transition-[opacity,color] group-hover/row:opacity-100 group-focus-within/row:opacity-100 hover:text-[var(--error)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <CloseIcon className="size-3.5" aria-hidden="true" />
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
