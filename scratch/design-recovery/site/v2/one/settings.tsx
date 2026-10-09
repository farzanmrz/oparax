"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, X as CloseIcon } from "lucide-react";
import { profile, SITES_MAX } from "@/next/data/onboarding";
import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { groups, HANDLE, sources as initialSources, type Group, type Source } from "@/v2/deck/data";
import { GroupGlyph, SourceMark, XAvatar } from "@/v2/deck/marks";
import { BASE } from "./card";
import { ACCOUNT_EMAIL as EMAIL, AppShell, PageLine } from "./shell";

// The Settings page: sources management and the account (council on the One's chrome, Oct 8: Twitter DMs, the
// alert hour and the digests moved to the Notifications page; the free week meter, the theme and Sign out live in
// the rail's foot). Two columns in the page's one column. Left, the body: the sources as ONE lifted
// panel, four sections divided by hairlines (Twitter accounts, RSS feeds, Websites, GitHub), each a heading line (the kind
// mark, the kind name, Add source at the right) over one-line rows (logo, name, handle or address; an x at the right
// on hover and focus; the reason under the row on click). No counts except the shared limit for websites and feeds,
// said once. Right, a 360px sticky block, one object: the person and the plan.

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
        <aside aria-label="Account" className="lg:sticky lg:top-6">
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
                <p className="text-[13.5px] font-semibold text-t1">Plan</p>
                <Link
                  href={`${BASE}/landing#pricing`}
                  className="ml-auto shrink-0 rounded-sm text-[13px] text-t2 underline decoration-line-strong underline-offset-4 transition-colors hover:text-t1 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring"
                >
                  Plans
                </Link>
              </div>
              <p className="mt-1 text-[12.5px] text-t2">Free week. Plans from $5 a month.</p>
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
