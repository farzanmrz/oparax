"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ExternalLink, Layers, Link2, Rows3, Search } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Collapsible } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { FeedStory, ItemView } from "../data/feed";
import { AlertsButton, Facts, Quote, TopBar, ViewSwitch } from "./chrome";
import { accounts, digests, hostOf, newest, sites, status, storiesFor, week, weekTotal, when, type View } from "./data";
import { Arrive, Checking, EASE, NewFlag, useArrival } from "./live";
import { Dot, GitHubMark, KindChip, MarkStack, ReportMark, Segments, SiteIcon, WeekBars, XAvatar } from "./marks";

// Direction 1, Window (agreed.md): the feed as one lit product window on the page, the way linear-home-01 and
// owner-4 show Linear. Inside: a sidebar of the agent's real sources and accounts, the story list with the live
// checking row, the selected story large with its reports as their own rows, and a status column of tiles.

const BASE = "/next/feed/window";

export function WindowFeed({ view, theme, story }: { view: View; theme?: string; story?: string | null }) {
  const list = storiesFor(view);
  const { arrived, pending } = useArrival();
  const visible = arrived ? list : list.slice(1);
  const fallback = view === "clustered" ? "st-gpt61-sol" : "st-latent-sol";
  const [selected, setSelected] = useState(story && list.some((s) => s.id === story) ? story : fallback);
  const current = list.find((s) => s.id === selected) ?? list[0];
  const position = visible.findIndex((s) => s.id === current.id) + 1;

  return (
    <div className="palette-council flex min-h-svh flex-col">
      <TopBar title="Feed" />
      <main className="relative flex-1 px-5 pt-5 pb-10">
        {/* The stage: a soft top-lit frame the window sits in (linear-intake-02, linear-plan-08). */}
        <div className="relative overflow-hidden rounded-[18px] border border-line" style={{ background: "var(--stage-frame)" }}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "var(--stage-light)" }} />
          <div className="relative flex items-end justify-between px-8 pt-7 pb-6">
            <div>
              <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Your Feed</h1>
              <p className="mt-2.5 text-[13.5px] text-t3">
                {view === "clustered"
                  ? "Reports about the same event, joined into one story."
                  : "Each post or article on its own."}
              </p>
            </div>
            <ViewSwitch base={BASE} view={view} theme={theme} />
          </div>

          <div
            className="relative mx-8 mb-[-1px] flex h-[740px] overflow-hidden rounded-t-[14px] border border-b-0 border-line-strong bg-[var(--window)]"
            style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
          >
            <Sidebar view={view} />
            <StoryList
              list={visible}
              arrived={arrived}
              pending={pending}
              newestId={list[0].id}
              selected={current.id}
              onSelect={setSelected}
              view={view}
            />
            <Detail story={current} position={position} total={visible.length} />
            <StatusColumn pending={pending} />
          </div>
        </div>
      </main>
    </div>
  );
}

