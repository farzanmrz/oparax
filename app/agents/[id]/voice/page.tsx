import type { LucideIcon } from "lucide-react";
import {
  AlignLeftIcon,
  BlocksIcon,
  CompassIcon,
  FingerprintIcon,
  GitBranchIcon,
  ListTreeIcon,
  MessageSquareQuoteIcon,
  PenLineIcon,
  QuoteIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  WorkflowIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { BandCard } from "@/components/band-card";
import { PageHeading } from "@/components/page-heading";
import { createClient } from "@/lib/supabase/server";
import { SetupProgressCard } from "../setup-progress-card";
import { getOwnedExtractionProgress } from "./get-extraction-progress";
import { RetryExtractionButton } from "./retry-extraction-button";

export const maxDuration = 800;

const GuideMarkdown = dynamic(() => import("./guide-markdown"));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GuideSection = { title: string; content: string };
type GuideCard =
  | { type: "section"; title: string; content: string; icon: LucideIcon }
  | { type: "rules"; always: string | null; never: string | null };

const SECTION_ICONS: Record<string, LucideIcon> = {
  "Beat & Scope": CompassIcon,
  "Identity & Register": FingerprintIcon,
  Formatting: AlignLeftIcon,
  "Vocabulary & Phrasing": MessageSquareQuoteIcon,
  "Post Modes": WorkflowIcon,
  "Repeating Sub-Units": ListTreeIcon,
  "Block Skeleton": BlocksIcon,
  "Post Relationships": GitBranchIcon,
  "Representative Posts": QuoteIcon,
};

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

function toGuideCards(sections: GuideSection[]): GuideCard[] {
  const cards: GuideCard[] = [];
  const always = sections.find((section) => section.title === "Hard Rules — Always")?.content;
  const never = sections.find((section) => section.title === "Hard Rules — Never")?.content;
  let insertedRules = false;

  for (const section of sections) {
    if (section.title === "Hard Rules — Always" || section.title === "Hard Rules — Never") {
      if (!insertedRules) {
        cards.push({ type: "rules", always: always || null, never: never || null });
        insertedRules = true;
      }
      continue;
    }

    cards.push({
      type: "section",
      title: section.title,
      content: section.content,
      icon: SECTION_ICONS[section.title] ?? PenLineIcon,
    });
  }

  return cards;
}

function EmptyState({ deskId, reporterHandle }: { deskId: string; reporterHandle: string }) {
  return (
    <BandCard icon={<PenLineIcon />} title="Guide">
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <h3 className="text-sm font-semibold">No Guide Yet for @{reporterHandle}</h3>
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
  const cards = toGuideCards(sections);

  return (
    <div className="flex flex-col gap-[var(--page-rhythm-mobile)] py-[var(--page-rhythm-mobile)] desk:gap-[var(--page-rhythm-web)] desk:py-[var(--page-rhythm-web)]">
      <PageHeading icon={<PenLineIcon />}>Guide (@{desk.reporter_handle})</PageHeading>
      {extractionInFlight && progress.ok ? (
        <SetupProgressCard
          deskId={id}
          initial={{
            stage: progress.stage,
            status: progress.status,
            errorCode: progress.errorCode,
            corpusPostCount: progress.corpusPostCount,
            scopeExcludedCount: progress.scopeExcludedCount,
          }}
        />
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
            <div className="[column-gap:var(--page-rhythm-mobile)] desk:[column-gap:var(--page-rhythm-web)] desk:[columns:2_440px]">
              {cards.map((card, index) => (
                <div
                  className="mb-[var(--page-rhythm-mobile)] break-inside-avoid desk:mb-[var(--page-rhythm-web)]"
                  key={card.type === "rules" ? "rules" : card.title}
                >
                  {card.type === "rules" ? (
                    <BandCard icon={<ShieldCheckIcon />} title="Rules">
                      <div className="space-y-5">
                        {card.always ? (
                          <section aria-labelledby={`rules-do-${index}`}>
                            <h3
                              className="mb-2 text-sm font-semibold text-text-body"
                              id={`rules-do-${index}`}
                            >
                              Do
                            </h3>
                            <GuideMarkdown content={card.always} />
                          </section>
                        ) : null}
                        {card.never ? (
                          <section aria-labelledby={`rules-avoid-${index}`}>
                            <h3
                              className="mb-2 text-sm font-semibold text-text-body"
                              id={`rules-avoid-${index}`}
                            >
                              Avoid
                            </h3>
                            <GuideMarkdown content={card.never} />
                          </section>
                        ) : null}
                      </div>
                    </BandCard>
                  ) : (
                    <BandCard icon={<card.icon />} title={card.title}>
                      <GuideMarkdown content={card.content} />
                    </BandCard>
                  )}
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
