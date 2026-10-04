"use client";

import Link from "next/link";
import { Check, Quote as QuoteMark } from "lucide-react";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { heroStory } from "@/next/data/landing";
import { brief, candidateCount, chosenAccounts, chosenSites, posts, postsRead } from "@/next/data/onboarding";
import { plans } from "@/next/copy";
import { cn } from "@/lib/utils";
import { EmailLink, GoogleButton, XButton } from "./auth";
import { BASE, lift, liftStyle, SiteHeader, Stage } from "./chrome";
import { beat, HANDLE, packDm, sources, stories, when, type Group } from "./data";
import { GitHubTile, GroupGlyph, GroupLabel, Segments, SourceMark } from "./marks";
import { StoryStack } from "./stack";

// Deck v2 landing. Sign-up first: the hero's actions are the sign-up itself (X, Google, email). The product works
// on screen from the first pixel: the Next.js 15 story as a physical stack, its three sources (blog, GitHub
// release, X post) peeking behind it with their own words, and the X message it became. Below: every kind of
// source as an equal card, this week's stories as stacks, how an agent is built from one sentence, the plans.

const byGroup = (g: Group) => sources.filter((s) => s.group === g);

export function DeckLanding() {
  const dm = packDm(HANDLE, [heroStory]).split("\n");
  return (
    <Stage light={900}>
      <SiteHeader nav />
      <main className="relative">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-[1400px] items-center gap-12 px-4 pt-12 pb-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:px-8">
          <div>
            <p className="flex items-center gap-2 text-[12.5px] text-t2">
              <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide text-[var(--caution)]">
                FREE WEEK
              </span>
              Free for a week once your agent is ready.
            </p>
            <h1 className="mt-5 text-[44px] leading-[1.07] font-semibold tracking-[-0.03em] text-t1 lg:text-[48px]">
              Oparax turns the news you follow into sourced stories.
            </h1>
            <p className="mt-5 text-[16px] leading-[1.6] text-t2">
              Pick what you follow. Oparax watches the X accounts, websites, RSS feeds, GitHub and Product Hunt around it, joins the
              articles and posts about one event into one story with its sources attached, and can alert you on X.
            </p>
            <div className="mt-8 grid max-w-[360px] gap-2.5">
              <XButton />
              <GoogleButton />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <EmailLink />
                <Link href={`${BASE}/login`} className="text-[13px] text-t3 transition-colors hover:text-t1">
                  Log In
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-5 xl:flex-row">
            <StoryStack story={heroStory} native peek={50} imageHeight={188} className="w-full min-w-0 flex-1" />
            <DmCard lines={dm} className="w-[300px] shrink-0 xl:mb-8 xl:w-[272px]" />
          </div>
        </section>
        <p className="mx-auto max-w-[1400px] px-4 text-[12px] text-t3 lg:px-8">
          Historical example from October 21, 2024, from public sources. The story and the message are a preview, not a live result.
        </p>

        {/* Sources */}
        <section id="sources" className="mx-auto w-full max-w-[1400px] scroll-mt-16 px-4 pt-20 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[640px]">
              <h2 className="text-[30px] leading-tight font-semibold tracking-[-0.025em] text-t1">Every source weighed the same</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-t2">
                X accounts, websites, RSS feeds, GitHub and Product Hunt are all read the same way: each new item is checked
                against your sentence, and what passes becomes a story.
              </p>
            </div>
            <p className="text-[12.5px] text-t3">The sources one agent chose for @{HANDLE}, and their stories this week.</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr]">
            <SourceCard group="x" label="X accounts" />
            <SourceCard group="rss" label="RSS feeds" />
            <div className="grid content-start gap-4">
              <SourceCard group="website" label="Websites" />
              <GitHubCard />
              <ProductHuntCard />
            </div>
          </div>

          <div className="mt-10 grid items-start gap-6 md:grid-cols-3">
            {[stories.clustered[3], stories.clustered[0], stories.clustered[4]].map((s) => (
              <StoryStack key={s.id} story={s} imageHeight={160} />
            ))}
          </div>
        </section>

        {/* The agent */}
        <section id="agent" className="mx-auto w-full max-w-[1400px] scroll-mt-16 px-4 pt-20 lg:px-8">
          <div className="max-w-[680px]">
            <h2 className="text-[30px] leading-tight font-semibold tracking-[-0.025em] text-t1">Built from your posts and one sentence</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-t2">
              Sign up, write what you want to follow, and your agent reads your newest posts, checks every candidate source against
              your sentence and chooses the ones that fit, each with its reason.
            </p>
          </div>
          <AgentStrip />
          <p className="mt-3 text-[12px] text-t3">Illustrative example, not a real run.</p>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto w-full max-w-[1400px] scroll-mt-16 px-4 pt-20 pb-24 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[640px]">
              <h2 className="text-[30px] leading-tight font-semibold tracking-[-0.025em] text-t1">A free week, then a plan</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-t2">
                Every plan includes your story feed and unlimited websites and RSS feeds. Choose how much of X to watch and how often
                to hear from us.
              </p>
            </div>
          </div>
          <Plans />
          <div className={cn(lift, "mt-12 flex flex-wrap items-center gap-6 px-6 py-5")} style={liftStyle}>
            <OparaxMark className="size-7 text-t1" />
            <p className="flex-1 text-[17px] font-medium text-t1">Sign up, write one sentence, and read your first stories today.</p>
            <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
              <XButton className="w-auto px-5" />
              <GoogleButton className="w-auto px-5" />
            </div>
          </div>
        </section>
      </main>
      <footer className="mt-auto border-t border-line">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-end gap-6 px-4 text-[13px] text-t3 lg:px-8">
          {["Privacy", "Terms", "Contact"].map((l) => (
            <a key={l} href="#" className="transition-colors hover:text-t1">
              {l}
            </a>
          ))}
        </div>
      </footer>
    </Stage>
  );
}