function Sidebar({ view }: { view: View }) {
  return (
    <aside className="flex w-[204px] shrink-0 flex-col border-r border-line bg-[var(--rail)]">
      <div className="flex h-12 items-center gap-2 px-3.5">
        <span className="grid size-6 place-items-center rounded-md bg-[var(--brand)] text-[11px] font-semibold text-white">F</span>
        <span className="text-[13px] font-semibold text-t1">farzanmrz</span>
        <ChevronDown className="size-3.5 text-t4" />
        <Search className="ml-auto size-3.5 text-t3" />
      </div>
      <nav className="space-y-px px-2">
        <NavRow icon={view === "clustered" ? <Layers className="size-3.5" /> : <Rows3 className="size-3.5" />} label="Feed" count={storiesFor(view).length} on />
        <NavRow icon={<GitHubMark className="size-3.5" />} label="Digests" count={digests.length} />
      </nav>
      <div className="mt-4 min-h-0 flex-1 overflow-hidden">
        <p className="flex items-center justify-between px-3.5 pb-1 text-[11.5px] font-medium text-t4">
          Sites and feeds <span className="tabular-nums">{sites.length}</span>
        </p>
        <ul className="px-2">
          {sites.slice(0, 7).map((s) => (
            <li key={s.id} className="flex h-[27px] items-center gap-2 rounded-md px-1.5 text-[12.5px] text-t2 hover:bg-raised" title={s.why}>
              <SiteIcon host={s.host} size={14} />
              <span className="truncate">{s.name}</span>
              <span className="ml-auto text-[11px] text-t4">{s.kind === "rss" ? "Feed" : "Site"}</span>
            </li>
          ))}
          <li className="px-1.5 py-1 text-[12px] text-t4">{sites.length - 7} more</li>
        </ul>
        <p className="flex items-center justify-between px-3.5 pt-3 pb-1 text-[11.5px] font-medium text-t4">
          X accounts <span className="tabular-nums">{accounts.length}</span>
        </p>
        <ul className="px-2">
          {accounts.map((a) => (
            <li key={a.id} className="flex h-[27px] items-center gap-2 rounded-md px-1.5 text-[12.5px] text-t2 hover:bg-raised" title={a.why}>
              <XAvatar handle={a.handle} size={15} />
              <span className="truncate">{a.name}</span>
              <span className="ml-auto truncate text-[11px] text-t4">{a.handle}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function NavRow({ icon, label, count, on = false }: { icon: React.ReactNode; label: string; count: number; on?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 text-[13px] text-t2",
        on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
      )}
    >
      <span className={cn("text-t3", on && "text-[var(--brand)]")}>{icon}</span>
      {label}
      <span className="ml-auto text-[11.5px] tabular-nums text-t4">{count}</span>
    </div>
  );
}

function StoryList({
  list,
  arrived,
  pending,
  newestId,
  selected,
  onSelect,
  view,
}: {
  list: FeedStory[];
  arrived: boolean;
  pending: number;
  newestId: string;
  selected: string;
  onSelect: (id: string) => void;
  view: View;
}) {
  return (
    <section aria-label="Stories" className="flex w-[318px] shrink-0 flex-col border-r border-line">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
        <span className="text-[13px] font-semibold text-t1">{view === "clustered" ? "Stories" : "Reports"}</span>
        <span className="text-[12px] tabular-nums text-t4">{list.length}</span>
        <span className="ml-auto flex items-center gap-1 text-[12px] text-t3">
          <ArrowUpDown className="size-3" /> Newest
        </span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="flex h-11 items-center border-b border-line-soft bg-[var(--caution-soft)]/40 px-4">
          <Checking pending={pending} compact />
        </div>
        <ul>
          <AnimatePresence initial={false}>
            {list.map((s, i) => (
              <Arrive key={s.id} as="li" index={i} fresh={arrived && s.id === newestId}>
                <Row story={s} on={s.id === selected} fresh={arrived && s.id === newestId} onSelect={() => onSelect(s.id)} />
              </Arrive>
            ))}
          </AnimatePresence>
        </ul>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--window)] to-transparent" />
      </div>
    </section>
  );
}

function Row({ story, on, fresh, onSelect }: { story: FeedStory; on: boolean; fresh: boolean; onSelect: () => void }) {
  const last = newest(story);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={on ? "true" : undefined}
      className={cn(
        "relative block w-full border-b border-line-soft px-4 py-3 text-left transition-colors hover:bg-raised",
        on && "bg-[var(--brand-soft)] hover:bg-[var(--brand-soft)]",
      )}
    >
      {on ? <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[var(--brand)]" /> : null}
      <span className="flex items-center gap-2">
        <MarkStack items={story.items} size={16} />
        <span className="truncate text-[12px] text-t3">{story.items.map((i) => i.publisher).join(", ")}</span>
        {fresh ? <NewFlag className="ml-auto" /> : <span className="ml-auto shrink-0 text-[11.5px] tabular-nums text-t4">{when(last.published_at)}</span>}
      </span>
      <span className={cn("mt-1.5 line-clamp-2 text-[13.5px] leading-snug", on ? "text-t1" : "text-t2")}>{story.card.headline}</span>
      <span className="mt-2 flex items-center gap-1.5">
        {[...new Set(story.items.map((i) => i.kind))].map((k) => (
          <KindChip key={k} kind={k} count={story.items.filter((i) => i.kind === k).length} className="h-5 text-[11px]" />
        ))}
        {story.items.length > 1 ? (
          <span className="inline-flex h-5 items-center gap-1 rounded-full border border-line px-1.5 text-[11px] text-t3">
            <Layers className="size-3" /> {story.items.length} reports
          </span>
        ) : null}
      </span>
    </button>
  );
}

function Detail({ story, position, total }: { story: FeedStory; position: number; total: number }) {
  const last = newest(story);
  return (
    <section aria-label="Selected story" className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-5 text-[12.5px]">
        {story.arrangement === "clustered" ? <Layers className="size-3.5 text-t3" /> : <Rows3 className="size-3.5 text-t3" />}
        <span className="text-t3">{story.arrangement === "clustered" ? "Story" : "Report"}</span>
        <span className="text-t4">/</span>
        <span className="truncate text-t2">{story.card.headline}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2.5 text-t4">
          <span className="tabular-nums">
            {Math.max(position, 1)} / {total}
          </span>
          <ArrowUp className="size-3.5" />
          <ArrowDown className="size-3.5" />
          <span className="mx-1 h-4 w-px bg-line" />
          <span className="grid size-7 place-items-center rounded-md border border-line text-t3"><Link2 className="size-3.5" /></span>
          <span className="grid size-7 place-items-center rounded-md border border-line text-t3"><ExternalLink className="size-3.5" /></span>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 pt-7 pb-10">
        <AnimatePresence mode="wait">
          <motion.article
            key={story.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <div className="flex gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[...new Set(story.items.map((i) => i.kind))].map((k) => (
                    <KindChip key={k} kind={k} count={story.items.filter((i) => i.kind === k).length} />
                  ))}
                  <span className="inline-flex h-[22px] items-center rounded-full border border-line px-2 text-[11.5px] text-t3">
                    {story.card.facts.length} facts
                  </span>
                  <span className="inline-flex h-[22px] items-center rounded-full border border-line px-2 text-[11.5px] tabular-nums text-t3">
                    {when(last.published_at)} UTC
                  </span>
                </div>
                <h2 className="mt-3.5 text-[23px] leading-[1.25] font-semibold tracking-[-0.018em] text-t1">{story.card.headline}</h2>
              </div>
              {story.card.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={story.card.image}
                  alt=""
                  loading="lazy"
                  className="mt-1 h-[84px] w-[136px] shrink-0 rounded-lg object-cover shadow-[0_0_0_1px_var(--line-strong),0_8px_20px_-8px_rgb(0_0_0/0.5)]"
                />
              ) : null}
            </div>
            <Facts story={story} className="mt-5" />
            <Reports story={story} />
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  );
}

