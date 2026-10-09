import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ShellPlan } from "@/components/one/header";
import { KindChip } from "@/components/one/marks";
import { lift } from "@/components/one/stage";
import { monitorContent } from "@/lib/monitor/content";
import type { FeedStats, WeekDay } from "@/lib/monitor/present";
import { cn } from "@/lib/utils";

// The Deck's four tiles above the feed (design preview v2/deck/chrome.tsx Tile, marks.tsx WeekBars and Segments),
// with the product's own numbers only: a zero chip is left out, and a tile whose data does not exist is left out.

const copy = monitorContent.tiles;

export function Tile({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={label} className={cn(lift, "min-w-0 px-4 py-3.5", className)}>
      <p className="text-[12px] font-medium text-t3">{label}</p>
      {children}
    </section>
  );
}

/** Seven-day bars; the newest day in the brand blue, an empty day as a short hairline. */
export function WeekBars({ week, className }: { week: WeekDay[]; className?: string }) {
  const max = Math.max(1, ...week.map((d) => d.count));
  return (
    <div
      role="img"
      aria-label={week.map((d) => `${d.label}: ${d.count}`).join(", ")}
      className={cn("flex h-9 items-end gap-1.5", className)}
    >
      {week.map((d, i) => (
        <span key={d.day} className="flex h-full flex-1 flex-col justify-end">
          <span
            className={cn(
              "w-full rounded-[3px]",
              d.count === 0
                ? "h-[3px] bg-line-strong"
                : i === week.length - 1
                  ? "bg-[var(--brand)]"
                  : "bg-[var(--brand)]/45",
            )}
            style={d.count ? { height: `${(d.count / max) * 100}%` } : undefined}
          />
        </span>
      ))}
    </div>
  );
}

/** A segmented meter, one segment per day; the days left are filled. */
export function Segments({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: The segments are a fixed row of identical marks.
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            i < filled ? "bg-[var(--brand)]" : "bg-line-strong",
          )}
        />
      ))}
    </div>
  );
}

export function FeedTiles({
  stats,
  live,
  pending,
  failed,
  watching,
  plan,
}: {
  stats: FeedStats;
  /** The agent is watching (free week or paid), not stopped. */
  live: boolean;
  /** Items being checked against the sentence, and items that could not be processed. */
  pending: number;
  failed: number;
  watching: { sites: number; accounts: number };
  /** Null before the free week starts. */
  plan: ShellPlan | null;
}) {
  const { posts, articles, digests } = stats.kinds;
  const reports = posts + articles + digests;
  const first = stats.week[0];
  const last = stats.week[stats.week.length - 1];
  const watchLine = copy.watching(watching.sites, watching.accounts);
  return (
    <div className="grid gap-4 @min-[560px]:grid-cols-2 @min-[960px]:grid-cols-4">
      <Tile label={copy.stories}>
        <div className="mt-1.5 flex items-end justify-between gap-4">
          <span className="text-[28px] leading-none font-semibold text-t1 tabular-nums">
            {stats.stories}
          </span>
          <WeekBars week={stats.week} className="w-[120px]" />
        </div>
        <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-[11px] text-t3">
          <span>{copy.byDate}</span>
          <span>{copy.range(first.label, last.label)}</span>
        </p>
      </Tile>
      {reports ? (
        <Tile label={copy.reports}>
          <div className="mt-2.5 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            {[
              { n: posts, tone: "bg-[var(--kind-post)]" },
              { n: articles, tone: "bg-[var(--kind-article)]" },
              { n: digests, tone: "bg-[var(--kind-github)]/70" },
            ]
              .filter(({ n }) => n)
              .map(({ n, tone }) => (
                <span key={tone} className={cn("h-full", tone)} style={{ flexGrow: n }} />
              ))}
          </div>
          <p className="mt-3 flex flex-wrap gap-1.5">
            {posts ? <KindChip kind="post">{copy.posts(posts)}</KindChip> : null}
            {articles ? <KindChip kind="article">{copy.articles(articles)}</KindChip> : null}
            {digests ? <KindChip kind="github">{copy.digests(digests)}</KindChip> : null}
          </p>
        </Tile>
      ) : null}
      <Tile label={copy.agent}>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="inline-flex items-center gap-2 self-center text-[14px] font-medium">
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", live ? "bg-[var(--ok)]" : "border border-t3")}
            />
            <span className={live ? "text-[var(--ok)]" : "text-t2"}>
              {live ? copy.live : copy.stopped}
            </span>
          </span>
          {watchLine ? <span className="text-[12.5px] text-t3">{watchLine}</span> : null}
        </p>
        {pending || failed ? (
          <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-t2 tabular-nums">
            {pending ? (
              <span className="inline-flex items-center gap-1.5">
                <LoaderCircle
                  className="size-3.5 animate-spin text-[var(--caution)] motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {copy.checking(pending)}
              </span>
            ) : null}
            {failed ? (
              <span className="inline-flex items-center gap-1.5">
                <CircleAlert className="size-3.5 text-[var(--error)]" aria-hidden="true" />
                {copy.failed(failed)}
              </span>
            ) : null}
          </p>
        ) : null}
      </Tile>
      {plan ? (
        <Tile label={plan.name}>
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            {plan.daysLeft !== null ? (
              <p className="flex items-baseline gap-1.5">
                <span className="text-[22px] leading-none font-semibold text-t1 tabular-nums">
                  {plan.daysLeft}
                </span>
                <span className="text-[13px] text-t2">
                  {monitorContent.menu.daysLeft(plan.daysLeft)}
                </span>
              </p>
            ) : null}
            <p className="text-[12px] text-t3 tabular-nums">{copy.pool(plan.used, plan.limit)}</p>
          </div>
          {plan.daysLeft !== null ? (
            <div className="mt-3">
              <Segments total={plan.days} filled={plan.daysLeft} />
            </div>
          ) : null}
        </Tile>
      ) : null}
    </div>
  );
}

/** The amber row above the cards while items are being checked against the sentence. */
export function CheckingRow({ pending }: { pending: number }) {
  return (
    <div
      role="status"
      className="flex h-12 items-center gap-2.5 rounded-xl border border-dashed border-[var(--caution)]/45 bg-[var(--caution-soft)] px-4 text-[13px] text-t1"
    >
      <LoaderCircle
        className="size-4 animate-spin text-[var(--caution)] motion-reduce:animate-none"
        aria-hidden="true"
      />
      {copy.checkingRow(pending)}
    </div>
  );
}
