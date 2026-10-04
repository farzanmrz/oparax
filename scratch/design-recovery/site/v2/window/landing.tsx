"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Mail } from "lucide-react";
import { BotAvatar, XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { BASE, Label, PrimaryButton, SecondaryButton, ShowProvider, SiteHeader, Stage, Window, WindowBar } from "./chrome";
import {
  beat,
  brief,
  candidateCount,
  droppedSample,
  groups,
  HANDLE,
  posts,
  sources,
  stories,
  type Group,
  type Source,
} from "./data";
import { Dot, GroupGlyph, SourceMark, XAvatar } from "./marks";
import { Facts, SourceCard, sortedItems, StoryHead, StoryImage } from "./story";

// Window landing, v2. Sign-up first: the three ways to sign up sit in the hero. The leading object is the
// product window with one real story open beside the source list it came from, and the X message that story
// becomes. Below: every kind of source weighed the same (with a post and a release joined into one story), how
// the agent picks sources from one sentence (the recorded example run), and the plans.

const sol = stories.clustered.find((s) => s.id === "clustered-sol")!;
const next15 = stories.clustered.find((s) => s.id === "clustered-next15")!;

export function Landing() {
  return (
    <ShowProvider>
      <div className="palette-council min-h-svh">
        <SiteHeader active="landing" />
        <main className="px-4 pt-4 pb-4 lg:px-5 lg:pt-5 lg:pb-5">
          <Hero />
          <SourcesSection />
          <AgentSection />
          <Pricing />
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-6 px-6 text-[13px] text-t3">
            <span>Oparax</span>
            <span className="ml-auto">Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
        </footer>
      </div>
    </ShowProvider>
  );
}

/* ───────────── Hero ───────────── */

export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4", className)}>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.8Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

function Hero() {
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <Stage grid>
      <div className="grid grid-cols-1 gap-12 px-5 pt-14 lg:grid-cols-[440px_minmax(0,1fr)] lg:px-8">
        <div className="pb-12">
          <span className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-2 py-1 font-mono text-[10.5px] tracking-[0.1em] text-[var(--caution)]">
            FREE WEEK · 7 DAYS · NO CARD
          </span>
          <h1 className="mt-5 text-[52px] leading-[1.04] font-semibold tracking-[-0.035em] text-t1">Your beat, watched for you.</h1>
          <p className="mt-5 text-[16px] leading-[1.6] text-t2">
            Say what you follow in one sentence. Oparax watches the X accounts, RSS feeds, websites, GitHub repositories and Product Hunt around it,
            joins the articles and posts about one event into one story with every fact sourced, and sends it to you on X.
          </p>
          <div className="mt-7 flex max-w-[360px] flex-col gap-2.5">
            <PrimaryButton href={`${BASE}/setup`} className="h-11 text-[14px]">
              <XLogo className="size-3.5" />
              Sign up with X
            </PrimaryButton>
            <SecondaryButton href={`${BASE}/setup?handle=typed`} className="h-11 text-[14px]">
              <GoogleMark />
              Sign up with Google
            </SecondaryButton>
            <Link href={`${BASE}/login?mode=signup`} className="mt-1 inline-flex items-center gap-1.5 self-start text-[13.5px] text-t2 hover:text-t1">
              <Mail className="size-3.5" /> or with an email and password
            </Link>
          </div>
          <DmCard className="mt-9" />
        </div>
        <Window open className="flex min-w-0 flex-col">
          <WindowBar>
            <span className="font-mono text-[11.5px] text-t3">oparax.ai/{HANDLE}</span>
            <span className="ml-auto flex items-center gap-1.5 text-[12px] text-[var(--ok)]">
              <Dot tone="ok" pulse /> Live
            </span>
          </WindowBar>
          <div className="flex min-w-0">
            <MiniRail highlight={new Set(sol.items.map((i) => i.sourceId))} />
            <div className="min-w-0 flex-1 px-8 pt-6 pb-8">
              <StoryImage src={sol.image!} className="aspect-[2.6/1]" />
              <div className="mt-5">
                <StoryHead story={sol} size="lg" />
              </div>
              <Facts story={sol} onFocus={setFocus} className="mt-4" />
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {sortedItems(sol).map((item) => (
                  <SourceCard key={item.id} item={item} story={sol} focused={focus === item.id} />
                ))}
              </div>
            </div>
          </div>
        </Window>
      </div>
    </Stage>
  );
}

