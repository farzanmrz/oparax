"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Globe, Rss } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import type { FeedStory, ItemView } from "@/next/data/feed";
import { Facts } from "@/next/council/chrome";
import { clock, hostOf, status, when } from "@/next/council/data";
import { Checking, EASE, useArrival } from "@/next/council/live";
import { Dot, GitHubMark, KindChip, MarkStack, SiteIcon, XAvatar } from "@/next/council/marks";
import { accounts, clustered, feeds, repos, sourceTotal, websites } from "./data";

// The hero scene: the agent at work, drawn the way owner-5 draws Linear's intake (a live board, one lifted
// object floating over it). The board is the week's reports, one column per publication day, with the sources
// it watches in the first column; a status bar on top in Vercel's dot-and-word idiom. The lifted card is the
// story two of those reports became; their board cards carry the brand ring so the join reads without wires.
// On load the newest report replays its arrival once (labelled above the scene).

const reports: ItemView[] = clustered
  .filter((s) => s.items.every((i) => i.published_at.startsWith("2026")))
  .flatMap((s) => s.items)
  .sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
const days = [...new Set(reports.map((r) => r.published_at.slice(0, 10)))];
const featured: FeedStory = clustered.find((s) => s.id === "st-gpt61-sol")!;
const joined = new Set(featured.items.map((i) => i.id));
const newestId = reports[0].id;

