"use client";

import { AnimatePresence } from "motion/react";
import { CircleAlert, Layers } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import type { FeedStory, ItemView } from "../data/feed";
import { AlertsButton, Facts, TopBar, ViewSwitch } from "./chrome";
import { accounts, counts, digests, hostOf, newest, sites, status, storiesFor, storiesThisWeek, week, when, type View } from "./data";
import { Arrive, Checking, NewFlag, useArrival } from "./live";
import { Dot, GitHubMark, KindChip, MarkStack, ReportMark, Segments, WeekBars } from "./marks";

// Direction 3, Deck (agreed.md): one slim row of four tiles (linear-insights-03, supabase-ds-metriccard-01),
// then stories as physical report stacks: a clustered story is a card with its other reports peeking behind
// it (React Bits Stack and hero-10 stacking, rebuilt as CSS so the front card stays readable), a direct item is
// a flat card. A digest panel holds the GitHub entry. Most colorful of the three; news stays the largest type.

const BASE = "/next/feed/deck";
const PEEK = 22;

export function DeckFeed({ view, theme }: { view: View; theme?: string }) {
  const list = storiesFor(view);
  const { arrived, pending } = useArrival();
  // Masonry: newest first, each story into the shortest column by estimated height. Columns are fixed from the
  // full list so the arriving story drops into its place without reshuffling the others.
  const columns: FeedStory[][] = [[], [], []];
  const heights = [72, 0, 214];
  for (const s of list) {
    const c = heights.indexOf(Math.min(...heights));
    columns[c].push(s);
    heights[c] += (s.card.image ? 116 : 0) + 250 + Math.min(s.items.length - 1, 2) * PEEK;
  }

  return (
    <div className="palette-council relative flex min-h-svh flex-col">
      <TopBar title="Feed" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-12 h-[520px]" style={{ background: "var(--stage-light)" }} />
      <main className="relative mx-auto w-full max-w-[1360px] px-10 pt-8 pb-16">
        <div className="flex items-end gap-6">
          <div>
            <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Your Feed</h1>
            <p className="mt-2.5 text-[13.5px] text-t3">
              {view === "clustered" ? "Reports about the same event, stacked into one story." : "Each post or article on its own card."}
            </p>
          </div>
          <ViewSwitch base={BASE} view={view} theme={theme} className="ml-4" />
          <AlertsButton className="ml-auto" />
        </div>

        <Tiles pending={pending} />

        <div className="mt-8 grid grid-cols-3 items-start gap-6">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-6">
              {ci === 0 && pending > 0 ? (
                <div className="flex h-12 items-center rounded-xl border border-dashed border-[var(--caution)]/45 bg-[var(--caution-soft)]/60 px-4">
                  <Checking pending={pending} compact />
                </div>
              ) : null}
              {ci === 2 ? <Digest /> : null}
              <AnimatePresence initial={false}>
                {col.map((s, i) => {
                  const fresh = s.id === list[0].id;
                  if (fresh && !arrived) return null;
                  return (
                    <Arrive key={s.id} index={ci + i * 3} fresh={fresh}>
                      <StoryStack story={s} fresh={fresh} />
                    </Arrive>
                  );
                })}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section
      aria-label={label}
      className={cn("rounded-xl border border-line-strong bg-[var(--window)] px-4 py-3.5", className)}
      style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      <p className="text-[12px] font-medium text-t3">{label}</p>
      {children}
    </section>
  );
}

