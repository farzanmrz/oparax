import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { OneRun } from "@/components/one/run";
import { column, OneShell } from "@/components/one/shell";
import {
  previewBeat,
  previewBuildingMonitor,
  previewCheckpoints,
  previewEmail,
  previewHandle,
  previewMonitor,
  previewRun,
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
  const monitor = point.ready ? previewMonitor() : previewBuildingMonitor("building");
  return (
    <OneShell email={previewEmail} monitor={monitor}>
      <main
        id="monitor-content"
        tabIndex={-1}
        className={`${column} relative flex-1 pt-7 pb-24 wrap-anywhere`}
      >
        <PreviewNotice />
        <OneRun
          monitorId={monitor.id}
          handle={previewHandle}
          displayHandle={monitor.display_handle}
          beat={previewBeat}
          view={readRun(point.log, run, { failed: false, ready: point.ready })}
          run={run}
          failed={false}
          ready={point.ready}
          canRetry={false}
          preview
        />
      </main>
    </OneShell>
  );
}
