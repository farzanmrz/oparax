"use client";

import { ArrowRight, Layers, CornerDownRight } from "lucide-react";
import { BotAvatar, XLogo } from "@/pro/shared/brand";
import { Facts } from "@/next/council/chrome";
import { Checking } from "@/next/council/live";
import { Dot, KindChip, MarkStack, ReportMark, WeekBars } from "@/next/council/marks";
import { cn } from "@/lib/utils";
import { GhostButton, KindBadge, PrimaryButton } from "./atoms";
import { clock, dmStories, funnel, HANDLE, solStory, status, week, when, wireAll } from "./data";

// Screen 1: the product working. A report wire arriving from the person's sources, the story those reports
// became (the lifted surface), the X DM that carried it, and the agent's live state. Real reports only.

export function Hero() {
  const weekTotal = week.reduce((n, d) => n + d.count, 0);
  return (
    <section id="top" className="relative h-[844px] overflow-hidden">
      <div className="mx-auto grid h-full max-w-[1360px] grid-cols-[392px_1fr] gap-10 px-8 pt-14">
        <div className="flex flex-col pb-10 pt-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-[var(--tile-bg)] px-2.5 py-1 text-[12px] text-t2 shadow-[var(--top-light)]">
            <Dot tone="ok" pulse />
            <span className="font-medium text-[var(--ok)]">Live</span>
            <span className="text-t3">
              {funnel.sites} sites and feeds, {funnel.accounts} X accounts for @{HANDLE}
            </span>
          </span>
          <h1 className="mt-6 text-[40px] font-semibold leading-[1.08] tracking-[-0.025em] text-t1">
            The internet you don&apos;t see on X, brought to you on X.
          </h1>
          <p className="mt-5 text-[15.5px] leading-[1.6] text-t2">
            Oparax watches the sources of your beat, joins every report of one event into one story with each fact
            cited, and sends it to your X DMs.
          </p>
          <div className="mt-7 flex items-center gap-2.5">
            <PrimaryButton className="h-9 px-4 text-[13.5px]">
              Sign up <ArrowRight className="size-3.5" />
            </PrimaryButton>
            <GhostButton className="h-9 px-4 text-[13.5px]">
              <XLogo className="size-3" /> Continue with X
            </GhostButton>
          </div>

          <div className="tile mt-8 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-t1">Free week</span>
              <span className="text-[12px] text-t3">no card</span>
            </div>
            <div className="mt-3 flex gap-1" aria-hidden="true">
              {Array.from({ length: status.trialDays }, (_, i) => (
                <span key={i} className="h-1.5 flex-1 rounded-full bg-[var(--caution)]" />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-[12.5px]">
              <div>
                <p className="text-t3">Days</p>
                <p className="mt-0.5 font-medium tabular-nums text-t1">{status.trialDays}</p>
              </div>
              <div>
                <p className="text-t3">Watched X posts</p>
                <p className="mt-0.5 font-medium tabular-nums text-t1">{status.poolLimit}</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="label">Reads</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <KindBadge kind="x" plural />
              <KindBadge kind="website" plural />
              <KindBadge kind="rss" plural />
              <KindBadge kind="github" />
              <KindBadge kind="producthunt" />
            </div>
          </div>
          <div className="mt-auto">
            <PulseTile weekTotal={weekTotal} />
          </div>
        </div>

        <div className="stage relative -mr-8 rounded-tl-[22px] border-l border-t border-line bg-[var(--stage-frame)] pl-5 pt-5">
          <div className="dots pointer-events-none absolute inset-0 rounded-tl-[22px] opacity-60 [mask-image:linear-gradient(180deg,black,transparent_70%)]" />
          <div className="relative grid grid-cols-[372px_1fr] gap-4 pr-8">
            <div className="flex flex-col gap-4">
              <WirePanel />
            </div>
            <div className="flex flex-col gap-4">
              <StoryCard />
              <DmThread />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WirePanel() {
  return (
    <div className="tile overflow-hidden">
      <div className="flex h-10 items-center justify-between border-b border-line px-4">
        <span className="text-[13px] font-medium text-t1">Reports in</span>
        <span className="font-mono text-[11px] text-t4">newest first</span>
      </div>
      <div className="flex h-10 items-center border-b border-line bg-[var(--caution-soft)] px-4">
        <Checking pending={1} compact />
      </div>
      <ul>
        {wireAll.map(({ item, story }) => {
          const joined = story.items.length > 1;
          return (
            <li key={item.id} className="flex items-start gap-3 border-b border-line-soft px-4 py-2 last:border-b-0">
              <span className="mt-[3px] w-[80px] shrink-0 font-mono text-[10.5px] leading-4 text-t4">
                {when(item.published_at, false)}
                <br />
                {clock(item.published_at)}
              </span>
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[12px] text-t3">
                  <ReportMark item={item} size={13} />
                  {item.publisher}
                </span>
                <p className="mt-0.5 truncate text-[13px] text-t1">{item.title}</p>
              </div>
              {joined ? (
                <span className="mt-1 inline-flex h-[20px] shrink-0 items-center gap-1 rounded-full bg-[var(--brand-soft)] px-1.5 text-[11px] font-medium text-[var(--brand)]">
                  <Layers className="size-3" /> joined
                </span>
              ) : (
                <KindChip kind={item.kind} className="mt-1 h-[20px] px-1.5 text-[11px]" />
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex h-9 items-center gap-2 border-t border-line bg-[var(--error-soft)] px-4 text-[12.5px] text-[var(--error)]">
        <Dot tone="error" />
        Could not process {status.failed} item.
      </div>
    </div>
  );
}

function PulseTile({ weekTotal }: { weekTotal: number }) {
  return (
    <div className="tile grid grid-cols-[1fr_auto] gap-x-5 p-4">
      <div>
        <p className="text-[12px] text-t3">Published this week</p>
        <p className="mt-1 text-[22px] font-semibold tabular-nums leading-none text-t1">
          {weekTotal} <span className="text-[13px] font-normal text-t3">reports</span>
        </p>
      </div>
      <WeekBars week={week} height={44} className="w-[150px]" />
      <div className="col-span-2 mt-2 flex justify-between font-mono text-[10.5px] text-t4">
        <span />
        <span className="flex w-[150px] justify-between">
          <span>{week[0].label}</span>
          <span>{week[week.length - 1].label}</span>
        </span>
      </div>
    </div>
  );
}

function StoryCard() {
  const s = solStory;
  return (
    <article className="lift relative z-10 overflow-hidden">
      <div className="relative h-[150px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.card.image!} alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--window)] via-transparent to-transparent" />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
          <Layers className="size-3" /> {s.items.length} reports, one story
        </span>
      </div>
      <div className="px-5 pb-4 pt-1">
        <div className="flex items-center gap-2">
          <KindChip kind="article" count={s.items.length} />
          <span className="rounded-full border border-line px-2 py-0.5 text-[11.5px] text-t3">{s.card.facts.length} facts</span>
          <span className="ml-auto font-mono text-[11px] text-t4">{when(s.items[0].published_at)}</span>
        </div>
        <h3 className="mt-2.5 text-[19px] font-semibold leading-[1.25] tracking-[-0.01em] text-t1">{s.card.headline}</h3>
        <Facts story={s} max={3} size="sm" className="mt-3" />
        <div className="mt-3.5 flex items-center gap-2 border-t border-line pt-3 text-[12px] text-t3">
          <MarkStack items={s.items} size={16} />
          {s.card.publishers.map((p) => p.name).join(", ")}
        </div>
      </div>
    </article>
  );
}

function DmThread() {
  return (
    <div className="tile overflow-hidden">
      <div className="flex h-11 items-center gap-2.5 border-b border-line px-4">
        <BotAvatar className="size-6" />
        <span className="text-[13px] font-semibold text-t1">Oparax</span>
        <span className="text-[12px] text-t3">@oparax_ai</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-t3">
          <XLogo className="size-3" /> Direct message
        </span>
      </div>
      <div className="px-4 py-3">
        <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-raised px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-t1">
          <p className="font-medium">Oparax: {dmStories.length} new stories for you</p>
          {dmStories.map((s) => (
            <div key={s.id} className="mt-2">
              <p>{s.card.headline}</p>
              <p className="text-t2">{s.card.facts[0].text}</p>
              <p className="text-[var(--brand)]">
                oparax.ai/{HANDLE}/{s.id}
              </p>
            </div>
          ))}
        </div>
        <p className={cn("mt-1.5 flex items-center gap-1 text-[11px] text-t4")}>
          <CornerDownRight className="size-3" /> One DM per story. Later reports improve the card, never DM again.
        </p>
      </div>
    </div>
  );
}
