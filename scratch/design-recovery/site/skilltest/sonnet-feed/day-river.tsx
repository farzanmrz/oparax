"use client";

import { useState } from "react";
import { Newspaper } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import type { FeedStory } from "@/next/data/feed";
import { AlertsButton, TopBar, ViewSwitch } from "@/next/council/chrome";
import { accounts, newest, sites, status, when, type View } from "@/next/council/data";
import { Checking } from "@/next/council/live";
import { GitHubMark, ReportMark, SiteIcon, XAvatar } from "@/next/council/marks";
import {
  AgentTile,
  Cite,
  clockOf,
  DigestBody,
  entriesFor,
  entrySrcs,
  FreeWeekTile,
  GitHubPill,
  GROUPS,
  groupCount,
  JoinedPill,
  KindPill,
  PHMark,
  Pic,
  Quote,
  srcWord,
  Tile,
  WeekTile,
  type Entry,
  type Src,
} from "./kit";

// Direction B, Day river. The feed as a river of time: a spine runs down the page from "now", each story hangs
// off it at the minute its newest report appeared, with its picture beside it (or, when no source had one, the
// sources' own words in the same place). The sources sit in a directory beside the river, each kind named.

const BASE = "/skilltest/sonnet-feed/b";

const MONTH_DAY = (iso: string) => when(iso, false);

export function DayRiver({ view, theme }: { view: View; theme?: string }) {
  const [src, setSrc] = useState<Src | "all">("all");
  const shown = entriesFor(view).filter((e) => src === "all" || entrySrcs(e).includes(src));
  const days: { key: string; label: string; items: Entry[] }[] = [];
  for (const e of shown) {
    const key = e.at.slice(0, 10);
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push(e);
    else days.push({ key, label: MONTH_DAY(e.at), items: [e] });
  }
  const pending = status.pending - 1;

  return (
    <div className="palette-council relative flex min-h-svh flex-col">
      <TopBar title="Feed" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-12 h-[560px]" style={{ background: "var(--stage-light)" }} />
      <main className="relative mx-auto w-full max-w-[1360px] px-10 pt-7 pb-24">
        <div className="flex items-end gap-4">
          <div>
            <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Your Feed</h1>
            <p className="mt-2.5 text-[13.5px] text-t3">
              {view === "clustered" ? "Articles and posts about the same event, joined into one story." : "Each post or article on its own."}
            </p>
          </div>
          <ViewSwitch base={BASE} view={view} theme={theme} className="ml-3" />
        </div>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_364px] items-start gap-10">
          <section aria-label="Stories by time" className="relative pl-[92px]">
            <span
              aria-hidden="true"
              className="absolute top-3 bottom-0 left-[80px] w-px"
              style={{ background: "linear-gradient(to bottom, var(--line-strong) 0%, var(--line-strong) 90%, transparent)" }}
            />
            {src === "all" && pending > 0 ? (
              <div className="relative mb-7">
                <span className="absolute top-[11px] -left-[23px] grid size-[22px] place-items-center rounded-full border-2 border-[var(--caution)] bg-[var(--window)]">
                  <StatusMark status="running" size={12} color="var(--caution)" strokeWidth={2.5} />
                </span>
                <span className="absolute top-[17px] -left-[92px] w-[52px] text-right text-[11.5px] tracking-wide text-[var(--caution)] uppercase" style={{ fontFamily: "var(--label-font)" }}>
                  now
                </span>
                <div className="flex h-11 items-center rounded-xl border border-dashed border-[var(--caution)]/50 bg-[var(--caution-soft)]/60 px-4">
                  <Checking pending={pending} />
                </div>
              </div>
            ) : null}

            {shown.length === 0 ? <EmptyRiver src={src as Src} /> : null}

            {days.map((d, di) => (
              <div key={d.key} className="mb-9 last:mb-0">
                <div className="relative mb-4 flex items-center gap-4">
                  <span aria-hidden="true" className="absolute top-1/2 -left-[15px] size-[7px] -translate-y-1/2 rounded-[2px] bg-t3" />
                  <h2 className="text-[19px] leading-none font-semibold tracking-[-0.015em] text-t1">{d.label}</h2>
                  <span aria-hidden="true" className="h-px flex-1 bg-line" />
                </div>
                <div className="space-y-5">
                  {d.items.map((e, i) => (
                    <Entry_ key={e.id} entry={e} big={di === 0 && i === 0 && e.type === "story"} />
                  ))}
                </div>
              </div>
            ))}
          </section>

          <aside className="space-y-4">
            <Tile label="Alerts on X">
              <p className="mt-1.5 flex items-center gap-2 text-[13.5px] text-t2">
                <span aria-hidden="true" className="size-2 rounded-full border border-t4" /> Not connected
              </p>
              <AlertsButton full className="mt-3 h-9" />
            </Tile>
            <AgentTile pending={pending} />
            <Directory src={src} onPick={(s) => setSrc((cur) => (cur === s ? "all" : s))} />
            <WeekTile />
            <FreeWeekTile />
          </aside>
        </div>
      </main>
    </div>
  );
}

