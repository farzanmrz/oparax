"use client";

import { ArrowDown, Check, Layers } from "lucide-react";
import { Facts } from "@/next/council/chrome";
import { clock, hostOf, storiesThisWeek, week, when } from "@/next/council/data";
import { KindChip, KindGlyph, MarkStack, ReportMark, WeekBars } from "@/next/council/marks";
import { councilStories, type ItemView } from "@/next/data/feed";
import { githubRelease, heroArrivals, heroStory } from "@/next/data/landing";
import { cn } from "@/lib/utils";
import { SectionHead, Surface } from "./bits";

// Screen 3: three reports of one event (the Next.js blog post, the GitHub release, the @nextjs post, in real
// publication order on October 21, 2024) becoming one card, with every fact citing where it came from. Beside
// it, the other stories of the feed's newest week as image cards.

const isGitHub = (i: ItemView) => i.id === githubRelease.id;
const kindOf = (i: ItemView) => (isGitHub(i) ? "github" : i.kind);

const more = ["st-c-olmo", "st-c-mai", "st-c-agent", "st-c-mistral"].map((id) => councilStories.find((s) => s.id === id)!);

export function StorySection() {
  return (
    <section id="stories" className="relative pt-6 pb-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 bottom-0" style={{ background: "var(--opus3-glow)" }} />
      <div className="relative mx-auto max-w-[1320px] px-10">
        <SectionHead id="stories-head" title={<>Many reports.<br />One story, every line cited.</>}>
          When a blog, a release and a post report the same event, Oparax joins them into one card. Each fact names
          the source it came from, and opens to the exact words.
        </SectionHead>

        <div className="mt-10 grid grid-cols-[300px_minmax(0,1fr)_290px] items-start gap-7">
          <Arrivals />
          <JoinedCard />
          <ThisWeek />
        </div>
      </div>
    </section>
  );
}

