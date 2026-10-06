import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OnboardingView } from "@/components/monitor/onboarding";
import {
  previewFailed,
  previewHandle,
  previewMonitor,
  previewTitle,
} from "@/lib/local-preview/fixture";
import { monitorContent as copy } from "@/lib/monitor/content";
import { toOnboarding } from "@/lib/onboarding/read";
import { PreviewNotice } from "../preview-notice";

export const metadata: Metadata = {
  title: previewTitle,
  robots: { index: false, follow: false },
};

// A run whose first try stopped, with its one retry left.
export default function LocalPreviewFailedPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const steps = copy.onboarding.steps;
  return (
    <main id="monitor-content" tabIndex={-1} className="wrap-anywhere">
      <PreviewNotice className="mb-0 rounded-none border-x-0 border-t-0" />
      <OnboardingView
        monitorId={previewMonitor().id}
        handle={previewHandle}
        step={previewFailed.step}
        log={previewFailed.log}
        failed
        ready={false}
        canRetry
        failure={copy.buildFailed(steps[previewFailed.step - 1], copy.buildReason)}
        onboarding={toOnboarding(previewFailed.state)}
        preview
      />
    </main>
  );
}