/** The source list from the feed, slim: grouped, real marks, the story's own sources lit. */
function MiniRail({ highlight }: { highlight: Set<string> }) {
  return (
    <aside aria-label="Sources" className="w-[196px] shrink-0 border-r border-line bg-[var(--rail)] pt-3 pb-6">
      {groups.map((g) => (
        <section key={g.id} className="pt-2.5">
          <Label className="px-4 pb-1">{g.label}</Label>
          <ul className="px-2">
            {sources
              .filter((s) => s.group === g.id)
              .slice(0, g.id === "rss" ? 6 : 7)
              .map((s) => (
                <li
                  key={s.id}
                  className={cn(
                    "flex h-[26px] items-center gap-2 rounded-md px-2 text-[12px] text-t2",
                    highlight.has(s.id) && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
                  )}
                >
                  <SourceMark source={s} size={14} />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}

/** The X direct message the story becomes (lib/alerts/pack.ts format), lifted like a notification. */
function DmCard({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative rounded-[14px] border border-line-strong bg-[var(--window)] p-4", className)}
      style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
    >
      <div className="flex items-center gap-2.5">
        <BotAvatar className="size-8 ring-1 ring-line-strong" />
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-t1">Oparax</p>
          <p className="text-[12px] text-t3">@oparax_ai</p>
        </div>
        <span className="ml-auto inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[var(--kind-post-soft)] px-2 text-[11.5px] font-medium text-[var(--kind-post)]">
          <XLogo className="size-3" /> Direct message
        </span>
      </div>
      <div className="mt-3 rounded-xl rounded-tl-sm bg-[var(--raised)] px-3.5 py-3 text-[13px] leading-[1.5] text-t1">
        <p className="text-t3">Oparax: 1 new story for you</p>
        <p className="mt-2 font-semibold">{sol.headline}</p>
        <p className="mt-1 text-t2">{sol.facts[0].text}</p>
        <p className="mt-1.5 text-[var(--brand)]">oparax.ai/{HANDLE}/st-gpt61-sol</p>
      </div>
    </div>
  );
}

/* ───────────── Sources ───────────── */

function SectionHead({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="grid scroll-mt-20 grid-cols-1 items-end gap-6 px-5 pt-24 pb-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 lg:px-8">
      <div>
        <Label>{eyebrow}</Label>
        <h2 className="mt-3 text-[38px] leading-[1.1] font-semibold tracking-[-0.03em] text-t1">{title}</h2>
      </div>
      <p className="text-[16px] leading-[1.6] text-t2">{children}</p>
    </div>
  );
}

const groupNote: Record<Group, string> = {
  x: "Posts from the accounts that fit",
  rss: "Articles from the feeds that fit",
  website: "Articles read from the page",
  github: "Releases, explained",
  producthunt: "Daily launches",
};

function SourcesSection() {
  return (
    <>
      <SectionHead id="sources" eyebrow="Sources" title="Every source weighed the same">
        X accounts, RSS feeds, websites, GitHub and Product Hunt all feed one judge: each new post, article or release is read against your
        sentence, and the ones about the same event join one story.
      </SectionHead>
      <Stage>
        <div className="grid grid-cols-[minmax(0,1fr)_500px] gap-8 p-8">
          <Window className="min-w-0">
            <WindowBar>
              <span className="text-[12.5px] font-medium text-t1">Sources for @{HANDLE}</span>
              <span className="ml-auto text-[12px] text-t3">Chosen by the agent from one sentence</span>
            </WindowBar>
            <ul>
              {groups.map((g) => (
                <GroupBand key={g.id} group={g.id} />
              ))}
            </ul>
          </Window>
          <article className="rounded-[14px] border border-line-strong bg-[var(--window)] p-6" style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
            <Label className="text-[var(--kind-post)]">A post and a release, one story</Label>
            <div className="mt-4">
              <StoryHead story={next15} />
            </div>
            <Facts story={next15} size="sm" className="mt-3.5" />
            <div className="mt-4 grid grid-cols-2 items-start gap-2.5">
              {sortedItems(next15).map((item) => (
                <SourceCard key={item.id} item={item} story={next15} />
              ))}
            </div>
          </article>
        </div>
      </Stage>
    </>
  );
}

/** One band per kind of source, all drawn the same way: the kind on the left, its sources as marked chips. */
function GroupBand({ group }: { group: Group }) {
  const list = sources.filter((s) => s.group === group);
  return (
    <li className="grid grid-cols-[170px_minmax(0,1fr)] gap-4 border-b border-line px-5 py-4 last:border-b-0">
      <div>
        <div className="flex items-center gap-2">
          <GroupGlyph group={group} className="text-t2" />
          <Label className="text-t2">{groups.find((x) => x.id === group)!.label}</Label>
        </div>
        <p className="mt-1 text-[12px] text-t3">{groupNote[group]}</p>
      </div>
      <ul className="flex flex-wrap content-start gap-1.5">
        {list.map((s) => (
          <li
            key={s.id}
            title={s.why ?? s.focus}
            className="inline-flex h-8 items-center gap-2 rounded-full border border-line bg-[var(--raised)] pr-3 pl-1.5 text-[12.5px] text-t1 shadow-[var(--top-light)]"
          >
            <SourceMark source={s} size={20} />
            <span className="font-medium">{s.name}</span>
            <span className="text-t3">{s.group === "x" ? s.handle : s.focus}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

/* ───────────── Agent ───────────── */

const picks = [
  ...sources.filter((s) => s.group === "x").slice(0, 3),
  ...sources.filter((s) => s.group === "rss").slice(0, 4),
  ...sources.filter((s) => s.group === "website"),
];

function AgentSection() {
  return (
    <>
      <SectionHead id="agent" eyebrow="Your agent" title="One sentence, then it picks the sources">
        Your agent reads your newest X posts once, checks {candidateCount} candidate sources against your sentence, and keeps the ones that fit,
        each with its reason. You never fill in a list.
      </SectionHead>
      <Stage grid>
        <div className="px-8 pt-8">
          <Window open className="grid grid-cols-[340px_minmax(0,1fr)]">
            <div className="border-r border-line bg-[var(--rail)] p-5">
              <Label>Your sentence</Label>
              <p className="mt-2.5 rounded-lg border border-[var(--brand-line)] bg-[var(--brand-soft)] px-3.5 py-3 text-[14.5px] leading-[1.5] text-t1">{beat}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {brief.interests.map((t) => (
                  <span key={t} className="rounded-full border border-line-strong px-2 py-0.5 text-[11.5px] text-t2">
                    {t}
                  </span>
                ))}
              </div>
              <Label className="mt-6">Your posts, read once</Label>
              <ul className="mt-2.5 space-y-2">
                {posts.slice(0, 2).map((p) => (
                  <li key={p.id} className="rounded-lg border border-line bg-[var(--raised)] p-3 shadow-[var(--top-light)]">
                    <p className="flex items-center gap-2 text-[12px] text-t3">
                      <span className="grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>
                      <span className="font-medium text-t1">Farzan</span> @{HANDLE}
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-[1.5] text-t2">{p.text.replace(/\n+/g, " ")}</p>
                    {p.quoted ? (
                      <p className="mt-2 rounded-md border border-line bg-[var(--well)] px-2.5 py-1.5 text-[12px] text-t3">
                        <span className="font-medium text-[var(--kind-post)]">{p.quoted.author}</span> {p.quoted.text}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0 p-6">
              <div className="flex items-center gap-2">
                <Label>Chosen, each with its reason</Label>
                <span className="ml-auto text-[12px] text-t3">Example run, recorded</span>
              </div>
              <ul className="mt-3.5 grid grid-cols-2 gap-2.5">
                {picks.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 rounded-lg border border-line bg-[var(--raised)] px-3 py-2.5 shadow-[var(--top-light)]">
                    <SourceMark source={s} size={22} className="mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-[13px] leading-tight font-medium text-t1">
                        {s.name} <span className="font-normal text-t3">{s.group === "x" ? s.handle : s.group === "rss" ? "RSS feed" : "Website"}</span>
                      </span>
                      <span className="mt-1 block text-[12.5px] leading-[1.5] text-t2">{s.why}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[12.5px] font-medium text-t2">Read and left out for this sentence</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {droppedSample.map((c) => (
                  <li key={c.id} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-line-strong pr-2.5 pl-1 text-[12.5px] text-t3">
                    <span className="opacity-60">
                      {c.kind === "x_account" ? <XAvatar handle={c.target.replace("https://x.com/", "")} size={18} /> : <SourceMarkHost host={new URL(c.target).hostname.replace(/^www\./, "")} />}
                    </span>
                    <span className="line-through decoration-t3/60">{c.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Window>
        </div>
      </Stage>
    </>
  );
}

function SourceMarkHost({ host }: { host: string }) {
  const s: Source = { id: host, group: "rss", name: host, handle: host, host, focus: "", why: null };
  return <SourceMark source={s} size={18} />;
}

/* ───────────── Pricing ───────────── */

const plans = [
  { name: "Free week", price: "$0", per: "for 7 days", posts: 300, postsLabel: "300 watched X posts in the week", cadence: "One DM a day", note: "No card. It starts when your agent is ready.", free: true },
  { name: "Hobby", price: "$5", per: "a month", posts: 100, postsLabel: "100 watched X posts a month", cadence: "One DM a day" },
  { name: "Creator", price: "$30", per: "a month", posts: 3000, postsLabel: "3,000 watched X posts a month", cadence: "One DM a day" },
  { name: "Wire", price: "$99", per: "a month", posts: 4000, postsLabel: "4,000 watched X posts a month", cadence: "Every 15 minutes when there is news" },
];

function Pricing() {
  return (
    <>
      <SectionHead id="pricing" eyebrow="Pricing" title="A free week, then a plan">
        Every plan reads unlimited RSS feeds and websites, and GitHub and Product Hunt. Plans differ in how many X posts your agent watches and how
        often it writes to you.
      </SectionHead>
      <Stage>
        <div className="grid grid-cols-4 gap-4 p-8">
          {plans.map((p) => (
            <div
              key={p.name}
              className={cn(
                "flex flex-col rounded-[14px] border bg-[var(--window)] p-5",
                p.free ? "border-[var(--caution)]/45" : "border-line-strong",
              )}
              style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
            >
              <p className={cn("text-[13.5px] font-semibold", p.free ? "text-[var(--caution)]" : "text-t1")}>{p.name}</p>
              <p className="mt-2 text-t1">
                <span className="text-[32px] font-semibold tracking-[-0.02em] tabular-nums">{p.price}</span>{" "}
                <span className="text-[13px] text-t3">{p.per}</span>
              </p>
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-[12.5px] text-t2">
                  <XLogo className="size-3 text-[var(--kind-post)]" /> {p.postsLabel}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-strong">
                  <span
                    className={cn("block h-full rounded-full", p.free ? "bg-[var(--caution)]" : "bg-[var(--brand)]")}
                    style={{ width: `${Math.max(3, (p.posts / 4000) * 100)}%` }}
                  />
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-[12.5px] text-t2">
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--ok)]" /> Alerts on X: {p.cadence[0].toLowerCase() + p.cadence.slice(1)}
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--ok)]" /> Unlimited RSS feeds and websites
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--ok)]" /> Stories with every fact sourced
                </li>
              </ul>
              {p.note ? <p className="mt-4 text-[12px] text-t3">{p.note}</p> : null}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-6 border-t border-line px-8 py-6">
          <p className="text-[18px] font-semibold tracking-[-0.01em] text-t1">Start with a free week on your own beat.</p>
          <div className="flex gap-2.5">
            <SecondaryButton href={`${BASE}/login?mode=signup`}>Sign up with email</SecondaryButton>
            <PrimaryButton href={`${BASE}/setup`}>
              <XLogo className="size-3" /> Sign up with X
            </PrimaryButton>
          </div>
        </div>
      </Stage>
    </>
  );
}