export function HeroScene() {
  const { arrived, pending } = useArrival();
  return (
    <div className="relative h-[660px] overflow-hidden rounded-t-[18px] border border-b-0 border-line" style={{ background: "var(--scene-frame)" }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "var(--stage-light)" }} />

      {/* The board */}
      <div
        className="absolute top-8 right-8 left-8 bottom-0 overflow-hidden rounded-t-[14px] border border-b-0 border-line-strong bg-[var(--window)]"
        style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
      >
        <div className="flex h-11 items-center gap-6 border-b border-line px-5 text-[12.5px]">
          <span className="flex items-center gap-2 font-medium">
            <Dot tone="ok" pulse /> <span className="text-[var(--ok)]">Live</span>
            <span className="font-normal text-t3">watching {sourceTotal} sources</span>
          </span>
          <span className="h-4 w-px bg-line" />
          <span className="min-w-0">
            {pending > 0 ? <Checking pending={pending} compact /> : <span className="text-t3">Nothing waiting</span>}
          </span>
          <span className="ml-auto flex items-center gap-2 text-t3">
            <Dot tone="error" /> {status.failed} failed
          </span>
          <span className="flex items-center gap-2 text-t3">
            <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide text-[var(--caution)]">
              FREE WEEK
            </span>
            {status.daysLeft} days left
          </span>
        </div>
        <div className="grid h-full grid-cols-[220px_repeat(4,minmax(0,1fr))]">
          <WatchingColumn />
          {days.map((day) => {
            const items = reports.filter((r) => r.published_at.startsWith(day));
            const shown = items.filter((r) => arrived || r.id !== newestId);
            return (
              <section key={day} className="border-l border-line-soft px-3 pt-3">
                <p className="mb-2.5 flex items-center gap-2 px-1 text-[12px] font-medium text-t2">
                  {when(`${day}T00:00:00Z`, false)}
                  <span className="tabular-nums text-t4">{shown.length}</span>
                </p>
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {shown.map((r) => (
                      <ReportCard key={r.id} item={r} fresh={arrived && r.id === newestId} ring={joined.has(r.id)} />
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      {/* The story two reports became, lifted over the board */}
      <StoryCard />

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-36" style={{ background: "var(--fade-to-page)" }} />
    </div>
  );
}

function WatchingColumn() {
  const rows: { key: string; mark: React.ReactNode; name: string; kind: React.ReactNode }[] = [
    ...accounts.slice(0, 4).map((a) => ({
      key: a.id,
      mark: <XAvatar handle={a.handle} size={16} />,
      name: a.name,
      kind: <XLogo className="size-2.5 text-[var(--kind-post)]" />,
    })),
    ...feeds.slice(0, 4).map((s) => ({
      key: s.id,
      mark: <SiteIcon host={s.host} size={16} />,
      name: s.name,
      kind: <Rss className="size-3 text-[var(--kind-article)]" />,
    })),
    ...websites.map((s) => ({
      key: s.id,
      mark: <SiteIcon host={s.host} size={16} />,
      name: s.name,
      kind: <Globe className="size-3 text-[var(--kind-article)]" />,
    })),
    ...repos.map((r) => ({
      key: r.name,
      mark: <GitHubMark className="size-4 text-[var(--kind-github)]" />,
      name: r.name,
      kind: <GitHubMark className="size-3 text-t4" />,
    })),
  ];
  return (
    <section className="bg-[var(--rail)] px-2.5 pt-3">
      <p className="mb-2 px-1.5 text-[12px] font-medium text-t2">Watching</p>
      <ul>
        {rows.map((r) => (
          <li key={r.key} className="flex h-[30px] items-center gap-2.5 rounded-md px-1.5 text-[12.5px] text-t2">
            {r.mark}
            <span className="truncate">{r.name}</span>
            <span className="ml-auto">{r.kind}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReportCard({ item, fresh, ring }: { item: ItemView; fresh: boolean; ring: boolean }) {
  const reduce = useReducedMotion();
  const body = (
    <div
      className={cn(
        "rounded-lg border border-line bg-[var(--raised)] px-3 py-2.5",
        ring && "border-[var(--brand-line)] shadow-[0_0_0_3px_var(--brand-soft)]",
      )}
      style={ring ? undefined : { boxShadow: "var(--top-light)" }}
    >
      <p className="flex items-center gap-2 text-[11.5px] text-t3">
        <SiteIcon host={hostOf(item.url)} size={14} />
        <span className="truncate">{item.publisher}</span>
        {fresh ? (
          <span className="ml-auto rounded-full bg-[var(--brand)] px-1.5 text-[10.5px] font-semibold text-white">New</span>
        ) : (
          <span className="ml-auto tabular-nums text-t4">{clock(item.published_at)}</span>
        )}
      </p>
      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-t1">{item.title}</p>
      <KindChip kind={item.kind} className="mt-2 h-5 text-[11px]" />
    </div>
  );
  if (reduce) return <li>{body}</li>;
  return (
    <motion.li
      layout
      initial={fresh ? { opacity: 0, height: 0, y: -12 } : { opacity: 0, y: 8 }}
      animate={fresh ? { opacity: 1, height: "auto", y: 0 } : { opacity: 1, y: 0 }}
      transition={{ duration: fresh ? 0.5 : 0.36, ease: EASE }}
      className={fresh ? "overflow-hidden" : undefined}
    >
      {body}
    </motion.li>
  );
}

function StoryCard() {
  const reduce = useReducedMotion();
  const kinds = [...new Set(featured.items.map((i) => i.kind))];
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
      className="absolute top-[340px] right-[72px] z-10 w-[560px] overflow-hidden rounded-[14px] border border-line-strong bg-[var(--window)]"
      style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
    >
      <div className="flex gap-5 px-6 pt-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {kinds.map((k) => (
              <KindChip key={k} kind={k} count={featured.items.filter((i) => i.kind === k).length} />
            ))}
            <MarkStack items={featured.items} size={18} />
            <span className="truncate text-[12px] text-t3">{featured.items.map((i) => i.publisher).join(", ")}</span>
          </div>
          <h3 className="mt-3 text-[21px] leading-[1.25] font-semibold tracking-[-0.018em] text-t1">{featured.card.headline}</h3>
        </div>
        {featured.card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={featured.card.image} alt="" className="mt-1 h-[76px] w-[118px] shrink-0 rounded-lg object-cover shadow-[0_0_0_1px_var(--line-strong)]" />
        ) : null}
      </div>
      <Facts story={featured} max={3} size="sm" className="px-6 pt-4 pb-6" />
    </motion.article>
  );
}