/** The report stack: each report is its own row with kind, real mark, publisher and time (AI Elements Sources trigger and content). */
function Reports({ story }: { story: FeedStory }) {
  const [open, setOpen] = useState<string | null>(story.items[0].id);
  const items = [...story.items].sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  return (
    <Collapsible defaultOpen className="mt-7 text-t2">
      <SourcesTrigger count={items.length} className="group text-[12.5px] text-t3 hover:text-t1">
        <span className="font-medium">Used {items.length} {items.length === 1 ? "source" : "sources"}</span>
        <ChevronDown className="size-3.5 transition-transform group-data-[state=closed]:-rotate-90" />
      </SourcesTrigger>
      <SourcesContent className="mt-3 w-full gap-0">
        <ol className="relative space-y-2.5">
          {items.length > 1 ? <span aria-hidden="true" className="absolute top-5 bottom-5 left-[19px] w-px bg-line-strong" /> : null}
          {items.map((item) => (
            <ReportRow key={item.id} item={item} story={story} open={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)} />
          ))}
        </ol>
      </SourcesContent>
    </Collapsible>
  );
}

function ReportRow({ item, story, open, onToggle }: { item: ItemView; story: FeedStory; open: boolean; onToggle: () => void }) {
  const spans = [...new Set(story.card.facts.flatMap((f) => f.evidence.filter((e) => e.item === item.id).map((e) => e.span)))];
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-lg border border-line bg-[var(--raised)] px-3 py-2.5 text-left transition-colors hover:border-line-strong",
          open && "border-line-strong",
        )}
        style={{ boxShadow: "var(--top-light)" }}
      >
        <span className="grid size-[18px] place-items-center rounded-full bg-[var(--window)] ring-4 ring-[var(--window)]">
          <ReportMark item={item} size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[13px]">
            <span className="font-medium text-t1">{item.publisher}</span>
            <span className="truncate text-t4">{item.kind === "post" ? item.author : hostOf(item.url)}</span>
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-t3">{item.title}</span>
        </span>
        <KindChip kind={item.kind} />
        <span className="w-[86px] shrink-0 text-right text-[11.5px] tabular-nums text-t4">{when(item.published_at)}</span>
      </button>
      {open && spans.length ? <Quote item={item} spans={spans.slice(0, 2)} className="ml-8" /> : null}
    </li>
  );
}