/** The X direct message the story became (lib/alerts/pack.ts format). */
function DmCard({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <div className={cn(lift, "overflow-hidden", className)} style={{ boxShadow: "var(--window-shadow)" }}>
      <div className="flex items-center gap-2.5 border-b border-line bg-[var(--raised)] px-3.5 py-2.5">
        <span className="grid size-7 place-items-center rounded-full bg-t1 text-[var(--window)]">
          <OparaxMark className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-t1">Oparax</span>
          <span className="block text-[11.5px] text-t3">@oparax_ai</span>
        </span>
        <span className="flex items-center gap-1 rounded-full bg-[var(--kind-post-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--kind-post)]">
          <XLogo className="size-2.5" /> Message
        </span>
      </div>
      <div className="p-3.5">
        <div className="rounded-2xl rounded-tl-md bg-[var(--well)] px-3.5 py-3 text-[12.5px] leading-[1.5] text-t2">
          {lines.map((l, i) =>
            l === "" ? (
              <span key={i} className="block h-2" />
            ) : l.startsWith("https://") ? (
              <span key={i} className="block break-all text-[var(--brand)]">
                {l.replace("https://", "")}
              </span>
            ) : (
              <span key={i} className={cn("block", i === 0 || i === 2 ? "font-semibold text-t1" : "")}>
                {l}
              </span>
            ),
          )}
        </div>
        <p className="mt-2 text-[11px] text-t3">One message per story. Later articles improve the card.</p>
      </div>
    </div>
  );
}

