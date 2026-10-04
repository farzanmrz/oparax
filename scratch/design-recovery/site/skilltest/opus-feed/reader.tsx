"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertsButton, TopBar, ViewSwitch } from "@/next/council/chrome";
import { status, type View } from "@/next/council/data";
import { Checking, EASE, useArrival } from "@/next/council/live";
import { GitHubMark, KindGlyph, MarkStack, ReportMark, Segments } from "@/next/council/marks";
import type { ItemView } from "@/next/data/feed";
import {
  Cover,
  FailedLine,
  feed,
  filterStories,
  GROUPS,
  groupOf,
  KindIcon,
  LiveLine,
  newest,
  pickLead,
  ReleaseChip,
  repo,
  SourceGlyph,
  sourceCount,
  StoryChips,
  when,
  watchingLine,
  type Story,
} from "./shared";

// Direction C, Reader: one story read in full, with each fact set beside the source's own words in the margin,
// so nothing needs a click to check. Above it, every story runs as a strip of pictures (a story without a picture
// shows its publisher's mark on the same plate); the open one is lifted and ringed in blue. On the left, the
// sources as a wall of their own marks grouped by kind, the open story's sources as cards, and the agent's state.

const BASE = "/skilltest/opus-feed/c";

export function Reader({ view, theme }: { view: View; theme?: string }) {
  const [source, setSource] = useState<string | null>(null);
  const { pending } = useArrival();
  const list = filterStories(feed(view), source);
  const [picked, setPicked] = useState<string | null>(null);
  const open = list.find((s) => s.id === picked) ?? pickLead(list);

  return (
    <div className="palette-council flex min-h-svh flex-col">
      <TopBar title="Feed" />
      <div className="flex flex-1">
        <Panel selected={source} onSelect={setSource} story={open} pending={pending} />
        <main className="relative min-w-0 flex-1 px-7 pt-5 pb-14">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px]" style={{ background: "var(--stage-light)" }} />
          <div className="relative flex items-center gap-4">
            <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Your Feed</h1>
            <span className="text-[13.5px] text-t3">{list.length} stories, newest first</span>
            <div className="ml-auto flex items-center gap-2">
              <ViewSwitch base={BASE} view={view} theme={theme} />
            </div>
          </div>
          <Strip list={list} open={open?.id} onOpen={setPicked} />
          {open ? <Story story={open} /> : <p className="relative mt-10 text-[14px] text-t3">Nothing from this source in the preview yet.</p>}
        </main>
      </div>
    </div>
  );
}

