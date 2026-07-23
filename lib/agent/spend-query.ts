// lib/agent/spend-query.ts
//
// Setup tab's Spend rollup. Aggregates `model_calls` GROUPED BY `stage` — never
// `usage_events.kind` — because `draft-pipeline.ts` stamps every drafting-family call AND
// the judge call under the SAME `usage_events.kind === "drafting"` (see its
// `deliverDraft`/`draftForExperiment` `stampUsageEvent` calls); a kind-based split can't
// tell drafting from judging apart and would silently render $0.00 for Judging.
// `model_calls.stage` is where they're actually distinct — verified against the real
// writers: `draft-council-run.ts`'s `CouncilCall.stage` is typed `"drafting" | "judge"`
// (drafts, repairs, and revisions all stamp `"drafting"`; only the judge call stamps
// `"judge"`), and `scripts/extract-voice-guide.ts` stamps `"voice_extraction"`. Those three
// literal strings are the entire live write surface today — no remapping needed, just an
// explicit `stage IN (...)` filter so a future stage (e.g. a `"scan"` stage, mentioned as a
// placeholder in the `model_calls` migration's column comment but never written) can't leak
// into this rollup unbucketed.
//
// Delivery counts (Slack/email) DO come from `usage_events` — `"slack_notification"` /
// `"email_notification"` rows are stamped there with `cost_usd: null` (Slack/email sends
// carry no dollar cost in this app), so they're COUNTED here, never costed.
//
// Owner-wide, not per-desk: neither `model_calls` nor `usage_events` carries an
// `experiment_id` column, so "spend" here is genuinely across every desk the signed-in
// owner has — the Setup card's copy says "across all your desks" for exactly this reason.
//
// Read-only, RLS-scoped (`model_calls_select_own` / `usage_events_select_own` — both
// `auth.uid() = owner_id`) — the caller's cookie-session client already limits every row to
// the signed-in owner, so no explicit `owner_id` filter appears below.
import type { createClient } from "@/lib/supabase/server";

type RlsClient = Awaited<ReturnType<typeof createClient>>;

export type SpendStage = "drafting" | "judge" | "voice_extraction";
export type SpendRollup = { stage: SpendStage; costUsd: number }[];

export type SpendPeriod = "weekly" | "monthly" | "yearly";
export const SPEND_PERIODS: readonly SpendPeriod[] = ["weekly", "monthly", "yearly"];
export const SPEND_PERIOD_LABELS: Record<SpendPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export type SpendWindow = {
  readonly rollup: SpendRollup;
  readonly totalUsd: number;
  readonly deliveryCount: { readonly slack: number; readonly email: number };
};

const PERIOD_DAYS: Record<SpendPeriod, number> = { weekly: 7, monthly: 30, yearly: 365 };
const STAGES: readonly SpendStage[] = ["drafting", "judge", "voice_extraction"];

function sinceIso(period: SpendPeriod, now: Date): string {
  return new Date(now.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000).toISOString();
}

async function loadWindow(
  supabase: RlsClient,
  period: SpendPeriod,
  now: Date,
): Promise<SpendWindow> {
  const since = sinceIso(period, now);

  const [callsResult, deliveryResult] = await Promise.all([
    supabase
      .from("model_calls")
      .select("stage, cost_usd")
      .gte("created_at", since)
      .in("stage", STAGES),
    supabase
      .from("usage_events")
      .select("kind")
      .gte("created_at", since)
      .in("kind", ["slack_notification", "email_notification"]),
  ]);

  const callRows = callsResult.data ?? [];
  const rollup: SpendRollup = STAGES.map((stage) => ({
    stage,
    costUsd: callRows
      .filter((row) => row.stage === stage)
      .reduce((sum, row) => sum + (row.cost_usd ?? 0), 0),
  }));
  const totalUsd = rollup.reduce((sum, row) => sum + row.costUsd, 0);

  const deliveryRows = deliveryResult.data ?? [];
  const deliveryCount = {
    slack: deliveryRows.filter((row) => row.kind === "slack_notification").length,
    email: deliveryRows.filter((row) => row.kind === "email_notification").length,
  };

  return { rollup, totalUsd, deliveryCount };
}

/**
 * Precomputes all three period windows (Weekly / Monthly / Yearly) server-side — the Setup
 * page's period dropdown is a client leaf that only switches between these already-fetched
 * windows, never re-queries. Period windows are trailing N-day cutoffs off `created_at`
 * (7 / 30 / 365 days), not calendar week/month/year boundaries.
 */
export async function loadSpendWindows(
  supabase: RlsClient,
): Promise<Record<SpendPeriod, SpendWindow>> {
  const now = new Date();
  const windows = await Promise.all(
    SPEND_PERIODS.map((period) => loadWindow(supabase, period, now)),
  );
  return Object.fromEntries(SPEND_PERIODS.map((period, i) => [period, windows[i]])) as Record<
    SpendPeriod,
    SpendWindow
  >;
}
