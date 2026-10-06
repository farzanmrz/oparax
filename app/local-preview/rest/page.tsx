import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SetupForm } from "@/app/onboarding/setup-form";
import { SetupSample } from "@/app/onboarding/setup-sample";
import { SetupStage } from "@/app/onboarding/setup-stage";
import { previewEmail, previewTitle } from "@/lib/local-preview/fixture";
import { PreviewNotice } from "../preview-notice";

export const metadata: Metadata = {
  title: previewTitle,
  robots: { index: false, follow: false },
};

// The onboarding page at rest, before the person has a monitor.
export default function LocalPreviewRestPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <SetupStage email={previewEmail} aside={<SetupSample />}>
      <PreviewNotice />
      <SetupForm verifiedHandle={null} buildsOpen error={undefined} />
    </SetupStage>
  );
}
