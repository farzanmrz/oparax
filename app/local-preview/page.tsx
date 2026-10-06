import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bubble } from "@/components/monitor/bubble";
import { DigestBlock } from "@/components/monitor/digest-block";
import { OneFeed } from "@/components/monitor/one-feed";
import { SkippedList } from "@/components/monitor/skipped-list";
import { Stage } from "@/components/one/stage";
import { previewFeed, previewHandle, previewTitle } from "@/lib/local-preview/fixture";
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
    <Stage className="ph-no-autocapture">
      <a
        href="#monitor-content"
        className="sr-only z-30 rounded-md bg-background p-3 text-primary focus:fixed focus:top-2 focus:left-4 focus:not-sr-only focus-visible:outline-2 focus-visible:outline-ring"
      >
        {monitorContent.skipToNews}
      </a>
      <main
        id="monitor-content"
        tabIndex={-1}
        className="relative mx-auto w-full max-w-[1800px] flex-1 px-4 pt-8 pb-24 wrap-anywhere desk:px-8"
      >
        <PreviewNotice />
        <OneFeed
          feed={feed}
          handle={previewHandle}
          view={view}
          storyId={story}
          title={monitorContent.yourFeed}
          banner={
            <p className="mt-3 text-[13px] text-t2">
              {monitorContent.dmLine}{" "}
              <Link
                href={`/${previewHandle}/notifications`}
                className="font-medium text-[var(--brand)] underline-offset-4 hover:underline"
              >
                {monitorContent.dmLink}
              </Link>
            </p>
          }
        />
        <div className="mt-12 grid gap-8 desk:grid-cols-2">
          <SkippedList items={feed.skipped} />
          <DigestBlock items={feed.digests} github productHunt />
        </div>
      </main>
      <Bubble handle={previewHandle} displayHandle={previewHandle} />
    </Stage>
  );
}
