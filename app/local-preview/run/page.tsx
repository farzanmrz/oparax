import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { OnboardingView } from "@/components/monitor/onboarding";
import { OneShell } from "@/components/one/shell";
import {
  previewBuildingMonitor,
  previewCheckpoints,
  previewEmail,
  previewHandle,
  previewMonitor,
  previewRun,
  previewTitle,
} from "@/lib/local-preview/fixture";
import { toOnboarding } from "@/lib/onboarding/read";
import { PreviewNotice } from "../preview-notice";

export const metadata: Metadata = {
  title: previewTitle,
  robots: { index: false, follow: false },
};

// The onboarding run frozen at one checkpoint: /local-preview/run?at=profile|posts|jev|chosen|done.
export default async function LocalPreviewRunPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string | string[] }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { at } = await searchParams;
  const run = previewRun[z.enum(previewCheckpoints).catch("profile").parse(at)];
  return (
    <OneShell
      email={previewEmail}
      monitor={run.ready ? previewMonitor() : previewBuildingMonitor("building")}
    >
      <main id="monitor-content" tabIndex={-1} className="wrap-anywhere">
        <PreviewNotice className="mb-0 rounded-none border-x-0 border-t-0" />
        <OnboardingView
          monitorId={previewMonitor().id}
          handle={previewHandle}
          step={run.step}
          log={run.log}
          failed={false}
          ready={run.ready}
          canRetry={false}
          failure=""
          onboarding={toOnboarding(run.state)}
          preview
        />
      </main>
    </OneShell>
  );
}
