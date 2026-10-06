import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsFrame, SettingsView } from "@/app/[handle]/settings/settings-view";
import {
  previewEmail,
  previewHandle,
  previewMonitor,
  previewSettings,
  previewTitle,
} from "@/lib/local-preview/fixture";
import { PreviewNotice } from "../preview-notice";

export const metadata: Metadata = {
  title: previewTitle,
  robots: { index: false, follow: false },
};

export default function LocalPreviewSettingsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <SettingsFrame owner={{ email: previewEmail, monitor: previewMonitor() }}>
      <PreviewNotice className="mb-0" />
      <SettingsView handle={previewHandle} monitor={previewMonitor()} data={previewSettings} />
    </SettingsFrame>
  );
}
