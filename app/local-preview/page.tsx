import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OwnerFeed } from "@/components/monitor/one-feed";
import { OneShell } from "@/components/one/shell";
import {
  previewAgent,
  previewEmail,
  previewFeed,
  previewHandle,
  previewSources,
  previewTitle,
} from "@/lib/local-preview/fixture";
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

  return (
    <OneShell
      email={previewEmail}
      agent={previewAgent}
      sources={previewSources}
      selected={source}
      direct={!story && view === "articles"}
      className="ph-no-autocapture wrap-anywhere"
    >
      <PreviewNotice />
      <OwnerFeed
        feed={feed}
        sources={previewSources}
        handle={previewHandle}
        view={view}
        storyId={story}
        source={source}
        digests={{ github: true, productHunt: true }}
      />
    </OneShell>
  );
}
