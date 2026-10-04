"use client";

import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { ChevronDown, Layers } from "lucide-react";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { FeedStory } from "@/next/data/feed";
import { beat, PREVIEW_NOTE, status } from "@/next/council/data";
import { Arrive, useArrival } from "@/next/council/live";
import {
  Account,
  AlertsAction,
  Brand,
  EmptyFeed,
  EmptySource,
  Evidence,
  GroupLabel,
  Headline,
  Meta,
  Modes,
  Picture,
  Publishers,
  Showing,
  SourceMark,
  StatusWords,
  StoryFacts,
  Trial,
  useThemeGuard,
} from "./shared";
import { groups, href, NOTE, sourceCount, storiesForState, type FeedState } from "./model";

// Direction B of opus-feed3, "Rail and sheet" (consensus-opus round 3, agreed by Astra, Grok and the builder).
// An unframed source rail on the page ground at the left, and one lifted sheet beside it under the stage light.
// The sheet opens with one status rule (never repeated between stories), then every story complete and
// hairline-separated: headline across, facts on the left, the 16:9 picture or plate on the right with the
// quoted evidence under it. Choosing a source on the rail narrows the sheet; nothing is selected to read.

const BASE = "/skilltest/opus-feed3/b";

export function SheetFeed({ state }: { state: FeedState }) {
  useThemeGuard();
  const list = storiesForState(state);
  const arrival = useArrival();
  const filtered = Boolean(state.source);
  // The newest story replays its arrival only on the full feed; elsewhere the checking count stays as stored.
  const replay = !filtered && !state.empty;
  const pending = replay ? arrival.pending : status.pending;
  const rest = filtered && list.length === 0 ? storiesForState({ ...state, source: null }) : [];
  const rows = (items: typeof list, live: boolean) => (
    <AnimatePresence initial={false}>
      {items.map((s, i) => {
        const fresh = live && i === 0;
        if (fresh && !arrival.arrived) return null;
        return (
          <Arrive key={s.id} index={i} fresh={fresh}>
            <StoryRow story={s} fresh={fresh} />
          </Arrive>
        );
      })}
    </AnimatePresence>
  );

  return (
    <div className="palette-council relative min-h-svh overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[680px] md:left-[280px]"
        style={{ background: "var(--stage-light)" }}
      />

      <Rail state={state} />

      <div className="relative md:pl-[304px]">
        <NarrowBar state={state} />
        <main className="px-4 pt-3 pb-16 md:pt-6 md:pr-6 md:pl-0">
          <div
            className="mx-auto max-w-[1112px] overflow-hidden rounded-[14px] border border-line-strong bg-[var(--window)]"
            style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
          >
            <StatusRule pending={pending} note={replay ? NOTE : PREVIEW_NOTE} />
            {filtered ? <Showing base={BASE} state={state} className="border-b border-line px-5 py-3 md:px-8" /> : null}

            {state.empty ? (
              <EmptyFeed cols={3} className="px-5 py-8 md:px-8 md:py-10" />
            ) : list.length === 0 ? (
              <>
                <EmptySource base={BASE} state={state} className="px-5 py-8 md:px-8 md:py-10" />
                <p className="border-t border-line bg-[var(--rail)] px-5 py-2.5 font-mono text-[10.5px] tracking-[0.12em] text-t4 uppercase md:px-8">
                  Everything else on your beat
                </p>
                <div className="[&>*+*>article]:border-t [&>*+*>article]:border-line">{rows(rest, false)}</div>
              </>
            ) : (
              <div className="[&>*+*>article]:border-t [&>*+*>article]:border-line">{rows(list, replay)}</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ───────────── the rail ───────────── */

function Rail({ state }: { state: FeedState }) {
  return (
    <aside aria-label="Sources" className="fixed inset-y-0 left-0 z-10 hidden w-[280px] overflow-y-auto px-5 py-5 md:block">
      <div className="flex items-center gap-2.5">
        <Brand />
        <Account className="min-w-0 flex-1" />
        <ThemeToggle className="size-8 shrink-0 text-t3" />
      </div>
      <Trial className="mt-2.5 pl-[28px]" />
      <p className="mt-5 text-[13px] leading-[1.5] text-t2">
        <span className="text-t4">“</span>
        {beat}
        <span className="text-t4">”</span>
      </p>
      <Modes base={BASE} state={state} className="mt-4 w-fit" />
      <RailSources state={state} className="mt-5" />
    </aside>
  );
}

function RailSources({ state, className }: { state: FeedState; className?: string }) {
  const all = !state.source;
  return (
    <nav aria-label="Filter by source" className={className}>
      <Link
        href={href(BASE, state, { source: null })}
        aria-current={all ? "true" : undefined}
        className={cn(
          "flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-t2 hover:bg-[var(--raised)] focus-visible:outline-2 focus-visible:outline-ring",
          all && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
        )}
      >
        <Layers className={cn("size-3.5", all && "text-[var(--brand)]")} aria-hidden="true" />
        All sources
        <span className="ml-auto text-[12px] text-t4 tabular-nums">{sourceCount}</span>
      </Link>
      {groups.map((g) => (
        <div key={g.kind} className="mt-4">
          <GroupLabel label={g.label} count={g.items.length} className="px-2" />
          <ul className="mt-1.5">
            {g.items.map((s) => {
              const on = state.source === s.id;
              return (
                <li key={s.id}>
                  <Link
                    href={href(BASE, state, { source: on ? null : s.id, empty: false })}
                    aria-current={on ? "true" : undefined}
                    title={s.focus || s.sub}
                    className={cn(
                      "flex h-[30px] items-center gap-2 rounded-md px-2 text-[13px] text-t2 hover:bg-[var(--raised)] hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring",
                      on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
                    )}
                  >
                    <SourceMark source={s} size={16} />
                    <span className="min-w-0 truncate">{s.name}</span>
                    {s.kind === "x" ? <span className="ml-auto shrink-0 text-[11.5px] text-t4">{s.handle}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Narrow window: account and mode words on top, the rail behind a Sources disclosure. */
function NarrowBar({ state }: { state: FeedState }) {
  return (
    <div className="flex flex-col gap-3 px-4 pt-4 md:hidden">
      <div className="flex items-center gap-2.5">
        <Brand />
        <Account className="min-w-0 flex-1" />
        <Trial />
        <ThemeToggle className="size-8 shrink-0 text-t3" />
      </div>
      <div className="flex items-center gap-2">
        <Modes base={BASE} state={state} />
        <details className="group relative ml-auto">
          <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-line bg-[var(--well)] px-2.5 text-[12.5px] text-t2 focus-visible:outline-2 focus-visible:outline-ring">
            Sources <span className="text-t4 tabular-nums">{sourceCount}</span>
            <ChevronDown className="size-3.5 text-t4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div
            className="absolute right-0 z-30 mt-2 max-h-[70svh] w-[280px] overflow-y-auto rounded-xl border border-line-strong bg-[var(--window)] p-3"
            style={{ boxShadow: "var(--window-shadow)" }}
          >
            <RailSources state={state} />
          </div>
        </details>
      </div>
    </div>
  );
}

/* ───────────── the sheet ───────────── */

function StatusRule({ pending, note }: { pending: number; note: string }) {
  return (
    <div className="border-b border-line bg-[var(--rail)] px-5 py-3 md:px-8">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <StatusWords pending={pending} />
        <AlertsAction className="max-sm:w-full max-sm:justify-between sm:ml-auto" />
      </div>
      <p className="mt-1.5 text-[11.5px] text-t4">{note}</p>
    </div>
  );
}

function StoryRow({ story, fresh }: { story: FeedStory; fresh: boolean }) {
  return (
    <article className="px-5 py-6 md:px-8 md:py-7">
      <Meta story={story} fresh={fresh} extra={<Publishers story={story} />} />
      <Headline story={story} className="mt-3" />
      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,60fr)_minmax(0,40fr)] md:gap-8">
        <div className="order-2 md:order-1">
          <StoryFacts story={story} large />
        </div>
        <Picture story={story} fit="frame" className="order-1 md:order-2" />
      </div>
      <Evidence story={story} max={2} row className="mt-5" />
    </article>
  );
}
