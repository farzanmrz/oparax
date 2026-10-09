"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowUpDown, CalendarDays, CircleAlert, Gauge, Layers, X } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import {
  clock,
  day,
  feedItems,
  groupLabel,
  groups,
  groupSingular,
  href,
  itemsFrom,
  newest,
  plural,
  sourceById,
  sources,
  sourcesIn,
  status,
  storiesFor,
  type Kind,
  type Source,
  type Story,
  type View,
} from "./data";
import { AlertsButton, Facts, LiveDots, Lifted, Masthead, Page, StatusTile } from "./chrome";
import { Arrive, NewFlag, useArrival } from "./live";
import { Dot, GroupGlyph, Handle, KindChip, Segments, SourceMark } from "./marks";
import { StoryMedia } from "./media";

// Newsroom feed, fixed. Carried from the accepted Newsroom (next/council/newsroom.tsx): one lifted table
// window under a mono uppercase header, status tiles and a small chart beside it.
// Fixed: every row shows its facts on arrival (no expand); every row has one media object of the same
// footprint (image, post, release or article card); the left list holds every source, grouped by kind, and
// filters the table; sources by name (no Name or Handle switch, no search, the clustered view only, owner Oct 8); no "reports"; each count said once and with its unit.

const BASE = "/v2/newsroom/feed";
// Below 1280px the media moves under the facts, so the story column never collapses.
const COLS = "grid-cols-[132px_minmax(0,1fr)_84px] xl:grid-cols-[168px_minmax(0,1fr)_272px_96px]";
type Label = "name" | "handle";