function SourceCard({ group, label }: { group: Group; label: string }) {
  const members = byGroup(group);
  return (
    <section className={cn(lift, "p-4")} style={liftStyle}>
      <GroupLabel glyph={<GroupGlyph group={group} />} count={members.length}>
        {label}
      </GroupLabel>
      <ul className="mt-3 space-y-1">
        {members.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5 py-1">
            <SourceMark source={s} size={20} />
            <span className="text-[13.5px] font-medium text-t1">{s.name}</span>
            <span className="min-w-0 truncate text-[12px] text-t3">{group === "x" ? s.handle : s.focus}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GitHubCard() {
  const repo = byGroup("github")[0];
  return (
    <section className={cn(lift, "p-4")} style={liftStyle}>
      <GroupLabel glyph={<GroupGlyph group="github" />} count={1}>
        GitHub
      </GroupLabel>
      <p className="mt-3 flex items-center gap-2.5">
        <GitHubTile size={20} />
        <span className="text-[13.5px] font-medium text-t1">{repo.name}</span>
        <span className="text-[12px] text-t3">{repo.focus}</span>
      </p>
      <div className="mt-2.5 rounded-md border border-line bg-[var(--well)] px-3 py-2 font-mono text-[11.5px] leading-[1.7] text-t2">
        <span className="mr-2 rounded border border-line-strong px-1.5 py-px text-t1">v15.0.0</span>
        <span className="block">Support React 19 in App and Pages router: #65058</span>
        <span className="block">[Breaking] Disable automatic fetch caching: #66004</span>
      </div>
    </section>
  );
}

function ProductHuntCard() {
  return (
    <section className={cn(lift, "p-4")} style={liftStyle}>
      <GroupLabel
        glyph={
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/roadmap-brands/producthunt.png" alt="" className="size-3 rounded-full" />
        }
      >
        Product Hunt
      </GroupLabel>
      <p className="mt-3 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/roadmap-brands/producthunt.png" alt="" className="size-5 rounded-full" />
        <span className="text-[13.5px] font-medium text-t1">Product Hunt</span>
        <span className="text-[12px] text-t3">Daily new product launches, for tool beats</span>
      </p>
    </section>
  );
}

function AgentStrip() {
  const chosen = chosenSites.length + chosenAccounts.length;
  const sample = ["q-nextjs", "vercel-product-and-platform-news", "latent-space-ai-engineering-newsletter-and-podcast", "x-alibaba_qwen"].map(
    (id) => sources.find((s) => s.id === id)!,
  );
  return (
    <div className="mt-8 grid items-start gap-4 lg:grid-cols-[0.95fr_1fr_0.95fr]">
      <section className={cn(lift, "p-5")} style={liftStyle}>
        <p className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white">F</span>
          <span>
            <span className="block text-[14px] font-semibold text-t1">Farzan Mirza</span>
            <span className="block text-[12px] text-t3">
              @{HANDLE}, {postsRead} newest posts read
            </span>
          </span>
        </p>
        <div className="mt-4 flex gap-2.5 rounded-lg border border-[var(--brand-line)] bg-[var(--brand-soft)] px-3.5 py-3">
          <QuoteMark className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
          <p className="text-[15px] leading-snug font-medium text-t1">{beat}</p>
        </div>
        <ul className="mt-4 grid gap-2.5">
          {posts.slice(0, 2).map((p) => (
            <li key={p.id} className="relative rounded-lg border border-line bg-[var(--well)] px-3.5 py-2.5">
              <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[2px] rounded-r-full bg-[var(--kind-post)]" />
              <p className="flex items-center gap-1.5 text-[11.5px] text-t3">
                <XLogo className="size-2.5" /> {p.kind === "quote" ? "Quote" : "Post"}, {when(`${p.date}T00:00:00Z`, false)}
              </p>
              <p className="mt-1 text-[13px] leading-snug text-t2">{p.text}</p>
              {p.quoted ? (
                <p className="mt-1.5 text-[12px] text-t3">
                  <span className="font-medium text-t2">{p.quoted.author}</span> {p.quoted.text}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {brief.interests.map((t) => (
            <span key={t} className="rounded-full border border-line bg-[var(--well)] px-2.5 py-0.5 text-[12px] text-t2">
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className={cn(lift, "p-5")} style={liftStyle}>
        <p className="text-[13px] font-semibold text-t1">
          {chosen} sources chosen from {candidateCount} checked, each with its reason
        </p>
        <ul className="mt-2 divide-y divide-line-soft">
          {sample.map((s) => (
            <li key={s.id} className="flex gap-3 py-2.5">
              <SourceMark source={s} size={24} className={cn("mt-0.5", s.group === "x" ? "" : "rounded-[6px]")} />
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[13.5px]">
                  <span className="font-medium text-t1">{s.group === "x" ? s.handle : s.name}</span>
                  <span className="font-mono text-[10px] tracking-[0.1em] text-t3 uppercase">{s.group === "x" ? "X account" : "RSS feed"}</span>
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-t2">{s.why}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div>
        <p className="mb-3 text-[12.5px] text-t3">What those sources found this week</p>
        <StoryStack story={stories.clustered[1]} imageHeight={150} />
      </div>
    </div>
  );
}

function Plans() {
  const max = 4000;
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <section className={cn(lift, "p-5")} style={liftStyle}>
        <p className="text-[14px] font-semibold text-t1">Free week</p>
        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="text-[30px] leading-none font-semibold text-t1">$0</span>
          <span className="text-[13px] text-t3">for 7 days</span>
        </p>
        <div className="mt-5">
          <Segments total={7} filled={7} tone="caution" />
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[13px] text-t2">
          <XLogo className="size-3 text-[var(--kind-post)]" /> 300 watched X posts
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-t2">
          <Check className="size-3.5 text-[var(--ok)]" aria-hidden="true" /> No card. It starts when your agent is ready.
        </p>
      </section>
      {plans.map((p) => {
        const posts = Number(p.detail.match(/^([\d,]+)/)![1].replace(",", ""));
        const cadence = p.tier === "wire" ? "Alerts every 15 minutes when there is news" : "One DM a day";
        return (
          <section key={p.tier} className={cn(lift, "p-5")} style={liftStyle}>
            <p className="text-[14px] font-semibold text-t1">{p.name}</p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[30px] leading-none font-semibold text-t1">{p.price}</span>
              <span className="text-[13px] text-t3">a month</span>
            </p>
            <span className="mt-5 block h-1.5 rounded-full bg-line-strong">
              <span className="block h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.max((posts / max) * 100, 3)}%` }} />
            </span>
            <p className="mt-4 flex items-center gap-1.5 text-[13px] text-t2">
              <XLogo className="size-3 text-[var(--kind-post)]" /> {posts.toLocaleString("en-US")} watched X posts a month
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-t2">
              <Check className="size-3.5 text-[var(--ok)]" aria-hidden="true" /> {cadence}
            </p>
          </section>
        );
      })}
    </div>
  );
}
