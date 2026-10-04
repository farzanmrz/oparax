"use client";

import { Quote as QuoteIcon } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { XAvatar } from "@/next/council/marks";
import { githubRelease } from "@/next/data/landing";
import { brief, buildLog, candidateCount, chosenAccounts, chosenSites, droppedSample, kept, posts, postsRead, profile, beat } from "@/next/data/onboarding";
import StatusMark from "@/components/react-bits/StatusMark";
import { cn } from "@/lib/utils";
import { KindIcon, kindLabel, SectionHead, SourceLogo, Surface, windowStyle, type SourceKind } from "./bits";

// Screen 2: onboarding as it really runs. The person's sentence and the posts it was read from on the left,
// the recorded run's funnel in the middle, and the big object: the wall of sources it chose, each with its own
// logo or avatar, its kind and the reason it was picked.

type Tile = { id: string; kind: SourceKind; name: string; target: string; sub: string; why: string };

const tiles: Tile[] = [
  ...chosenSites.map((s) => ({
    id: s.id,
    kind: s.kind as SourceKind,
    name: s.name,
    target: s.target,
    sub: new URL(s.target).hostname.replace(/^www\./, ""),
    why: s.why,
  })),
  ...chosenAccounts.map((a) => ({ id: a.id, kind: "x_account" as const, name: a.name, target: a.target, sub: a.handle, why: a.why })),
  {
    id: githubRelease.source_id,
    kind: "github",
    name: "vercel/next.js",
    target: "https://github.com/vercel/next.js",
    sub: "Releases",
    why: "The Next.js repository's releases, read like any other source.",
  },
];

// The recorded run's build log with its UTC times (repeated reads folded; lines whose counts the funnel shows dropped).
const log = buildLog.filter((l, i) => i === 0 || l.message !== buildLog[i - 1].message).filter((l) => !/\d/.test(l.message));

const chosen = chosenSites.length + chosenAccounts.length;
const dropped = droppedSample.filter((d) => ["x-paulg", "x-midjourney", "fc-barcelona-first-team-news", "x-fabrizioromano"].includes(d.id));

export function SourcesSection() {
  return (
    <section id="sources" className="relative pt-24 pb-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[700px] opacity-70" style={{ background: "var(--stage-light)" }} />
      <div className="relative mx-auto max-w-[1320px] px-10">
        <SectionHead id="sources-head" title={<>One sentence picks<br />your sources.</>}>
          Oparax reads your recent X posts once, judges every candidate source against your sentence and keeps the
          ones that fit. Websites, RSS feeds, X accounts and GitHub are weighed the same.
        </SectionHead>

        <div className="relative mt-10 overflow-hidden rounded-[18px] border border-line" style={{ background: "var(--stage-frame)" }}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "var(--stage-light)" }} />
          <div
            className="relative mx-7 mt-7 mb-[-1px] flex h-[648px] overflow-hidden rounded-t-[14px] border border-b-0 border-line-strong bg-[var(--window)]"
            style={windowStyle}
          >
            <Profile />
            <Funnel />
            <Wall />
          </div>
        </div>
      </div>
    </section>
  );
}

function Profile() {
  const [latest, quoted] = posts;
  return (
    <aside className="flex w-[330px] shrink-0 flex-col border-r border-line bg-[var(--rail)] p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white">
          {profile.name[0]}
        </span>
        <div className="leading-tight">
          <p className="text-[14px] font-semibold text-t1">{profile.name}</p>
          <p className="text-[12.5px] text-t3">{profile.handle}</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-2 py-1 text-[11.5px] font-medium text-[var(--brand)]">
          <XLogo className="size-2.5" /> Read {postsRead} posts
        </span>
      </div>

      <figure className="mt-5 rounded-xl border border-[var(--brand-line)] bg-[var(--brand-soft)] p-4">
        <QuoteIcon className="size-4 text-[var(--brand)]" />
        <blockquote className="mt-2 text-[18px] leading-[1.4] font-medium tracking-[-0.01em] text-t1">{beat}</blockquote>
      </figure>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {brief.interests.map((i) => (
          <span key={i} className="rounded-md border border-line-strong px-2 py-0.5 text-[11.5px] text-t2">
            {i}
          </span>
        ))}
      </div>

      <div className="mt-6 space-y-2.5">
        <Post date={latest.date} text={latest.text} />
        <Post date={quoted.date} text={quoted.text}>
          <div className="mt-2 rounded-lg border border-line p-2.5">
            <p className="flex items-center gap-1.5 text-[11.5px] text-t3">
              <XAvatar handle={quoted.quoted!.author} size={15} />
              <span className="font-medium text-t2">Guillermo Rauch</span> {quoted.quoted!.author}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-t2">{quoted.quoted!.text}</p>
          </div>
        </Post>
      </div>
    </aside>
  );
}

