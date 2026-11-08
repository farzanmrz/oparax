import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageLine } from "@/components/one/app-shell";
import { OneShell } from "@/components/one/shell";
import { SourcesPage } from "@/components/one/sources-page";
import {
  previewAgent,
  previewEmail,
  previewHandle,
  previewSettings,
  previewSources,
  previewTitle,
} from "@/lib/local-preview/fixture";
import { monitorContent } from "@/lib/monitor/content";
import { PreviewNotice } from "../preview-notice";

export const metadata: Metadata = {
  title: previewTitle,
  robots: { index: false, follow: false },
};

// The owner's Sources page with the example agent's sources.
export default function LocalPreviewSourcesPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <OneShell email={previewEmail} agent={previewAgent} sources={previewSources}>
      <PreviewNotice />
      <PageLine title={monitorContent.sources} home={`/${previewHandle}`} />
      <SourcesPage
        handle={previewHandle}
        paid={false}
        sources={previewSettings.sources}
        accounts={previewSettings.accounts}
        repos={previewSettings.repos}
        poolLeft={258}
      />
    </OneShell>
  );
}
