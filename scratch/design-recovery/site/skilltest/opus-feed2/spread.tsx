"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { FeedStory } from "@/next/data/feed";
import { beat, HANDLE, newest, when } from "@/next/council/data";
import { Checking, NewFlag, useArrival } from "@/next/council/live";
import {
  AfterMount,
  AgentState,
  AlertsAction,
  Cover,
  EmptyKind,
  Evidence,
  FactsMore,
  feed,
  FreeWeek,
  GithubRelease,
  Img,
  inWeek,
  KindIndex,
  Preview,
  Publishers,
  showsGithub,
  storyMatches,
  StoryMeta,
  useThemeGuard,
  type KindKey,
} from "./shared";

// Direction A, Spread (council gate, October 2: Grok's "Spread" and Astra's "open folios"). The feed is a
// sequence of two-page spreads lifted off a lit stage. The first spread is this week: the left page carries the
// story joined from the most sources in full (photo, every fact, the sources' own words); the right page
// carries the rest of the week, each readable without a click. Further spreads hold earlier stories two to a
// spread, the GitHub release among them. The source index runs along the top edge of the spread itself.

export function SpreadFeed() {
  useThemeGuard();
  const [kind, setKind] = useState<KindKey>("all");
  const { pending } = useArrival();

  const shown = feed.filter((s) => storyMatches(s, kind));
  const week = shown.filter(inWeek);
  const earlier = shown.filter((s) => !inWeek(s));
  // The lead: this week's story joined from the most sources, newest first on a tie.
  const lead = [...week].sort((a, b) => b.items.length - a.items.length)[0];
  const rest = week.filter((s) => s !== lead);
  const gh = showsGithub(kind);
  const nothing = !shown.length && !gh;

  return (
    <div className="palette-council relative flex min-h-svh flex-col">
      <header className="relative z-20 flex h-12 shrink-0 items-center gap-3 border-b border-line px-5">
        <OparaxMark className="size-[18px] text-t1" />
        <span className="text-t4">/</span>
        <span className="flex items-center gap-2 text-[13px] text-t1">
          <span className="grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>@
          {HANDLE}
        </span>
        <FreeWeek className="ml-2 hidden md:flex" />
        <div className="ml-auto flex items-center gap-3">
          <AgentState pending={pending} className="hidden lg:flex" />
          <Preview className="hidden xl:inline" />
          <AlertsAction />
          <ThemeToggle className="size-8 text-t3" />
        </div>
      </header>

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-12 h-[640px]" style={{ background: "var(--stage-light)" }} />

      <main className="relative mx-auto w-full max-w-[1376px] px-4 pt-6 pb-16 sm:px-8">
        <div className="rounded-[14px] border border-line-strong bg-[var(--window)]" style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
          {/* The running head of the spread: the person's own beat on the left, the sources on the right. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-t-[14px] border-b border-line bg-[var(--rail)] px-5 py-2 xl:flex-nowrap">
            <p className="flex min-w-0 flex-1 items-center gap-2.5 text-[12.5px]" title={beat}>
              <span className="shrink-0 font-mono text-[10.5px] tracking-[0.08em] whitespace-nowrap text-t4 uppercase">Your beat</span>
              <span className="truncate text-t2">{beat}</span>
            </p>
            <KindIndex value={kind} onChange={setKind} marks={4} className="max-w-full shrink-0 overflow-x-auto" />
          </div>

          {nothing ? (
            <EmptyKind kind={kind} />
          ) : (
            <>
              {week.length ? (
                <Pages
                  label="This week"
                  left={lead ? <LeadPage story={lead} /> : null}
                  right={
                    <div>
                      <PageHead label={lead ? "Also this week" : "This week"} count={rest.length} />
                      {pending > 0 && kind === "all" ? (
                        <div className="mx-6 mb-1 flex h-11 items-center rounded-lg border border-dashed border-[var(--caution)]/45 bg-[var(--caution-soft)]/60 px-3.5">
                          <AfterMount>
                            <Checking pending={pending} compact />
                          </AfterMount>
                        </div>
                      ) : null}
                      <ol className="px-6">
                        {rest.map((s, i) => (
                          <li key={s.id} className={cn("py-4", i > 0 && "border-t border-line-soft")}>
                            <BriefItem story={s} fresh={s === feed[0] && kind === "all"} />
                          </li>
                        ))}
                      </ol>
                    </div>
                  }
                />
              ) : null}

              {earlier.length || gh ? <Earlier stories={earlier} github={gh} first={!week.length} /> : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/** Two facing pages: the left a little wider, a hairline fold between them. */
function Pages({ left, right, label, divided = true }: { left: React.ReactNode; right: React.ReactNode; label: string; divided?: boolean }) {
  return (
    <section aria-label={label} className={cn("grid lg:grid-cols-[1.12fr_1fr]", divided && "border-b border-line last:border-b-0")}>
      <div className="min-w-0 border-line lg:border-r">{left}</div>
      <div className="min-w-0">{right}</div>
    </section>
  );
}

function PageHead({ label, count }: { label: string; count?: number }) {
  return (
    <p className="flex items-center gap-2 px-6 pt-5 pb-3 font-mono text-[10.5px] tracking-[0.08em] text-t4 uppercase">
      {label}
      {count ? <span className="tabular-nums">{count}</span> : null}
    </p>
  );
}

/** The lead page: the whole story, photo first. */
function LeadPage({ story, imageHeight = 300 }: { story: FeedStory; imageHeight?: number }) {
  const joined = story.items.length > 1;
  return (
    <article className="p-6 pt-5">
      {story.card.image ? (
        <div
          className="relative overflow-hidden rounded-[10px] border border-line-strong"
          style={{ height: imageHeight, boxShadow: "var(--card-shadow)" }}
        >
          <Img src={story.card.image} />
          {joined ? (
            <span className="absolute top-3 left-3 inline-flex h-[24px] items-center gap-1.5 rounded-full bg-black/55 px-2.5 text-[11.5px] font-medium text-white backdrop-blur-sm">
              <Layers className="size-3" /> Joined from {story.items.length} sources
            </span>
          ) : null}
        </div>
      ) : null}
      <StoryMeta story={story} className="mt-5" />
      <h2 className="mt-2.5 text-[27px] leading-[1.18] font-semibold tracking-[-0.025em] text-balance text-t1">{story.card.headline}</h2>
      <FactsMore story={story} first={story.card.facts.length} size="md" className="mt-4" />
      <Evidence story={story} className="mt-5" />
      <Publishers story={story} className="mt-5 border-t border-line-soft pt-4" />
    </article>
  );
}

/** One story on the right page: picture or cover, headline, the first facts, who reported it. */
function BriefItem({ story, fresh }: { story: FeedStory; fresh: boolean }) {
  const first = story.items[0];
  return (
    <article className="grid grid-cols-1 gap-3 sm:grid-cols-[148px_1fr] sm:gap-4">
      <div className="h-[150px] overflow-hidden sm:h-[96px] rounded-[8px] border border-line-strong" style={{ boxShadow: "var(--card-shadow)" }}>
        {story.card.image ? <Img src={story.card.image} /> : <Cover item={first} />}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Publishers story={story} size={15} className="min-w-0" />
          {fresh ? <NewFlag /> : null}
          <span className="ml-auto shrink-0 text-[11.5px] tabular-nums text-t4">{when(newest(story).published_at)}</span>
        </div>
        <h3 className="mt-1.5 text-[16px] leading-snug font-semibold tracking-[-0.01em] text-t1">{story.card.headline}</h3>
        <FactsMore story={story} first={1} className="mt-1.5" />
      </div>
    </article>
  );
}

/** Earlier stories, two to a spread, newest first; the GitHub release takes its place by date. */
function Earlier({ stories, github, first }: { stories: FeedStory[]; github: boolean; first: boolean }) {
  type Entry = { at: string; node: React.ReactNode; key: string };
  const entries: Entry[] = stories.map((s) => ({ at: newest(s).published_at, key: s.id, node: <LeadPage story={s} imageHeight={220} /> }));
  if (github) entries.push({ at: "2024-10-21T18:51:48Z", key: "github", node: <div className="p-6 pt-5"><GithubRelease /></div> });
  entries.sort((a, b) => (a.at < b.at ? 1 : -1));
  // Two to a spread; the GitHub release, being short, shares a page with the story before it.
  const pages: Entry[][] = [];
  for (const e of entries) {
    const last = pages[pages.length - 1];
    if (e.key === "github" && last) last.push(e);
    else pages.push([e]);
  }
  const spreads: Entry[][][] = [];
  for (let i = 0; i < pages.length; i += 2) spreads.push(pages.slice(i, i + 2));
  return (
    <>
      {spreads.map((pair, si) => (
        <div key={si} className={cn(!(first && si === 0) && "border-t border-line")}>
          {si === 0 ? <PageHead label="Earlier" /> : null}
          <Pages
            label="Earlier"
            divided={false}
            left={pair[0].map((e, i) => (
              <div key={e.key} className={cn(i > 0 && "border-t border-line-soft")}>
                {e.node}
              </div>
            ))}
            right={(pair[1] ?? []).map((e, i) => (
              <div key={e.key} className={cn(i > 0 && "border-t border-line-soft")}>
                {e.node}
              </div>
            ))}
          />
        </div>
      ))}
    </>
  );
}
