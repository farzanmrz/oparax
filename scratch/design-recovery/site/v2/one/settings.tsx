"use client";

import { useState } from "react";
import { Plus, X as CloseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { groups, sources as initialSources, type Group, type Source } from "@/v2/deck/data";
import { GroupGlyph, SourceMark } from "@/v2/deck/marks";
import { BandCard, bandButton } from "./card-band";
import { AppShell, hue, PageLine, title } from "./shell";

// The Sources page (owner, Oct 10: no Settings page; Sources, Notifications and Account are the pages). One band
// card per kind, the four side by side across the page's column (owner, Oct 10): the kind mark, the kind
// name in Title Case and Add Source in the band; rows under it, each the logo, the name and the handle or address
// on one line with a cross at the right end that removes it ("a trash can or a cross maybe?": the cross, quiet and
// always there). The reason opens under a row on click. No counts (owner, Oct 4).

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function OneSources() {
  const [list, setList] = useState<Source[]>(initialSources);
  const [open, setOpen] = useState<string | null>(null);
  const remove = (id: string) => {
    setList((prev) => prev.filter((s) => s.id !== id));
    if (open === id) setOpen(null);
  };
  return (
    <AppShell>
      <PageLine title="Sources" />
      <div className="mt-6 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {groups.map((g) => {
          const members = list.filter((s) => s.group === g.id);
          if (!members.length) return null;
          return (
            <BandCard
              key={g.id}
              glyph={<GroupGlyph group={g.id} className={cn("size-4 shrink-0", hue[g.id])} />}
              heading={title(g.label)}
              action={
                <button type="button" className={bandButton} style={{ boxShadow: "var(--top-light)" }}>
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add
                </button>
              }
              bodyClassName="px-2 py-2"
            >
              <ul>
                {members.map((s) => (
                  <SourceRow key={s.id} source={s} group={g.id} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} onRemove={() => remove(s.id)} />
                ))}
              </ul>
            </BandCard>
          );
        })}
      </div>
    </AppShell>
  );
}

/** Kept for the old import name. */
export const OneSettings = OneSources;

function SourceRow({ source: s, group, open, onToggle, onRemove }: { source: Source; group: Group; open: boolean; onToggle: () => void; onRemove: () => void }) {
  return (
    <li className={cn("rounded-md transition-colors", open ? "bg-[var(--raised)]" : "hover:bg-raised/60")}>
      <div className="flex min-h-9 items-center gap-1 pr-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-9 min-w-0 flex-1 items-center gap-3 rounded-md px-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
        >
          <SourceMark source={s} size={18} className={group === "x" ? "" : "rounded-[4px]"} />
          <span className="min-w-0 flex-1 truncate">
            <span className="text-[13.5px] font-medium text-t1">{s.name}</span>
            <span className="ml-2 text-[12.5px] text-t3">{s.handle}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${s.name}`}
          className="grid size-7 shrink-0 place-items-center rounded-md text-t4 transition-colors hover:bg-raised hover:text-[var(--error)] focus-visible:outline-2 focus-visible:outline-ring"
        >
          <CloseIcon className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <div className="pr-4 pb-3 pl-[42px] text-[13px] leading-[1.5]">
          {s.focus ? <p className="text-t1">{cap(s.focus)}.</p> : null}
          {s.why ? <p className="mt-0.5 text-t2">{s.why}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
