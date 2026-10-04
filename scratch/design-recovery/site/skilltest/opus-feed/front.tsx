"use client";

import { useState } from "react";
import { Layers, Quote as QuoteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertsButton, Facts, TopBar, ViewSwitch } from "@/next/council/chrome";
import { beat, status, week, type View } from "@/next/council/data";
import { Checking, useArrival } from "@/next/council/live";
import { MarkStack, ReportMark, Segments, WeekBars } from "@/next/council/marks";
import {
  Cover,
  FailedLine,
  feed,
  filterStories,
  GROUPS,
  groupOf,
  hostOf,
  KindIcon,
  LiveLine,
  newest,
  pickLead,
  ReleaseRow,
  sourceCount,
  SourceGlyph,
  storyHas,
  StoryChips,
  when,
  sourceTotal,
  type Story,
} from "./shared";

// Direction A, Front Page: the feed set like a newspaper's front page on one lifted sheet. The masthead carries
// the person's own sentence and the agent's state in one ruled strip; the lead story is the newest story joined
// from more than one source, with a large picture and every fact; the rest run in ruled columns, each with its
// picture and two facts, so the page reads without a click. Sources sit on the page beside the sheet, grouped
// by kind, and choosing one narrows the sheet to the stories it fed.

const BASE = "/skilltest/opus-feed/a";

export function FrontPage({ view, theme }: { view: View; theme?: string }) {
  const [source, setSource] = useState<string | null>(null);
  const { pending } = useArrival();
  const list = filterStories(feed(view), source);
  const lead = pickLead(list);
  const rest = list.filter((s) => s.id !== lead?.id);
  const bands = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 9)].filter((b) => b.length);

  return (
    <div className="palette-council relative flex min-h-svh flex-col">
      <TopBar title="Feed" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-12 h-[620px]" style={{ background: "var(--stage-light)" }} />
      <main className="relative flex gap-5 px-6 pt-6 pb-14">
        <SourceRail selected={source} onSelect={setSource} total={feed(view).length} />
        <article
          className="min-w-0 flex-1 overflow-hidden rounded-[14px] border border-line-strong bg-[var(--window)]"
          style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
        >
          <Masthead view={view} theme={theme} pending={pending} />
          {lead ? <Lead story={lead} /> : <p className="px-8 py-16 text-[14px] text-t3">Nothing from this source in the preview yet.</p>}
          {bands.map((band, i) => (
            <Band key={i} stories={band} label={i === 0 ? null : "Earlier"} />
          ))}
        </article>
      </main>
    </div>
  );
}

