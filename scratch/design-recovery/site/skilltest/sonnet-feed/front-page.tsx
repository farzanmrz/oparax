"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedStory } from "@/next/data/feed";
import { AlertsButton, TopBar, ViewSwitch } from "@/next/council/chrome";
import { newest, status, when, type View } from "@/next/council/data";
import { Checking } from "@/next/council/live";
import { MarkStack } from "@/next/council/marks";
import {
  AgentTile,
  Cite,
  DigestBody,
  DigestThumb,
  entriesFor,
  entrySrcs,
  FreeWeekTile,
  GitHubPill,
  GROUPS,
  GroupMarks,
  groupCount,
  JoinedPill,
  KindPill,
  leadOf,
  PHMark,
  Pic,
  Quote,
  Thumb,
  WeekTile,
  type Entry,
  type Src,
} from "./kit";

// Direction A, Front page. The feed laid out like a newspaper's first screen: one lead story with its picture
// and every fact read in place, the sources' own words beside it, the next stories down a lifted side column,
// and the rest of the day under the fold. Sources are switched along the top, each kind named on its own.

const BASE = "/skilltest/sonnet-feed/a";

export function FrontPage({ view, theme }: { view: View; theme?: string }) {
  const [src, setSrc] = useState<Src | "all">("all");
  const all = entriesFor(view);
  const shown = all.filter((e) => src === "all" || entrySrcs(e).includes(src));
  const lead = leadOf(shown);
  const rest = shown.filter((e) => e !== lead);
  const side = rest.slice(0, 4);
  const more = rest.slice(4);
  const pending = status.pending - 1;

  return (
    <div className="palette-council relative flex min-h-svh flex-col">
      <TopBar title="Feed" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-12 h-[560px]" style={{ background: "var(--stage-light)" }} />
      <main className="relative mx-auto w-full max-w-[1360px] px-10 pt-7 pb-14">
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

        <SourceTabs value={src} onChange={setSrc} />

        {shown.length === 0 ? (
          <Empty src={src as Src} />
        ) : (
          <>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_404px] items-stretch gap-6">
              {lead && lead.type === "story" ? <Lead story={lead.story} /> : <span />}
              <aside
                aria-label="Next stories"
                className="flex flex-col overflow-hidden rounded-[14px] border border-line-strong bg-[var(--window)]"
                style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
              >
                <div className="flex h-12 shrink-0 items-center border-b border-line bg-[var(--caution-soft)]/50 px-4">
                  <Checking pending={pending} compact />
                </div>
                {side.map((e) => (
                  <SideRow key={e.id} entry={e} />
                ))}
              </aside>
            </div>

            <div className="mt-6 grid grid-cols-[repeat(3,minmax(0,1fr))_320px] items-start gap-6">
              {more.map((e) => (
                <MoreCard key={e.id} entry={e} />
              ))}
              <div className="flex flex-col gap-4" style={{ gridColumn: 4, gridRow: 1 }}>
                <AgentTile pending={pending} />
                <FreeWeekTile />
                <WeekTile />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SourceTabs({ value, onChange }: { value: Src | "all"; onChange: (s: Src | "all") => void }) {
  return (
    <div
      role="tablist"
      aria-label="Sources"
      className="mt-6 flex items-stretch gap-1 rounded-xl border border-line-strong bg-[var(--window)] p-1"
      style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
    >
      <Tab on={value === "all"} onClick={() => onChange("all")}>
        <Layers className={cn("size-4", value === "all" ? "text-[var(--brand)]" : "text-t3")} />
        All sources
      </Tab>
      {GROUPS.map((g) => (
        <Tab key={g.id} on={value === g.id} onClick={() => onChange(g.id)}>
          <GroupMarks id={g.id} size={18} />
          <span className="truncate">{g.label}</span>
          {groupCount[g.id] ? <span className="text-[11.5px] tabular-nums text-t4">{groupCount[g.id]}</span> : null}
        </Tab>
      ))}
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={cn(
        "flex h-10 min-w-0 flex-1 items-center justify-center gap-2.5 rounded-lg px-3 text-[13px] text-t2 transition-colors hover:bg-raised",
        on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
      )}
    >
      {children}
    </button>
  );
}

function Empty({ src }: { src: Src }) {
  const g = GROUPS.find((x) => x.id === src);
  return (
    <div className="mt-5 grid h-[320px] place-items-center rounded-[14px] border border-line-strong bg-[var(--window)]" style={{ boxShadow: "var(--card-shadow)" }}>
      <p className="flex items-center gap-2.5 text-[14px] text-t2">
        {src === "ph" ? <PHMark size={18} /> : null}
        Nothing from {g?.label} in your feed yet.
      </p>
    </div>
  );
}

function kindItems(story: FeedStory) {
  return [...new Map(story.items.map((i) => [i.kind, i])).values()];
}

function Lead({ story }: { story: FeedStory }) {
  const last = newest(story);
  const ordered = [...story.items].sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  const quotes = ordered
    .map((item) => ({ item, span: story.card.facts.flatMap((f) => f.evidence).find((e) => e.item === item.id)?.span }))
    .filter((q): q is { item: (typeof ordered)[number]; span: string } => !!q.span);
  const byId = new Map(story.items.map((i) => [i.id, i]));
  return (
    <article
      className="h-full overflow-hidden rounded-[14px] border border-line-strong bg-[var(--window)]"
      style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
    >
      <div className="relative h-[322px] overflow-hidden bg-[var(--raised)]">
        <Pic src={story.card.image} className="size-full" />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--window)] via-[var(--window)]/35 to-transparent" />
        <div className="absolute top-5 left-7 flex items-center gap-1.5 rounded-full bg-[var(--window)]/80 p-[3px] backdrop-blur-sm">
          {kindItems(story).map((i) => (
            <KindPill key={i.id} item={i} />
          ))}
          <JoinedPill n={story.items.length} />
          <span className="px-2 text-[11.5px] tabular-nums text-t3">{when(last.published_at)} UTC</span>
        </div>
        <h2 className="absolute inset-x-7 bottom-4 text-[31px] leading-[1.1] font-semibold tracking-[-0.025em] text-t1">{story.card.headline}</h2>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_292px] gap-8 px-7 pt-3 pb-7">
        <ul className="space-y-3">
          {story.card.facts.map((f, i) => (
            <li key={i} className="flex gap-2.5 text-[14.5px] leading-[1.55]">
              <span aria-hidden="true" className="mt-[0.7em] size-1 shrink-0 rounded-full bg-t4" />
              <span className="text-t2">
                {f.text}{" "}
                <Cite className="ml-0.5" items={[...new Map(f.evidence.map((e) => [e.item, byId.get(e.item)!])).values()]} />
              </span>
            </li>
          ))}
        </ul>
        <div>
          <p className="mb-2 text-[12px] font-medium text-t3">In their words</p>
          <div className="space-y-2.5">
            {quotes.map((q) => (
              <Quote key={q.item.id} item={q.item} span={q.span} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function SideRow({ entry }: { entry: Entry }) {
  if (entry.type === "digest") {
    const d = entry.digest;
    return (
      <article className="flex flex-1 items-center gap-3.5 border-b border-line-soft p-4 last:border-b-0 hover:bg-raised">
        <DigestThumb className="h-[92px] w-[116px] shrink-0 rounded-lg shadow-[0_0_0_1px_var(--line-strong)]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <GitHubPill />
            <span className="ml-auto text-[11.5px] tabular-nums text-t4">{when(d.released_at)}</span>
          </div>
          <h3 className="mt-1.5 text-[15px] leading-[1.3] font-semibold text-t1">{d.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-[1.45] text-t3">
            {d.description}. {d.detail}
          </p>
        </div>
      </article>
    );
  }
  const s = entry.story;
  const last = newest(s);
  return (
    <article className="flex flex-1 items-center gap-3.5 border-b border-line-soft p-4 last:border-b-0 hover:bg-raised">
      <Thumb item={last} image={s.card.image} className="h-[92px] w-[116px] rounded-lg shadow-[0_0_0_1px_var(--line-strong),0_8px_18px_-8px_rgb(0_0_0/0.45)]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {kindItems(s).map((i) => (
            <KindPill key={i.id} item={i} />
          ))}
          <span className="ml-auto shrink-0 text-[11.5px] tabular-nums text-t4">{when(last.published_at)}</span>
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-[15px] leading-[1.3] font-semibold tracking-[-0.01em] text-t1">{s.card.headline}</h3>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.45] text-t3">{s.card.facts[0].text}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-t3">
          <MarkStack items={s.items} size={14} />
          <span className="truncate">{s.items.map((i) => i.publisher).join(", ")}</span>
        </p>
      </div>
    </article>
  );
}

function MoreCard({ entry }: { entry: Entry }) {
  const cls = "overflow-hidden rounded-xl border border-line-strong bg-[var(--window)] transition-transform duration-300 hover:-translate-y-0.5";
  const sh = { boxShadow: "var(--card-shadow), var(--top-light)" };
  if (entry.type === "digest") {
    const d = entry.digest;
    return (
      <article className={cls} style={sh}>
        <DigestThumb className="h-[128px] w-full" />
        <div className="p-4">
          <GitHubPill />
          <DigestBody d={d} className="mt-3" />
        </div>
      </article>
    );
  }
  const s = entry.story;
  const last = newest(s);
  return (
    <article className={cls} style={sh}>
      <Thumb item={last} image={s.card.image} className="h-[128px] w-full border-b border-line" markSize={34} />
      <div className="p-4">
        <div className="flex items-center gap-1.5">
          {kindItems(s).map((i) => (
            <KindPill key={i.id} item={i} />
          ))}
        </div>
        <h3 className="mt-2.5 text-[16px] leading-[1.3] font-semibold tracking-[-0.01em] text-t1">{s.card.headline}</h3>
        <p className="mt-2 line-clamp-3 text-[13px] leading-[1.5] text-t2">{s.card.facts[0].text}</p>
        <p className="mt-3 flex items-center gap-1.5 border-t border-line-soft pt-3 text-[12px] text-t3">
          <MarkStack items={s.items} size={16} />
          <span className="truncate">{s.items.map((i) => i.publisher).join(", ")}</span>
          <span className="ml-auto shrink-0 tabular-nums text-t4">{when(last.published_at, false)}</span>
        </p>
      </div>
    </article>
  );
}