function Panel({
  selected,
  onSelect,
  story,
  pending,
}: {
  selected: string | null;
  onSelect: (k: string | null) => void;
  story?: Story;
  pending: number;
}) {
  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-r border-line bg-[var(--rail)] px-4 pt-4 pb-6">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] text-t2 transition-colors hover:bg-raised",
          selected === null && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
        )}
      >
        <Layers className={cn("size-3.5 text-t3", selected === null && "text-[var(--brand)]")} /> All sources
      </button>
      <div className="mt-3 space-y-3.5">
        {GROUPS.map((g) => (
          <section key={g.kind}>
            <p className="flex items-center gap-1.5 px-1 pb-1.5 font-mono text-[10.5px] tracking-[0.08em] text-t4 uppercase">
              <KindIcon kind={g.kind} className="size-3" /> {g.label}
              <span className="ml-auto tabular-nums">{groupOf(g.kind).length}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {groupOf(g.kind).map((s) => {
                const on = selected === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    title={`${s.name}, ${s.detail}: ${s.focus}`}
                    onClick={() => onSelect(on ? null : s.key)}
                    className={cn(
                      "grid size-[30px] place-items-center rounded-lg border border-line bg-[var(--window)] transition-colors hover:border-line-strong",
                      on && "border-[var(--brand-line)] bg-[var(--brand-soft)] ring-2 ring-[var(--brand-line)]",
                    )}
                    style={{ boxShadow: "var(--top-light)" }}
                  >
                    <SourceGlyph source={s} size={18} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {story ? (
        <section className="mt-6">
          <p className="px-1 pb-2 font-mono text-[10.5px] tracking-[0.08em] text-t4 uppercase">In this story</p>
          <ul className="space-y-2">
            {[...story.items]
              .sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
              .map((item) => (
                <SourceCard key={item.id} item={item} />
              ))}
            {story.release ? (
              <li className="rounded-lg border border-line bg-[var(--window)] p-2.5" style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}>
                <p className="flex items-center gap-2 text-[12.5px]">
                  <span className="grid size-[18px] place-items-center rounded-[5px] bg-[var(--kind-github-soft)] text-[var(--kind-github)]">
                    <GitHubMark className="size-3" />
                  </span>
                  <span className="font-medium text-t1">{repo.name}</span>
                  <ReleaseChip className="ml-auto h-5 text-[10.5px]" />
                </p>
                <p className="mt-1.5 text-[12px] leading-snug text-t2">
                  {story.release.description}. Release {repo.tag}, not a prerelease.
                </p>
                <p className="mt-1 text-[11px] tabular-nums text-t4">{when(story.release.released_at)}</p>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <section
        aria-label="Agent"
        className="mt-6 rounded-xl border border-line-strong bg-[var(--window)] p-3.5"
        style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
      >
        <LiveLine />
        <p className="mt-1 text-[12px] leading-snug text-t3">Watching {watchingLine()}</p>
        <div className="mt-3 space-y-2 border-t border-line-soft pt-3">
          <Checking pending={pending} compact />
          <FailedLine count={status.failed} />
        </div>
        <div className="mt-3 border-t border-line-soft pt-3">
          <p className="flex items-baseline justify-between text-[12.5px] text-t3">
            Free week
            <span className="text-t2">
              <span className="font-semibold tabular-nums text-t1">{status.daysLeft}</span> days left
            </span>
          </p>
          <div className="mt-2">
            <Segments total={status.trialDays} filled={status.daysLeft} />
          </div>
          <p className="mt-2 text-[12px] tabular-nums text-t3">
            {status.poolUsed} of {status.poolLimit} watched X posts
          </p>
        </div>
        <AlertsButton full className="mt-3.5" />
      </section>
    </aside>
  );
}

function SourceCard({ item }: { item: ItemView }) {
  return (
    <li className="flex gap-2.5 rounded-lg border border-line bg-[var(--window)] p-2.5" style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}>
      <Cover image={item.image} item={item} markSize={18} className="h-[52px] w-[64px] shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[12px]">
          <ReportMark item={item} size={13} />
          <span className="truncate font-medium text-t1">{item.publisher}</span>
          <KindGlyph kind={item.kind} className={cn("ml-auto size-3 shrink-0", item.kind === "post" ? "text-[var(--kind-post)]" : "text-[var(--kind-article)]")} />
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-t3">{item.title}</p>
      </div>
    </li>
  );
}

function Strip({ list, open, onOpen }: { list: Story[]; open?: string; onOpen: (id: string) => void }) {
  return (
    <div className="relative mt-4 -mr-7">
      <ul className="flex gap-3 overflow-hidden pt-1.5 pr-7 pb-3">
        {list.map((s) => {
          const on = s.id === open;
          return (
            <li key={s.id} className="w-[184px] shrink-0">
              <button
                type="button"
                onClick={() => onOpen(s.id)}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "block w-full rounded-xl border bg-[var(--window)] p-1.5 text-left transition-transform",
                  on ? "-translate-y-1 border-[var(--brand-line)] ring-2 ring-[var(--brand-line)]" : "border-line hover:border-line-strong",
                )}
                style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
              >
                <Cover image={s.card.image} item={s.items[0]} markSize={26} className="h-[86px] rounded-lg" />
                <span className={cn("mt-2 line-clamp-2 px-1 text-[12.5px] leading-snug font-medium", on ? "text-t1" : "text-t2")}>
                  {s.card.headline}
                </span>
                <span className="mt-1.5 flex items-center gap-1.5 px-1 pb-0.5">
                  <MarkStack items={s.items} size={14} />
                  {s.release ? (
                    <span className="grid size-[14px] place-items-center rounded-[4px] bg-[var(--kind-github-soft)] text-[var(--kind-github)]">
                      <GitHubMark className="size-2.5" />
                    </span>
                  ) : null}
                  <span className="ml-auto text-[10.5px] tabular-nums text-t4">{when(newest(s).published_at, false)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-[var(--page)] to-transparent" />
    </div>
  );
}

function Story({ story }: { story: Story }) {
  const last = newest(story);
  const byId = new Map(story.items.map((i) => [i.id, i]));
  return (
    <AnimatePresence mode="wait">
      <motion.article
        key={story.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="relative mt-3 overflow-hidden rounded-[14px] border border-line-strong bg-[var(--window)]"
        style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
      >
        <div className="relative">
          <Cover image={story.card.image} item={story.items[0]} markSize={56} fade className="h-[212px]" />
          <div className="absolute inset-x-0 bottom-0 px-8 pb-5">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--window)]/85 p-1 backdrop-blur">
                <StoryChips story={story} />
              {sourceCount(story) > 1 ? (
                <span className="inline-flex h-[22px] items-center gap-1 rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 text-[11.5px] text-[var(--brand)] backdrop-blur">
                  <Layers className="size-3" /> Joined from {sourceCount(story)} sources
                </span>
              ) : null}
              </span>
              <span className="ml-auto rounded-full bg-[var(--window)]/80 px-2 py-0.5 text-[11.5px] tabular-nums text-t3 backdrop-blur">
                {when(last.published_at)} UTC
              </span>
            </div>
            <h2 className="mt-2.5 max-w-[860px] text-[30px] leading-[1.15] font-semibold tracking-[-0.025em] text-t1">{story.card.headline}</h2>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-t border-line font-mono text-[10.5px] tracking-[0.08em] text-t4 uppercase">
          <span className="px-8 py-2.5">What happened</span>
          <span className="border-l border-line px-6 py-2.5">In their words</span>
        </div>
        <ol>
          {story.card.facts.map((fact, i) => {
            const cited = [...new Map(fact.evidence.map((e) => [e.item, byId.get(e.item)!])).values()];
            return (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-t border-line-soft">
                <div className="flex gap-3.5 px-8 py-3.5">
                  <span className="mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-md bg-[var(--brand-soft)] text-[11.5px] font-semibold tabular-nums text-[var(--brand)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] leading-[1.55] text-t1">{fact.text}</p>
                  </div>
                </div>
                <div className="space-y-2 border-l border-line bg-[var(--rail)] px-6 py-3">
                  {cited.slice(0, 2).map((item) => (
                    <figure
                      key={item.id}
                      className="rounded-md border border-line bg-[var(--window)] px-3 py-2"
                      style={{ borderLeft: `2px solid ${item.kind === "post" ? "var(--kind-post)" : "var(--kind-article)"}` }}
                    >
                      <blockquote className="text-[12.5px] leading-relaxed text-t2">
                        “{fact.evidence.find((e) => e.item === item.id)!.span.replace(/^["“]|["”]$/g, "")}”{" "}
                        <span className="inline-flex translate-y-[2px] items-center gap-1 text-[11.5px] whitespace-nowrap text-t3">
                          <ReportMark item={item} size={12} />
                          {item.publisher}
                        </span>
                      </blockquote>
                    </figure>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </motion.article>
    </AnimatePresence>
  );
}