function Tiles({ pending }: { pending: number }) {
  const total = counts.posts + counts.articles;
  return (
    <div className="mt-6 grid grid-cols-4 gap-4">
      <Tile label="Stories this week">
        <div className="mt-1 flex items-end justify-between gap-4">
          <p className="text-[30px] leading-none font-semibold tabular-nums text-t1">{storiesThisWeek}</p>
          <WeekBars week={week} height={38} className="w-[150px]" />
        </div>
        <p className="mt-2 flex justify-between text-[11px] text-t4">
          <span>By publication date</span>
          <span>
            {week[0].label} to {week[week.length - 1].label}
          </span>
        </p>
      </Tile>
      <Tile label="Reports by kind">
        <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-line-strong">
          <span className="h-full bg-[var(--kind-post)]" style={{ width: `${(counts.posts / total) * 100}%` }} />
          <span className="h-full border-l-2 border-[var(--window)] bg-[var(--kind-article)]" style={{ width: `${(counts.articles / total) * 100}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <KindChip kind="post" count={counts.posts} />
          <KindChip kind="article" count={counts.articles} />
          <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[var(--kind-github-soft)] px-2 text-[11.5px] font-medium text-[var(--kind-github)]">
            <GitHubMark className="size-3" /> {counts.digests} digest
          </span>
        </div>
      </Tile>
      <Tile label="Agent">
        <p className="mt-1.5 flex items-center gap-2 text-[14px] font-medium">
          <Dot tone="ok" pulse /> <span className="text-[var(--ok)]">Live</span>
          <span className="text-[12.5px] font-normal text-t3">
            {sites.length} sites and feeds, {accounts.length} X accounts
          </span>
        </p>
        <div className="mt-2.5 flex items-center gap-4 text-[12.5px]">
          <span className="flex items-center gap-1.5 text-t2">
            <StatusMark status={pending > 0 ? "running" : "done"} size={14} color="var(--caution)" doneColor="var(--ok)" strokeWidth={2} />
            <span className="tabular-nums">{pending}</span> checking
          </span>
          <span className="flex items-center gap-1.5 text-t2">
            <CircleAlert className="size-3.5 text-[var(--error)]" />
            <span className="tabular-nums">{status.failed}</span> failed
          </span>
          <span className="flex items-center gap-1.5 text-t2">
            <XLogo className="size-3 text-t3" /> Alerts off
          </span>
        </div>
      </Tile>
      <Tile label="Free week">
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[22px] leading-none font-semibold tabular-nums text-t1">{status.daysLeft}</span>
          <span className="text-[13px] text-t2">days left</span>
          <span className="ml-auto text-[12px] tabular-nums text-t3">
            {status.poolUsed} of {status.poolLimit} watched posts
          </span>
        </p>
        <div className="mt-3">
          <Segments total={status.trialDays} filled={status.daysLeft} />
        </div>
      </Tile>
    </div>
  );
}

/** A story as a physical stack: the front card, and one plate per further report peeking above it. */
function StoryStack({ story, fresh }: { story: FeedStory; fresh: boolean }) {
  const behind = [...story.items].sort((a, b) => (a.published_at < b.published_at ? 1 : -1)).slice(1, 3);
  return (
    <div className="group relative" style={{ paddingTop: behind.length * PEEK }}>
      {behind
        .map((item, i) => <Plate key={item.id} item={item} depth={i + 1} top={(behind.length - 1 - i) * PEEK} />)
        .reverse()}
      <Card story={story} fresh={fresh} />
    </div>
  );
}

function Plate({ item, depth, top }: { item: ItemView; depth: number; top: number }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-x-0 rounded-xl border border-line-strong bg-[var(--raised)] transition-transform duration-300 ease-out",
        depth === 1 ? "group-hover:-translate-y-[8px] group-hover:rotate-[-1deg]" : "group-hover:-translate-y-[14px] group-hover:rotate-[1.2deg]",
      )}
      style={{
        top,
        height: 120,
        marginInline: depth * 10,
        zIndex: 3 - depth,
        boxShadow: "var(--card-shadow)",
      }}
    >
      <span
        className="absolute inset-x-4 top-0 h-[2px] rounded-b-full"
        style={{ background: item.kind === "post" ? "var(--kind-post)" : "var(--kind-article)" }}
      />
      <span className="flex h-[22px] items-center gap-1.5 px-3.5 text-[11px] text-t2">
        <ReportMark item={item} size={12} />
        {item.publisher}
        <span className="text-t4">{item.kind === "post" ? item.author : hostOf(item.url)}</span>
        <span className="ml-auto text-t4 tabular-nums">{when(item.published_at)}</span>
      </span>
    </div>
  );
}

function Card({ story, fresh }: { story: FeedStory; fresh: boolean }) {
  const last = newest(story);
  const kinds = [...new Set(story.items.map((i) => i.kind))];
  const more = story.card.facts.length - 2;
  return (
    <article
      className="relative z-10 overflow-hidden rounded-xl border border-line-strong bg-[var(--window)] transition-shadow"
      style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      {story.card.image ? (
        <div className="relative h-[116px] overflow-hidden border-b border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.card.image} alt="" loading="lazy" className="size-full object-cover" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--window)]/70 via-transparent to-transparent" />
        </div>
      ) : null}
      <div className="p-4">
        <div className="flex items-center gap-1.5">
          {kinds.map((k) => (
            <KindChip key={k} kind={k} count={story.items.filter((i) => i.kind === k).length} />
          ))}
          {fresh ? <NewFlag className="ml-1" /> : null}
          <span className="ml-auto text-[11.5px] tabular-nums text-t4">{when(last.published_at)}</span>
        </div>
        <h2 className="mt-2.5 text-[16.5px] leading-[1.3] font-semibold tracking-[-0.01em] text-t1">{story.card.headline}</h2>
        <Facts story={story} max={2} size="sm" className="mt-2.5" />
        {more > 0 ? <p className="mt-1.5 pl-3.5 text-[12px] text-t4">{more} more {more === 1 ? "fact" : "facts"}</p> : null}
        <div className="mt-3.5 flex items-center gap-2 border-t border-line-soft pt-3">
          <MarkStack items={story.items} size={18} />
          <span className="min-w-0 truncate text-[12px] text-t2">
            {story.items.map((i) => (i.kind === "post" ? i.author : hostOf(i.url))).join(", ")}
          </span>
          {story.items.length > 1 ? (
            <span className="ml-auto inline-flex h-[22px] shrink-0 items-center gap-1 rounded-md border border-[var(--brand-line)] bg-[var(--brand-soft)] px-1.5 text-[11.5px] text-[var(--brand)]">
              <Layers className="size-3" /> {story.items.length} reports
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Digest() {
  return (
    <section
      aria-label="Daily digest"
      className="overflow-hidden rounded-xl border border-line-strong bg-[var(--window)]"
      style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      <div className="flex items-center gap-2 border-b border-line bg-[var(--raised)] px-4 py-2.5">
        <span className="grid size-6 place-items-center rounded-md bg-[var(--kind-github-soft)] text-[var(--kind-github)]">
          <GitHubMark className="size-3.5" />
        </span>
        <span className="text-[13px] font-semibold text-t1">Daily digest</span>
        <span className="ml-auto text-[11.5px] text-t4">GitHub</span>
      </div>
      {digests.map((d) => (
        <div key={d.url} className="px-4 py-3.5">
          <p className="flex items-center gap-2 text-[14px] font-medium text-t1">
            <GitHubMark className="size-3.5 text-[var(--kind-github)]" />
            {d.name}
            <span className="ml-auto rounded-full border border-line px-1.5 py-px text-[10.5px] text-t3">Release</span>
          </p>
          <p className="mt-1.5 text-[13px] text-t2">{d.description}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-t3">{d.detail}</p>
          <p className="mt-2 text-[11.5px] text-t4">Released {when(d.released_at)}</p>
        </div>
      ))}
    </section>
  );
}
