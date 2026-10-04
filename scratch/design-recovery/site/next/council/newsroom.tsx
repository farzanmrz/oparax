"use client";

import { Fragment, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowUpDown,
  BellRing,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Gauge,
  Layers,
  Newspaper,
  Rows3,
  Search,
  Settings,
} from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import type { FeedStory } from "../data/feed";
import { AlertsButton, Facts, Quote, TopBar, ViewSwitch } from "./chrome";
import {
  accounts,
  counts,
  digests,
  newest,
  sites,
  status,
  storiesFor,
  week,
  weekTotal,
  when,
  type View,
} from "./data";
import { Arrive, Checking, EASE, NewFlag, useArrival } from "./live";
import { Dot, GitHubMark, KindChip, KindTile, MarkStack, Segments, StepArea } from "./marks";

// Direction 2, Newsroom (agreed.md): Supabase dashboard logic (owner-1, owner-3, supabase-database-01,
// supabase-functions-05, supabase-ds-*). One full-width panel holds the feed as hairline rows under a mono
// uppercase header; a row opens in place to the story and its quoted evidence. Status tiles with icon tiles
// and a metric card computed from stored publication times sit on the right. Densest of the three.

const BASE = "/next/feed/newsroom";
const COLS = "grid-cols-[92px_minmax(0,1fr)_88px_150px_118px]";

export function NewsroomFeed({ view, theme, story }: { view: View; theme?: string; story?: string | null }) {
  const list = storiesFor(view);
  const { arrived, pending } = useArrival();
  const visible = arrived ? list : list.slice(1);
  const fallback = view === "clustered" ? "st-gpt61-sol" : "st-latent-sol";
  const [open, setOpen] = useState<string | null>(story && list.some((s) => s.id === story) ? story : fallback);

  return (
    <div className="palette-council flex min-h-svh flex-col">
      <TopBar title="Feed" />
      <div className="flex flex-1">
        <LeftNav view={view} />
        <main className="min-w-0 flex-1 px-8 pt-6 pb-12">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em] text-t1">Your Feed</h1>
              <p className="mt-1 text-[13.5px] text-t3">
                {view === "clustered"
                  ? "Reports about the same event, joined into one story. Newest first."
                  : "Each post or article on its own. Newest first."}
              </p>
            </div>
            <AlertsButton />
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <ViewSwitch base={BASE} view={view} theme={theme} />
            <label className="flex h-8 w-[240px] items-center gap-2 rounded-md border border-line bg-[var(--well)] px-2.5 text-[12.5px] text-t4">
              <Search className="size-3.5" />
              Search stories
            </label>
            <span className="mx-1 h-5 w-px bg-line" />
            <KindChip kind="post" count={counts.posts} />
            <KindChip kind="article" count={counts.articles} />
            <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[var(--kind-github-soft)] px-2 text-[11.5px] font-medium text-[var(--kind-github)]">
              <GitHubMark className="size-3" /> {counts.digests} digest
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-[12px] text-t3">
              <ArrowUpDown className="size-3" /> Newest report first
            </span>
          </div>

          <div className="mt-4 flex items-start gap-5">
            <section
              aria-label="Feed"
              className="min-w-0 flex-1 overflow-hidden rounded-xl border border-line-strong bg-[var(--window)]"
              style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
            >
              <div
                className={cn("grid h-10 items-center gap-4 border-b border-line px-4 font-mono text-[10.5px] tracking-[0.08em] text-t4", COLS)}
                style={{ background: "linear-gradient(180deg, var(--raised), var(--window))" }}
              >
                <span>KIND</span>
                <span>STORY</span>
                <span>REPORTS</span>
                <span>SOURCE</span>
                <span className="text-right">PUBLISHED</span>
              </div>
              <div className={cn("grid h-11 items-center gap-4 border-b border-line bg-[var(--caution-soft)]/50 px-4", COLS)}>
                <span className="font-mono text-[10.5px] tracking-[0.08em] text-[var(--caution)]">LIVE</span>
                <Checking pending={pending} compact className="col-span-3" />
                <span className="text-right font-mono text-[11px] text-t4">now</span>
              </div>
              <ul>
                <AnimatePresence initial={false}>
                  {visible.map((s, i) => (
                    <Arrive key={s.id} as="li" index={i} fresh={arrived && s.id === list[0].id} className="border-b border-line-soft last:border-b-0">
                      <TableRow
                        story={s}
                        open={open === s.id}
                        fresh={arrived && s.id === list[0].id}
                        onToggle={() => setOpen(open === s.id ? null : s.id)}
                      />
                    </Arrive>
                  ))}
                </AnimatePresence>
              </ul>
              <div className="flex h-10 items-center justify-between border-t border-line bg-[var(--raised)]/60 px-4 text-[12px] text-t3">
                <span>
                  {visible.length} {view === "clustered" ? "stories" : "reports"}. Watching {sites.length} sites and feeds and {accounts.length} X accounts.
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--error)]">
                  <Dot tone="error" /> {status.failed} FAILED
                </span>
              </div>
            </section>
            <Rail pending={pending} />
          </div>
        </main>
      </div>
    </div>
  );
}

