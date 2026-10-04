"use client";

import { useState } from "react";
import { Newspaper } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import type { DigestEntry, FeedStory, ItemView } from "@/next/data/feed";
import { AlertsButton, TopBar, ViewSwitch } from "@/next/council/chrome";
import { accounts, hostOf, newest, sites, status, when, type View } from "@/next/council/data";
import { Dot, GitHubMark, ReportMark, SiteIcon, XAvatar } from "@/next/council/marks";
import {
  AgentTile,
  DigestThumb,
  entriesFor,
  factSources,
  FreeWeekTile,
  GitHubPill,
  GROUPS,
  groupCount,
  JoinedPill,
  KindPill,
  leadOf,
  PHMark,
  Pic,
  Quote,
  srcWord,
  Thumb,
  where,
  WeekTile,
  type Entry,
  type Src,
} from "./kit";

// Direction C, Case file. One story at a time, laid open: its picture and sources on the left, and on the right
// every fact set beside the words it came from, so the evidence reads without a single click. The source ribbon
// above lights the sources behind the open story; the film strip below holds the rest of the feed and stays put.

const BASE = "/skilltest/sonnet-feed/c";

export function CaseFile({ view, theme }: { view: View; theme?: string }) {
  const list = entriesFor(view);
  const [sel, setSel] = useState<string>(leadOf(list)?.id ?? list[0].id);
  const current = list.find((e) => e.id === sel) ?? list[0];
  const pending = status.pending - 1;

  return (
    <div className="palette-council relative flex min-h-svh flex-col">
      <TopBar title="Feed" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-12 h-[560px]" style={{ background: "var(--stage-light)" }} />
      <main className="relative mx-auto w-full max-w-[1360px] flex-1 px-10 pt-6 pb-10">
        <div className="flex items-end gap-4">
          <div>
            <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Your Feed</h1>
            <p className="mt-2.5 text-[13.5px] text-t3">
              {view === "clustered" ? "Articles and posts about the same event, joined into one story." : "Each post or article on its own."}
            </p>
          </div>
          <ViewSwitch base={BASE} view={view} theme={theme} className="ml-3" />
          <AlertsButton className="ml-auto" />
        </div>

        <Ribbon entry={current} />

        <section
          aria-label="Open story"
          className="relative mt-4 overflow-hidden rounded-[18px] border border-line"
          style={{ background: "var(--stage-frame)" }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "var(--stage-light)" }} />
          <div
            className="relative m-6 grid grid-cols-[364px_minmax(0,1fr)] overflow-hidden rounded-[14px] border border-line-strong bg-[var(--window)]"
            style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
          >
            {current.type === "story" ? <StoryCase story={current.story} /> : <DigestCase d={current.digest} />}
          </div>
        </section>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <AgentTile pending={pending} />
          <FreeWeekTile />
          <WeekTile />
        </div>
      </main>

      <Filmstrip list={list} sel={current.id} onSelect={setSel} pending={pending} />
    </div>
  );
}

/** The ids of the sources behind the open entry, so the ribbon can light them. */
function lit(entry: Entry) {
  const x = new Set<string>();
  const hosts = new Set<string>();
  let github = false;
  if (entry.type === "digest") github = true;
  else
    for (const i of entry.story.items) {
      if (i.kind === "post" && i.author) x.add(i.author.toLowerCase());
      else hosts.add(hostOf(i.url));
    }
  return { x, hosts, github };
}