function Arrivals() {
  return (
    <div className="relative pt-1">
      <p className="mb-3 text-[12px] text-t3">October 21, 2024, UTC</p>
      <span aria-hidden="true" className="absolute top-12 bottom-24 left-[21px] w-px bg-line-strong" />
      <ol className="space-y-3">
        {heroArrivals.map((item) => {
          const k = kindOf(item);
          return (
            <li key={item.id} className="relative flex gap-3">
              <span className="relative z-10 mt-3 grid h-[22px] w-[44px] shrink-0 place-items-center rounded-full border border-line-strong bg-[var(--window)] text-[10.5px] tabular-nums text-t2">
                {clock(item.published_at)}
              </span>
              <Surface className="min-w-0 flex-1 p-3">
                <p className="flex items-center gap-1.5 text-[12px] text-t2">
                  <ReportMark item={item} size={14} />
                  <span className="truncate font-medium text-t1">{isGitHub(item) ? item.author : item.publisher}</span>
                  <KindChip kind={k} className="ml-auto h-[20px] px-1.5 text-[10.5px]" />
                </p>
                <p
                  className={cn(
                    "mt-2 line-clamp-3 text-[12.5px] leading-[1.5] text-t2",
                    isGitHub(item) && "font-mono text-[11px] leading-[1.6] whitespace-pre-line text-t2",
                  )}
                >
                  {isGitHub(item) ? item.text : item.text.split("\n")[0]}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--ok)]">
                  <Check className="size-3" strokeWidth={2.5} /> Fits your sentence
                </p>
              </Surface>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 ml-[58px] inline-flex items-center gap-2 rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-3 py-1.5 text-[12px] font-medium text-[var(--brand)]">
        <ArrowDown className="size-3.5 -rotate-90" /> Joined into one story
      </p>
    </div>
  );
}

function JoinedCard() {
  const story = heroStory;
  const counts = (["post", "article", "github"] as const)
    .map((k) => ({ k, n: story.items.filter((i) => kindOf(i) === k).length }))
    .filter((c) => c.n > 0);
  return (
    <div className="relative pt-[44px]">
      {/* the joined reports, stacked behind the card */}
      {[
        { d: 2, item: story.items[2] },
        { d: 1, item: story.items[1] },
      ].map(({ d, item }) => (
        <div
          key={d}
          aria-hidden="true"
          className="absolute inset-x-0 h-[60px] rounded-[14px] border border-line-strong bg-[var(--raised)]"
          style={{ top: (2 - d) * 22, marginInline: d * 14, boxShadow: "var(--card-shadow)" }}
        >
          <span
            className="absolute inset-x-5 top-0 h-[2px] rounded-b-full"
            style={{ background: d === 2 ? "var(--kind-post)" : "var(--kind-github)" }}
          />
          <span className="flex h-[22px] items-center gap-1.5 px-4 text-[11px] text-t2">
            <ReportMark item={item} size={12} />
            {isGitHub(item) ? item.author : item.publisher}
            <span className="text-t4">{isGitHub(item) ? "v15.0.0" : item.author}</span>
            <span className="ml-auto tabular-nums text-t4">{clock(item.published_at)}</span>
          </span>
        </div>
      ))}
      <Surface as="article" lift="window" className="overflow-hidden">
        <div className="relative h-[220px] overflow-hidden border-b border-line bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.card.image!} alt="" className="size-full object-cover" />
        </div>
        <div className="p-6">
          <div className="flex items-center gap-1.5">
            {counts.map(({ k, n }) => (
              <KindChip key={k} kind={k} count={k === "github" ? undefined : n} />
            ))}
            <span className="ml-auto text-[12px] tabular-nums text-t4">{when(story.items[2].published_at)} UTC</span>
          </div>
          <h3 className="mt-3 text-[27px] leading-[1.15] font-semibold tracking-[-0.02em] text-t1">{story.card.headline}</h3>
          <Facts story={story} className="mt-4" size="sm" />
          <div className="mt-5 flex items-center gap-2.5 border-t border-line-soft pt-4">
            <MarkStack items={story.items} size={20} />
            <span className="text-[12.5px] text-t2">nextjs.org, github.com, @nextjs</span>
            <span className="ml-auto inline-flex h-[24px] items-center gap-1 rounded-md border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 text-[11.5px] text-[var(--brand)]">
              <Layers className="size-3" /> {story.items.length} reports
            </span>
          </div>
        </div>
      </Surface>
    </div>
  );
}

function ThisWeek() {
  return (
    <div className="space-y-3 pt-1">
      <Surface className="px-4 py-3.5">
        <p className="text-[12px] text-t3">Stories this week</p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <p className="text-[30px] leading-none font-semibold tabular-nums text-t1">{storiesThisWeek}</p>
          <WeekBars week={week} height={36} className="w-[140px]" />
        </div>
        <p className="mt-2 flex justify-between text-[11px] text-t4">
          <span>By publication date</span>
          <span>
            {week[0].label} to {week[week.length - 1].label}
          </span>
        </p>
      </Surface>
      {more.map((s) => {
        const item = s.items[0];
        return (
          <Surface key={s.id} as="article" className="flex gap-3 overflow-hidden p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.card.image!} alt="" className="h-[74px] w-[92px] shrink-0 rounded-lg border border-line object-cover" />
            <div className="min-w-0 py-0.5">
              <p className="flex items-center gap-1.5 text-[11.5px] text-t3">
                <ReportMark item={item} size={13} />
                <span className="truncate">{item.publisher}</span>
                <KindGlyph kind="article" className="size-3 text-[var(--kind-article)]" />
                <span className="ml-auto shrink-0 tabular-nums text-t4">{when(item.published_at, false)}</span>
              </p>
              <p className="mt-1 line-clamp-2 text-[13px] leading-[1.35] font-medium text-t1">{s.card.headline}</p>
              <p className="mt-0.5 truncate text-[11px] text-t4">{hostOf(item.url)}</p>
            </div>
          </Surface>
        );
      })}
    </div>
  );
}
