"use client";

import { useState } from "react";
import { ChevronRight, Layers } from "lucide-react";
import { PREVIEW_NOTE, newest, when, type View } from "@/next/council/data";
import { AlertsButton, Facts, Quote, ViewSwitch } from "@/next/council/chrome";
import { NewFlag, useArrival } from "@/next/council/live";
import { GitHubMark, KindGlyph, ReportMark, Segments } from "@/next/council/marks";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { DigestEntry, FeedStory } from "@/next/data/feed";
import { status, week, weekTotal } from "@/next/council/data";
import { WeekBars, Dot } from "@/next/council/marks";
import { CircleAlert } from "lucide-react";
import {
  Brand,
  DigestChip,
  entriesFor,
  Handle,
  kindsOf,
  PublisherLine,
  Publishers,
  ReleaseWell,
  StoryChips,
  StoryPic,
  storyTime,
  useThemeGuard,
  type Entry,
} from "./kit";
import { accounts, sites } from "@/next/council/data";

// Direction C, the piles. Reports are physical piles on a lit desk, one pile per kind of report: the top card shows
// its picture, headline and publisher, and the cards behind it peek out with their publisher and time. Taking a
// card off a pile opens it as the large card in front, with every fact cited; "Next" deals the next card from the
// same pile. The task: pick up what matters from the pile you care about, read it whole, move on.

const BASE = "/skilltest/sonnet-feed2/c";

type PileId = "articles" | "mixed" | "posts" | "github";

const PILES: Record<PileId, { label: string; tone: string }> = {
  articles: { label: "Articles", tone: "var(--kind-article)" },
  mixed: { label: "Posts and articles", tone: "var(--brand)" },
  posts: { label: "Posts", tone: "var(--kind-post)" },
  github: { label: "GitHub", tone: "var(--kind-github)" },
};

function pileOf(e: Entry): PileId {
  if (e.type === "digest") return "github";
  const k = kindsOf(e.story);
  return k.length > 1 ? "mixed" : k[0] === "post" ? "posts" : "articles";
}

export function Piles({ view, theme, pile }: { view: View; theme?: string; pile?: string }) {
  useThemeGuard();
  const { pending } = useArrival();
  const all = entriesFor(view);
  const groups = (["articles", "mixed", "posts", "github"] as PileId[])
    .map((id) => ({ id, entries: all.filter((e) => pileOf(e) === id) }))
    .filter((g) => g.entries.length > 0);
  const [openId, setOpenId] = useState(() => (groups.find((g) => g.id === pile) ?? groups.find((g) => g.entries[0].id === all[0].id) ?? groups[0]).entries[0].id);
  const open = all.find((e) => e.id === openId) ?? all[0];
  const openGroup = groups.find((g) => g.entries.some((e) => e.id === open.id))!;
  const at = openGroup.entries.findIndex((e) => e.id === open.id);
  const next = openGroup.entries[(at + 1) % openGroup.entries.length];

  return (
    <div className="palette-council relative min-h-screen overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[760px]" style={{ background: "var(--stage-light)" }} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{ backgroundImage: "var(--dot-grid)", backgroundSize: "22px 22px" }}
      />
      <header className="relative z-20 flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line px-4 py-1.5">
        <Brand />
        <span className="hidden text-t4 sm:inline">/</span>
        <Handle className="hidden sm:flex" />
        <span className="hidden text-t4 sm:inline">/</span>
        <span className="hidden text-[13px] text-t2 sm:inline">Feed</span>
        <ViewSwitch base={BASE} view={view} theme={theme} className="sm:ml-3" />
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full border border-line px-2.5 py-1 text-[11.5px] text-t3 md:inline">{PREVIEW_NOTE}</span>
          <ThemeToggle className="size-8 text-t3" />
        </div>
      </header>
      <main className="relative z-10 mx-auto w-[min(1296px,calc(100%-32px))] pb-8 pt-5">
        <div className="grid gap-5 lg:grid-cols-[repeat(3,minmax(0,1fr))_284px]">
          {groups.map((g) => (
            <PileStack
              key={g.id}
              id={g.id}
              total={g.entries.length}
              entries={g.entries.filter((e) => e.id !== open.id)}
              onOpen={setOpenId}
            />
          ))}
          {groups.length < 3 ? <span className="hidden lg:block" /> : null}
          <DeskTile pending={pending} />
        </div>
        <OpenCard
          entry={open}
          fresh={open.id === all[0].id}
          pending={pending}
          groupLabel={PILES[openGroup.id].label}
          position={`${at + 1} of ${openGroup.entries.length}`}
          onNext={openGroup.entries.length > 1 ? () => setOpenId(next.id) : undefined}
          nextLabel={next.type === "story" ? next.story.card.headline : next.digest.name}
        />
      </main>
    </div>
  );
}

