"use client";

import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { FeedStory } from "@/next/data/feed";
import { Arrive, useArrival } from "@/next/council/live";
import {
  Account,
  AlertsAction,
  Brand,
  Contributors,
  EmptyFeed,
  EmptySource,
  Evidence,
  GroupLabel,
  Headline,
  Meta,
  Modes,
  Picture,
  Showing,
  SourceMark,
  StatusWords,
  StoryFacts,
  Trial,
  useThemeGuard,
} from "./shared";
import { groups, href, NOTE, storiesForState, type FeedState } from "./model";
import { PREVIEW_NOTE, status } from "@/next/council/data";

// Direction A of opus-feed3, "Directory and bands" (consensus-opus round 3, agreed by Astra, Grok and the
// builder). No rail and no title row: one lifted directory holds the account, the two views, the alert action,
// every configured source in the owner's four named groups, and one status row. Below it each story is its own
// lifted full-width band: the picture at its own aspect ratio (or the plate) with the contributing sources under
// it, the headline and every fact in the middle, the quoted evidence on the right. One downward read.

const BASE = "/skilltest/opus-feed3/a";

export function BandsFeed({ state }: { state: FeedState }) {
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
            <StoryBand story={s} fresh={fresh} />
          </Arrive>
        );
      })}
    </AnimatePresence>
  );

  return (
    <div className="palette-council relative min-h-svh overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[640px]" style={{ background: "var(--stage-light)" }} />
      <main className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pt-4 pb-16 md:px-6 md:pt-6">
        <Directory state={state} pending={pending} note={replay ? NOTE : PREVIEW_NOTE} />

        {filtered ? <Showing base={BASE} state={state} className="-mb-1 px-1" /> : null}

        {state.empty ? (
          <Band className="p-6 md:p-8">
            <EmptyFeed cols={4} />
          </Band>
        ) : list.length === 0 ? (
          <>
            <Band className="p-6 md:p-8">
              <EmptySource base={BASE} state={state} />
            </Band>
            <p className="mt-3 px-1 font-mono text-[10.5px] tracking-[0.12em] text-t4 uppercase">Everything else on your beat</p>
            {rows(rest, false)}
          </>
        ) : (
          rows(list, replay)
        )}
      </main>
    </div>
  );
}

function Band({ children, className, as = "section" }: { children: React.ReactNode; className?: string; as?: "section" | "article" }) {
  const Tag = as;
  return (
    <Tag
      className={cn("relative rounded-xl border border-line-strong bg-[var(--window)]", className)}
      style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      {children}
    </Tag>
  );
}

/* ───────────── the directory ───────────── */

function Directory({ state, pending, note }: { state: FeedState; pending: number; note: string }) {
  return (
    <Band className="overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-3 border-b border-line px-4 py-3 md:gap-x-4 md:px-5">
        <Brand />
        <span className="text-t4 max-md:hidden" aria-hidden="true">
          /
        </span>
        <Account />
        <Trial />
        <ThemeToggle className="-ml-1 size-8 text-t3 max-md:ml-auto" />
        <Modes base={BASE} state={state} className="md:ml-auto" />
        <AlertsAction className="max-md:ml-auto" />
      </header>

      {/* Desktop: every group open. Narrow: one disclosure. */}
      <div className="hidden px-5 py-4 md:block">
        <SourceGroups state={state} />
      </div>
      <details className="group md:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] text-t2 focus-visible:outline-2 focus-visible:outline-ring">
          Sources <span className="text-t4 tabular-nums">{groups.reduce((n, g) => n + g.items.length, 0)}</span>
          <ChevronDown className="ml-auto size-4 text-t4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-4 pb-4">
          <SourceGroups state={state} />
        </div>
      </details>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line bg-[var(--rail)] px-4 py-3 md:px-5">
        <StatusWords pending={pending} />
        <p className="text-[11.5px] text-t4 md:ml-auto">{note}</p>
      </footer>
    </Band>
  );
}

function SourceGroups({ state }: { state: FeedState }) {
  const width: Record<string, string> = { rss: "md:max-w-[560px]", website: "", x: "md:max-w-[440px]", github: "" };
  return (
    <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:gap-x-9 md:gap-y-4">
      {groups.map((g) => (
        <div key={g.kind} className={cn("min-w-0", width[g.kind])}>
          <GroupLabel label={g.label} count={g.items.length} />
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {g.items.map((s) => {
              const on = state.source === s.id;
              return (
                <li key={s.id}>
                  <Link
                    href={href(BASE, state, { source: on ? null : s.id, empty: false })}
                    aria-current={on ? "true" : undefined}
                    title={s.kind === "x" ? s.handle : s.focus || s.sub}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-[var(--well)] px-2 text-[12.5px] text-t2 transition-colors",
                      "hover:border-line-strong hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring",
                      on && "border-[var(--brand-line)] bg-[var(--brand-soft)] text-t1",
                    )}
                  >
                    <SourceMark source={s} size={15} />
                    {s.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ───────────── one band per story ───────────── */

function StoryBand({ story, fresh }: { story: FeedStory; fresh: boolean }) {
  return (
    <Band as="article" className="grid grid-cols-1 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)_320px]">
      <div className="order-2 flex flex-col gap-3 p-4 pt-0 lg:order-1 lg:border-r lg:border-line lg:pt-4">
        <Picture story={story} fit="natural" />
        <Contributors story={story} className="-mx-1.5" />
      </div>
      <div className="order-1 min-w-0 px-5 pt-5 pb-4 lg:order-2 lg:px-7 lg:py-6">
        <Meta story={story} fresh={fresh} />
        <Headline story={story} className="mt-3" />
        <StoryFacts story={story} large className="mt-4" />
      </div>
      <div className="order-3 border-line bg-[var(--rail)] p-4 max-lg:border-t lg:border-l lg:p-5">
        <Evidence story={story} />
      </div>
    </Band>
  );
}
