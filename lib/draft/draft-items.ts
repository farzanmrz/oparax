// Shared draft leg: turn scanned items into one X post each via DeepSeek (Gateway),
// reusing generateDraft. This is the ONE entrypoint both callers use — the create-chat
// preview (Caller A) and the saved-agent run (Caller B) — so the two can never diverge.

import { DRAFT_MODEL } from "@/lib/ai/providers";
import { generateDraft } from "@/lib/draft/generate";
import { logUsage } from "@/lib/usage/log";

export interface DraftItemInput {
  title: string;
  summary: string;
}

export type DraftItemResult =
  | {
      ok: true;
      /** The drafted tweet text. */
      text: string;
      error: null;
      /** Summed gateway market cost for this item (initial + any repair pass). */
      marketCost: number | null;
      /** Resolved BYOK provider the gateway routed to. */
      resolved: string | null;
    }
  | {
      ok: false;
      text: null;
      /** A readable error. */
      error: string;
      marketCost: null;
      resolved: null;
    };

/**
 * Draft one X post per scanned item. Sequential (NOT Promise.all) to keep Gateway
 * concurrency low and bounded inside the run window. A per-item failure (a returned
 * { ok: false } OR a thrown error) becomes { ok: false, text: null, error } — this
 * never throws and never aborts the batch. Returns exactly one result per input, in
 * order, so callers can zip results back onto their items by index.
 */
export async function draftItems(
  items: DraftItemInput[],
  cfg: { draftingInstructions: string; exampleTweets: string[] },
  signal?: AbortSignal,
): Promise<DraftItemResult[]> {
  const results: DraftItemResult[] = [];
  for (const item of items) {
    try {
      const r = await generateDraft({
        draftingInstructions: cfg.draftingInstructions,
        story: { title: item.title, summary: item.summary },
        exampleTweets: cfg.exampleTweets,
        signal,
      });
      if (r.ok) {
        results.push({
          ok: true,
          text: r.text,
          error: null,
          marketCost: r.marketCost,
          resolved: r.resolved,
        });
      } else {
        results.push({ ok: false, text: null, error: r.error, marketCost: null, resolved: null });
      }
    } catch (error) {
      results.push({
        ok: false,
        text: null,
        error: error instanceof Error ? error.message : "Drafting failed.",
        marketCost: null,
        resolved: null,
      });
    }
  }
  return results;
}

/**
 * Emit one draft usage trace per item. logUsage is a synchronous console tracer that swallows
 * its own errors, so these are fire-and-forget — never awaited on the request hot path. Both
 * the create preview (Caller A) and the saved run (Caller B) call this so their traces match.
 */
export function logDraftUsage(
  drafts: DraftItemResult[],
  base: {
    user_id: string;
    agent_id?: string | null;
    run_id?: string | null;
    tool_call_id?: string | null;
    source?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): void {
  for (const d of drafts) {
    void logUsage({
      kind: "draft",
      provider: "gateway",
      resolved_provider: d.resolved,
      model: DRAFT_MODEL,
      tool_name: "draft",
      gatewayMarketCost: d.marketCost,
      ...base,
    });
  }
}