function PileStack({
  id,
  total,
  entries,
  onOpen,
}: {
  id: PileId;
  total: number;
  entries: Entry[];
  onOpen: (id: string) => void;
}) {
  const meta = PILES[id];
  const top = entries[0];
  const peeks = entries.slice(1, 3);
  return (
    <section aria-label={`${meta.label} pile`} className="flex min-w-0 flex-col">
      <div className="mb-2 flex h-6 items-center gap-2 px-1 text-[12.5px]">
        <span className="grid size-5 place-items-center rounded-md" style={{ color: meta.tone, background: `color-mix(in srgb, ${meta.tone} 14%, transparent)` }}>
          {id === "github" ? <GitHubMark className="size-3.5" /> : id === "mixed" ? <Layers className="size-3.5" aria-hidden="true" /> : <KindGlyph kind={id === "posts" ? "post" : "article"} />}
        </span>
        <span className="font-medium text-t1">{meta.label}</span>
        <span className="tabular-nums text-t4">{total}</span>
      </div>
      {top ? (
        <div className="relative flex flex-1 flex-col">
          {[...peeks].reverse().map((e, i) => (
            <Peek key={e.id} entry={e} inset={(peeks.length - i) * 10} />
          ))}
          <TopCard entry={top} onOpen={() => onOpen(top.id)} />
        </div>
      ) : (
        <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-line-strong text-[12.5px] text-t4">Nothing else in this pile</div>
      )}
    </section>
  );
}

