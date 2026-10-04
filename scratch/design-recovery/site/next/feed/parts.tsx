import Link from "next/link";
import { CircleAlert, Inbox, Info, Layers, Rows3 } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import StatusMark from "@/components/react-bits/StatusMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PREVIEW_NOTE } from "../data/feed";
import { alerts as alertCopy, feedCopy, planStates } from "../copy";
import { StoryCard } from "../story-card";
import { PlanCards } from "../plans";
import { hrefFor, storiesFor, viewHint, type FeedOptions, type View } from "./model";

export const viewIcon: Record<View, typeof Rows3> = { direct: Rows3, clustered: Layers };

/** Direct/Clustered beside the feed title (simple page arrangement). Links, so each view has a URL. */
export function ViewSwitch({ base, options }: { base: string; options: FeedOptions }) {
  return (
    <nav aria-label="Feed view" className="flex rounded-lg border border-border bg-secondary p-1">
      {(["direct", "clustered"] as const).map((view) => {
        const Icon = viewIcon[view];
        const on = options.view === view;
        return (
          <Link
            key={view}
            href={hrefFor(base, options, { view, story: null })}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
              on && "bg-card text-foreground shadow-[0_1px_2px_rgb(9_15_29/0.15)]",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {feedCopy[view]}
          </Link>
        );
      })}
    </nav>
  );
}

export function FeedTitle({ options, children }: { options: FeedOptions; children?: React.ReactNode }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{feedCopy.title}</h1>
        {children}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{viewHint[options.view]}</p>
    </div>
  );
}

/** Alert activation (owner only, free week or paid). Copy from components/monitor/bot-button.tsx. */
export function AlertsCard({ state }: { state: FeedOptions["alerts"] }) {
  const connected = state === "active" || state === "paused";
  const status = state === "active" || state === "paused" || state === "stopped" ? state : null;
  return (
    <section aria-labelledby="alerts-title" className="rounded-xl border border-border bg-card p-5">
      <h2 id="alerts-title" className="flex items-center gap-2 text-sm font-semibold">
        <XLogo className="size-3.5" />
        Alerts on X
      </h2>
      {status ? (
        <p className="mt-3 flex items-start gap-2 text-sm">
          <span
            aria-hidden="true"
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              status === "active" ? "bg-foreground" : "border border-muted-foreground",
            )}
          />
          {alertCopy[status]}
        </p>
      ) : null}
      {state === "active" ? <p className="mt-1.5 pl-4 text-sm text-muted-foreground">{alertCopy.cadence}</p> : null}
      {connected ? null : (
        <>
          <Button className="mt-4 h-10 w-full text-sm">
            <XLogo className="size-3.5" />
            {alertCopy.get}
          </Button>
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{alertCopy.explain}</p>
          {state === "error" ? (
            <p role="alert" className="mt-2.5 flex items-start gap-1.5 text-sm text-destructive">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {alertCopy.failed}
            </p>
          ) : null}
        </>
      )}
      <Button variant="outline" className="mt-4 h-9 w-full text-sm">
        {alertCopy.check}
      </Button>
    </section>
  );
}

/** Free-week lines from components/monitor/state-banner.tsx; values are the just-built state (10.6a).
 * ?pool=out shows the real pool-paused line with the pool full; days stay at the fixture value. */
export function FreeWeekCard({ days = 7, limit = 300, poolOut = false }: { days?: number; limit?: number; poolOut?: boolean }) {
  const used = poolOut ? limit : 0;
  return (
    <section aria-label="Free week" className="rounded-xl border border-border bg-card p-5 text-sm">
      <p>{feedCopy.trial(days)}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-muted-foreground/70" style={{ width: `${(used / limit) * 100}%` }} />
      </div>
      <p className="mt-2 text-muted-foreground">{feedCopy.pool(used, limit)}</p>
      {poolOut ? <p className="mt-2">{feedCopy.poolOut}</p> : null}
    </section>
  );
}

export function PlanBanner({ plan }: { plan: FeedOptions["plan"] }) {
  if (plan === "trial") return null;
  // State banners: neutral surface, one small blue icon (round 1 change 24).
  if (plan === "exhausted")
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 px-5 py-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        {planStates.exhausted}
      </div>
    );
  return (
    <section aria-labelledby="frozen-title" className="rounded-xl border border-border bg-muted/50 p-5">
      <h2 id="frozen-title" className="flex items-center gap-2 font-semibold">
        <Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
        {planStates.frozenTitle}
      </h2>
      <p className="mt-1 pl-6 text-sm text-muted-foreground">{planStates.frozenBody}</p>
      <PlanCards className="mt-4" />
    </section>
  );
}

/** Status lines above the stories, as components/monitor/feed.tsx places them; the stories stay underneath. */
function FeedStatus({ state }: { state: FeedOptions["state"] }) {
  if (state === "checking")
    return (
      <div role="status" className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="flex items-center gap-2.5 text-sm font-medium">
          <StatusMark status="running" size={18} color="var(--color-muted-foreground)" />
          {feedCopy.checking(2)}
        </p>
        <p className="mt-1 pl-7 text-sm text-muted-foreground">
          Each item is judged against your sentence before it becomes a story.
        </p>
      </div>
    );
  if (state === "failed-items")
    return (
      <p role="status" className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-card px-4 py-3 text-sm">
        <CircleAlert className="size-4 shrink-0 text-destructive" aria-hidden="true" />
        {feedCopy.failedItems(1)}
      </p>
    );
  return null;
}

export function FeedList({ options }: { options: FeedOptions }) {
  if (options.state === "empty" || options.first)
    return (
      <div className="flex items-start gap-4 rounded-xl border border-dashed border-border px-6 py-10">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Inbox className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-medium">{feedCopy.empty}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your agent keeps checking your sites, feeds and X accounts. Stories that fit your sentence appear here.
          </p>
        </div>
      </div>
    );
  return (
    <div className="space-y-4">
      <FeedStatus state={options.state} />
      {storiesFor(options).map((story) => (
        <StoryCard
          key={story.id}
          story={story}
          highlighted={story.id === options.story}
          openSources={story.id === options.story}
        />
      ))}
    </div>
  );
}

export function PreviewNote() {
  return <p className="text-xs text-muted-foreground">{PREVIEW_NOTE}</p>;
}

/** Everything right of the feed: identical in both arrangements, so only navigation differs. */
export function FeedAside({ options }: { options: FeedOptions }) {
  if (options.plan !== "trial") return null;
  return (
    <aside className="space-y-4">
      <AlertsCard state={options.alerts} />
      <FreeWeekCard poolOut={options.poolOut} />
    </aside>
  );
}