function Post({ date, text, children }: { date: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-[var(--window)] p-3" style={{ boxShadow: "var(--top-light)" }}>
      <p className="flex items-center gap-1.5 text-[11.5px] text-t3">
        <span className="grid size-4 place-items-center rounded-full bg-[var(--brand)] text-[8.5px] font-semibold text-white">F</span>
        <span className="font-medium text-t2">Farzan</span> {profile.handle}
        <span className="ml-auto tabular-nums text-t4">{new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span>
      </p>
      <p className="mt-1.5 text-[12.5px] leading-snug text-t1">{text}</p>
      {children}
    </div>
  );
}

function Funnel() {
  const rows = [
    { label: "Candidate sources", n: candidateCount, tone: "bg-t4", text: "text-t1" },
    { label: "Fit your sentence", n: kept.length, tone: "bg-[var(--ok)]", text: "text-[var(--ok)]" },
    { label: "Chosen", n: chosen, tone: "bg-[var(--brand)]", text: "text-[var(--brand)]" },
  ];
  return (
    <div className="flex w-[244px] shrink-0 flex-col border-r border-line p-5">
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <p className="text-[12px] text-t3">{r.label}</p>
            <p className={cn("mt-0.5 text-[30px] leading-none font-semibold tracking-[-0.02em] tabular-nums", r.text)}>{r.n}</p>
            <div className="mt-2.5 h-1.5 rounded-full bg-line-strong">
              <span className={cn("block h-full rounded-full", r.tone)} style={{ width: `${Math.max(4, (r.n / candidateCount) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <ol className="relative mt-6 space-y-2.5 border-t border-line pt-4">
        {log.map((l) => (
          <li key={l.at} className="flex items-start gap-2 text-[11.5px] leading-snug">
            <StatusMark status="done" size={13} doneColor="var(--ok)" strokeWidth={2} />
            <span className="min-w-0 flex-1 text-t2">{l.message}</span>
            <span className="shrink-0 font-mono text-[10.5px] text-t4">{l.at.slice(11, 19)}</span>
          </li>
        ))}
      </ol>
      <div className="mt-auto">
        <p className="text-[12px] text-t3">Left out for this beat</p>
        <ul className="mt-2 space-y-1.5">
          {dropped.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-[12.5px] text-t3">
              <span className="opacity-70 grayscale">
                <SourceLogo kind={d.kind} target={d.target} size={18} />
              </span>
              <span className="truncate">{d.name}</span>
              <KindIcon kind={d.kind} className="ml-auto size-3 shrink-0 opacity-60" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Wall() {
  const kinds = (["rss", "website", "x_account", "github"] as SourceKind[]).map((k) => ({
    k,
    n: tiles.filter((t) => t.kind === k).length,
  }));
  return (
    <div className="min-w-0 flex-1 p-5">
      <div className="flex items-center gap-2">
        <p className="text-[14px] font-semibold whitespace-nowrap text-t1">Watching for @farzanmrz</p>
        <div className="ml-auto flex gap-1.5">
          {kinds.map(({ k, n }) => (
            <span key={k} className="inline-flex h-[24px] items-center gap-1.5 rounded-full border border-line-strong bg-[var(--raised)] px-2 text-[11.5px] whitespace-nowrap text-t2">
              <KindIcon kind={k} className="size-3" />
              {n} {kindLabel[k]}
              {n === 1 || k === "github" ? "" : "s"}
            </span>
          ))}
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2.5">
        {tiles.map((t) => (
          <li
            key={t.id}
            className="group flex gap-3 rounded-xl border border-line bg-[var(--raised)] p-3 transition-colors hover:border-line-strong"
            style={{ boxShadow: "var(--top-light)" }}
          >
            <SourceLogo kind={t.kind} target={t.target} size={34} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-t1">
                <span className="truncate">{t.name}</span>
                <KindIcon kind={t.kind} className="size-3 shrink-0" />
              </p>
              <p className="truncate text-[11.5px] text-t4">{t.sub}</p>
              <p className="mt-1 line-clamp-1 text-[11.5px] leading-snug text-t3">{t.why}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
