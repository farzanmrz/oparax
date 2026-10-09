"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Mail } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { BotAvatar, OparaxMark, XLogo } from "@/pro/shared/brand";
import { packDm } from "@/next/data/feed";
import { cn } from "@/lib/utils";
import {
  beat,
  brief,
  clock,
  day,
  feedItems,
  funnel,
  groupLabel,
  heroItems,
  heroStory,
  HANDLE,
  plans,
  sourceById,
  sourcesIn,
  status,
  storiesFor,
  type FeedItem,
  type Group,
  type Source,
  type Story,
} from "./data";
import { Facts, Lifted, Mono, Page, primaryClass, secondaryClass, SiteNav } from "./chrome";
import { EASE, LiveLine } from "./live";
import { GitHubMark, GoogleMark, GroupGlyph, ItemMark, KindChip, SiteIcon, SourceMark, XAvatar } from "./marks";
import { ItemImage, ReleaseBlock } from "./media";

// Newsroom landing. Sign up first, beside the product working on real data: the hero's lifted table window
// replays the Next.js 15 day of October 21, 2024 (a blog article, a GitHub release and an Twitter post arrive as
// rows and join into one story, which goes out as an X direct message). Below: the sources desk of the recorded
// run with each source's latest item, then the plans as one table with the free week as its live top row.

const story: Story = {
  id: heroStory.id,
  card: heroStory.card,
  items: [heroItems.blog, heroItems.release, heroItems.post],
};
const rows: FeedItem[] = [heroItems.blog, heroItems.release, heroItems.post];
const STEPS = [700, 1500, 2300, 3200, 3900];

