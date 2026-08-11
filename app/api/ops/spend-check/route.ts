// Read-only spend watchdog. Poller-triggered (same auth model and caller shape as
// /api/sources/refresh-strip-phrases), never on a user-facing path, and it NEVER blocks or
// throttles a model call — it only reads the ledger after the fact and reports.
//
// Exists because of the 2026-08-09 runaway: one source looped the agentic resolver every
// 3-5 minutes for three days ($69) and nothing said a word. Provider-side spend caps are the
// wrong instrument for that — a budget is a hard 402 that would have taken production down
// instead of the bug — and provider totals cannot see WHICH desk is looping. The ledger can:
// the anomaly was one ref_id with hundreds of calls, obvious the whole time.
//
// Two independent checks, both alert-only:
//   1. Per-(stage, ref_id) volume/cost anomalies in the ledger — catches a runaway loop.
//   2. AI Gateway remaining credit against descending thresholds — catches "about to run dry"
//      before a 402 stops real drafting. Vercel's own spend alerts cannot express this: they
//      fire at fixed 50/75/100% of a *budget's* spend within a refresh period, not at an
//      absolute remaining-credit figure.
import { timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/** Remaining AI Gateway credit, in dollars, at or below which this warns. Descending so the
 *  message names the tightest band crossed; each is a louder Sentry level than the last. */
const CREDIT_THRESHOLDS: { atOrBelow: number; level: "warning" | "error" | "fatal" }[] = [
  { atOrBelow: 25, level: "fatal" },
  { atOrBelow: 50, level: "error" },
  { atOrBelow: 60, level: "warning" },
  { atOrBelow: 80, level: "warning" },
];

/** Anomaly floors for one window. Deliberately far above normal: the drafting stages fire
 *  thousands of qwen calls a day at fractions of a cent, so a call COUNT alone means little —
 *  it is the pairing with cost, per single ref_id, that isolates a runaway. For scale, the
 *  incident's worst day was 252 calls / $32 against one ref_id; a healthy desk's most
 *  expensive stage sits near $0.20 total. */
const DEFAULT_WINDOW_HOURS = 24;
const MIN_CALLS = 50;
const MIN_COST = 5;

const requestSchema = z
  .object({
    windowHours: z.number().positive().max(168).optional(),
    minCalls: z.number().positive().optional(),
    minCost: z.number().positive().optional(),
  })
  .nullable();

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

type Anomaly = {
  stage: string;
  ref_id: string | null;
  calls: number;
  total_cost: number;
  first_call: string;
  last_call: string;
};

/** Remaining credit from the gateway's own balance endpoint. Returns null (never throws) when
 *  the key is absent or the call fails — a watchdog that takes itself down on a transient
 *  fetch error is worse than one that reports what it could read. */
async function readCreditBalance(): Promise<{ balance: number; totalUsed: number } | null> {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/credits", {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    // Both fields come back as decimal STRINGS, live-probed 2026-08-11:
    // {"balance":"99.860705634","total_used":"225.139294366"}
    const body = (await res.json()) as { balance?: unknown; total_used?: unknown };
    const balance = Number(body.balance);
    const totalUsed = Number(body.total_used);
    if (!Number.isFinite(balance)) return null;
    return { balance, totalUsed: Number.isFinite(totalUsed) ? totalUsed : 0 };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET;
  if (!secret || !isAuthorized(req.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 422 });
  const windowHours = parsed.data?.windowHours ?? DEFAULT_WINDOW_HOURS;
  const minCalls = parsed.data?.minCalls ?? MIN_CALLS;
  const minCost = parsed.data?.minCost ?? MIN_COST;

  const admin = createAdminClient();
  const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();

  const [{ data: rows, error }, credit] = await Promise.all([
    admin.rpc("detect_spend_anomalies", {
      p_since: since,
      p_min_calls: minCalls,
      p_min_cost: minCost,
    }),
    readCreditBalance(),
  ]);

  if (error) {
    console.error("spend-check: anomaly query failed", error);
    Sentry.captureException(error, { tags: { area: "spend_watchdog" } });
    return new Response("anomaly query failed", { status: 500 });
  }

  const anomalies = (rows ?? []) as Anomaly[];
  for (const a of anomalies) {
    // One Sentry issue per (stage, ref_id) rather than per detection, so a persistent runaway
    // stays a single open issue that keeps incrementing instead of flooding the inbox.
    Sentry.captureMessage(`spend anomaly: ${a.stage} ref=${a.ref_id}`, {
      level: a.total_cost >= minCost * 4 ? "error" : "warning",
      tags: { area: "spend_watchdog", stage: a.stage, outcome: "anomaly" },
      extra: {
        refId: a.ref_id,
        calls: a.calls,
        totalCostUsd: a.total_cost,
        windowHours,
        firstCall: a.first_call,
        lastCall: a.last_call,
      },
    });
    console.error(
      `spend-check: ${a.stage} ref=${a.ref_id} calls=${a.calls} cost=$${a.total_cost} in ${windowHours}h`,
    );
  }

  let creditAlert: { balance: number; threshold: number } | null = null;
  if (credit) {
    const crossed = CREDIT_THRESHOLDS.filter((t) => credit.balance <= t.atOrBelow).sort(
      (a, b) => a.atOrBelow - b.atOrBelow,
    )[0];
    if (crossed) {
      creditAlert = { balance: credit.balance, threshold: crossed.atOrBelow };
      Sentry.captureMessage(
        `AI Gateway credit low: $${credit.balance.toFixed(2)} remaining (at or below $${crossed.atOrBelow})`,
        {
          level: crossed.level,
          tags: { area: "spend_watchdog", outcome: "credit_low" },
          extra: {
            balance: credit.balance,
            totalUsed: credit.totalUsed,
            threshold: crossed.atOrBelow,
          },
        },
      );
      console.error(
        `spend-check: credit $${credit.balance.toFixed(2)} at or below $${crossed.atOrBelow}`,
      );
    }
  }

  return Response.json({
    windowHours,
    anomalyCount: anomalies.length,
    anomalies,
    creditBalance: credit?.balance ?? null,
    creditAlert,
  });
}
