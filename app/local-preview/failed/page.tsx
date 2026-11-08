import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OneRun } from "@/components/one/run";
import { OneShell } from "@/components/one/shell";
import { RailProfile, Timeline } from "@/components/one/timeline";
import {
  previewAgent,
  previewBeat,
  previewEmail,
  previewFailed,
  previewHandle,
  previewMonitor,
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
  const view = readRun(previewFailed.log, run, { failed: true, ready: false });
  return (
    <OneShell
      email={previewEmail}
      agent={previewAgent}
      middle={
        <>
          <Timeline phases={view.phases} />
          {run.profile ? <RailProfile profile={run.profile} /> : null}
        </>
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
        failed
        ready={false}
        canRetry
        preview
      />
    </OneShell>
  );
}