function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cn("border-b border-line px-4 py-3.5", className)}>
      <p className="text-[11.5px] font-medium text-t4">{label}</p>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function StatusColumn({ pending }: { pending: number }) {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-l border-line bg-[var(--rail)]">
      <Tile label="Alerts on X">
        <p className="flex items-center gap-2 text-[13px] text-t2">
          <Dot tone="idle" /> Not connected
        </p>
        <AlertsButton full className="mt-2.5" />
      </Tile>
      <Tile label="Agent">
        <p className="flex items-center gap-2 text-[13px] font-medium text-t1">
          <Dot tone="ok" pulse /> <span className="text-[var(--ok)]">Live</span>
        </p>
        <p className="mt-1 text-[12px] text-t3">
          Watching {sites.length} sites and feeds, {accounts.length} X accounts
        </p>
      </Tile>
      <div className="grid grid-cols-2 border-b border-line">
        <section className="border-r border-line px-4 py-3.5">
          <p className="text-[11.5px] font-medium text-t4">Checking</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[18px] font-semibold tabular-nums text-t1">
            <StatusMark status={pending > 0 ? "running" : "done"} size={15} color="var(--caution)" doneColor="var(--ok)" strokeWidth={2} />
            {pending}
          </p>
        </section>
        <section className="px-4 py-3.5">
          <p className="text-[11.5px] font-medium text-t4">Failed</p>
          <p className="mt-1.5 flex items-center gap-2 text-[18px] font-semibold tabular-nums text-[var(--error)]">
            <Dot tone="error" /> {status.failed}
          </p>
        </section>
      </div>
      <Tile label="Free week">
        <p className="text-[13px] text-t1">
          <span className="font-semibold tabular-nums">{status.daysLeft}</span> days left
        </p>
        <div className="mt-2">
          <Segments total={status.trialDays} filled={status.daysLeft} />
        </div>
        <p className="mt-2 text-[12px] text-t3">Plans from $5 a month.</p>
      </Tile>
      <Tile label="Watched X posts">
        <p className="text-[13px] tabular-nums text-t1">
          {status.poolUsed} <span className="text-t3">of {status.poolLimit}</span>
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-line-strong" />
      </Tile>
      <Tile label="Published this week" className="border-b-0">
        <p className="text-[13px] text-t1">
          <span className="font-semibold tabular-nums">{weekTotal}</span> reports
        </p>
        <WeekBars week={week} height={44} className="mt-2.5" />
        <p className="mt-1.5 flex justify-between text-[10.5px] text-t4">
          <span>{week[0].label}</span>
          <span>{week[week.length - 1].label}</span>
        </p>
      </Tile>
    </aside>
  );
}
