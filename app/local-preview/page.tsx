import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OwnerFeed } from "@/components/monitor/one-feed";
import { column, OneShell, planOf } from "@/components/one/shell";
import {
  previewEmail,
  previewFeed,
  previewHandle,
  previewMonitor,
  previewSources,
  previewStats,
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
  searchParams: Promise<{ view?: string | string[]; source?: string | string[] }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const [{ story }, search] = await Promise.all([params, searchParams]);
  const source = typeof search.source === "string" && !story ? search.source : null;
  const feed = previewFeed(story, source);
  if (story && !feed.storyFound) notFound();
  const view = typeof search.view === "string" ? search.view : undefined;
  const monitor = previewMonitor();

  return (
    <OneShell
      email={previewEmail}
      monitor={monitor}
      skip={{ href: "#monitor-content", label: monitorContent.skipToNews }}
      className="ph-no-autocapture"
    >
      <main
        id="monitor-content"
        tabIndex={-1}
        className={`${column} relative flex-1 pt-7 pb-24 wrap-anywhere`}
      >
        <PreviewNotice />
        <OwnerFeed
          feed={feed}
          stats={previewStats()}
          sources={previewSources}
          handle={previewHandle}
          view={view}
          storyId={story}
          source={source}
          digests={{ github: true, productHunt: true }}
          live
          plan={planOf(monitor)}
        />
      </main>
    </OneShell>
  );
}
