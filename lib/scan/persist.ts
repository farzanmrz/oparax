import type { SupabaseClient } from "@supabase/supabase-js";
import { SCAN_MODEL } from "@/lib/ai/providers";
import { draftItems, logDraftUsage } from "@/lib/draft/draft-items";
import { buildRunItemInsert } from "@/lib/scan/run-items";
import { extractMetrics, type ScanResult, storiesFromOutput } from "@/lib/scan/ui-stream";
import type { RunItemInsert } from "@/lib/types";
import type { Database } from "@/lib/types/database";
import { logUsage } from "@/lib/usage/log";

/** Usage attribution dimension (api_usage_events.source). runs.source stays manual|cron. */
export type RunUsageSource = "manual" | "cron" | "auto_post";

export interface PersistRunResultInput {
  /** RLS client (manual route) or service-role client (cron). The caller owns the choice. */
  supabase: SupabaseClient<Database>;
  /** The runs row id, created up front with status='running'. */
  runId: string;
  agentId: string;
  /** Owner of the agent — usage attribution. */
  userId: string;
  /** The streaming result from runScanStream (already being consumed by the caller). */
  result: ScanResult;
  /** Date.now() captured before runScanStream, for elapsed metrics. */
  startedAt: number;
  source: RunUsageSource;
  /** The agent's drafting voice — passed in (not re-fetched) so the draft leg stays
   *  framework-agnostic and both callers share one path. */
  draftingInstructions: string;
  exampleTweets: string[];
}

/**
 * Drive a finished scan result into terminal DB state: build run_items, mark the run
 * completed/failed, and log usage. Source-agnostic and client-agnostic so the manual route
 * (RLS client) and the cron tick (service-role client, Stage C) share ONE persistence path.
 * The single run-completion chokepoint. Never throws — any failure lands the run 'failed'.
 */
export async function persistRunResult(input: PersistRunResultInput): Promise<void> {
  const { supabase, runId, agentId, userId, result, startedAt, source } = input;
  const { draftingInstructions, exampleTweets } = input;
  try {
    const [output, metrics] = await Promise.all([result.output, extractMetrics(result, startedAt)]);

    if (!output) {
      await supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: "Run completed, but structured output was missing.",
        })
        .eq("id", runId);
      return;
    }

    // SCAN leg → items only. Then the DeepSeek DRAFT leg writes one tweet per item.
    // Per-item draft failure is recoverable (status "failed", null text) — it never
    // throws and never fails the whole run (which already paid for the Grok search).
    const rawStories = storiesFromOutput(output);
    // Bound the draft leg against the remaining wall-clock (route maxDuration = 300s) so a
    // near-budget scan + long sequential draft batch can't be hard-killed mid-write and leave
    // the run stuck at 'running'. On abort, per-item drafts fail fast → items land 'failed'
    // (recoverable) and the run still reaches a terminal state.
    const draftBudgetMs = Math.max(5_000, 285_000 - (Date.now() - startedAt));
    const drafts = await draftItems(
      rawStories,
      { draftingInstructions, exampleTweets },
      AbortSignal.timeout(draftBudgetMs),
    );
    const runItems: RunItemInsert[] = rawStories.map((story, i) => {
      const d = drafts[i];
      return buildRunItemInsert(
        {
          run_id: runId,
          agent_id: agentId,
          story_title: story.title,
          story_summary: story.summary,
          source_urls: story.sourceUrls,
          primary_tweet_url: story.primaryTweetUrl,
          dedupe_key: story.dedupeKey,
        },
        { text: d?.ok ? d.text : null, error: d?.error },
      );
    });
    // cost_usd carries the summed DeepSeek draft cost; the scan leg's token cost is
    // structurally null for xai.responses (see ui-stream.ts) — logged to console, not the row.
    const draftCostUsd = drafts.reduce((sum, d) => sum + (d.marketCost ?? 0), 0);

    if (runItems.length > 0) {
      const { error: itemsError } = await supabase.from("run_items").insert(runItems);
      if (itemsError) {
        await supabase
          .from("runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: "Run completed, but its items could not be saved.",
          })
          .eq("id", runId);
        return;
      }
    }

    await supabase
      .from("runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        cost_usd: draftCostUsd > 0 ? draftCostUsd : metrics.costUsd,
        x_search_count: metrics.xSearchCalls,
        item_count: runItems.length,
        error_message: null,
      })
      .eq("id", runId);

    await logUsage({
      kind: "scan",
      provider: "xai",
      resolved_provider: "xai",
      tool_name: "scan",
      model: SCAN_MODEL,
      user_id: userId,
      agent_id: agentId,
      run_id: runId,
      source, // new api_usage_events.source dimension (A0 column; logUsage spreads it via ...rest)
      input_tokens: metrics.inputTokens,
      output_tokens: metrics.outputTokens,
      xSearchCalls: metrics.xSearchCalls,
      metadata: {
        elapsedMs: metrics.elapsedMs,
        xSearchCalls: metrics.xSearchCalls,
        storyCount: runItems.length,
      },
    });

    // Per-item draft telemetry (DeepSeek leg). Cost is summed into cost_usd above.
    logDraftUsage(drafts, { user_id: userId, agent_id: agentId, run_id: runId, source });

    // future: notify(userId, { runId, agentId, itemCount: runItems.length }) — breaking-news
    // channels (email / WhatsApp / push) hook in HERE, the single run-completion chokepoint.
    // No interface/emitter/registry yet (YAGNI, spec §2.3).
  } catch (error) {
    console.error("persistRunResult failed", error);
    await supabase
      .from("runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "Unknown run error.",
      })
      .eq("id", runId)
      // Only the first terminal writer wins: if onAbort already marked this run failed
      // (timeout path), don't clobber its message.
      .eq("status", "running")
      .then(undefined, () => {});
  }
}
