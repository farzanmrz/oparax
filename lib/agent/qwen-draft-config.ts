// lib/agent/qwen-draft-config.ts
//
// The one Qwen 3.7 Flash config shared by translation and the cheaper support paths
// (correction revision and dormant clustering). Qwen 3.7 Flash is
// vision-capable, so callers with source media must pass the original attachments rather than a
// text-only description produced by another model.
export const QWEN_DRAFT_MODEL = "alibaba/qwen3.7-flash";
export const QWEN_DRAFT_PROVIDER_OPTIONS = { gateway: { sort: "ttft" } };

/** Stuck-call guard, NOT a latency budget — and load-bearing precisely because these calls carry
 *  no `maxOutputTokens`. It guards dormant clustering. Onboarding is uncapped for the same
 *  reason but carries its own
 *  equivalent abort (`ONBOARDING_TIMEOUT_MS`, lib/sources/onboard-source.ts). It exists for the same reason
 *  extract-guide.ts's abort does: an abort THROWS, so `draftForAgent`'s catch runs and RELEASES
 *  the `draft_claims` row; a platform kill at `app/api/ingest/route.ts`'s `maxDuration` is not a
 *  throw, so that catch never runs, the claim is held forever, and the worker's retry hits 23505
 *  -> `already_drafted` -> HTTP 200. The draft is then permanently lost while the delivery log
 *  reads success.
 *
 *  The translator does NOT use this guard — it streams (see draft-translate.ts) and uses an
 *  inactivity-reset abort instead, because a flowing stream makes silence, not elapsed time, the
 *  true death signal.
 *
 *  120s is far beyond a normal support call, so it only ever fires on a genuinely stuck generation.
 *  It bounds ONE call: `processDelivery` still loops desks serially, so many desks on one delivery
 *  can outrun the route's budget in aggregate — that predates the uncapped output and is
 *  unchanged here. */
export const QWEN_DRAFT_TIMEOUT_MS = 120_000;
export const QWEN_FILTER_TIMEOUT_MS = 30_000;
export const QWEN_SYNTHESIZE_TIMEOUT_MS = 120_000;

/** Bounds each stage by both its own stuck-call guard and the enclosing route deadline. */
export function qwenStageAbortSignal(timeoutMs: number, deadlineAt?: number): AbortSignal {
  const remaining = deadlineAt === undefined ? timeoutMs : Math.max(1, deadlineAt - Date.now());
  return AbortSignal.timeout(Math.min(timeoutMs, remaining));
}

/** X renders no markdown, so a stray `**bold**` posts with literal asterisks. Model prompts
 * forbid it, but this deterministic backstop keeps stored text postable. */
export function stripMarkdown(text: string): string {
  return text.replaceAll("**", "");
}