function Ribbon({ entry }: { entry: Entry }) {
  const on = lit(entry);
  const ring = (active: boolean, hue: string) =>
    active ? { boxShadow: `0 0 0 2px var(--window), 0 0 0 4px ${hue}` } : undefined;
  return (
    <div
      aria-label="Sources"
      className="mt-6 flex items-stretch gap-6 overflow-x-auto rounded-xl border border-line-strong bg-[var(--window)] px-5 py-3 [scrollbar-width:none]"
      style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      <div className="flex shrink-0 flex-col justify-between">
        <span className="text-[10.5px] tracking-[0.09em] text-t3 uppercase" style={{ fontFamily: "var(--label-font)" }}>
          Agent
        </span>
        <span className="flex h-6 items-center gap-2 text-[13px] font-medium text-[var(--ok)]">
          <Dot tone="ok" pulse /> Live
        </span>
      </div>
      {GROUPS.map((g) => (
        <div key={g.id} className="flex shrink-0 flex-col justify-between gap-1.5 border-l border-line pl-6">
          <span className="flex items-center gap-1.5 text-[10.5px] tracking-[0.09em] text-t3 uppercase" style={{ fontFamily: "var(--label-font)" }}>
            {g.label}
            {groupCount[g.id] ? <span className="tabular-nums text-t4">{groupCount[g.id]}</span> : null}
          </span>
          <div className="flex items-center gap-2">
            {g.id === "x"
              ? accounts.map((a) => (
                  <span key={a.id} title={a.name} className="rounded-full" style={ring(on.x.has(a.handle), "var(--kind-post)")}>
                    <XAvatar handle={a.handle} size={24} />
                  </span>
                ))
              : null}
            {g.id === "rss" || g.id === "website"
              ? sites
                  .filter((s) => s.kind === g.id)
                  .map((s) => (
                    <span key={s.id} title={s.name} className="rounded-[6px]" style={ring(on.hosts.has(s.host), "var(--kind-article)")}>
                      <SiteIcon host={s.host} size={24} className="rounded-[6px]" />
                    </span>
                  ))
              : null}
            {g.id === "github" ? (
              <span title="vercel/next.js" className="grid size-6 place-items-center rounded-full text-[var(--kind-github)]" style={ring(on.github, "var(--kind-github)")}>
                <GitHubMark className="size-[22px]" />
              </span>
            ) : null}
            {g.id === "ph" ? (
              <span title="Product Hunt" className="grid size-6 place-items-center">
                <PHMark size={24} />
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceCard({ item }: { item: ItemView }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-[var(--window)] p-3",
        item.kind === "post" ? "border-l-2 border-l-[var(--kind-post)]" : "border-l-2 border-l-[var(--kind-article)]",
      )}
    >
      <div className="flex items-center gap-2">
        <ReportMark item={item} size={18} className={item.kind === "post" ? "" : "rounded-[4px]"} />
        <span className="text-[13px] font-medium text-t1">{item.publisher}</span>
        {srcWord(item) ? <span className="text-[11.5px] text-t4">{srcWord(item)}</span> : null}
        <span className="ml-auto text-[11.5px] tabular-nums text-t4">{when(item.published_at)}</span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-[1.45] text-t3">{item.title}</p>
      <p className="mt-1 truncate text-[11.5px] text-t4">{where(item)}</p>
    </div>
  );
}

function StoryCase({ story }: { story: FeedStory }) {
  const last = newest(story);
  const kinds = [...new Map(story.items.map((i) => [i.kind, i])).values()];
  const ordered = [...story.items].sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  return (
    <>
      <aside className="flex flex-col border-r border-line bg-[var(--rail)]">
        <Thumb item={last} image={story.card.image} className="h-[224px] w-full border-b border-line" markSize={44} />
        <div className="space-y-2.5 p-4">
          <p className="text-[12px] font-medium text-t3">Sources</p>
          {ordered.map((i) => (
            <SourceCard key={i.id} item={i} />
          ))}
        </div>
      </aside>
      <article className="min-w-0 px-8 pt-6 pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {kinds.map((i) => (
            <KindPill key={i.id} item={i} />
          ))}
          <JoinedPill n={story.items.length} />
          <span className="ml-auto text-[11.5px] tabular-nums text-t4">{when(last.published_at)} UTC</span>
        </div>
        <h2 className="mt-3.5 text-[29px] leading-[1.15] font-semibold tracking-[-0.025em] text-t1">{story.card.headline}</h2>
        <div
          className="mt-5 grid grid-cols-2 gap-x-8 border-b border-line pb-2 text-[10.5px] tracking-[0.09em] text-t3 uppercase"
          style={{ fontFamily: "var(--label-font)" }}
        >
          <span>Fact</span>
          <span>In their words</span>
        </div>
        <ol>
          {story.card.facts.map((f, i) => {
            const by = factSources(story, f);
            return (
              <li key={i} className="grid grid-cols-2 gap-x-8 border-b border-line-soft py-3.5 last:border-b-0">
                <div className="flex gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand)] tabular-nums">
                    {i + 1}
                  </span>
                  <p className="text-[14.5px] leading-[1.5] text-t1">{f.text}</p>
                </div>
                <div className="space-y-2">
                  {by.map((item) => (
                    <Quote
                      key={item.id}
                      item={item}
                      span={f.evidence.filter((e) => e.item === item.id).map((e) => e.span)[0]}
                      className="py-1.5 [&_blockquote]:text-[12.5px]"
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </article>
    </>
  );
}

function DigestCase({ d }: { d: DigestEntry }) {
  const rows: [string, string][] = [
    ["What it is", d.description],
    ["What the release carries", d.detail],
    ["Released", `${when(d.released_at)} UTC`],
  ];
  return (
    <>
      <aside className="flex flex-col border-r border-line bg-[var(--rail)]">
        <div className="grid h-[224px] place-items-center border-b border-line bg-[var(--kind-github-soft)] text-[var(--kind-github)]">
          <GitHubMark className="size-20" />
        </div>
        <div className="space-y-2.5 p-4">
          <p className="text-[12px] font-medium text-t3">Source</p>
          <div className="rounded-lg border border-line border-l-2 border-l-[var(--kind-github)] bg-[var(--window)] p-3">
            <div className="flex items-center gap-2">
              <GitHubMark className="size-4 text-[var(--kind-github)]" />
              <span className="text-[13px] font-medium text-t1">vercel/next.js</span>
              <span className="text-[11.5px] text-t4">GitHub</span>
              <span className="ml-auto text-[11.5px] tabular-nums text-t4">{when(d.released_at)}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] text-t3">Release tag v15.0.0</p>
          </div>
        </div>
      </aside>
      <article className="min-w-0 px-8 pt-6 pb-6">
        <div className="flex items-center gap-1.5">
          <GitHubPill />
          <span className="ml-auto text-[11.5px] tabular-nums text-t4">{when(d.released_at)} UTC</span>
        </div>
        <h2 className="mt-3.5 text-[29px] leading-[1.15] font-semibold tracking-[-0.025em] text-t1">{d.name}</h2>
        <div className="mt-5 border-t border-line">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[200px_minmax(0,1fr)] gap-x-8 border-b border-line-soft py-3.5 last:border-b-0">
              <span className="pt-0.5 text-[10.5px] tracking-[0.09em] text-t3 uppercase" style={{ fontFamily: "var(--label-font)" }}>
                {k}
              </span>
              <p className="text-[14.5px] leading-[1.5] text-t1">{v}</p>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}

function Filmstrip({ list, sel, onSelect, pending }: { list: Entry[]; sel: string; onSelect: (id: string) => void; pending: number }) {
  return (
    <nav
      aria-label="Stories"
      className="sticky bottom-0 z-30 border-t border-line-strong bg-[var(--page)]/95 backdrop-blur-md"
      style={{ boxShadow: "0 -10px 28px -14px rgb(0 0 0 / 0.35)" }}
    >
      <div className="mx-auto flex max-w-[1360px] gap-3 overflow-x-auto px-10 py-3 [scrollbar-width:none]">
        {pending > 0 ? (
          <div className="flex w-[168px] shrink-0 flex-col justify-center gap-2 rounded-lg border border-dashed border-[var(--caution)]/50 bg-[var(--caution-soft)]/60 px-3">
            <StatusMark status="running" size={17} color="var(--caution)" strokeWidth={2} />
            <Shimmer as="span" duration={2.2} className="text-[12.5px] leading-snug font-medium [--color-background:var(--t1)] [--color-muted-foreground:var(--t3)]">
              {`Checking ${pending} ${pending === 1 ? "item" : "items"} against your sentence`}
            </Shimmer>
          </div>
        ) : null}
        {list.map((e) => (
          <Frame key={e.id} entry={e} on={e.id === sel} onClick={() => onSelect(e.id)} />
        ))}
      </div>
    </nav>
  );
}

function Frame({ entry, on, onClick }: { entry: Entry; on: boolean; onClick: () => void }) {
  const isDigest = entry.type === "digest";
  const story = entry.type === "story" ? entry.story : null;
  const last = story ? newest(story) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={on ? "true" : undefined}
      className={cn(
        "w-[176px] shrink-0 overflow-hidden rounded-lg border bg-[var(--window)] text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5",
        on ? "border-[var(--brand-line)] shadow-[0_0_0_1px_var(--brand),0_10px_24px_-10px_rgb(58_108_244/0.55)]" : "border-line-strong",
      )}
      style={on ? undefined : { boxShadow: "var(--card-shadow)" }}
    >
      <div className="relative">
        {story && last ? <Thumb item={last} image={story.card.image} className="h-[72px] w-full" markSize={24} /> : <DigestThumb className="h-[72px] w-full" />}
        {story && story.items.length > 1 ? (
          <span className="absolute top-1.5 right-1.5">
            <JoinedPill n={story.items.length} />
          </span>
        ) : null}
      </div>
      <div className="p-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-t4">
          {isDigest ? (
            <GitHubMark className="size-3 text-[var(--kind-github)]" />
          ) : last!.kind === "post" ? (
            <XLogo className="size-2.5 text-[var(--kind-post)]" />
          ) : (
            <Newspaper className="size-3 text-[var(--kind-article)]" strokeWidth={1.75} />
          )}
          <span className="tabular-nums">{when(entry.at, false)}</span>
        </div>
        <p className={cn("mt-1 line-clamp-2 text-[12.5px] leading-snug font-medium", on ? "text-t1" : "text-t2")}>
          {story ? story.card.headline : (entry as Extract<Entry, { type: "digest" }>).digest.name}
        </p>
      </div>
    </button>
  );
}

export type { Src };
