// lib/agent/qwen-draft-config.ts
//
// The one Qwen 3.7 Flash config shared by the pipeline's cheap model stages (filter,
// synthesis, story grouping, alert judging). Qwen 3.7 Flash is vision-capable, so callers
// with source media must pass the original attachments rather than a text-only description
// produced by another model.
export const QWEN_DRAFT_MODEL = "alibaba/qwen3.7-flash";
export const QWEN_DRAFT_PROVIDER_OPTIONS = { gateway: { sort: "ttft" } };

/** Stuck-call guard, NOT a latency budget — and load-bearing precisely because these calls carry
 *  no `maxOutputTokens`. An abort THROWS, so `draftForAgent`'s catch runs and RELEASES the
 *  `draft_claims` row; a platform kill at the delivery route's `maxDuration` is not a throw, so
 *  that catch never runs, the claim is held forever, and the retry hits 23505 ->
 *  `already_drafted` -> HTTP 200. The story is then permanently lost while the delivery log
 *  reads success. (Onboarding is uncapped for the same reason but carries its own equivalent
 *  abort, `ONBOARDING_TIMEOUT_MS` in lib/sources/onboard-source.ts.)
 *
 *  120s is far beyond a normal support call, so it only ever fires on a genuinely stuck
 *  generation. It bounds ONE call: `processDelivery` still loops desks serially, so many desks
 *  on one delivery can outrun the route's budget in aggregate. */
export const QWEN_DRAFT_TIMEOUT_MS = 120_000;
export const QWEN_FILTER_TIMEOUT_MS = 30_000;
export const QWEN_SYNTHESIZE_TIMEOUT_MS = 120_000;

/** Bounds each stage by both its own stuck-call guard and the enclosing route deadline. */
export function qwenStageAbortSignal(timeoutMs: number, deadlineAt?: number): AbortSignal {
  const remaining = deadlineAt === undefined ? timeoutMs : Math.max(1, deadlineAt - Date.now());
  return AbortSignal.timeout(Math.min(timeoutMs, remaining));
}
