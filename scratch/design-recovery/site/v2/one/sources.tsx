"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SITES_MAX } from "@/next/data/onboarding";
import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { groups, sources as initialSources, type Group, type Source } from "@/v2/deck/data";
import { GroupGlyph, SourceMark } from "@/v2/deck/marks";
import { Shell } from "./rail";

// The Sources page: one lifted list (owner, Oct 4: "The card UI itself, I don't like"), a heading per kind with its
// Add source button, rows under it. A row is the logo, then the name and its handle or address on one line ("The
// account and handle can come next to each other, and the website and name can come next to each other"), and a
// quiet Remove. No numbers ("There should be no numbers next to the sources because this is the sources page"),
// except the onboarding's own rule for websites and feeds together. A click opens the row's reason under it.

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function OneSources() {
  const [list, setList] = useState<Source[]>(initialSources);
  const [open, setOpen] = useState<string | null>(null);
  const sitesAndFeeds = list.filter((s) => s.group === "rss" || s.group === "website").length;
  const remove = (id: string) => {
    setList((prev) => prev.filter((s) => s.id !== id));
    if (open === id) setOpen(null);
  };
  return (
    <Shell
      header={
        <header className="flex max-w-[760px] items-center gap-3">
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Sources</h1>
          <p className="ml-auto text-[13.5px] text-t3">What your agent reads.</p>
        </header>
      }
    >
      <main className="min-w-0 pb-24">
        <div className={cn(lift, "max-w-[760px] overflow-hidden")} style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
          {groups.map((g, gi) => {
            const members = list.filter((s) => s.group === g.id);
            // The shared rule for websites and feeds, said once under the first of the two headings.
            const limit = g.id === "rss";
            return (
              <section key={g.id} aria-label={g.label} className={cn("px-3 pt-4 pb-3", gi > 0 && "border-t border-line")}>
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
                {limit ? (
                  <p className="mt-1 pl-[38px] text-[12px] text-t3">
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
      </main>
    </Shell>
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
