// PROVIDERMETADATA FINDING (spike B1-Step3, 2026-06-15):
// xai.responses() with AI SDK v6 returns `undefined` for providerMetadata at both
// the result level (await result.providerMetadata) and per-step (step.providerMetadata).
// The path `providerMetadata?.xai?.cost_in_usd_ticks` and
// `providerMetadata?.xai?.server_side_tool_usage_details?.x_search_calls`
// that the old stream.ts ScanStreamWriter read from the raw Responses API `response.usage`
// are not surfaced through the AI SDK xai adapter.
//
// FALLBACK STRATEGY:
// - costUsd: null (not available via AI SDK xai.responses)
// - xSearchCalls: count tool calls named "x_search" from await result.steps
//   (each x_search server-side tool invocation is recorded as a toolCall by the xai adapter)
// - elapsedMs: tracked by the caller via startedAt

import type { StreamTextResult, ToolSet, UIMessageStreamOptions } from "ai";
import { toRawStory } from "@/lib/scan/parse";
import type { ScanItem } from "@/lib/scan/schema";
import type { RawStory, ScanMetrics, StorySource } from "@/lib/scan/types";

// biome-ignore lint/suspicious/noExplicitAny: StreamTextResult's OUTPUT generic only affects result.object typing; `unknown` breaks inference that downstream callers rely on.
export type ScanResult = StreamTextResult<ToolSet, any>;

export async function extractMetrics(result: ScanResult, startedAt: number): Promise<ScanMetrics> {
  // providerMetadata is undefined for xai.responses in AI SDK v6 — see file comment.
  // Try it anyway to pick it up if a future SDK version populates it.
  const meta = await result.providerMetadata;
  const xaiMeta = meta?.xai as Record<string, unknown> | undefined;

  // Attempt cost from providerMetadata.xai.cost_in_usd_ticks (currently always absent)
  const costTicks =
    typeof xaiMeta?.cost_in_usd_ticks === "number" ? xaiMeta.cost_in_usd_ticks : null;
  const costUsd = costTicks !== null ? Number((costTicks / 1e10).toFixed(6)) : null;

  // xSearch call count: sum all x_search tool calls across steps.
  // Each x_search server-side invocation is recorded as a toolCall entry.
  const steps = await result.steps;
  const xSearchCalls = steps.reduce((acc, step) => {
    const count = (step.toolCalls ?? []).filter((tc) => tc.toolName === "x_search").length;
    return acc + count;
  }, 0);

  // Token usage is surfaced by the xai adapter even though providerMetadata is not;
  // the cost engine prices grok-4.3 tokens + xSearch calls from these.
  const usage = await result.usage;

  return {
    costUsd,
    elapsedMs: Date.now() - startedAt,
    xSearchCalls: xSearchCalls > 0 ? xSearchCalls : null,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
  };
}

/**
 * Derive StorySource[] from a scan item.
 * - Uses structured `sources` from the model output when present.
 * - Falls back to synthesising minimal `{ type: "article", url }` entries from
 *   `urls` so older / partial model shapes still produce a renderable array.
 */
function sourcesFromItem(item: ScanItem): StorySource[] {
  if (item.sources && item.sources.length > 0) {
    return item.sources as StorySource[];
  }
  // Graceful fallback: synthesise from flat urls array.
  return item.urls.map(
    (url): StorySource => ({
      type: "article",
      url,
    }),
  );
}

export function storiesFromOutput(output: {
  items?: Parameters<typeof toRawStory>[0][] | null;
}): RawStory[] {
  const items = (output?.items ?? []) as ScanItem[];
  const seen = new Set<string>();
  return items
    .map((item) => {
      const base = toRawStory(item);
      return {
        ...base,
        sources: sourcesFromItem(item),
      } satisfies RawStory;
    })
    .filter((story) => {
      if (seen.has(story.dedupeKey)) return false;
      seen.add(story.dedupeKey);
      return true;
    });
}

export function scanToUIResponse(
  result: ScanResult,
  options?: UIMessageStreamOptions<never>,
): Response {
  return result.toUIMessageStreamResponse(options);
}