function SourceRail({ selected, onSelect, total }: { selected: string | null; onSelect: (k: string | null) => void; total: number }) {
  return (
    <aside aria-label="Sources" className="w-[212px] shrink-0">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-[13px] text-t2 transition-colors hover:bg-raised",
          selected === null && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
        )}
      >
        <Layers className={cn("size-3.5 text-t3", selected === null && "text-[var(--brand)]")} />
        All sources
        <span className="ml-auto text-[11.5px] tabular-nums text-t4">{total}</span>
      </button>
      {GROUPS.map((g) => (
        <section key={g.kind} className="mt-4">
          <p className="flex items-center gap-1.5 px-2.5 pb-1.5 font-mono text-[10.5px] tracking-[0.08em] text-t4 uppercase">
            <KindIcon kind={g.kind} className="size-3" />
            {g.label}
            <span className="ml-auto tabular-nums">{groupOf(g.kind).length}</span>
          </p>
          <ul>
            {groupOf(g.kind).map((s) => {
              const on = selected === s.key;
              const fed = feed("clustered").filter((st) => storyHas(st, s.key)).length;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    title={s.focus}
                    onClick={() => onSelect(on ? null : s.key)}
                    className={cn(
                      "flex h-[27px] w-full items-center gap-2 rounded-md px-2.5 text-left text-[12.5px] text-t2 transition-colors hover:bg-raised",
                      on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
                    )}
                  >
                    <SourceGlyph source={s} size={15} />
                    <span className="truncate">{s.name}</span>
                    {fed ? <span className="ml-auto text-[11px] tabular-nums text-t4">{fed}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </aside>
  );
}

function Masthead({ view, theme, pending }: { view: View; theme?: string; pending: number }) {
  return (
    <header>
      <div className="flex items-start gap-6 px-8 pt-6 pb-5">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Your Feed</h1>
          <p className="mt-3 flex items-start gap-2 text-[13.5px] leading-snug text-t3">
            <QuoteIcon className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" />
            <span className="text-t2">{beat}</span>
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <ViewSwitch base={BASE} view={view} theme={theme} />
          <AlertsButton />
        </div>
      </div>
      <div className="grid grid-cols-[auto_auto_auto_1fr_auto] items-center divide-x divide-line border-y border-line bg-[var(--rail)] text-[12.5px]">
        <div className="flex h-11 items-center gap-2.5 px-6">
          <LiveLine />
          <span className="whitespace-nowrap text-t3">watching {sourceTotal} sources</span>
        </div>
        <div className="flex h-11 items-center px-5">
          <Checking pending={pending} compact />
        </div>
        <div className="flex h-11 items-center px-5 whitespace-nowrap">
          <FailedLine count={status.failed} />
        </div>
        <div className="flex h-11 items-center gap-3 px-5">
          <span className="shrink-0 text-t3">Free week</span>
          <div className="w-28">
            <Segments total={status.trialDays} filled={status.daysLeft} />
          </div>
          <span className="shrink-0 text-t2">
            <span className="font-semibold tabular-nums text-t1">{status.daysLeft}</span> days left
          </span>
        </div>
        <div className="flex h-11 items-center gap-2.5 px-5" title="Items published per day, by their own publication time">
          <span className="text-t3">Per day</span>
          <WeekBars week={week} height={20} className="w-[76px]" />
        </div>
      </div>
    </header>
  );
}

function Lead({ story }: { story: Story }) {
  const last = newest(story);
  const items = [...story.items].sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  return (
    <section aria-label="Lead story" className="grid grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] gap-8 px-8 pt-7 pb-8">
      <div className="min-w-0">
        <Cover image={story.card.image} item={items[0]} className="h-[318px] rounded-[10px]" markSize={64} />
        <ul className={cn("mt-3 grid gap-2.5", items.length + (story.release ? 1 : 0) > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {items.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 items-center gap-2.5 rounded-lg border border-line bg-[var(--raised)] px-3 py-2"
              style={{ boxShadow: "var(--top-light)" }}
            >
              <ReportMark item={item} size={22} className={item.kind === "post" ? "" : "rounded-md"} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-t1">{item.publisher}</span>
                <span className="block truncate text-[11.5px] text-t3">{item.title}</span>
              </span>
              <span className="shrink-0 text-right text-[11px] leading-tight tabular-nums text-t4">
                {when(item.published_at, false)}
                <br />
                {item.kind === "post" ? item.author : hostOf(item.url)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <StoryChips story={story} />
          {sourceCount(story) > 1 ? (
            <span className="inline-flex h-[22px] items-center gap-1 rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 text-[11.5px] text-[var(--brand)]">
              <Layers className="size-3" /> Joined from {sourceCount(story)} sources
            </span>
          ) : null}
          <span className="ml-auto text-[12px] tabular-nums text-t4">{when(last.published_at)} UTC</span>
        </div>
        <h2 className="mt-4 text-[30px] leading-[1.15] font-semibold tracking-[-0.025em] text-t1">{story.card.headline}</h2>
        <Facts story={story} className="mt-5" />
        {story.release ? <ReleaseRow entry={story.release} className="mt-5" /> : null}
      </div>
    </section>
  );
}

function Band({ stories, label }: { stories: Story[]; label: string | null }) {
  return (
    <section className="border-t border-line">
      {label ? (
        <p className="border-b border-line-soft px-8 py-2.5 font-mono text-[10.5px] tracking-[0.08em] text-t4 uppercase">{label}</p>
      ) : null}
      <div className="grid grid-cols-3 divide-x divide-line">
        {stories.map((s) => (
          <Column key={s.id} story={s} />
        ))}
        {Array.from({ length: 3 - stories.length }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
      </div>
    </section>
  );
}

function Column({ story }: { story: Story }) {
  const last = newest(story);
  const more = story.card.facts.length - 2;
  return (
    <article className="min-w-0 px-6 pt-6 pb-7">
      <Cover image={story.card.image} item={story.items[0]} className="h-[148px] rounded-[10px]" />
      <div className="mt-3.5 flex items-center gap-1.5">
        <StoryChips story={story} />
        <span className="ml-auto text-[11.5px] tabular-nums text-t4">{when(last.published_at)}</span>
      </div>
      <h3 className="mt-2.5 text-[17px] leading-[1.3] font-semibold tracking-[-0.012em] text-t1">{story.card.headline}</h3>
      <Facts story={story} max={2} size="sm" className="mt-2.5" />
      {more > 0 ? <p className="mt-1.5 pl-3.5 text-[12px] text-t4">{more} more {more === 1 ? "fact" : "facts"}</p> : null}
      {story.release ? <ReleaseRow entry={story.release} className="mt-3" /> : null}
      <div className="mt-3.5 flex items-center gap-2 border-t border-line-soft pt-3">
        <MarkStack items={story.items} size={18} />
        <span className="min-w-0 truncate text-[12px] text-t2">{story.items.map((i) => i.publisher).join(", ")}</span>
      </div>
    </article>
  );
}

