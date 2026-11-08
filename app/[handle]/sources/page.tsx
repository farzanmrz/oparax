import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OneSources } from "@/components/monitor/one-sources";
import { SourcesPage } from "@/components/one/sources-page";
import { Stage } from "@/components/one/stage";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { monitorContent as copy } from "@/lib/monitor/content";
import { readMonitor, readSources, readViewer } from "@/lib/monitor/read";
import { monitorState } from "@/lib/monitor-state";
import { Elsewhere, OwnerPage, readOwnerPage } from "../owner-page";

type Props = { params: Promise<{ handle: string }> };

export const runtime = "nodejs";
export const maxDuration = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const monitor = await readMonitor(handle);
  if (!monitor) return { title: copy.missing(handle) };
  return {
    title: `${copy.sources}: ${copy.metadataTitle(monitor.profile?.name || monitor.display_handle)}`,
  };
}

// The agent's sources. The owner manages them here (owner, Oct 10: Sources is one of the three pages beside the
// feed); a visitor reads the list under the site header.
export default async function SourcesRoute({ params }: Props) {
  const { handle } = await params;
  const [monitor, viewer] = await Promise.all([readMonitor(handle), readViewer()]);
  if (!monitor) notFound();
  if (viewer.userId !== null && viewer.userId === monitor.user_id) {
    const { owned } = await readOwnerPage(monitor.handle, "sources");
    if (!owned.ok) return <Elsewhere title={copy.sources} />;
    const state = monitorState(owned.monitor);
    return (
      <OwnerPage owned={owned} title={copy.sources}>
        <SourcesPage
          handle={owned.monitor.handle}
          paid={state.state === "paid"}
          sources={owned.data.sources}
          accounts={owned.data.accounts}
          repos={owned.data.repos}
          poolLeft={Math.max(0, owned.monitor.pool_limit - owned.monitor.pool_used)}
        />
      </OwnerPage>
    );
  }
  const data = await readSources(monitor);
  return (
    <Stage>
      <SiteHeader signedIn={viewer.signedIn} />
      <main className="relative mx-auto w-full max-w-[1800px] flex-1 px-4 pt-8 pb-24 desk:px-8">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">
            {copy.sources}
          </h1>
          <p className="ml-auto text-[13.5px] text-t3">{copy.sourcesLine}</p>
        </header>
        <OneSources data={data} />
      </main>
      <SiteFooter />
    </Stage>
  );
}
