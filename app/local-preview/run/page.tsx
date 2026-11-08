import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { OneRun } from "@/components/one/run";
import { OneShell } from "@/components/one/shell";
import { RailProfile, Timeline } from "@/components/one/timeline";
import {
  previewAgent,
  previewBeat,
  previewCheckpoints,
  previewEmail,
  previewHandle,
  previewMonitor,
  previewRun,
  previewSources,
  previewTitle,
} from "@/lib/local-preview/fixture";
import { readRun } from "@/lib/onboarding/phases";
import { toOnboarding } from "@/lib/onboarding/read";
import { PreviewNotice } from "../preview-notice";

export const metadata: Metadata = {
  title: previewTitle,
  robots: { index: false, follow: false },
};

// The onboarding run frozen at one checkpoint: /local-preview/run?at=profile|posts|scoring|jev|chosen|done.
export default async function LocalPreviewRunPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string | string[] }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { at } = await searchParams;
  const point = previewRun[z.enum(previewCheckpoints).catch("profile").parse(at)];
  const run = toOnboarding(point.state);
  const view = readRun(point.log, run, { failed: false, ready: point.ready });
  return (
    <OneShell
      email={previewEmail}
      agent={previewAgent}
      sources={point.ready ? previewSources : null}
      middle={
        point.ready ? undefined : (
          <>
            <Timeline phases={view.phases} />
            {run.profile ? <RailProfile profile={run.profile} /> : null}
          </>
        )
      }
      className="wrap-anywhere"
    >
      <PreviewNotice />
      <OneRun
        monitorId={previewMonitor().id}
        handle={previewHandle}
        beat={previewBeat}
        view={view}
        run={run}
        failed={false}
        ready={point.ready}
        canRetry={false}
        preview
      />
    </OneShell>
  );
}