function EmptyRiver({ src }: { src: Src }) {
  const g = GROUPS.find((x) => x.id === src);
  return (
    <div className="grid h-[240px] place-items-center rounded-xl border border-line-strong bg-[var(--window)]" style={{ boxShadow: "var(--card-shadow)" }}>
      <p className="flex items-center gap-2.5 text-[14px] text-t2">
        {src === "ph" ? <PHMark size={18} /> : null}
        Nothing from {g?.label} in your feed yet.
      </p>
    </div>
  );
}

function Node({ kind }: { kind: "post" | "article" | "github" }) {
  const hue = { post: "var(--kind-post)", article: "var(--kind-article)", github: "var(--kind-github)" }[kind];
  return (
    <span
      aria-hidden="true"
      className="absolute top-[14px] -left-[23px] grid size-[22px] place-items-center rounded-full border-2 bg-[var(--window)]"
      style={{ borderColor: hue, color: hue, boxShadow: `0 0 0 4px color-mix(in srgb, ${hue} 14%, transparent)` }}
    >
      {kind === "post" ? <XLogo className="size-[9px]" /> : kind === "github" ? <GitHubMark className="size-[11px]" /> : <Newspaper className="size-[11px]" strokeWidth={2} />}
    </span>
  );
}

function Entry_({ entry, big }: { entry: Entry; big: boolean }) {
  const cardCls = "grid overflow-hidden rounded-xl border border-line-strong bg-[var(--window)] transition-transform duration-300 hover:-translate-y-0.5";
  const sh = { boxShadow: big ? "var(--window-shadow), var(--top-light)" : "var(--card-shadow), var(--top-light)" };

  if (entry.type === "digest") {
    const d = entry.digest;
    return (
      <div className="relative">
        <Node kind="github" />
        <span className="absolute top-[18px] -left-[92px] w-[52px] text-right text-[11.5px] text-t3" style={{ fontFamily: "var(--label-font)" }}>
          {clockOf(entry.at)}
        </span>
        <article className={cardCls} style={{ ...sh, gridTemplateColumns: "minmax(0,1fr) 320px" }}>
          <div className="p-5">
            <GitHubPill />
            <DigestBody d={d} className="mt-3.5" />
          </div>
          <div className="grid place-items-center border-l border-line bg-[var(--kind-github-soft)] text-[var(--kind-github)]">
            <GitHubMark className="size-16" />
          </div>
        </article>
      </div>
    );
  }

  const s: FeedStory = entry.story;
  const last = newest(s);
  const first = s.card.facts[0].evidence[0];
  const firstItem = s.items.find((i) => i.id === first.item) ?? s.items[0];
  const kinds = [...new Map(s.items.map((i) => [i.kind, i])).values()];
  const byId = new Map(s.items.map((i) => [i.id, i]));
  const chrono = [...s.items].sort((a, b) => (a.published_at < b.published_at ? -1 : 1));
  const facts = s.card.facts.slice(0, big ? 4 : 2);
  const hidden = s.card.facts.length - facts.length;

  return (
    <div className="relative">
      <Node kind={last.kind} />
      <span className="absolute top-[18px] -left-[92px] w-[52px] text-right text-[11.5px] text-t3" style={{ fontFamily: "var(--label-font)" }}>
        {clockOf(last.published_at)}
      </span>
      <article className={cardCls} style={{ ...sh, gridTemplateColumns: `minmax(0,1fr) ${big ? 420 : 320}px` }}>
        <div className="flex min-w-0 flex-col p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            {kinds.map((i) => (
              <KindPill key={i.id} item={i} />
            ))}
            <JoinedPill n={s.items.length} />
          </div>
          <h3 className={cn("font-semibold text-t1", big ? "mt-3 text-[27px] leading-[1.15] tracking-[-0.022em]" : "mt-2.5 text-[18.5px] leading-[1.28] tracking-[-0.012em]")}>
            {s.card.headline}
          </h3>
          <ul className={cn("space-y-2", big ? "mt-4" : "mt-3")}>
            {facts.map((f, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.5]">
                <span aria-hidden="true" className="mt-[0.66em] size-1 shrink-0 rounded-full bg-t4" />
                <span className="text-t2">
                  {f.text}{" "}
                  <Cite className="ml-0.5" items={[...new Map(f.evidence.map((e) => [e.item, byId.get(e.item)!])).values()]} />
                </span>
              </li>
            ))}
          </ul>
          {hidden > 0 ? <p className="mt-2 pl-3.5 text-[12px] text-t4">{hidden} more {hidden === 1 ? "fact" : "facts"}</p> : null}
          <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-line-soft pt-3 text-[12px] text-t3" style={{ marginTop: 16 }}>
            {chrono.map((i, k) => (
              <span key={i.id} className="inline-flex items-center gap-2.5">
                {k > 0 ? <span aria-hidden="true" className="h-px w-5 bg-line-strong" /> : null}
                <span className="inline-flex items-center gap-1.5">
                  <ReportMark item={i} size={14} className={i.kind === "post" ? "" : "rounded-[3px]"} />
                  <span className="text-t2">{i.publisher}</span>
                  {srcWord(i) ? <span className="text-t4">{srcWord(i)}</span> : null}
                  <span className="tabular-nums text-t4">{when(i.published_at)}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="relative min-h-[170px] border-l border-line bg-[var(--raised)]">
          {s.card.image ? (
            <Pic src={s.card.image} className="absolute inset-0 size-full" />
          ) : (
            <div className="flex h-full flex-col justify-center bg-[var(--well)] p-4">
              <p className="mb-2 text-[12px] font-medium text-t3">In their words</p>
              <Quote item={firstItem} span={first.span} />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

function Directory({ src, onPick }: { src: Src | "all"; onPick: (s: Src) => void }) {
  return (
    <Tile label="Sources">
      {GROUPS.map((g) => {
        const on = src === g.id;
        return (
          <div key={g.id} className="mt-3.5 first-of-type:mt-3">
            <button type="button" onClick={() => onPick(g.id)} aria-pressed={on} className="flex w-full items-center gap-2 text-left">
              {g.id === "github" ? <GitHubMark className="size-3.5 text-[var(--kind-github)]" /> : null}
              {g.id === "ph" ? <PHMark size={14} /> : null}
              {g.id === "x" ? <XLogo className="size-3 text-[var(--kind-post)]" /> : null}
              {g.id === "rss" || g.id === "website" ? <Newspaper className="size-3.5 text-[var(--kind-article)]" strokeWidth={1.75} /> : null}
              <span className={cn("text-[10.5px] tracking-[0.09em] uppercase", on ? "text-[var(--brand)]" : "text-t3")} style={{ fontFamily: "var(--label-font)" }}>
                {g.label}
              </span>
              {groupCount[g.id] ? <span className="text-[11px] tabular-nums text-t4">{groupCount[g.id]}</span> : null}
              {on ? <span className="ml-auto text-[11px] text-[var(--brand)]">Showing</span> : null}
            </button>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {g.id === "x"
                ? accounts.map((a) => (
                    <Chip key={a.id} title={a.why}>
                      <XAvatar handle={a.handle} size={15} />
                      {a.name}
                    </Chip>
                  ))
                : null}
              {g.id === "rss" || g.id === "website"
                ? sites
                    .filter((s) => s.kind === g.id)
                    .map((s) => (
                      <Chip key={s.id} title={s.why}>
                        <SiteIcon host={s.host} size={15} />
                        {s.name}
                      </Chip>
                    ))
                : null}
              {g.id === "github" ? (
                <Chip>
                  <GitHubMark className="size-3.5 text-[var(--kind-github)]" />
                  vercel/next.js
                </Chip>
              ) : null}
            </div>
          </div>
        );
      })}
    </Tile>
  );
}

function Chip({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex h-[26px] items-center gap-1.5 rounded-md border border-line bg-[var(--raised)] px-2 text-[12px] text-t2">
      {children}
    </span>
  );
}
