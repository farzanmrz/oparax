"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, X as CloseIcon } from "lucide-react";
import { profile } from "@/next/data/onboarding";
import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { groups, HANDLE, sources as initialSources, type Group, type Source } from "@/v2/deck/data";
import { GroupGlyph, SourceMark, XAvatar } from "@/v2/deck/marks";
import { BASE } from "./card";
import { ACCOUNT_EMAIL as EMAIL, AppShell, hue, PageLine } from "./shell";
import { useDirection } from "./direction";

// The Settings page. Two council directions (Oct 9, owner: "Why are these attached cards? Why are they not separate
// cards? There is no meaningful way the card header is distinguished from the card component itself"): one separate
// lifted card per kind, 16px apart. Direction A puts the header inside the card as a 44px band on the raised ground
// (the kind mark, the title at 16px semibold, Add source at the right), no hairline, the rows on the card ground under
// it. Direction B puts the heading on the page ground above a card that holds only the rows, 24px between kinds.
// Rows: logo, name and handle or address on one line, an x on hover and focus, the reason under the row on click.
// No counts (owner, Oct 4). Right, a 360px sticky block: the person and the plan.

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function OneSettings() {
  const [list, setList] = useState<Source[]>(initialSources);
  const [open, setOpen] = useState<string | null>(null);
  const dir = useDirection();
  const remove = (id: string) => {
    setList((prev) => prev.filter((s) => s.id !== id));
    if (open === id) setOpen(null);
  };
  return (
    <AppShell>
      <PageLine title="Settings" />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className={cn("flex flex-col", dir === "a" ? "gap-4" : "gap-6")}>
          {groups.map((g) => {
            const members = list.filter((s) => s.group === g.id);
            const head = (
              <>
                <GroupGlyph group={g.id} className={cn("size-4 shrink-0", hue[g.id])} />
                <h2 className="text-[16px] leading-5 font-semibold text-t1">{g.label}</h2>
                <AddSource />
              </>
            );
            const rows = (
              <ul className="grid items-start gap-x-4 xl:grid-cols-2">
                {members.map((s) => (
                  <SourceRow key={s.id} source={s} group={g.id} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} onRemove={() => remove(s.id)} />
                ))}
              </ul>
            );
            return dir === "a" ? (
              <section key={g.id} aria-label={g.label} className={cn(lift, "overflow-hidden")} style={liftStyle}>
                <div className="flex h-11 items-center gap-2.5 bg-[var(--raised)] px-4">{head}</div>
                <div className="px-3 pt-2 pb-2.5">{rows}</div>
              </section>
            ) : (
              <section key={g.id} aria-label={g.label}>
                <div className="flex h-8 items-center gap-2.5 px-1">{head}</div>
                <div className={cn(lift, "mt-3 px-3 py-2")} style={liftStyle}>
                  {rows}
                </div>
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

function AddSource() {
  return (
    <button
      type="button"
      className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-[var(--window)] px-2.5 text-[12.5px] font-medium text-t2 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
      style={{ boxShadow: "var(--top-light)" }}
    >
      <Plus className="size-3.5" aria-hidden="true" />
      Add source
    </button>
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
