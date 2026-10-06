import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DigestBlock } from "@/components/monitor/digest-block";
import { OneFeed } from "@/components/monitor/one-feed";
import { overlayGroups } from "@/components/monitor/one-sources";
import { SkippedList } from "@/components/monitor/skipped-list";
import { column, OneShell } from "@/components/one/shell";
import { SourcesOverlay } from "@/components/one/sources-overlay";
import {
  previewEmail,
  previewFeed,
  previewHandle,
  previewMonitor,
  previewSources,
  previewTitle,
} from "@/lib/local-preview/fixture";
import { monitorContent } from "@/lib/monitor/content";
import { PreviewNotice } from "./preview-notice";

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
    <OneShell
      email={previewEmail}
      monitor={previewMonitor()}
      skip={{ href: "#monitor-content", label: monitorContent.skipToNews }}
      className="ph-no-autocapture"
    >
      <main
        id="monitor-content"
        tabIndex={-1}
        className={`${column} relative flex-1 pt-7 pb-24 wrap-anywhere`}
      >
        <PreviewNotice />
        <OneFeed
          feed={feed}
          handle={previewHandle}
          view={view}
          storyId={story}
          owner
          title={monitorContent.title(previewHandle)}
        />
        <div className="mt-12 grid gap-8 desk:grid-cols-2">
          <SkippedList items={feed.skipped} />
          <DigestBlock items={feed.digests} github productHunt />
        </div>
        <SourcesOverlay groups={overlayGroups(previewSources)} />
      </main>
    </OneShell>
  );
}