function LeftNav({ view }: { view: View }) {
  const group = (label: string, rows: { icon: React.ReactNode; label: string; count?: number; on?: boolean }[]) => (
    <div className="mt-5 first:mt-0">
      <p className="px-3 pb-1.5 font-mono text-[10.5px] tracking-[0.1em] text-t4">{label}</p>
      {rows.map((r) => (
        <div
          key={r.label}
          className={cn(
            "flex h-8 items-center gap-2.5 rounded-md px-3 text-[13px] text-t2",
            r.on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
          )}
        >
          <span className={cn("text-t3", r.on && "text-[var(--brand)]")}>{r.icon}</span>
          {r.label}
          {r.count !== undefined ? <span className="ml-auto text-[11.5px] tabular-nums text-t4">{r.count}</span> : null}
        </div>
      ))}
    </div>
  );
  return (
    <nav aria-label="Agent" className="w-[208px] shrink-0 border-r border-line bg-[var(--rail)] px-2.5 py-5">
      {group("FEED", [
        { icon: <Layers className="size-4" />, label: "Stories", count: counts.clustered, on: view === "clustered" },
        { icon: <Rows3 className="size-4" />, label: "Articles and posts", count: counts.direct, on: view === "direct" },
        { icon: <GitHubMark className="size-4" />, label: "Daily digests", count: counts.digests },
      ])}
      {group("WATCHING", [
        { icon: <Newspaper className="size-4" />, label: "Sites and feeds", count: sites.length },
        { icon: <XLogo className="size-3.5" />, label: "X accounts", count: accounts.length },
      ])}
      {group("ACCOUNT", [
        { icon: <BellRing className="size-4" />, label: "Alerts" },
        { icon: <CreditCard className="size-4" />, label: "Billing" },
        { icon: <Settings className="size-4" />, label: "Settings" },
      ])}
    </nav>
  );
}

