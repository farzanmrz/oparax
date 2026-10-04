"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, Globe, Info, Lock, RotateCw, Rss, Send } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import type { FeedStory, ItemView } from "@/next/data/feed";
import { Facts } from "@/next/council/chrome";
import { hostOf, when } from "@/next/council/data";
import { EASE } from "@/next/council/live";
import { GitHubMark, KindChip, MarkStack, SiteIcon, XAvatar } from "@/next/council/marks";
import {
  accounts,
  beat,
  buildSteps,
  building,
  dmStories,
  feeds,
  githubRelease,
  HANDLE,
  heroStory,
  profile,
  setup,
  websites,
} from "./data";

// The three "how it works" scenes. Each is one stage (the feed's lit frame) holding a dim product surface at the
// back and one lifted object in front, the composition of owner-5 and owner-6 (Linear's thread card over a live
// board): onboarding over the build, the story over its reports, the X DM over the page its link opens.

/** Entrance used by every scene object: a short rise once in view (React Bits AnimatedList easing). */
function Rise({ delay = 0, className, children }: { delay?: number; className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Stage({ height, fade = false, children, className }: { height: number; fade?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-[18px] border border-line", className)}
      style={{ height, background: "var(--scene-frame)" }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "var(--stage-light)" }} />
      {children}
      {/* Objects run off the bottom edge, as Linear's scenes do; the edge dissolves into the frame. */}
      {fade ? <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28" style={{ background: "linear-gradient(180deg, transparent, var(--scene-end))" }} /> : null}
    </div>
  );
}

const lifted = { boxShadow: "var(--window-shadow), var(--top-light)" };
const sunk = { boxShadow: "var(--card-shadow), var(--top-light)" };

/* ─────────────── 1. Onboarding over the build ─────────────── */

export function SetupScene() {
  const rows = [
    ...feeds.slice(0, 4).map((s) => ({ key: s.id, mark: <SiteIcon host={s.host} size={16} />, name: s.name, line: s.focus, kind: "rss" as const })),
    ...accounts.slice(0, 3).map((a) => ({ key: a.id, mark: <XAvatar handle={a.handle} size={16} />, name: a.name, line: a.handle, kind: "x" as const })),
    ...websites.map((s) => ({ key: s.id, mark: <SiteIcon host={s.host} size={16} />, name: s.name, line: s.focus, kind: "web" as const })),
  ];
  return (
    <Stage height={500} fade>
      {/* Two windows side by side (Linear's agent windows, home-04): what the person types, what the agent does with it. */}
      <Rise className="absolute top-12 left-10 w-[430px]">
        <div className="rounded-[14px] border border-line-strong bg-[var(--window)]" style={lifted}>
          <div className="flex h-12 items-center gap-2.5 border-b border-line px-5">
            <OparaxMark className="size-4 text-t1" />
            <span className="text-[14px] font-semibold text-t1">{setup.title}</span>
          </div>
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="text-[12.5px] font-medium text-t2">{setup.handleLabel}</span>
              <span className="mt-1.5 flex h-10 items-center gap-2.5 rounded-lg border border-line-strong bg-[var(--well)] px-3 text-[13.5px] text-t1">
                <span className="grid size-6 place-items-center rounded-full bg-[var(--brand)] text-[11px] font-semibold text-white">
                  {profile.name[0]}
                </span>
                {profile.handle}
                <span className="ml-auto grid size-5 place-items-center rounded-full bg-[var(--ok-soft)] text-[var(--ok)]">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              </span>
              <span className="mt-1.5 block text-[12px] text-t3">{setup.verifiedHelp}</span>
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-t2">{setup.beatLabel}</span>
              <span className="mt-1.5 block rounded-lg border border-[var(--brand-line)] bg-[var(--well)] px-3 py-2.5 text-[13.5px] leading-relaxed text-t1 shadow-[0_0_0_3px_var(--brand-soft)]">
                {beat}
                <span className="mt-1 block text-right text-[11.5px] tabular-nums text-t4">
                  {beat.length}/{setup.beatMax}
                </span>
              </span>
            </label>
            <span className="flex h-10 w-full items-center justify-center rounded-lg bg-primary text-[13.5px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_4px_14px_-4px_rgb(58_108_244/0.55)]">
              {setup.submit}
            </span>
          </div>
        </div>
      </Rise>

      <Rise delay={0.15} className="absolute top-12 right-10 left-[500px]">
        <div className="overflow-hidden rounded-[14px] border border-line-strong bg-[var(--window)]" style={lifted}>
          <div className="flex h-12 items-center gap-2 border-b border-line px-5">
            <span className="text-[14px] font-semibold text-t1">{building.title}</span>
          </div>
          <ul className="border-b border-line py-1">
            {buildSteps.map((step, i) => (
              <Rise key={step.text} delay={0.25 + i * 0.12}>
                <li className="flex h-9 items-center gap-2.5 px-5 text-[12.5px]">
                  {step.state === "done" ? (
                    <span className="grid size-4 place-items-center rounded-full bg-[var(--ok-soft)] text-[var(--ok)]">
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  ) : (
                    <StatusMark status="running" size={15} color="var(--caution)" strokeWidth={2} />
                  )}
                  {step.state === "running" ? (
                    <Shimmer as="span" duration={2.2} className="text-[12.5px] [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
                      {step.text}
                    </Shimmer>
                  ) : (
                    <span className="text-t2">{step.text}</span>
                  )}
                </li>
              </Rise>
            ))}
          </ul>
          <p className="flex items-center gap-4 px-5 pt-3.5 pb-1.5 text-[12px] font-medium text-t3">
            Recommended
            <span className="flex items-center gap-1.5 font-normal"><Rss className="size-3 text-[var(--kind-article)]" /> {feeds.length} RSS feeds</span>
            <span className="flex items-center gap-1.5 font-normal"><Globe className="size-3 text-[var(--kind-article)]" /> {websites.length} {websites.length === 1 ? "website" : "websites"}</span>
            <span className="flex items-center gap-1.5 font-normal"><XLogo className="size-2.5 text-[var(--kind-post)]" /> {accounts.length} X accounts</span>
          </p>
          <ul className="px-2 pb-2">
            {rows.map((r, i) => (
              <Rise key={r.key} delay={0.5 + i * 0.06}>
                <li className="grid h-10 grid-cols-[22px_150px_1fr_110px] items-center gap-2 rounded-md px-3 text-[12.5px] border-b border-line-soft">
                  {r.mark}
                  <span className="truncate font-medium text-t1">{r.name}</span>
                  <span className="truncate text-t3">{r.line}</span>
                  <span className="flex items-center justify-end gap-1.5 text-[11.5px] text-t3">
                    {r.kind === "x" ? (
                      <><XLogo className="size-2.5 text-[var(--kind-post)]" /> X account</>
                    ) : r.kind === "rss" ? (
                      <><Rss className="size-3 text-[var(--kind-article)]" /> RSS feed</>
                    ) : (
                      <><Globe className="size-3 text-[var(--kind-article)]" /> Website</>
                    )}
                  </span>
                </li>
              </Rise>
            ))}
          </ul>
        </div>
      </Rise>
    </Stage>
  );
}

/* ─────────────── 2. One story over its reports ─────────────── */

const kindOf = (item: ItemView) => (item.publisher === "GitHub" ? ("github" as const) : item.kind);

export function StoryScene() {
  const story = heroStory;
  const reports = [...story.items].sort((a, b) => (a.published_at < b.published_at ? -1 : 1));
  const kinds = [...new Set(story.items.map(kindOf))];
  return (
    <Stage height={470} fade>
      {/* Back: the reports in the order they were published, each its own kind of object. */}
      <div className="absolute top-12 bottom-0 left-10 w-[460px]">
        <p className="mb-3 flex items-center gap-2 text-[12px] font-medium text-t3">
          Reports, {when(reports[0].published_at, false)}
        </p>
        <ol className="relative space-y-3">
          <span aria-hidden="true" className="absolute top-6 bottom-6 left-[17px] w-px bg-line-strong" />
          {reports.map((item, i) => (
            <Rise key={item.id} delay={0.1 + i * 0.18}>
              <li className="relative flex gap-3">
                <span className="relative z-10 mt-3 grid size-[34px] shrink-0 place-items-center rounded-full border border-line bg-[var(--window)]">
                  <span className="text-[10.5px] font-medium tabular-nums text-t3">{clockOf(item.published_at)}</span>
                </span>
                <div className="min-w-0 flex-1">{reportObject(item)}</div>
              </li>
            </Rise>
          ))}
        </ol>
      </div>

      {/* Front: the one card they became. */}
      <Rise delay={0.55} className="absolute top-12 right-10 w-[600px]">
        <article className="overflow-hidden rounded-[14px] border border-line-strong bg-[var(--window)]" style={lifted}>
          {story.card.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.card.image} alt="" className="h-[150px] w-full border-b border-line object-cover" />
          ) : null}
          <div className="px-6 pt-5 pb-6">
            <div className="flex flex-wrap items-center gap-1.5">
              {kinds.map((k) => (
                <KindChip key={k} kind={k} />
              ))}
              <span className="ml-auto flex items-center gap-2 text-[12px] text-t3">
                <MarkStack items={story.items} size={18} />
              </span>
            </div>
            <h3 className="mt-3 text-[22px] leading-[1.25] font-semibold tracking-[-0.018em] text-t1">{story.card.headline}</h3>
            <Facts story={story} max={4} size="sm" className="mt-4" />
          </div>
        </article>
      </Rise>
    </Stage>
  );
}