export function NewsroomFeed({ view, theme, settled = false }: { view: View; theme?: string; settled?: boolean }) {
  const list = storiesFor(view);
  const { arrived } = useArrival(settled);
  const [selected, setSelected] = useState<string | null>(null);
  const label: Label = "name";

  const visible = useMemo(
    () => (arrived ? list : list.slice(1)).filter((s) => !selected || s.items.some((i) => i.sourceId === selected)),
    [arrived, list, selected],
  );

  const source = selected ? sourceById.get(selected) ?? null : null;

  return (
    <Page>
      <Masthead title="Your Feed" />
        <main className="min-w-0 flex-1 px-4 pt-4 pb-14 lg:px-7">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-[13.5px] text-t3">
                Articles and posts about the same event, joined into one story. Newest first.
              </p>
            </div>
            <AlertsButton />
          </div>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start">
          <SourceRail selected={selected} onSelect={setSelected} label={label} />
          <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            {source ? (
              <span className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--brand-line)] bg-[var(--brand-soft)] pr-1 pl-2.5 text-[12.5px] text-t1">
                <SourceMark source={source} size={16} />
                {label === "name" ? source.name : source.handle}
                <button type="button" onClick={() => setSelected(null)} aria-label="Show all sources" className="grid size-6 place-items-center rounded text-t3 hover:text-t1">
                  <X className="size-3.5" />
                </button>
              </span>
            ) : null}
            <span className="ml-auto flex items-center gap-1.5 text-[12px] text-t3">
              <ArrowUpDown className="size-3" /> Newest first
            </span>
          </div>

          <StatusStrip />

          <div className="mt-3">
            <Lifted aria-label="Feed" className="min-w-0">
              <div
                className={cn("grid h-10 items-center gap-5 border-b border-line px-4 font-mono text-[10.5px] tracking-[0.08em] text-t3", COLS)}
                style={{ background: "linear-gradient(180deg, var(--raised), var(--window))" }}
              >
                <span>SOURCE</span>
                <span>STORY</span>
                <span aria-hidden="true" className="hidden xl:block" />
                <span className="text-right">PUBLISHED</span>
              </div>
              {visible.length === 0 ? (
                source ? (
                  <SourceEmpty source={source} label={label} />
                ) : null
              ) : (
                <ul>
                  <AnimatePresence initial={false}>
                    {visible.map((s, i) => (
                      <Arrive key={s.id} as="li" index={i} fresh={arrived && !settled && s.id === list[0].id} className="border-b border-line-soft last:border-b-0">
                        <Row story={s} label={label} fresh={arrived && !settled && s.id === list[0].id} onSource={setSelected} />
                      </Arrive>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
              {source && visible.length > 0 ? (
                <div className="flex h-10 items-center justify-between border-t border-line bg-[var(--raised)]/60 px-4 text-[12px] text-t3">
                  <span>
                    Only {label === "name" ? source.name : source.handle}, {groupSingular[source.group]}
                  </span>
                  <button type="button" onClick={() => setSelected(null)} className="text-[var(--brand)] hover:underline">
                    Show all sources
                  </button>
                </div>
              ) : null}
            </Lifted>
          </div>
          </div>
          </div>
        </main>
    </Page>
  );
}

function SourceRail({
  selected,
  onSelect,
  label,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
  label: Label;
}) {
  return (
    <nav aria-label="Sources" className="w-full shrink-0 rounded-[14px] border border-line bg-[var(--rail)] px-2.5 pt-5 pb-8 lg:w-[244px]">
      <div className="px-2">
        <p className="font-mono text-[10.5px] tracking-[0.1em] text-t3">SOURCES</p>
      </div>
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={cn(
          "mt-3 flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-t2 hover:bg-raised",
          selected === null && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
        )}
      >
        <Layers className={cn("size-4 text-t3", selected === null && "text-[var(--brand)]")} />
        All sources
      </button>
      {groups.map((g) => (
        <div key={g} className="mt-4">
          <p className="flex items-center gap-1.5 px-2.5 pb-1 font-mono text-[10px] tracking-[0.1em] text-t3">
            <GroupGlyph group={g} className="size-2.5" />
            {groupLabel[g]}
          </p>
          {sourcesIn(g).map((s) => {
            const n = itemsFrom(s.id);
            const on = selected === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(on ? null : s.id)}
                aria-pressed={on}
                title={s.focus || undefined}
                className={cn(
                  "flex min-h-[30px] w-full items-center gap-2.5 rounded-md px-2.5 py-1 text-left text-[12.5px] text-t2 hover:bg-raised focus-visible:outline-2 focus-visible:outline-[var(--brand)]",
                  on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]",
                )}
              >
                <SourceMark source={s} size={16} />
                <span className={cn("min-w-0 flex-1", label === "handle" && "font-mono text-[11px]")}>
                  {label === "name" ? s.name : <Handle value={s.handle} />}
                </span>
                {n > 0 ? (
                  <span className="shrink-0 text-[11px] tabular-nums text-t3" aria-label={`${n} in your feed`}>
                    {n}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function kindsOf(story: Story): { kind: Kind; n: number }[] {
  const m = new Map<Kind, number>();
  story.items.forEach((i) => m.set(i.kind, (m.get(i.kind) ?? 0) + 1));
  return [...m].map(([kind, n]) => ({ kind, n }));
}

function Row({ story, label, fresh, onSource }: { story: Story; label: Label; fresh: boolean; onSource: (id: string) => void }) {
  const last = newest(story);
  const srcs = [...new Map(story.items.map((i) => [i.sourceId, sourceById.get(i.sourceId)!])).values()].filter(Boolean);
  const kinds = kindsOf(story);
  return (
    <article className={cn("grid gap-5 px-4 py-4", COLS)}>
      <div className="min-w-0 space-y-2">
        {srcs.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSource(s.id)}
            className="flex w-full items-start gap-2 rounded-sm text-left text-[12.5px] text-t1 hover:text-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            title={`Show only ${s.name}`}
          >
            <SourceMark source={s} size={18} className="mt-px" />
            <span className={cn("min-w-0", label === "handle" && "font-mono text-[11px] leading-[1.6]")}>
              {label === "name" ? s.name : <Handle value={s.handle} />}
            </span>
          </button>
        ))}
        <div className="flex flex-wrap gap-1">
          {kinds.map(({ kind, n }) => (
            <KindChip key={kind} kind={kind} label={story.items.length > 1 ? plural(n, kind) : undefined} />
          ))}
        </div>
      </div>
      <div className="min-w-0">
        <h2 className="flex items-start gap-2 text-[15.5px] leading-snug font-semibold tracking-[-0.01em] text-t1">
          <span>{story.card.headline}</span>
          {fresh ? <NewFlag className="mt-0.5" /> : null}
        </h2>
        <Facts story={story} size="sm" className="mt-2" />
      </div>
      <StoryMedia story={story} className="col-start-2 row-start-2 max-w-[360px] xl:col-start-3 xl:row-start-1 xl:max-w-none" />
      <div className="col-start-3 row-start-1 text-right font-mono text-[11.5px] leading-[1.5] tabular-nums xl:col-start-4">
        <p className="text-t2">{day(last.published_at)}</p>
        <p className="text-t3">{clock(last.published_at)}</p>
      </div>
    </article>
  );
}

function SourceEmpty({ source, label }: { source: Source; label: Label }) {
  const what = source.group === "x" ? "posts" : source.group === "github" ? "releases" : "articles";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-8 px-6 py-8">
      <div>
        <div className="flex items-center gap-3">
          <SourceMark source={source} size={36} className="rounded-lg" />
          <div>
            <p className="text-[17px] font-semibold text-t1">{label === "name" ? source.name : source.handle}</p>
            <p className="text-[12.5px] text-t3">
              {groupSingular[source.group]} · <span className="font-mono text-[11.5px]">{label === "name" ? source.handle : source.name}</span>
            </p>
          </div>
        </div>
        <p className="mt-5 text-[14px] text-t2">
          Nothing from {source.name} in this preview yet. Its new {what} appear here as they are published, checked against your sentence like every other source.
        </p>
      </div>
      <div className="rounded-lg border border-line bg-[var(--well)] p-4">
        {source.focus ? (
          <>
            <p className="font-mono text-[10px] tracking-[0.08em] text-t3">COVERS</p>
            <p className="mt-1 text-[13px] text-t1">{source.focus}</p>
          </>
        ) : null}
        {source.why ? (
          <>
            <p className="mt-3 font-mono text-[10px] tracking-[0.08em] text-t3">WHY YOUR AGENT CHOSE IT</p>
            <p className="mt-1 text-[13px] text-t2">{source.why}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** The accepted Newsroom's status tiles, as one strip above the table so the table gets the full width. */
function StatusStrip() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-[1fr_1fr_1fr_1.25fr]">
      <StatusTile tone="ok" label="AGENT" icon={<LiveDots />}>
        <span className="text-[var(--ok)]">Live</span>
        <span className="text-t2">, watching {sources.length} sources</span>
      </StatusTile>
      <StatusTile tone="error" label="FAILED" icon={<CircleAlert className="size-[18px]" />}>
        Could not process <span className="tabular-nums">{status.failed}</span> item
      </StatusTile>
      <StatusTile label="ALERTS ON TWITTER" icon={<XLogo className="size-4" />}>
        <span className="flex items-center gap-2">
          <Dot tone="idle" /> Not connected
        </span>
      </StatusTile>
      <div className="flex items-center gap-4 rounded-lg border border-line bg-[var(--window)] px-3.5 py-2.5" style={{ boxShadow: "var(--top-light)" }}>
        <div className="min-w-0 flex-1">
          <p className="flex items-center justify-between font-mono text-[10px] tracking-[0.08em] text-t3">
            <span className="flex items-center gap-1.5"><CalendarDays className="size-3" /> FREE WEEK</span>
            <span className="font-sans text-[12.5px] tracking-normal text-t1"><span className="font-semibold tabular-nums">{status.daysLeft}</span> days left</span>
          </p>
          <div className="mt-2"><Segments total={status.trialDays} filled={status.daysLeft} /></div>
        </div>
        <div className="w-[120px] shrink-0">
          <p className="flex items-center justify-between font-mono text-[10px] tracking-[0.08em] text-t3">
            <span className="flex items-center gap-1.5"><Gauge className="size-3" /> TWITTER POSTS</span>
            <span className="font-sans text-[12.5px] tracking-normal text-t1 tabular-nums">{status.poolUsed}<span className="text-t3">/{status.poolLimit}</span></span>
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-line-strong" />
        </div>
      </div>
    </div>
  );
}

export const feedCounts = { items: feedItems.length };
