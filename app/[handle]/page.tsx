import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AgentHeader } from "@/components/monitor/agent-header";
import { Building } from "@/components/monitor/building";
import { DigestBlock } from "@/components/monitor/digest-block";
import { FeedViews, OneFeed, OwnerFeed } from "@/components/monitor/one-feed";
import { RefreshWhileBuilding } from "@/components/monitor/refresh-while-building";
import { SkippedList } from "@/components/monitor/skipped-list";
import { StateBanner } from "@/components/monitor/state-banner";
import { OneRun } from "@/components/one/run";
import { column, OneShell } from "@/components/one/shell";
import { Stage } from "@/components/one/stage";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { monitorContent as copy } from "@/lib/monitor/content";
import { readBuildLog, readFeed, readMonitor, readSources, readViewer } from "@/lib/monitor/read";
import { monitorState } from "@/lib/monitor-state";
import { readRun } from "@/lib/onboarding/phases";
import { emptyOnboarding, readOnboarding } from "@/lib/onboarding/read";

type Props = {
  params: Promise<{ handle: string; story?: string }>;
  searchParams: Promise<{
    before?: string | string[];
    beforeId?: string | string[];
    view?: string | string[];
    source?: string | string[];
    error?: string | string[];
    built?: string | string[];
  }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { handle } = await params;
  const monitor = await readMonitor(handle);
  if (!monitor) return { title: copy.missing(handle) };
  return {
    title: copy.metadataTitle(monitor.profile?.name || monitor.display_handle),
    description: monitor.beat,
  };
}

export default async function MonitorPage({ params, searchParams }: Props) {
  const [{ handle, story }, search] = await Promise.all([params, searchParams]);
  if (story && !z.uuid().safeParse(story).success) notFound();
  const [monitor, viewer] = await Promise.all([readMonitor(handle), readViewer()]);
  if (!monitor) notFound();
  const isOwner = viewer.userId !== null && viewer.userId === monitor.user_id;
  const state = monitorState(monitor);
  const building = state.state === "building";
  const failed = state.state === "failed";
  const before = typeof search.before === "string" ? search.before : undefined;
  const beforeId = typeof search.beforeId === "string" ? search.beforeId : undefined;
  const view = typeof search.view === "string" ? search.view : undefined;
  const source = typeof search.source === "string" && !story ? search.source : null;
  // The owner watches the build on the One onboarding page, which ends in place once the build completes.
  const justBuilt =
    !story && search.built === "1" && !building && !failed && monitor.build_finished_at !== null;
  const onboarding = isOwner && (building || failed || justBuilt);
  const ready = !building && !failed && !onboarding;
  const [feed, log, run, sources] = await Promise.all([
    ready
      ? readFeed(monitor, { before, beforeId, view, storyId: story, source: source ?? undefined })
      : null,
    building || failed || onboarding ? readBuildLog(monitor.id) : [],
    onboarding ? readOnboarding(monitor.id) : null,
    ready && isOwner ? readSources(monitor) : null,
  ]);
  if (story && !feed?.storyFound) notFound();
  if (onboarding) {
    const shown = run ?? emptyOnboarding;
    return (
      <OneShell email={viewer.email} monitor={monitor}>
        <PostHogUserContext id={viewer.userId} />
        <RefreshWhileBuilding building={building} />
        <main
          id="monitor-content"
          tabIndex={-1}
          className={`${column} relative flex-1 pt-7 pb-24 wrap-anywhere`}
        >
          <OneRun
            monitorId={monitor.id}
            handle={monitor.handle}
            displayHandle={monitor.display_handle}
            beat={monitor.beat}
            view={readRun(log, shown, { failed, ready: justBuilt })}
            run={shown}
            failed={failed}
            ready={justBuilt}
            canRetry={monitor.build_tries < 2}
          />
        </main>
      </OneShell>
    );
  }
  const stopped =
    state.state === "frozen" || state.state === "lapsed" || state.state === "exhausted";
  const direct = !story && view === "articles";
  const content = (
    <>
      {isOwner ? <PostHogUserContext id={viewer.userId} /> : null}
      <main
        id="monitor-content"
        tabIndex={-1}
        className={
          isOwner
            ? `${column} relative flex-1 pt-7 pb-24 wrap-anywhere`
            : "relative mx-auto w-full max-w-[1800px] flex-1 px-4 pt-8 pb-24 wrap-anywhere desk:px-8"
        }
      >
        <RefreshWhileBuilding building={building} />
        {building || failed ? (
          <div className="space-y-6">
            <AgentHeader
              handle={monitor.display_handle}
              beat={monitor.beat}
              profile={monitor.profile}
              brief={monitor.brief}
            />
            <Building
              handle={monitor.display_handle}
              step={monitor.build_step}
              log={log}
              profile={monitor.profile}
              failed={failed}
            />
          </div>
        ) : feed && sources ? (
          <OwnerFeed
            feed={feed}
            sources={sources}
            handle={monitor.handle}
            view={view}
            storyId={story}
            source={source}
            digests={{ github: monitor.digest_github, productHunt: monitor.digest_product_hunt }}
            banner={
              search.error === "activation" || stopped ? (
                <div className="mb-6 space-y-4">
                  {search.error === "activation" ? (
                    <Alert variant="destructive">
                      <AlertDescription>{copy.activationFailed}</AlertDescription>
                    </Alert>
                  ) : null}
                  {stopped ? <StateBanner monitor={monitor} state={state} isOwner /> : null}
                </div>
              ) : null
            }
          />
        ) : feed ? (
          <section aria-labelledby="feed-title">
            <header className="flex min-h-9 flex-wrap items-center gap-x-5 gap-y-3">
              <h1
                id="feed-title"
                className="shrink-0 text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1"
              >
                {copy.title(monitor.display_handle)}
              </h1>
              <FeedViews handle={monitor.handle} direct={direct} source={source} />
            </header>
            <p className="mt-3 text-[13.5px] text-t3">
              {direct ? copy.directLine : copy.clusteredLine}
            </p>
            {stopped ? (
              <div className="mt-4">
                <StateBanner monitor={monitor} state={state} isOwner={false} />
              </div>
            ) : null}
            {feed.pending || feed.failed ? (
              <div role="status" className="mt-3 space-y-1 text-[12.5px] text-t3">
                {feed.pending ? <p>{copy.pendingItems(feed.pending)}</p> : null}
                {feed.failed ? <p>{copy.failedItems(feed.failed)}</p> : null}
              </div>
            ) : null}
            <div className="mt-6">
              <OneFeed
                feed={feed}
                handle={monitor.handle}
                direct={direct}
                storyId={story}
                source={source}
                empty={copy.noNews}
              />
            </div>
            <div className="mt-12 grid gap-8 desk:grid-cols-2">
              <SkippedList items={feed.skipped} />
              <DigestBlock
                items={feed.digests}
                github={monitor.digest_github}
                productHunt={monitor.digest_product_hunt}
              />
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
  const skip = { href: "#monitor-content", label: copy.skipToNews };
  if (isOwner)
    return (
      <OneShell email={viewer.email} monitor={monitor} skip={skip}>
        {content}
      </OneShell>
    );
  return (
    <Stage>
      <a
        href={skip.href}
        className="sr-only rounded-md focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-50 focus:bg-background focus:p-3 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {skip.label}
      </a>
      <SiteHeader signedIn={viewer.signedIn} />
      {content}
      <SiteFooter />
    </Stage>
  );
}
