import Link from "next/link";
import { CalendarDays, Gauge, Inbox, ScanSearch } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { frame, Page } from "../frame";
import { PREVIEW_NOTE } from "../data/feed";
import { alerts as alertCopy, feedCopy } from "../copy";
import { hrefFor, storiesFor, viewHint, type FeedOptions } from "./model";
import { PlanBanner, viewIcon } from "./parts";
import { StoryRow } from "./story-row";

// The palette-comparison composition of the simple feed page (default; ?compose=old keeps parts.tsx).
// Rules from focus-review/theme-research/what-the-owner-sees.md 3.3 to 3.6 and the October 1 corrections:
// hue only as small single-job dots, selection by lightness, mono caps only for labels (palette-dependent),
// times and counts in dim sans with tabular numerals, the aside as label-over-value pairs on the canvas.

type Dot = "ok" | "caution" | "error" | "pending" | "hollow";

function StatusDot({ kind }: { kind: Dot }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-[7px] shrink-0 rounded-full",
        kind === "ok" && "bg-ok",
        kind === "caution" && "bg-caution",
        kind === "error" && "bg-error",
        kind === "pending" && "animate-pulse bg-t3",
        kind === "hollow" && "border border-t4",
      )}
    />
  );
}

/** Direct / Clustered: selected by a lighter fill (or a bright edge in slate), never by hue. */
function ViewSwitch({ base, options }: { base: string; options: FeedOptions }) {
  return (
    <nav aria-label="Feed view" className="flex rounded-[9px] border border-line p-0.5">
      {(["direct", "clustered"] as const).map((view) => {
        const Icon = viewIcon[view];
        const on = options.view === view;
        return (
          <Link
            key={view}
            href={hrefFor(base, options, { view, story: null })}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-t3 transition-colors hover:text-t1",
              on && "bg-[var(--seg-on-bg)] text-t1 shadow-[inset_0_0_0_1px_var(--seg-on-edge)]",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            <span className="sys-label">{feedCopy[view]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** One aside row: a small bordered icon tile, a dim label over a bright value, optional detail below. */
function Pair({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={label} className="flex gap-3">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-lg border border-line-strong bg-[var(--tile-bg)] text-t2"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 pt-px">
        <p className="sys-label text-t4">{label}</p>
        <div className="mt-1 text-sm text-t2">{children}</div>
      </div>
    </section>
  );
}

function AlertsPair({ state }: { state: FeedOptions["alerts"] }) {
  const connected = state === "active" || state === "paused";
  const value: Record<FeedOptions["alerts"], { dot: Dot; text: string }> = {
    none: { dot: "hollow", text: "Not connected" },
    active: { dot: "ok", text: alertCopy.active },
    paused: { dot: "hollow", text: alertCopy.paused },
    stopped: { dot: "hollow", text: alertCopy.stopped },
    error: { dot: "error", text: alertCopy.failed },
  };
  const v = value[state];
  return (
    <Pair icon={<XLogo className="size-3.5" />} label="Alerts on X">
      <p className="flex items-baseline gap-2">
        <StatusDot kind={v.dot} />
        <span>{v.text}</span>
      </p>
      {state === "active" ? <p className="mt-1 text-[13px] text-t3">{alertCopy.cadence}</p> : null}
      {connected ? null : (
        <>
          <button
            type="button"
            className="mt-3 inline-flex h-8 items-center gap-2 rounded-[var(--action-radius)] bg-primary px-3.5 text-[13px] font-medium text-primary-foreground shadow-[inset_0_0_0_1px_var(--action-edge)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <XLogo className="size-3" />
            {alertCopy.get}
          </button>
          <p className="mt-2.5 text-xs leading-relaxed text-t4">{alertCopy.explain}</p>
        </>
      )}
      <button type="button" className="mt-2 text-[13px] text-t3 underline-offset-4 hover:text-t1 hover:underline">
        {alertCopy.check}
      </button>
    </Pair>
  );
}

/** Pending and failed items, as a dot and a sentence instead of a tinted box above the stories. */
function StatusPair({ state }: { state: FeedOptions["state"] }) {
  if (state !== "checking" && state !== "failed-items") return null;
  return (
    <Pair icon={<ScanSearch className="size-4" strokeWidth={1.5} />} label="Status">
      <p className="flex items-baseline gap-2">
        <StatusDot kind={state === "checking" ? "pending" : "error"} />
        <span>{state === "checking" ? feedCopy.checking(2) : feedCopy.failedItems(1)}</span>
      </p>
      {state === "checking" ? (
        <p className="mt-1 text-[13px] text-t3">Each item is judged against your sentence before it becomes a story.</p>
      ) : null}
    </Pair>
  );
}

/** Free week and the watched-post meter: neutral, caution only near the limit, error only when used up. */
function FreeWeekPairs({ days = 7, limit = 300, poolOut = false }: { days?: number; limit?: number; poolOut?: boolean }) {
  const used = poolOut ? limit : 0;
  const share = used / limit;
  const fill = poolOut ? "bg-error" : share >= 0.8 ? "bg-caution" : "bg-t3";
  return (
    <>
      <Pair icon={<CalendarDays className="size-4" strokeWidth={1.5} />} label="Free week">
        <p className="tabular-nums">{days} days left</p>
        <p className="mt-0.5 text-[13px] text-t3">Plans from $5 a month.</p>
      </Pair>
      <Pair icon={<Gauge className="size-4" strokeWidth={1.5} />} label="Watched X posts">
        <p className="tabular-nums">
          {used} <span className="text-t3">of {limit}</span>
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line-strong" aria-hidden="true">
          <div className={cn("h-full rounded-full", fill)} style={{ width: `${Math.max(share * 100, 0)}%` }} />
        </div>
        {poolOut ? (
          <p className="mt-2 flex items-baseline gap-2 text-[13px] text-t3">
            <StatusDot kind="error" />
            {feedCopy.poolOut}
          </p>
        ) : null}
      </Pair>
    </>
  );
}

function Empty() {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-dashed border-line-strong px-6 py-10">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line-strong text-t3">
        <Inbox className="size-5" aria-hidden="true" strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-t1">{feedCopy.empty}</p>
        <p className="mt-1 text-sm text-t3">
          Your agent keeps checking your sites, feeds and X accounts. Stories that fit your sentence appear here.
        </p>
      </div>
    </div>
  );
}

function FeedBodyNew({ options, base }: { options: FeedOptions; base: string }) {
  const empty = options.state === "empty" || options.first;
  return (
    <>
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <h1 className="text-[28px] leading-tight tracking-[-0.022em] text-t1" style={{ fontWeight: "var(--heading-weight)" }}>
              {feedCopy.title}
            </h1>
            <ViewSwitch base={base} options={options} />
          </div>
          <p className="mt-1.5 text-[13px] text-t3">{viewHint[options.view]}</p>
        </div>
        {empty ? null : <p className="pb-0.5 text-xs text-t4">{PREVIEW_NOTE}</p>}
      </div>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_300px] gap-10">
        <div className="min-w-0 space-y-4">
          <PlanBanner plan={options.plan} />
          {empty ? (
            <Empty />
          ) : (
            <div className="feed-stack">
              {storiesFor(options).map((story) => (
                <StoryRow
                  key={story.id}
                  story={story}
                  highlighted={story.id === options.story}
                  openSources={story.id === options.story}
                />
              ))}
            </div>
          )}
        </div>
        {options.plan === "trial" ? (
          <aside className="space-y-6 pt-1">
            <AlertsPair state={options.alerts} />
            <StatusPair state={options.state} />
            <FreeWeekPairs poolOut={options.poolOut} />
          </aside>
        ) : null}
      </div>
    </>
  );
}

/** The simple feed page in the new composition; ready, exhausted and free-week-ended keep FeedPage. */
export function FeedPageNew({ options, base = "/next/feed/page" }: { options: FeedOptions; base?: string }) {
  return (
    <Page header="member">
      <div className={cn(frame, "py-8")}>
        <FeedBodyNew options={options} base={base} />
      </div>
    </Page>
  );
}