function clockOf(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function reportObject(item: ItemView) {
  const frame = "rounded-xl border border-line bg-[var(--raised)] p-3.5";
  if (kindOf(item) === "github") {
    return (
      <div className={frame} style={{ boxShadow: "var(--top-light)" }}>
        <p className="flex items-center gap-2 text-[12.5px]">
          <GitHubMark className="size-4 text-[var(--kind-github)]" />
          <span className="font-medium text-t1">{githubRelease.author}</span>
          <span className="rounded-full border border-line-strong px-1.5 font-mono text-[11px] text-t2">{item.title}</span>
          <KindChip kind="github" className="ml-auto h-5 text-[11px]" />
        </p>
        <ul className="mt-2.5 space-y-1 font-mono text-[11.5px] leading-snug text-t3">
          {item.text.split("\n").map((l) => (
            <li key={l} className="truncate">
              {l}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (item.kind === "post") {
    const [first, second, third] = item.text.split("\n\n");
    return (
      <div className={frame} style={{ boxShadow: "var(--top-light)" }}>
        <p className="flex items-center gap-2 text-[12.5px]">
          <XAvatar handle={item.author!} size={20} />
          <span className="font-medium text-t1">{item.publisher}</span>
          <span className="text-t4">{item.author}</span>
          <KindChip kind="post" className="ml-auto h-5 text-[11px]" />
        </p>
        <p className="mt-2 text-[13px] leading-snug text-t2">
          {first} {second} <span className="text-[var(--kind-post)]">{third}</span>
        </p>
      </div>
    );
  }
  return (
    <div className={cn(frame, "flex gap-3")} style={{ boxShadow: "var(--top-light)" }}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[12.5px]">
          <SiteIcon host={hostOf(item.url)} size={16} />
          <span className="font-medium text-t1">{item.publisher}</span>
          <span className="truncate text-t4">{hostOf(item.url)}</span>
          <KindChip kind="article" className="ml-auto h-5 text-[11px]" />
        </p>
        <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-t2">{item.text}</p>
      </div>
    </div>
  );
}

/* ─────────────── 3. The DM over the page its link opens ─────────────── */

export function AlertScene() {
  const opened = dmStories[0];
  return (
    <Stage height={540} fade>
      {/* Back: the person's page, open on the story the first link points to. */}
      <div
        className="absolute top-12 right-[-40px] bottom-[-1px] left-[470px] overflow-hidden rounded-tl-[14px] border border-r-0 border-b-0 border-line bg-[var(--window)]"
        style={{ ...sunk, maskImage: "linear-gradient(180deg, #000 70%, transparent)" }}
      >
        <div className="flex h-11 items-center gap-3 border-b border-line bg-[var(--rail)] px-4">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="ml-3 flex h-7 w-[420px] items-center gap-2 rounded-md border border-line bg-[var(--well)] px-2.5 text-[12px] text-t3">
            <Lock className="size-3 text-t4" />
            oparax.ai/<span className="text-t1">{HANDLE}</span>/{opened.id}
          </span>
          <RotateCw className="size-3.5 text-t4" />
        </div>
        <PageStory story={opened} />
      </div>

      {/* Front: the X DM thread with the bot. */}
      <Rise className="absolute top-[70px] left-10 w-[470px]">
        <div className="overflow-hidden rounded-[16px] border border-line-strong bg-[var(--window)]" style={lifted}>
          <div className="flex h-14 items-center gap-3 border-b border-line px-4">
            <ArrowLeft className="size-4 text-t3" />
            <span className="grid size-8 place-items-center rounded-full bg-black text-white ring-1 ring-white/10">
              <OparaxMark className="size-[60%]" />
            </span>
            <span className="leading-tight">
              <span className="block text-[13.5px] font-semibold text-t1">Oparax</span>
              <span className="block text-[12px] text-t3">@oparax_ai</span>
            </span>
            <XLogo className="ml-auto size-4 text-t1" />
            <Info className="size-4 text-t3" />
          </div>
          <div className="space-y-3 px-4 py-4">
            <div className="flex justify-end">
              <span className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[13.5px] text-primary-foreground">Start alerts</span>
            </div>
            <Rise delay={0.3}>
              <div className="max-w-[400px] rounded-2xl rounded-bl-md border border-line bg-[var(--raised)] px-4 py-3 text-[13px] leading-snug">
                <p className="font-medium text-t1">
                  Oparax: {dmStories.length} new {dmStories.length === 1 ? "story" : "stories"} for you
                </p>
                <ul className="mt-2.5 space-y-3">
                  {dmStories.map((s, i) => (
                    <li key={s.id}>
                      <p className="font-medium text-t1">{s.card.headline}</p>
                      <p className="mt-0.5 line-clamp-2 text-t2">{s.card.facts[0].text}</p>
                      <p className={cn("mt-0.5 truncate text-[var(--brand)]", i === 0 && "underline underline-offset-2")}>
                        https://oparax.ai/{HANDLE}/{s.id}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </Rise>
          </div>
          <div className="flex items-center gap-2 border-t border-line px-4 py-3">
            <span className="flex h-9 flex-1 items-center rounded-full border border-line bg-[var(--well)] px-3.5 text-[12.5px] text-t4">
              Start a new message
            </span>
            <Send className="size-4 text-[var(--brand)]" />
          </div>
        </div>
      </Rise>
    </Stage>
  );
}

function PageStory({ story }: { story: FeedStory }) {
  return (
    <div className="flex gap-6 px-[110px] pt-6">
      <article className="min-w-0 flex-1">
        {story.card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.card.image} alt="" className="h-[150px] w-full rounded-xl border border-line object-cover" />
        ) : null}
        <div className="mt-4 flex items-center gap-1.5">
          <KindChip kind={story.items[0].kind} />
          <span className="inline-flex h-[22px] items-center rounded-full border border-line px-2 text-[11.5px] tabular-nums text-t3">
            {when(story.items[0].published_at)} UTC
          </span>
        </div>
        <h3 className="mt-3 text-[21px] leading-[1.25] font-semibold tracking-[-0.018em] text-t1">{story.card.headline}</h3>
        <Facts story={story} size="sm" className="mt-3.5" />
      </article>
    </div>
  );
}
