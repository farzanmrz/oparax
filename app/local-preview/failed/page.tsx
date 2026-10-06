import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OneRun } from "@/components/one/run";
import { column, OneShell } from "@/components/one/shell";
import { SourceTable } from "@/components/one/source-table";
import {
  previewBeat,
  previewBuildingMonitor,
  previewEmail,
  previewFailed,
  previewHandle,
  previewTitle,
} from "@/lib/local-preview/fixture";
import { readRun } from "@/lib/onboarding/phases";
import { toOnboarding } from "@/lib/onboarding/read";
import { PreviewNotice } from "../preview-notice";

export const metadata: Metadata = {
  title: previewTitle,
  robots: { index: false, follow: false },
};

// A run whose first try stopped, with its one retry left.
export default function LocalPreviewFailedPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const run = toOnboarding(previewFailed.state);
  const monitor = previewBuildingMonitor("failed");
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
          view={readRun(previewFailed.log, run, { failed: true, ready: false })}
          run={run}
          failed
          ready={false}
          canRetry
          table={<SourceTable />}
          preview
        />
      </main>
    </OneShell>
  );
}
