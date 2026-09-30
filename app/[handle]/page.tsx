import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AccountsStrip } from "@/components/monitor/accounts-strip";
import { AgentHeader } from "@/components/monitor/agent-header";
import { BotButton } from "@/components/monitor/bot-button";
import { Building } from "@/components/monitor/building";
import { DigestBlock } from "@/components/monitor/digest-block";
import { Feed } from "@/components/monitor/feed";
import { RefreshWhileBuilding } from "@/components/monitor/refresh-while-building";
import { SkippedList } from "@/components/monitor/skipped-list";
import { SourcesList } from "@/components/monitor/sources-list";
import { StateBanner } from "@/components/monitor/state-banner";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { monitorContent as copy } from "@/lib/monitor/content";
import { readBuildLog, readFeed, readMonitor, readViewer } from "@/lib/monitor/read";
import { monitorState } from "@/lib/monitor-state";

type Props = {
  params: Promise<{ handle: string; story?: string }>;
  searchParams: Promise<{
    before?: string | string[];
    beforeId?: string | string[];
    view?: string | string[];
    error?: string | string[];
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
  const [feed, log] = await Promise.all([
    !building && !failed ? readFeed(monitor, { before, beforeId, view, storyId: story }) : null,
    building || failed ? readBuildLog(monitor.id) : [],
  ]);
  if (story && !feed?.storyFound) notFound();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#monitor-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-1 focus:left-4 focus:z-50 focus:bg-background focus:p-3"
      >
        {copy.skipToNews}
      </a>
      <SiteHeader signedIn={viewer.signedIn} />
      {isOwner ? <PostHogUserContext id={viewer.userId} /> : null}
      <main
        id="monitor-content"
        className="mx-auto w-[min(90%,1800px)] flex-1 space-y-6 py-8 wrap-anywhere"
      >
        <AgentHeader
          handle={monitor.display_handle}
          beat={monitor.beat}
          profile={monitor.profile}
          brief={monitor.brief}
          canEdit={isOwner}
        />
        <RefreshWhileBuilding building={building} />
        {building || failed ? (
          <Building
            monitorId={monitor.id}
            handle={monitor.display_handle}
            step={monitor.build_step}
            log={log}
            profile={monitor.profile}
            failed={failed}
            canRetry={isOwner}
            tries={monitor.build_tries}
          />
        ) : (
          <>
            <StateBanner monitor={monitor} state={state} isOwner={isOwner} />
            {isOwner && search.error === "activation" ? (
              <Alert variant="destructive">
                <AlertDescription>{copy.activationFailed}</AlertDescription>
              </Alert>
            ) : null}
            {isOwner ? (
              <BotButton
                monitorId={monitor.id}
                handle={monitor.display_handle}
                botState={monitor.bot_state}
                state={state.state}
              />
            ) : null}
            {feed ? (
              <div className="grid gap-8 desk:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">
                  <Feed feed={feed} handle={monitor.handle} view={view} storyId={story} />
                  <SkippedList items={feed.skipped} />
                </div>
                <aside className="min-w-0 space-y-8">
                  <SourcesList sources={feed.sources} />
                  <AccountsStrip accounts={feed.accounts} />
                  <DigestBlock
                    items={feed.digests}
                    github={monitor.digest_github}
                    productHunt={monitor.digest_product_hunt}
                  />
                </aside>
              </div>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
