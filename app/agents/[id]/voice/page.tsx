import { FileTextIcon, MicVocalIcon, TriangleAlertIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { BandCard } from "@/components/band-card";
import { PageHeading } from "@/components/page-heading";
import { createClient } from "@/lib/supabase/server";
import { ExtractionProgress } from "./extraction-progress";
import { getOwnedExtractionProgress } from "./get-extraction-progress";
import { RetryExtractionButton } from "./retry-extraction-button";

export const maxDuration = 800;

const GuideMarkdown = dynamic(() => import("./guide-markdown"));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GuideSection = { title: string; content: string };

function splitGuideSections(guide: string): GuideSection[] {
  const sections: GuideSection[] = [];
  const preamble: string[] = [];
  let title: string | null = null;
  let content: string[] = [];

  for (const line of guide.split("\n")) {
    const heading = line.match(/^##\s+(.+)$/);
    if (!heading) {
      if (title) content.push(line);
      else preamble.push(line);
      continue;
    }

    if (title) sections.push({ title, content: content.join("\n").trim() });
    title = heading[1].trim();
    content = sections.length === 0 ? [...preamble] : [];
  }

  if (title) sections.push({ title, content: content.join("\n").trim() });
  if (sections.length) return sections;
  return [{ title: "Writing Guide", content: guide.trim() }];
}

function EmptyState({ deskId, reporterHandle }: { deskId: string; reporterHandle: string }) {
  return (
    <BandCard icon={<MicVocalIcon />} title="Writing Guide">
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <h3 className="text-sm font-semibold">No Writing Guide Yet for @{reporterHandle}</h3>
        <p className="max-w-sm text-pretty text-sm text-text-muted">
          Extraction runs once a corpus source is connected.
        </p>
        <RetryExtractionButton deskId={deskId} />
      </div>
    </BandCard>
  );
}

export default async function VoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const { data: desk, error: deskError } = await supabase
    .from("agents")
    .select("reporter_handle")
    .eq("id", id)
    .maybeSingle();
  if (deskError) throw new Error("Failed to load the agent. Please try again.");
  if (!desk) notFound();

  const { data: guide, error: guideError } = await supabase
    .from("voice_guides")
    .select("guide_deploy")
    .eq("agent_id", id)
    .maybeSingle();
  if (guideError) throw new Error("Failed to load the writing guide. Please try again.");

  const progress = await getOwnedExtractionProgress(id);
  const extractionInFlight = progress?.ok === true && progress.status === "running";
  const extractionFailed = progress?.ok === true && progress.status === "failed";
  const sections = guide ? splitGuideSections(guide.guide_deploy) : [];

  return (
    <div className="flex flex-col gap-4 py-4 desk:py-6">
      <PageHeading>Writing Guide (@{desk.reporter_handle})</PageHeading>
      {extractionInFlight && progress.ok ? (
        <BandCard icon={<MicVocalIcon />} title="Preparing Writing Guide">
          <ExtractionProgress
            deskId={id}
            initialCorpusPostCount={progress.corpusPostCount}
            initialProgressNote={progress.progressNote}
            initialReasoningByStage={progress.reasoningByStage}
            initialScopeExcludedCount={progress.scopeExcludedCount}
            initialStage={progress.stage}
            initialTextByStage={progress.textByStage}
            initialToolActivities={progress.toolActivities}
          />
        </BandCard>
      ) : (
        <>
          {extractionFailed ? (
            <BandCard icon={<TriangleAlertIcon />} title="Extraction Incomplete" variant="danger">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-sm text-text-body">
                  Extraction didn&apos;t finish preparing this desk&apos;s drafting rules. Retry to
                  complete the writing guide setup.
                </p>
                <RetryExtractionButton deskId={id} />
              </div>
            </BandCard>
          ) : null}
          {guide ? (
            <div className="[column-gap:16px] desk:[columns:2_440px]">
              {sections.map((section) => (
                <div className="mb-4 break-inside-avoid" key={section.title}>
                  <BandCard icon={<FileTextIcon />} title={section.title}>
                    <GuideMarkdown content={section.content} />
                  </BandCard>
                </div>
              ))}
            </div>
          ) : extractionFailed ? null : (
            <EmptyState deskId={id} reporterHandle={desk.reporter_handle} />
          )}
        </>
      )}
    </div>
  );
}