function useReplay(settled: boolean) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(settled ? STEPS.length : 0);
  useEffect(() => {
    if (settled || reduce) {
      setStep(STEPS.length);
      return;
    }
    const timers = STEPS.map((t, i) => setTimeout(() => setStep(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, [settled, reduce]);
  return step;
}

export function Landing({ theme, settled = false }: { theme?: string; settled?: boolean }) {
  const q = theme ? `?theme=${theme}` : "";
  return (
    <Page>
      <SiteNav theme={theme} />
      <main className="flex-1">
        <Hero q={q} settled={settled} />
        <SourcesDesk />
        <Plans q={q} />
        <Closing q={q} />
      </main>
      <footer className="border-t border-line">
        <div className="flex h-14 items-center justify-between px-4 lg:px-7 text-[12.5px] text-t3">
          <span className="flex items-center gap-2">
            <OparaxMark className="size-4 text-t2" /> Oparax
          </span>
          <span className="flex gap-6">
            <a href="#" className="hover:text-t1">Privacy</a>
            <a href="#" className="hover:text-t1">Terms</a>
            <a href="#" className="hover:text-t1">Contact</a>
          </span>
        </div>
      </footer>
    </Page>
  );
}

function SignUpButtons({ q, className }: { q: string; className?: string }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Link href={`/v2/newsroom/setup${q}`} className={cn(primaryClass, "h-10 w-full text-[14px]")}>
        <XLogo className="size-3.5" /> Continue with Twitter
      </Link>
      <div className="grid grid-cols-2 gap-2">
        <Link href={`/v2/newsroom/setup${q}`} className={cn(secondaryClass, "h-10")}>
          <GoogleMark className="size-4" /> Google
        </Link>
        <Link href={`/v2/newsroom/login${q ? q + "&" : "?"}mode=signup`} className={cn(secondaryClass, "h-10")}>
          <Mail className="size-4 text-t2" /> Email
        </Link>
      </div>
    </div>
  );
}

const kindStrip: { group: Group | "ph"; label: string }[] = [
  { group: "x", label: groupLabel.x },
  { group: "rss", label: groupLabel.rss },
  { group: "website", label: groupLabel.website },
  { group: "github", label: groupLabel.github },
  { group: "ph", label: "PRODUCT HUNT" },
];

function KindStripMarks({ group }: { group: Group | "ph" }) {
  if (group === "ph") return <SiteIcon host="producthunt.com" size={16} className="rounded-full" />;
  if (group === "github")
    return (
      <span className="grid size-4 place-items-center text-[var(--kind-github)]">
        <GitHubMark className="size-3.5" />
      </span>
    );
  const list = sourcesIn(group).slice(0, 3);
  return (
    <span className="flex items-center">
      {list.map((s, i) => (
        <span key={s.id} className="rounded-full ring-2 ring-[var(--window)]" style={{ marginLeft: i ? -5 : 0, zIndex: 3 - i }}>
          <SourceMark source={s} size={16} className={s.group === "x" ? "" : "rounded-[4px]"} />
        </span>
      ))}
    </span>
  );
}

function Hero({ q, settled }: { q: string; settled: boolean }) {
  return (
    <section
      id="product"
      className="grid scroll-mt-16 grid-cols-1 gap-x-12 gap-y-8 px-4 lg:px-7 pt-10 pb-20 xl:grid-cols-[430px_minmax(0,1fr)] xl:grid-rows-[auto_1fr] xl:pt-12"
    >
      {/* Below 1280px the sign-up sits beside the intro and the product window follows at once; the kind strip goes last. */}
      <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:col-start-1 xl:row-start-1 xl:block xl:pt-4">
        <div>
          <p className="flex items-center gap-2.5 text-[13px] text-t2">
            <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide text-[var(--caution)]">
              FREE WEEK
            </span>
            Free for a week once your agent is ready.
          </p>
          <h1 className="mt-5 text-[38px] leading-[1.06] font-semibold tracking-[-0.035em] text-t1 xl:text-[46px] xl:leading-[1.04]">
            Oparax turns the news you follow into sourced stories.
          </h1>
          <p className="mt-5 text-[15.5px] leading-[1.6] text-t2">
            Pick what you follow. Oparax watches the Twitter accounts, RSS feeds, websites, GitHub and Product Hunt around it, groups
            related articles and posts into one story with its sources attached, and can alert you on Twitter.
          </p>
        </div>
        <Lifted className="p-4 xl:mt-7">
          <Mono>SIGN UP</Mono>
          <SignUpButtons q={q} className="mt-2.5" />
          <p className="mt-3 text-[12.5px] text-t3">
            Already have an account?{" "}
            <Link href={`/v2/newsroom/login${q ? q + "&" : "?"}mode=signup`} className="text-[var(--brand)] hover:underline">
              Log In
            </Link>
          </p>
        </Lifted>
      </div>
      <div className="order-last xl:order-none xl:col-start-1 xl:row-start-2">
        <Mono>WATCHES, ALL WEIGHED THE SAME</Mono>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {kindStrip.map((k) => (
            <span key={k.label} className="inline-flex h-8 items-center gap-2 rounded-md border border-line bg-[var(--window)] px-2.5" style={{ boxShadow: "var(--top-light)" }}>
              <KindStripMarks group={k.group} />
              <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-t2">{k.label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="xl:col-start-2 xl:row-span-2 xl:row-start-1">
        <HeroWindow settled={settled} />
      </div>
    </section>
  );
}

function HeroWindow({ settled }: { settled: boolean }) {
  const step = useReplay(settled);
  const shown = rows.slice(0, Math.min(step, 3));
  const joined = step >= 4;
  const sent = step >= 5;
  return (
    <div className="relative pr-10">
      <Lifted strong className="rounded-[14px]">
        <div className="flex h-10 items-center gap-2.5 border-b border-line px-4 text-[12.5px]" style={{ background: "linear-gradient(180deg, var(--raised), var(--window))" }}>
          <OparaxMark className="size-3.5 text-t1" />
          <span className="text-t3">/</span>
          <span className="text-t1">@{HANDLE}</span>
          <span className="text-t3">/</span>
          <span className="text-t2">Feed</span>
          <span className="ml-auto font-mono text-[10px] tracking-[0.08em] text-t3">REPLAY OF OCT 21, 2024 (UTC)</span>
        </div>
        <div className="grid h-9 grid-cols-[150px_minmax(0,1fr)_56px] items-center gap-4 border-b border-line px-4 font-mono text-[10.5px] tracking-[0.08em] text-t3">
          <span>SOURCE</span>
          <span>ARRIVED</span>
          <span className="text-right">TIME</span>
        </div>
        <div
          className={cn(
            "grid h-10 grid-cols-[150px_minmax(0,1fr)_56px] items-center gap-4 border-b border-line px-4",
            joined ? "bg-[var(--ok-soft)]" : "bg-[var(--caution-soft)]/60",
          )}
        >
          <span className={cn("font-mono text-[10.5px] tracking-[0.08em]", joined ? "text-[var(--ok)]" : "text-[var(--caution)]")}>LIVE</span>
          {joined ? (
            <span className="flex items-center gap-2.5 text-[13px] font-medium text-t1">
              <StatusMark status="done" size={15} color="var(--ok)" doneColor="var(--ok)" strokeWidth={2} />
              3 items about one event, joined into one story
            </span>
          ) : (
            <LiveLine label={`Checking ${3 - shown.length > 0 ? 3 - shown.length : 1} ${3 - shown.length === 1 ? "item" : "items"} against your sentence`} />
          )}
          <span />
        </div>
        <ul className="min-h-[204px]">
          <AnimatePresence initial={false}>
            {shown.map((item) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="overflow-hidden border-b border-line-soft"
              >
                <ArrivalRow item={item} joined={joined} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <AnimatePresence initial={false}>
          {joined ? (
            <motion.div
              key="story"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="grid grid-cols-[minmax(0,1fr)_236px] gap-6 bg-[var(--well)] px-5 pt-4 pb-5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Mono className="text-[var(--brand)]">STORY</Mono>
                  <KindChip kind="article" />
                  <KindChip kind="github" />
                  <KindChip kind="post" />
                </div>
                <h2 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-t1">{story.card.headline}</h2>
                <Facts story={story} size="sm" className="mt-3" />
              </div>
              <div className="pt-1">
                <ItemImage src={heroItems.blog.image!} className="relative aspect-[16/9] overflow-hidden rounded-lg border border-line" />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Lifted>
      <AnimatePresence>
        {sent ? (
          <motion.div
            key="dm"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="absolute right-0 bottom-[-96px] w-[292px]"
          >
            <DmCard />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <p className="mt-4 max-w-[440px] text-[12.5px] text-t3">
        Historical example from October 21, 2024, replayed. The story and the message are a preview, not a live result.
      </p>
    </div>
  );
}

function ArrivalRow({ item, joined }: { item: FeedItem; joined: boolean }) {
  const src = sourceById.get(item.sourceId);
  const name = item.kind === "github" ? "vercel/next.js" : item.publisher;
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)_56px] items-start gap-4 px-4 py-2.5">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="flex items-center gap-2 text-[12.5px] text-t1">
          {src ? <SourceMark source={src} size={16} /> : <ItemMark item={item} size={16} />}
          <span className="truncate">{name}</span>
        </span>
        <KindChip kind={item.kind} className="w-fit" />
      </div>
      <div className="min-w-0">
        {item.kind === "github" ? (
          <>
            <p className="text-[13px] font-medium text-t1">Release {item.title}</p>
            <div className="mt-0.5 font-mono text-[11px] leading-[1.55] text-t2">
              {item.text.split("\n").map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          </>
        ) : item.kind === "post" ? (
          <p className="text-[13px] leading-[1.5] text-t1">{item.text.split("\n").filter(Boolean).slice(0, 2).join(" ")}</p>
        ) : (
          <>
            <p className="text-[13px] font-medium text-t1">{item.title}</p>
            <p className="mt-0.5 text-[12.5px] leading-[1.5] text-t2">{item.text}</p>
          </>
        )}
      </div>
      <span className="flex flex-col items-end gap-1 text-right font-mono text-[11.5px] text-t2 tabular-nums">
        {clock(item.published_at)}
        {joined ? <Check className="size-3.5 text-[var(--ok)]" aria-label="Joined" /> : null}
      </span>
    </div>
  );
}

function DmCard() {
  const text = packDm(HANDLE, [{ ...heroStory, arrangement: "clustered" }]);
  const [head, ...rest] = text.split("\n\n");
  const lines = rest.join("\n\n").split("\n");
  return (
    <div className="overflow-hidden rounded-xl border border-line-strong bg-[var(--window)]" style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
      <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5">
        <BotAvatar className="size-7" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-t1">Oparax</p>
          <p className="text-[11.5px] text-t3">@oparax_ai</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-[var(--kind-post)]">
          <XLogo className="size-2.5" /> DIRECT MESSAGE
        </span>
      </div>
      <div className="p-3.5">
        <div className="rounded-2xl rounded-bl-md bg-[var(--raised)] px-3.5 py-3 text-[12.5px] leading-[1.5] text-t1">
          <p className="font-semibold">{head}</p>
          <p className="mt-2 font-medium">{lines[0]}</p>
          <p className="mt-1 text-t2">{lines[1]}</p>
          <p className="mt-1 break-all text-[var(--brand)]">{lines[2]}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────── Sources desk ───────────────

const deskGroups: { group: Group; ids: string[] }[] = (["x", "rss", "website", "github"] as const).map((g) => ({
  group: g,
  // Sources with a latest item first, then the rest, each group in the run's order.
  ids: [...sourcesIn(g)].sort((a, b) => Number(!!latestOf(b.id)) - Number(!!latestOf(a.id))).map((s) => s.id),
}));

function latestOf(id: string): FeedItem | null {
  const list = feedItems.filter((i) => i.sourceId === id).sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  return list[0] ?? null;
}

const DESK = "grid-cols-[236px_minmax(0,1fr)_minmax(0,1.15fr)]";

function SourcesDesk() {
  return (
    <section id="sources" className="relative scroll-mt-16 border-t border-line">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-80" style={{ background: "var(--stage-light)" }} />
      <div className="relative grid grid-cols-1 gap-8 px-4 lg:px-7 pt-16 pb-14 xl:grid-cols-[minmax(0,1fr)_312px]">
        <div className="min-w-0">
          <h2 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] text-t1">Every source weighed the same</h2>
          <p className="mt-3 max-w-[640px] text-[15px] leading-[1.6] text-t2">
            Twitter accounts, RSS feeds, websites and GitHub repositories go through one check against your sentence. A sample desk for
            @{HANDLE} (illustrative reasons), with the latest item from each source.
          </p>
          <Lifted strong className="mt-7 rounded-[14px]">
            <div
              className={cn("grid h-10 items-center gap-5 border-b border-line px-4 font-mono text-[10.5px] tracking-[0.08em] text-t3", DESK)}
              style={{ background: "linear-gradient(180deg, var(--raised), var(--window))" }}
            >
              <span>SOURCE</span>
              <span>WHY IT WAS CHOSEN</span>
              <span>LATEST</span>
            </div>
            {deskGroups.map(({ group, ids }) => (
              <div key={group}>
                <p className="flex items-center gap-1.5 border-b border-line-soft bg-[var(--raised)]/50 px-4 py-1.5 font-mono text-[10px] tracking-[0.1em] text-t3">
                  <GroupGlyph group={group} className="size-2.5" /> {groupLabel[group]}
                </p>
                {ids.map((id) => (
                  <DeskRow key={id} source={sourceById.get(id)!} />
                ))}
              </div>
            ))}
          </Lifted>
        </div>
        <div className="grid grid-cols-3 gap-3 self-start xl:sticky xl:top-20 xl:block xl:space-y-3 xl:pt-[118px]">
          <Lifted className="p-4">
            <Mono>YOUR SENTENCE</Mono>
            <p className="mt-2 border-l-2 border-[var(--brand)] pl-3 text-[15px] leading-[1.45] font-medium text-t1">{beat}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {brief.interests.map((t) => (
                <span key={t} className="rounded-md border border-line px-2 py-0.5 text-[12px] text-t2">
                  {t}
                </span>
              ))}
            </div>
          </Lifted>
          <Lifted className="p-4">
            <Mono>HOW THEY WERE PICKED</Mono>
            <div className="mt-3 space-y-2.5">
              {[
                { n: funnel.candidates, label: "candidates checked against the sentence", tone: "bg-t3/50" },
                { n: funnel.passed, label: "fit well enough to consider", tone: "bg-[var(--caution)]" },
                { n: funnel.chosen, label: "chosen, each with a reason", tone: "bg-[var(--ok)]" },
              ].map((r) => (
                <div key={r.label}>
                  <p className="flex items-baseline gap-2 text-[12.5px] text-t2">
                    <span className="text-[18px] font-semibold tabular-nums text-t1">{r.n}</span>
                    {r.label}
                  </p>
                  <div className="mt-1 h-1.5 rounded-full bg-line">
                    <div className={cn("h-full rounded-full", r.tone)} style={{ width: `${(r.n / funnel.candidates) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-t3">From 10 of @{HANDLE}&apos;s posts and the one sentence.</p>
          </Lifted>
          <Lifted className="p-4">
            <Mono>YOUR ALERTS</Mono>
            <p className="mt-2 flex items-center gap-2 text-[13px] text-t1">
              <XLogo className="size-3.5 text-[var(--kind-post)]" /> One X direct message per new story
            </p>
            <p className="mt-1 text-[12.5px] text-t3">Daily in your free week; every 15 minutes on Wire.</p>
          </Lifted>
        </div>
      </div>
    </section>
  );
}

function DeskRow({ source }: { source: Source }) {
  const item = latestOf(source.id);
  return (
    <div className={cn("grid items-start gap-5 border-b border-line-soft px-4 py-3 last:border-b-0", DESK)}>
      <div className="flex min-w-0 items-start gap-2.5">
        <SourceMark source={source} size={22} className="mt-0.5" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-t1">{source.name}</p>
          <p className="font-mono text-[10.5px] whitespace-nowrap text-t3">{source.handle}</p>
        </div>
      </div>
      <p className="text-[12.5px] leading-[1.5] text-t2">{source.why ?? `Added for this preview: releases of ${source.focus}.`}</p>
      {item ? <LatestCell item={item} /> : <p className="text-[12.5px] text-t3">Nothing new in this preview.</p>}
    </div>
  );
}

function LatestCell({ item }: { item: FeedItem }) {
  const story = storiesFor("direct").find((s) => s.items[0].id === item.id);
  const media = item.image ? (
    <ItemImage src={item.image} className="relative aspect-[16/10] w-[92px] shrink-0 overflow-hidden rounded-md border border-line" />
  ) : item.kind === "github" ? (
    <ReleaseMini />
  ) : item.kind === "post" ? (
    <span className="grid aspect-[16/10] w-[92px] shrink-0 place-items-center rounded-md border border-line bg-[var(--kind-post-soft)] text-[var(--kind-post)]">
      <XLogo className="size-5" />
    </span>
  ) : (
    <span className="grid aspect-[16/10] w-[92px] shrink-0 place-items-center rounded-md border border-line bg-[var(--kind-article-soft)]">
      <ItemMark item={item} size={22} />
    </span>
  );
  return (
    <div className="flex items-start gap-3">
      {media}
      <div className="min-w-0">
        <p className="text-[12.5px] leading-[1.45] font-medium text-t1">{story?.card.headline ?? item.title}</p>
        <p className="mt-1 font-mono text-[10.5px] text-t3">
          {day(item.published_at)}, {clock(item.published_at)}
        </p>
      </div>
    </div>
  );
}

function ReleaseMini() {
  return (
    <span className="flex aspect-[16/10] w-[92px] shrink-0 flex-col justify-center gap-0.5 rounded-md border border-line bg-[var(--kind-github-soft)] px-2 font-mono text-[9.5px] text-t2">
      <span className="flex items-center gap-1 text-[var(--kind-github)]">
        <GitHubMark className="size-3" /> v15.0.0
      </span>
      <span>#65058</span>
      <span>#66004</span>
    </span>
  );
}

// ─────────────── Plans ───────────────

const PLAN = "grid-cols-[180px_120px_minmax(0,1.3fr)_minmax(0,1fr)_160px]";

function Plans({ q }: { q: string }) {
  const max = Math.max(...plans.map((p) => p.posts));
  return (
    <section id="pricing" className="scroll-mt-16 border-t border-line">
      <div className="px-4 lg:px-7 pt-14 pb-14">
        <div className="flex items-end justify-between gap-8">
          <div>
            <h2 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] text-t1">Pick your pace</h2>
            <p className="mt-3 max-w-[620px] text-[15px] leading-[1.6] text-t2">
              Every plan includes your story feed and unlimited websites and RSS feeds. Choose how much of Twitter to watch and how often to
              hear from us.
            </p>
          </div>
          <Link href={`/v2/newsroom/login${q ? q + "&" : "?"}mode=signup`} className={cn(primaryClass, "h-10 px-4 text-[14px]")}>
            Sign Up
          </Link>
        </div>
        <Lifted strong className="mt-8 rounded-[14px]">
          <div
            className={cn("grid h-10 items-center gap-5 border-b border-line px-5 font-mono text-[10.5px] tracking-[0.08em] text-t3", PLAN)}
            style={{ background: "linear-gradient(180deg, var(--raised), var(--window))" }}
          >
            <span>PLAN</span>
            <span>PRICE</span>
            <span>WATCHED TWITTER POSTS</span>
            <span>ALERTS ON TWITTER</span>
            <span className="text-right">WEBSITES AND RSS FEEDS</span>
          </div>
          <div className={cn("grid items-center gap-5 border-b border-line bg-[var(--caution-soft)]/60 px-5 py-3.5", PLAN)}>
            <span className="font-mono text-[11px] tracking-[0.08em] text-[var(--caution)]">FREE WEEK</span>
            <span className="text-[15px] font-semibold text-t1">
              $0 <span className="text-[12px] font-normal text-t3">for 7 days</span>
            </span>
            <div>
              <p className="text-[13px] text-t1">
                <span className="tabular-nums">{status.poolLimit}</span> <span className="text-t3">in the week</span>
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-line">
                <div className="h-full rounded-full bg-[var(--caution)]" style={{ width: `${(status.poolLimit / max) * 100}%` }} />
              </div>
            </div>
            <span className="text-[13px] text-t2">Daily</span>
            <span className="text-right text-[13px] text-t2">Unlimited</span>
          </div>
          {plans.map((p) => (
            <div key={p.name} className={cn("grid items-center gap-5 border-b border-line-soft px-5 py-4 last:border-b-0", PLAN)}>
              <span className="text-[15px] font-semibold text-t1">{p.name}</span>
              <span className="text-[15px] font-semibold text-t1">
                {p.price} <span className="text-[12px] font-normal text-t3">a month</span>
              </span>
              <div>
                <p className="text-[13px] text-t1">
                  <span className="tabular-nums">{p.posts.toLocaleString("en-US")}</span> <span className="text-t3">a month</span>
                </p>
                <div className="mt-1.5 h-1.5 rounded-full bg-line">
                  <div className="h-full rounded-full bg-[var(--kind-post)]" style={{ width: `${(p.posts / max) * 100}%` }} />
                </div>
              </div>
              <span className="text-[13px] text-t2">{p.alerts}</span>
              <span className="text-right text-[13px] text-t2">Unlimited</span>
            </div>
          ))}
        </Lifted>
        <p className="mt-4 text-[13px] text-t3">
          Your free week starts when your agent is ready. Choose a plan on your agent&apos;s page when the week ends.
        </p>
      </div>
    </section>
  );
}

function Closing({ q }: { q: string }) {
  const latest = storiesFor("clustered").slice(0, 4);
  return (
    <section className="border-t border-line">
      <div className="grid grid-cols-1 items-center gap-12 px-4 lg:px-7 py-16 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <h2 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] text-t1">Your beat, watched for you</h2>
          <div className="mt-6 grid grid-cols-4 gap-3">
            {latest.map((s) => (
              <figure key={s.id} className="overflow-hidden rounded-lg border border-line bg-[var(--window)]" style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}>
                {s.card.image ? <ItemImage src={s.card.image} className="relative aspect-[16/9]" /> : null}
                <figcaption className="p-2.5 text-[12px] leading-[1.4] font-medium text-t1">{s.card.headline}</figcaption>
              </figure>
            ))}
          </div>
        </div>
        <Lifted className="p-5">
          <Mono>SIGN UP</Mono>
          <SignUpButtons q={q} className="mt-2.5" />
        </Lifted>
      </div>
    </section>
  );
}

export { XAvatar };
