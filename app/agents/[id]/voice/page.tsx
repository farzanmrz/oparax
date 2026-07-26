import { MicVocalIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { listVoiceRules } from "@/lib/voice/rules";
import { getExtractionProgress } from "./actions";
import type { AuditData } from "./audit-dialog";
import { ExtractionProgress } from "./extraction-progress";
import { RetryExtractionButton } from "./retry-extraction-button";
import { RulesEditor } from "./rules-editor";

// Mirrors app/agents/new/page.tsx's maxDuration (see its comment for the 800 rationale):
// this page's retryExtraction action awaits only the pre-flight gates (checkHandleShape,
// then runProfilePreflightGate) synchronously, then hands the billable phase to `after()`,
// same as the create flow — but that after() call still runs under this route's lifetime, so
// the function needs the same ceiling to survive a full extraction.
export const maxDuration = 800;

// The Reasoning block pulls in Streamdown (markdown rendering) — heavy, and only ever
// needed once a reporter opens the audit dialog. `next/dynamic` keeps it out of this
// route's initial JS.
const AuditDialog = dynamic(() => import("./audit-dialog"));
// Streamdown (markdown) is heavy — dynamic-load it so it's not in the route's initial JS.
const GuideMarkdown = dynamic(() => import("./guide-markdown"));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------------------------------------------ */
/* measured_facts parsing — `voice_guides.measured_facts` is a plain    */
/* string, the serialized output of `lib/voice/measuredFacts()`, not     */
/* JSON. Every field is pulled with its own regex and the whole parse    */
/* fails closed (null) if any line doesn't match the shape that function */
/* emits — a format drift degrades to "style facts unavailable" instead  */
/* of a crash or invented numbers.                                       */
/* ------------------------------------------------------------------ */

type MeasuredFacts = {
  readonly postCount: number;
  readonly length: {
    readonly median: number;
    readonly p10: number;
    readonly p90: number;
    readonly max: number;
    readonly over280: number;
  };
  readonly lineBreaks: { readonly none: number; readonly one: number; readonly twoPlus: number };
  readonly emoji: { readonly share: number; readonly inventory: string };
  readonly hashtags: { readonly share: number; readonly inventory: string };
  readonly mentions: number;
  readonly urls: number;
  readonly punctuation: {
    readonly exclaim: number;
    readonly question: number;
    readonly ellipsis: number;
    readonly emDash: number;
    readonly straightQuote: number;
    readonly curlyQuote: number;
    readonly colon: number;
  };
  readonly allCaps: number;
};

function parseMeasuredFacts(raw: string): MeasuredFacts | null {
  const countMatch = raw.match(/over all (\d+) corpus posts/);
  const length = raw.match(
    /length \(chars\): median (\d+), p10 (\d+), p90 (\d+), max (\d+); (\d+)\/\d+ posts over 280/,
  );
  const lineBreaks = raw.match(
    /line breaks: (\d+)\/\d+ posts have none, (\d+)\/\d+ exactly one, (\d+)\/\d+ two or more/,
  );
  const emoji = raw.match(/emoji: (\d+)\/\d+ posts contain any; full inventory: (.+)/);
  const hashtags = raw.match(
    /hashtags: (\d+)\/\d+ posts contain any; full inventory \(exact casing\): (.+)/,
  );
  const mentionsUrls = raw.match(/mentions \(@\): (\d+)\/\d+ posts; URLs: (\d+)\/\d+ posts/);
  const punctuation = raw.match(
    /posts containing: ! (\d+)\/\d+ · \? (\d+)\/\d+ · ellipsis (\d+)\/\d+ · em-dash (\d+)\/\d+ · straight " (\d+)\/\d+ · curly “” (\d+)\/\d+ · colon (\d+)\/\d+/,
  );
  const allCaps = raw.match(/ALL-CAPS words \(3\+ letters\): (\d+)\/\d+ posts/);

  if (
    !(
      countMatch &&
      length &&
      lineBreaks &&
      emoji &&
      hashtags &&
      mentionsUrls &&
      punctuation &&
      allCaps
    )
  ) {
    return null;
  }

  return {
    postCount: Number(countMatch[1]),
    length: {
      median: Number(length[1]),
      p10: Number(length[2]),
      p90: Number(length[3]),
      max: Number(length[4]),
      over280: Number(length[5]),
    },
    lineBreaks: {
      none: Number(lineBreaks[1]),
      one: Number(lineBreaks[2]),
      twoPlus: Number(lineBreaks[3]),
    },
    emoji: { share: Number(emoji[1]), inventory: emoji[2].trim() },
    hashtags: { share: Number(hashtags[1]), inventory: hashtags[2].trim() },
    mentions: Number(mentionsUrls[1]),
    urls: Number(mentionsUrls[2]),
    punctuation: {
      exclaim: Number(punctuation[1]),
      question: Number(punctuation[2]),
      ellipsis: Number(punctuation[3]),
      emDash: Number(punctuation[4]),
      straightQuote: Number(punctuation[5]),
      curlyQuote: Number(punctuation[6]),
      colon: Number(punctuation[7]),
    },
    allCaps: Number(allCaps[1]),
  };
}

/* ------------------------------------------------------------------ */
/* Presentation                                                        */
/* ------------------------------------------------------------------ */

function StatTile({
  label,
  value,
  detail,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm text-foreground">{value}</span>
      {detail ? <span className="font-mono text-xs text-muted-foreground">{detail}</span> : null}
    </div>
  );
}

function MeasuredFactsGrid({ facts }: { readonly facts: MeasuredFacts }) {
  const n = facts.postCount;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile
        detail={`p10 ${facts.length.p10} · p90 ${facts.length.p90} · max ${facts.length.max}`}
        label="Post length (median)"
        value={`${facts.length.median} chars`}
      />
      <StatTile label="Over 280 chars" value={`${facts.length.over280}/${n} posts`} />
      <StatTile
        detail={`${facts.lineBreaks.one}/${n} one · ${facts.lineBreaks.twoPlus}/${n} two+`}
        label="Line breaks"
        value={`${facts.lineBreaks.none}/${n} none`}
      />
      <StatTile label="ALL-CAPS words" value={`${facts.allCaps}/${n} posts`} />
      <StatTile
        detail={facts.emoji.inventory}
        label="Emoji"
        value={`${facts.emoji.share}/${n} posts`}
      />
      <StatTile
        detail={facts.hashtags.inventory}
        label="Hashtags"
        value={`${facts.hashtags.share}/${n} posts`}
      />
      <StatTile label="Mentions / URLs" value={`${facts.mentions}/${n} · ${facts.urls}/${n}`} />
      <StatTile
        detail={`ellipsis ${facts.punctuation.ellipsis}/${n} · em-dash ${facts.punctuation.emDash}/${n} · colon ${facts.punctuation.colon}/${n} · "${facts.punctuation.straightQuote}/${n} · “”${facts.punctuation.curlyQuote}/${n}`}
        label="Punctuation (! / ?)"
        value={`${facts.punctuation.exclaim}/${n} · ${facts.punctuation.question}/${n}`}
      />
    </div>
  );
}

