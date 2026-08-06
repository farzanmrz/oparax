// lib/agent/qwen-draft-config.ts
//
// The one Qwen 3.7 Flash config shared by translation, drafting, and the cheaper support paths
// (correction revision and dormant clustering). Qwen 3.7 Flash is
// vision-capable, so callers with source media must pass the original attachments rather than a
// text-only description produced by another model.
export const QWEN_DRAFT_MODEL = "alibaba/qwen3.7-flash";
export const QWEN_DRAFT_PROVIDER_OPTIONS = { gateway: { sort: "cost" } };

/** Stuck-call guard, NOT a latency budget — and load-bearing precisely because these calls carry
 *  no `maxOutputTokens`. It exists for the same reason extract-guide.ts's abort does: an abort
 *  THROWS, so `draftForAgent`'s catch runs and RELEASES the `draft_claims` row; a platform kill at
 *  `app/api/ingest/route.ts`'s `maxDuration = 300` is not a throw, so that catch never runs, the
 *  claim is held forever, and the worker's retry hits 23505 -> `already_drafted` -> HTTP 200. The
 *  draft is then permanently lost while the delivery log reads success.
 *
 *  120s is ~40x a normal drafting call, so it only ever fires on a genuinely stuck generation.
 *  It bounds ONE call: `processDelivery` still loops desks serially, so many desks on one delivery
 *  can outrun 300s in aggregate — that predates the uncapped output and is unchanged here. */
export const QWEN_DRAFT_TIMEOUT_MS = 120_000;

/** X renders no markdown, so a stray `**bold**` posts with literal asterisks. Model prompts
 * forbid it, but this deterministic backstop keeps stored text postable. */
export function stripMarkdown(text: string): string {
  return text.replaceAll("**", "");
}
