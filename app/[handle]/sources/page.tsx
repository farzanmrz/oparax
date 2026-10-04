import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bubble } from "@/components/monitor/bubble";
import { OneSources } from "@/components/monitor/one-sources";
import { Stage } from "@/components/one/stage";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { monitorContent as copy } from "@/lib/monitor/content";
import { readMonitor, readSources, readViewer } from "@/lib/monitor/read";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const monitor = await readMonitor(handle);
  if (!monitor) return { title: copy.missing(handle) };
  return {
    title: `${copy.sources}: ${copy.metadataTitle(monitor.profile?.name || monitor.display_handle)}`,
  };
}

// The agent's sources, public like its feed: the owner sees it with the bubble, a visitor with the site header.
export default async function SourcesPage({ params }: Props) {
  const { handle } = await params;
  const [monitor, viewer] = await Promise.all([readMonitor(handle), readViewer()]);
  if (!monitor) notFound();
  const isOwner = viewer.userId !== null && viewer.userId === monitor.user_id;
  const data = await readSources(monitor);
  return (
    <Stage>
      {isOwner ? (
        <PostHogUserContext id={viewer.userId} />
      ) : (
        <SiteHeader signedIn={viewer.signedIn} />
      )}
      <main className="relative mx-auto w-full max-w-[1800px] flex-1 px-4 pt-8 pb-24 desk:px-8">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">
            {copy.sources}
          </h1>
          <p className="ml-auto text-[13.5px] text-t3">{copy.sourcesLine}</p>
        </header>
        <OneSources data={data} />
      </main>
      {isOwner ? (
        <Bubble handle={monitor.handle} displayHandle={monitor.display_handle} />
      ) : (
        <SiteFooter />
      )}
    </Stage>
  );
}