function TableRow({ story, open, fresh, onToggle }: { story: FeedStory; open: boolean; fresh: boolean; onToggle: () => void }) {
  const last = newest(story);
  const kinds = [...new Set(story.items.map((i) => i.kind))];
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "relative grid w-full items-center gap-4 px-4 py-2.5 text-left transition-colors hover:bg-raised",
          COLS,
          open && "bg-[var(--brand-soft)] hover:bg-[var(--brand-soft)]",
        )}
      >
        {open ? <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] bg-[var(--brand)]" /> : null}
        <span className="flex items-center gap-1.5">
          {kinds.map((k) => (
            <KindTile key={k} kind={k} size={22} />
          ))}
          <span className="text-[11.5px] text-t3">{kinds.length === 1 ? (kinds[0] === "post" ? "Post" : "Article") : "Mixed"}</span>
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className={cn("truncate text-[13.5px] font-medium", open ? "text-t1" : "text-t1/90")}>{story.card.headline}</span>
            {fresh ? <NewFlag /> : null}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-t3">{story.card.facts[0].text}</span>
        </span>
        <span>
          <span
            className={cn(
              "inline-flex h-[22px] items-center gap-1 rounded-md border px-1.5 text-[11.5px] tabular-nums",
              story.items.length > 1 ? "border-[var(--brand-line)] bg-[var(--brand-soft)] text-[var(--brand)]" : "border-line text-t3",
            )}
          >
            <Layers className="size-3" />
            {story.items.length} {story.items.length === 1 ? "report" : "reports"}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <MarkStack items={story.items} size={18} />
          <span className="truncate text-[12.5px] text-t2">{story.items.map((i) => i.publisher).join(", ")}</span>
        </span>
        <span className="flex items-center justify-end gap-1.5 font-mono text-[11.5px] whitespace-nowrap tabular-nums text-t3">
          {when(last.published_at)}
          <ChevronRight className={cn("size-3.5 text-t4 transition-transform", open && "rotate-90 text-[var(--brand)]")} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="open"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <Expanded story={story} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Expanded({ story }: { story: FeedStory }) {
  const items = [...story.items].sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  return (
    <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6 border-t border-line-soft bg-[var(--well)] py-4 pr-5 pl-[124px]">
      <div>
        <p className="font-mono text-[10.5px] tracking-[0.08em] text-t4">STORY</p>
        <h3 className="mt-1.5 text-[16px] leading-snug font-semibold text-t1">{story.card.headline}</h3>
        <Facts story={story} size="sm" className="mt-2.5" />
      </div>
      <div>
        <p className="font-mono text-[10.5px] tracking-[0.08em] text-t4">EVIDENCE</p>
        <div className="mt-1.5 space-y-2">
          {items.map((item) => (
            <Quote
              key={item.id}
              item={item}
              className="mt-0"
              spans={[...new Set(story.card.facts.flatMap((f) => f.evidence.filter((e) => e.item === item.id).map((e) => e.span)))].slice(0, 2)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusTile({
  icon,
  label,
  children,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  tone?: "ok" | "caution" | "error";
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-[var(--window)] p-2.5" style={{ boxShadow: "var(--top-light)" }}>
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-md border border-line bg-[var(--raised)] text-t2",
          tone === "ok" && "text-[var(--ok)]",
          tone === "caution" && "text-[var(--caution)]",
          tone === "error" && "text-[var(--error)]",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.08em] text-t4">{label}</p>
        <div className="mt-0.5 text-[13px] text-t1">{children}</div>
      </div>
    </div>
  );
}

function Rail({ pending }: { pending: number }) {
  return (
    <aside className="w-[300px] shrink-0 space-y-3">
      <div className="grid grid-cols-1 gap-2">
        <StatusTile
          tone="ok"
          label="AGENT"
          icon={
            <span className="grid grid-cols-3 gap-[3px]">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="size-[5px] rounded-full bg-[var(--ok)]" />
              ))}
            </span>
          }
        >
          <span className="text-[var(--ok)]">Live</span>
          <span className="text-t3">, watching {sites.length + accounts.length} sources</span>
        </StatusTile>
        <div className="grid grid-cols-2 gap-2">
          <StatusTile tone="caution" label="CHECKING" icon={<StatusMark status={pending > 0 ? "running" : "done"} size={18} color="var(--caution)" doneColor="var(--ok)" strokeWidth={2} />}>
            <span className="tabular-nums">{pending}</span> <span className="text-t3">{pending === 1 ? "item" : "items"}</span>
          </StatusTile>
          <StatusTile tone="error" label="FAILED" icon={<CircleAlert className="size-[18px]" />}>
            <span className="tabular-nums">{status.failed}</span> <span className="text-t3">item</span>
          </StatusTile>
        </div>
        <StatusTile label="ALERTS ON X" icon={<XLogo className="size-4" />}>
          <span className="flex items-center gap-2">
            <Dot tone="idle" /> Not connected
          </span>
        </StatusTile>
      </div>

      <section
        className="overflow-hidden rounded-xl border border-line-strong bg-[var(--window)]"
        style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
      >
        <div className="px-4 pt-3.5">
          <p className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] text-t4">
            <Activity className="size-3" /> REPORTS PUBLISHED
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-[26px] leading-none font-semibold tabular-nums text-t1">{weekTotal}</span>
            <span className="text-[12px] text-t3">in the last 7 days</span>
          </p>
        </div>
        <div className="relative mt-3 px-0">
          <div aria-hidden="true" className="absolute inset-0 opacity-70" style={{ backgroundImage: "var(--dot-grid)", backgroundSize: "10px 10px" }} />
          <StepArea values={week.map((d) => d.count)} height={64} className="relative" />
        </div>
        <div className="flex justify-between border-t border-line px-4 py-2 font-mono text-[10.5px] text-t4">
          <span>{week[0].label.toUpperCase()}</span>
          <span>BY PUBLICATION DATE</span>
          <span>{week[week.length - 1].label.toUpperCase()}</span>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-[var(--window)] p-4" style={{ boxShadow: "var(--top-light)" }}>
        <p className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] text-t4">
          <GitHubMark className="size-3" /> GITHUB DIGEST
        </p>
        {digests.map((d) => (
          <Fragment key={d.url}>
            <p className="mt-2 flex items-center gap-2 text-[13.5px] font-medium text-t1">
              <span className="grid size-6 place-items-center rounded-md bg-[var(--kind-github-soft)] text-[var(--kind-github)]">
                <GitHubMark className="size-3.5" />
              </span>
              {d.name}
            </p>
            <p className="mt-1.5 text-[12.5px] text-t2">{d.description}</p>
            <p className="mt-1 text-[12px] text-t3">{d.detail}</p>
            <p className="mt-2 font-mono text-[11px] text-t4">RELEASED {when(d.released_at).toUpperCase()}</p>
          </Fragment>
        ))}
      </section>

      <section className="rounded-xl border border-line bg-[var(--window)] p-4" style={{ boxShadow: "var(--top-light)" }}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] text-t4">
            <CalendarDays className="size-3" /> FREE WEEK
          </p>
          <span className="text-[12.5px] text-t1">
            <span className="font-semibold tabular-nums">{status.daysLeft}</span> days left
          </span>
        </div>
        <div className="mt-2.5">
          <Segments total={status.trialDays} filled={status.daysLeft} />
        </div>
        <div className="mt-3.5 flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] text-t4">
            <Gauge className="size-3" /> WATCHED X POSTS
          </p>
          <span className="text-[12.5px] tabular-nums text-t1">
            {status.poolUsed} <span className="text-t3">of {status.poolLimit}</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-line-strong" />
      </section>
    </aside>
  );
}
