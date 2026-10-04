"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { groups, itemsFrom, sources, type Group } from "@/v2/deck/data";
import { GroupGlyph, SourceMark } from "@/v2/deck/marks";
import { Expand, Shell } from "./rail";

// The Sources page: the agent's sources in one section per kind (X accounts, RSS feeds, Websites, GitHub), with the
// section header larger than its rows (owner, Oct 4: "the websites, the RSS feeds, and the X accounts should be more
// prominent than the sites below"), counts as bare numbers in one aligned column.

const groupWord: Record<Group, string> = { x: "X account", rss: "RSS feed", website: "Website", github: "GitHub repository" };

export function OneSources() {
  return (
    <Shell
      header={
        <header className="flex items-center gap-3">
          <Expand />
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Sources</h1>
          <p className="ml-auto text-[13.5px] text-t3">What your agent reads. Chosen when it was built.</p>
        </header>
      }
    >
      <main className="min-w-0 pb-20">
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {groups.map((g) => {
            const members = sources.filter((s) => s.group === g.id);
            if (!members.length) return null;
            return <Section key={g.id} group={g.id} label={g.label} members={members} />;
          })}
        </div>
      </main>
    </Shell>
  );
}

function Section({ group, label, members }: { group: Group; label: string; members: typeof sources }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <section aria-label={label} className={cn(lift, "p-3")} style={liftStyle}>
      <p className="flex items-center gap-2 px-1.5 pb-2.5 text-[15px] font-semibold text-t1">
        <span className="text-t3">
          <GroupGlyph group={group} />
        </span>
        {label}
        <span className="ml-auto text-[12px] font-normal tabular-nums text-t3">{members.length}</span>
      </p>
      <ul>
        {members.map((s) => {
          const n = itemsFrom(s.id).length;
          const on = selected === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setSelected(on ? null : s.id)}
                className={cn(
                  "flex min-h-9 w-full items-center gap-2.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
                  on && "bg-[var(--brand-soft)] shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
                )}
              >
                <SourceMark source={s} size={20} className={group === "x" ? "" : "rounded-[5px]"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-t1">{s.name}</span>
                  <span className="block truncate text-[11.5px] text-t3">{group === "x" ? s.handle : s.mark}</span>
                </span>
                <span className="w-8 shrink-0 text-right text-[11.5px] tabular-nums text-t3" title={n ? `${n} in your feed` : undefined}>
                  {n > 0 ? n : null}
                </span>
              </button>
              {on && s.focus ? (
                <p className="px-2 pt-0.5 pb-2 text-[12.5px] leading-[1.5] text-t2">
                  {groupWord[group]}. {s.focus}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
