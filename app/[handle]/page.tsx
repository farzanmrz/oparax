import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AgentHeader } from "@/components/monitor/agent-header";
import { Building } from "@/components/monitor/building";
import { DigestBlock } from "@/components/monitor/digest-block";
import { OnboardingView } from "@/components/monitor/onboarding";
import { OneFeed } from "@/components/monitor/one-feed";
import { RefreshWhileBuilding } from "@/components/monitor/refresh-while-building";
import { SkippedList } from "@/components/monitor/skipped-list";
import { StateBanner } from "@/components/monitor/state-banner";
import { column, OneShell } from "@/components/one/shell";
import { Stage } from "@/components/one/stage";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { monitorContent as copy } from "@/lib/monitor/content";
import { readBuildLog, readFeed, readMonitor, readViewer } from "@/lib/monitor/read";
import { monitorState } from "@/lib/monitor-state";
import { readOnboarding } from "@/lib/onboarding/read";

type Props = {
  params: Promise<{ handle: string; story?: string }>;
  searchParams: Promise<{
    before?: string | string[];
    beforeId?: string | string[];
    view?: string | string[];
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
  // The owner watches the build on the One onboarding page, which ends in place once the build completes.
  const justBuilt =
    !story && search.built === "1" && !building && !failed && monitor.build_finished_at !== null;
  const onboarding = isOwner && (building || failed || justBuilt);
  const [feed, log, run] = await Promise.all([
    !building && !failed && !onboarding
      ? readFeed(monitor, { before, beforeId, view, storyId: story })
      : null,
    building || failed || onboarding ? readBuildLog(monitor.id) : [],
    onboarding ? readOnboarding(monitor.id) : null,
  ]);
  if (story && !feed?.storyFound) notFound();
  if (onboarding) {
    const steps = copy.onboarding.steps;
    return (
      <OneShell email={viewer.email} monitor={monitor}>
        <PostHogUserContext id={viewer.userId} />
        <RefreshWhileBuilding building={building} />
        <main id="monitor-content" tabIndex={-1} className="wrap-anywhere">
          <OnboardingView
            monitorId={monitor.id}
            handle={monitor.display_handle}
            step={monitor.build_step}
            log={log}
            failed={failed}
            ready={justBuilt}
            canRetry={monitor.build_tries < 2}
            failure={copy.buildFailed(
              steps[Math.min(Math.max(monitor.build_step - 1, 0), steps.length - 1)],
              copy.buildReason,
            )}
            onboarding={run ?? { profile: null, posts: [], sources: [], brief: null }}
          />
        </main>
      </OneShell>
    );
  }
  const active = state.state === "trial" || state.state === "paid";
  const stopped =
    state.state === "frozen" || state.state === "lapsed" || state.state === "exhausted";
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
              monitorId={monitor.id}
              handle={monitor.display_handle}
              step={monitor.build_step}
              log={log}
              profile={monitor.profile}
              failed={failed}
              canRetry={isOwner}
              tries={monitor.build_tries}
            />
          </div>
        ) : feed ? (
          <>
            <OneFeed
              feed={feed}
              handle={monitor.handle}
              view={view}
              storyId={story}
              title={isOwner ? copy.yourFeed : copy.title(monitor.display_handle)}
              banner={
                <>
                  {isOwner && active && monitor.bot_state !== "active" ? (
                    <p className="mt-3 text-[13px] text-t2">
                      {copy.dmLine}{" "}
                      <Link
                        href={`/${monitor.handle}/notifications`}
                        className="rounded-sm font-medium text-[var(--brand)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {copy.dmLink}
                      </Link>
                    </p>
                  ) : null}
                  {isOwner && search.error === "activation" ? (
                    <Alert variant="destructive" className="mt-4">
                      <AlertDescription>{copy.activationFailed}</AlertDescription>
                    </Alert>
                  ) : null}
                  {stopped ? (
                    <div className="mt-4">
                      <StateBanner monitor={monitor} state={state} isOwner={isOwner} />
                    </div>
                  ) : null}
                </>
              }
            />
            <div className="mt-12 grid gap-8 desk:grid-cols-2">
              <SkippedList items={feed.skipped} />
              <DigestBlock
                items={feed.digests}
                github={monitor.digest_github}
                productHunt={monitor.digest_product_hunt}
              />
            </div>
          </>
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