/** A card behind the top card: only its edge shows, with the publisher and time. */
function Peek({ entry, inset }: { entry: Entry; inset: number }) {
  const label =
    entry.type === "story" ? (
      <>
        <ReportMark item={newest(entry.story)} size={14} className={newest(entry.story).kind === "post" ? "" : "rounded-[4px]"} />
        <span className="truncate text-t2">{entry.story.items.map((i) => i.publisher).join(", ")}</span>
        <span className="ml-auto shrink-0 font-mono text-[10.5px] text-t4">{when(entry.at)}</span>
      </>
    ) : (
      <>
        <GitHubMark className="size-3.5 text-t2" />
        <span className="truncate text-t2">{entry.digest.name}</span>
        <span className="ml-auto shrink-0 font-mono text-[10.5px] text-t4">{when(entry.at, false)}</span>
      </>
    );
  return (
    <div
      aria-hidden="true"
      className="relative -mb-px flex h-[22px] items-center gap-1.5 rounded-t-lg bg-[var(--card)] px-3 text-[11.5px]"
      style={{ marginInline: inset, boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      {label}
    </div>
  );
}

function TopCard({ entry, onOpen }: { entry: Entry; onOpen: () => void }) {
  const story = entry.type === "story" ? entry.story : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative z-10 flex w-full flex-1 flex-col overflow-hidden rounded-xl bg-[var(--card)] text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      {story ? (
        story.card.image ? (
          <StoryPic story={story} className="h-[150px] w-full shrink-0" />
        ) : (
          <div className="h-[150px] shrink-0 border-b border-line bg-[var(--well)] p-3">
            <QuoteLine story={story} />
          </div>
        )
      ) : (
        <div className="flex h-[150px] shrink-0 items-center gap-4 border-b border-line bg-[var(--kind-github-soft)] px-5 text-[var(--kind-github)]">
          <GitHubMark className="size-10" />
          <span>
            <span className="block text-[13px] font-semibold text-t1">{entry.type === "digest" ? entry.digest.name.split(" ")[0] : ""}</span>
            <span className="block font-mono text-[22px] font-semibold tracking-tight text-t1">{entry.type === "digest" ? entry.digest.name.split(" ")[1] : ""}</span>
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col px-4 pb-3.5 pt-3">
        <div className="flex items-center gap-2">
          {story ? <StoryChips story={story} className="[&>span:not(:first-child)]:hidden" /> : <DigestChip />}
          <span className="ml-auto font-mono text-[10.5px] text-t3">{story ? storyTime(story) : when(entry.at, false)}</span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-[16px] font-semibold leading-[1.25] tracking-[-0.015em] text-t1">
          {story ? story.card.headline : entry.type === "digest" ? entry.digest.description : ""}
        </h3>
        {story ? <PublisherLine story={story} className="mt-auto pt-2.5" /> : <p className="mt-auto line-clamp-2 pt-2.5 text-[12px] leading-snug text-t3">{entry.type === "digest" ? entry.digest.detail : ""}</p>}
      </div>
    </button>
  );
}

function QuoteLine({ story }: { story: FeedStory }) {
  const first = story.card.facts[0].evidence[0];
  const item = story.items.find((i) => i.id === first.item)!;
  return <Quote item={item} spans={[first.span]} className="mt-0 line-clamp-4" />;
}

/** The desk tile: what the agent is doing and what is left of the free week. */
function DeskTile({ pending }: { pending: number }) {
  return (
    <aside
      aria-label="Agent status"
      className="flex min-w-0 flex-col divide-y divide-line overflow-hidden rounded-xl bg-[var(--card)]"
      style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      <div className="px-4 py-2.5">
        <p className="font-mono text-[10.5px] tracking-[0.12em] text-t4">AGENT</p>
        <p className="mt-1.5 flex items-center gap-2 text-[13px] text-t2">
          <Dot tone="ok" pulse />
          <span className="font-medium text-[var(--ok)]">Live</span>
          watching {sites.length + accounts.length} sources
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-line">
        <div className="px-4 py-2.5">
          <p className="font-mono text-[10.5px] tracking-[0.12em] text-t4">CHECKING</p>
          <p className="mt-1 flex items-center gap-2 text-[20px] tabular-nums text-t1">
            <span className="size-3.5 rounded-full border-2 border-[var(--caution)] border-t-transparent" aria-hidden="true" />
            {Math.max(pending, 0)}
          </p>
        </div>
        <div className="px-4 py-2.5">
          <p className="font-mono text-[10.5px] tracking-[0.12em] text-t4">FAILED</p>
          <p className="mt-1 flex items-center gap-2 text-[20px] tabular-nums text-t1">
            <CircleAlert className="size-4 text-[var(--error)]" aria-hidden="true" />
            {status.failed}
          </p>
        </div>
      </div>
      <div className="px-4 py-3">
        <AlertsButton full />
      </div>
      <div className="px-4 py-3">
        <p className="flex items-baseline justify-between text-[12.5px] text-t3">
          Free week <span><span className="tabular-nums text-t1">{status.daysLeft}</span> days left</span>
        </p>
        <div className="mt-2">
          <Segments total={status.trialDays} filled={status.daysLeft} />
        </div>
        <p className="mt-2 text-[12px] text-t3">
          <span className="tabular-nums text-t1">{status.poolUsed}</span> of {status.poolLimit} watched posts
        </p>
      </div>
      <div className="px-4 py-3">
        <p className="mb-2 flex items-baseline justify-between text-[12px] text-t3">
          Published this week <span><span className="tabular-nums text-t1">{weekTotal}</span> reports</span>
        </p>
        <WeekBars week={week} height={30} />
      </div>
    </aside>
  );
}

/** The card in front: one story or release read whole, with its picture and every fact cited. */
function OpenCard({
  entry,
  fresh,
  pending,
  groupLabel,
  position,
  onNext,
  nextLabel,
}: {
  entry: Entry;
  fresh: boolean;
  pending: number;
  groupLabel: string;
  position: string;
  onNext?: () => void;
  nextLabel: string;
}) {
  const story = entry.type === "story" ? entry.story : null;
  return (
    <article
      aria-label="Open card"
      className="relative z-20 mt-5 grid overflow-hidden rounded-2xl bg-[var(--window)] lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)]"
      style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
    >
      {story ? (
        story.card.image ? (
          <StoryPic story={story} className="min-h-[260px] lg:min-h-[420px]" />
        ) : (
          <div className="flex min-h-[260px] flex-col justify-center gap-2 border-b border-line bg-[var(--well)] px-8 lg:border-b-0 lg:border-r">
            <p className="font-mono text-[10.5px] tracking-[0.12em] text-t4">IN THEIR WORDS</p>
            <QuoteLine story={story} />
          </div>
        )
      ) : (
        <ReleaseWell digest={(entry as { digest: DigestEntry }).digest} className="min-h-[260px] lg:min-h-[420px]" />
      )}
      <div className="flex min-w-0 flex-col px-8 py-7">
        <div className="flex flex-wrap items-center gap-2">
          {story ? <StoryChips story={story} /> : <DigestChip />}
          {fresh ? <NewFlag /> : null}
          <span className="ml-auto font-mono text-[11px] tracking-wide text-t3">{story ? storyTime(story) : when(entry.at, false)}</span>
        </div>
        <h1 className="mt-3.5 max-w-[640px] text-[30px] font-semibold leading-[1.13] tracking-[-0.025em] text-t1">
          {story ? story.card.headline : (entry as { digest: DigestEntry }).digest.name}
        </h1>
        {story ? (
          <Facts story={story} className="mt-4 max-w-[640px]" />
        ) : (
          <div className="mt-3 max-w-[640px]">
            <p className="text-[14.5px] text-t2">{(entry as { digest: DigestEntry }).digest.description}</p>
            <p className="mt-3 text-[14.5px] leading-[1.55] text-t2">{(entry as { digest: DigestEntry }).digest.detail}</p>
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4">
          {story ? <Publishers story={story} className="flex flex-wrap gap-x-7 gap-y-2 space-y-0" /> : <span />}
          <span className="flex items-center gap-3">
            <span className="font-mono text-[11px] tabular-nums text-t4">
              {position} in {groupLabel}
            </span>
            {onNext ? (
              <button
                type="button"
                onClick={onNext}
                title={nextLabel}
                className="flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-[var(--well)] px-3 text-[12.5px] text-t1 transition-colors hover:bg-raised"
              >
                Next card
                <ChevronRight className="size-3.5 text-t3" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        </div>
      </div>
      {pending > 0 ? <span className="sr-only">Checking {pending} items against your sentence</span> : null}
    </article>
  );
}
