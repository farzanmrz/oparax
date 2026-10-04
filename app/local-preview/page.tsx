import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountsStrip } from "@/components/monitor/accounts-strip";
import { AgentHeader } from "@/components/monitor/agent-header";
import { Bubble } from "@/components/monitor/bubble";
import { DigestBlock } from "@/components/monitor/digest-block";
import { Feed } from "@/components/monitor/feed";
import { SkippedList } from "@/components/monitor/skipped-list";
import { SourcesList } from "@/components/monitor/sources-list";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  previewBeat,
  previewBrief,
  previewFeed,
  previewHandle,
  previewNotice,
  previewProfile,
  previewTitle,
} from "@/lib/local-preview/fixture";
import { monitorContent } from "@/lib/monitor/content";

export const metadata: Metadata = {
  title: previewTitle,
  robots: { index: false, follow: false },
};

export default async function LocalPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ story?: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const [{ story }, search] = await Promise.all([params, searchParams]);
  const feed = previewFeed(story);
  if (story && !feed.storyFound) notFound();
  const view = typeof search.view === "string" ? search.view : undefined;

  return (
    <div className="ph-no-autocapture flex min-h-dvh flex-col">
      <a
        href="#monitor-content"
        className="sr-only z-30 rounded-md bg-background p-3 text-primary focus:fixed focus:top-2 focus:left-4 focus:not-sr-only focus-visible:outline-2 focus-visible:outline-ring"
      >
        {monitorContent.skipToNews}
      </a>
      <main
        id="monitor-content"
        tabIndex={-1}
        className="mx-auto w-[min(90%,1800px)] flex-1 space-y-6 py-8 wrap-anywhere"
      >
        <Alert>
          <AlertDescription>{previewNotice}</AlertDescription>
        </Alert>
        <AgentHeader
          handle={previewHandle}
          beat={previewBeat}
          profile={previewProfile}
          brief={previewBrief}
        />
        <div className="grid gap-8 desk:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <Feed feed={feed} handle={previewHandle} view={view} storyId={story} />
            <SkippedList items={feed.skipped} />
          </div>
          <aside className="min-w-0 space-y-8">
            <SourcesList sources={feed.sources} />
            <AccountsStrip accounts={feed.accounts} />
            <DigestBlock items={feed.digests} github productHunt />
          </aside>
        </div>
      </main>
      <Bubble handle={previewHandle} displayHandle={previewHandle} />
    </div>
  );
}