function EmptyState({
  deskId,
  reporterHandle,
}: {
  readonly deskId: string;
  readonly reporterHandle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-4 py-16 text-center">
      <MicVocalIcon aria-hidden="true" className="size-6 text-muted-foreground" />
      <h3 className="text-sm font-semibold">No writing guide yet for @{reporterHandle}</h3>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">
        Extraction runs once a corpus source is connected.
      </p>
      <RetryExtractionButton deskId={deskId} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

/**
 * The Voice tab. The guide, its rules, and its extraction run all belong to THIS desk
 * (`experiment_id`), so every read here is scoped by the desk id already proven above.
 *
 * Two states:
 *   1. guide exists → the guide (`guide_deploy` as read-only audit prose) + the real
 *      `measured_facts` stat tiles + `RulesEditor` (the drafting input of record).
 *   2. no guide yet → if an extraction is in flight for this desk right now (an `after()` job
 *      that survives navigation), a live progress view (`ExtractionProgress`); otherwise the
 *      static empty state + a real retry action.
 */
export default async function VoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();

  const { data: desk, error: deskError } = await supabase
    .from("experiments")
    .select("reporter_handle")
    .eq("id", id)
    .maybeSingle();
  if (deskError) throw new Error("Failed to load the agent. Please try again.");
  if (!desk) notFound(); // RLS makes an absent id and another user's id indistinguishable

  const { reporter_handle: reporterHandle } = desk;

  const [{ data: guide, error: guideError }, rules] = await Promise.all([
    supabase
      .from("voice_guides")
      .select("guide_deploy, measured_facts, provenance")
      .eq("experiment_id", id)
      .maybeSingle(),
    listVoiceRules(id),
  ]);
  if (guideError) throw new Error("Failed to load the writing guide. Please try again.");

  let audit: AuditData | null = null;
  const modelCallId =
    guide?.provenance && typeof guide.provenance === "object" && "modelCallId" in guide.provenance
      ? (guide.provenance as { modelCallId: unknown }).modelCallId
      : null;
  if (typeof modelCallId === "string" && modelCallId) {
    const { data: call, error: callError } = await supabase
      .from("model_calls")
      .select("reasoning, cost_usd, created_at")
      .eq("id", modelCallId)
      .maybeSingle();
    if (callError) throw new Error("Failed to load the extraction record. Please try again.");
    if (call)
      audit = { reasoning: call.reasoning, costUsd: call.cost_usd, createdAt: call.created_at };
  }

  const facts = guide ? parseMeasuredFacts(guide.measured_facts) : null;

  // Only checked when there's no guide yet — a guide already existing means extraction is
  // done, so there's nothing in flight to poll for.
  const progress = guide ? null : await getExtractionProgress(id);
  const extractionInFlight = progress?.ok === true && progress.status === "running";

  return (
    <div className="flex flex-col gap-4 py-4">
      <PageHeading
        actions={guide ? <AuditDialog audit={audit} reporterHandle={reporterHandle} /> : null}
      >
        Writing guide
      </PageHeading>
      <Card>
        <CardContent className="flex flex-col gap-4">
          {guide ? (
            <>
              <GuideMarkdown content={guide.guide_deploy} />
              {facts ? (
                <MeasuredFactsGrid facts={facts} />
              ) : (
                <p className="text-sm text-muted-foreground">Style facts unavailable.</p>
              )}
              <RulesEditor deskId={id} rules={rules} />
            </>
          ) : extractionInFlight && progress.ok ? (
            <ExtractionProgress
              deskId={id}
              initialProgressNote={progress.progressNote}
              initialReasoningPartial={progress.reasoningPartial}
              initialStage={progress.stage}
              reporterHandle={reporterHandle}
            />
          ) : (
            <EmptyState deskId={id} reporterHandle={reporterHandle} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
