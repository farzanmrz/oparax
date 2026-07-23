import { MicVocalIcon, PlusIcon, SparklesIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { AuditData } from "./audit-dialog";

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

/** A rule row this schema can't back yet (no rules table — the guide is one markdown
 *  document today) renders greyed instead of omitted: reserves the layout slot, tells the
 *  reporter why via `title`, and stays tab-reachable (no native `disabled`, so focus and
 *  the title tooltip both still work — a stock `Button` still gets its own
 *  `focus-visible` ring since that styling isn't gated on the `disabled` attribute). */
function GreyedAffordance({
  icon,
  label,
  reason,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly reason: string;
}) {
  return (
    <Button
      aria-disabled="true"
      className="cursor-not-allowed opacity-60"
      size="sm"
      title={reason}
      type="button"
      variant="outline"
    >
      {icon}
      {label}
    </Button>
  );
}

function SuggestedCard() {
  return (
    <div
      aria-disabled="true"
      className="flex flex-col gap-1 rounded-xl border border-dashed border-border p-4 opacity-60"
      title="Suggested rules need a posting-history feed the desk doesn't ingest yet — coming soon"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <SparklesIcon className="size-4" />
        Suggested from your posts
      </div>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}

function EmptyState({ reporterHandle }: { readonly reporterHandle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-16 text-center">
      <MicVocalIcon aria-hidden="true" className="size-6 text-muted-foreground" />
      <h3 className="text-sm font-semibold">No writing guide yet for @{reporterHandle}</h3>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">
        Extraction runs once a corpus source is connected.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

/**
 * The Voice tab — one card, the reporter's writing guide. `guide_deploy` renders as
 * read-only prose (per-rule Edit/Delete rows would imply a rules table this schema
 * doesn't have) alongside the real `measured_facts` stat tiles. The mock's editing
 * chrome that the data can't back yet (Add a rule, Suggested-from-your-posts) is
 * grey-scaffolded rather than omitted, reserving its layout slot. A guide miss renders a
 * designed empty state, distinct from route-level loading.
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
  if (deskError) throw new Error("Failed to load the desk. Please try again.");
  if (!desk) notFound(); // RLS makes an absent id and another user's id indistinguishable

  const reporterHandle = desk.reporter_handle;

  const { data: guide, error: guideError } = await supabase
    .from("voice_guides")
    .select("guide_deploy, measured_facts, provenance")
    .eq("reporter_handle", reporterHandle)
    .maybeSingle();
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

  return (
    <div className="py-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Writing guide</CardTitle>
          <div className="flex items-center gap-2">
            {guide ? <AuditDialog audit={audit} reporterHandle={reporterHandle} /> : null}
            <GreyedAffordance
              icon={<PlusIcon className="size-3.5" />}
              label="Add a rule"
              reason="Adding rules needs a rules table this schema doesn't have yet — coming soon"
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {guide ? (
            <>
              <GuideMarkdown content={guide.guide_deploy} />
              {facts ? (
                <MeasuredFactsGrid facts={facts} />
              ) : (
                <p className="text-sm text-muted-foreground">Style facts unavailable.</p>
              )}
              <SuggestedCard />
            </>
          ) : (
            <EmptyState reporterHandle={reporterHandle} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
