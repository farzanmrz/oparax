import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/types/database";
import { currentUsageContext } from "@/lib/usage/context";
import { computeCostUsd } from "@/lib/usage/cost";

type Insert = Database["public"]["Tables"]["api_usage_events"]["Insert"];

type UsageEvent = Omit<Insert, "id" | "created_at" | "cost_usd"> & {
  /** Pre-computed cost (when the caller already knows it); else the engine fills it. */
  cost_usd?: number | null;
  /** Gateway market-rate cost from providerMetadata.gateway.marketCost (BYOK estimate). */
  gatewayMarketCost?: number | null;
  /** xSearch invocations (scan) for the cost engine. */
  xSearchCalls?: number | null;
  /** Handles checked (x_verify) for the cost engine. */
  verifyCount?: number | null;
};

/**
 * Record one model/API call's cost + usage in api_usage_events. Merges the
 * per-request attribution context (user/session/message/tool ids), computes
 * cost_usd when not provided, and uses the service-role client so it works for
 * system calls and bypasses owner-scoped RLS. Telemetry must never break a user
 * flow, so any failure is logged and swallowed.
 * @param event - the usage event to record
 */
export async function logUsage(event: UsageEvent): Promise<void> {
  try {
    const ctx = currentUsageContext();
    const { gatewayMarketCost, xSearchCalls, verifyCount, cost_usd, ...rest } = event;

    const cost =
      cost_usd ??
      computeCostUsd({
        kind: rest.kind,
        model: rest.model ?? null,
        inputTokens: rest.input_tokens ?? null,
        outputTokens: rest.output_tokens ?? null,
        gatewayMarketCost: gatewayMarketCost ?? null,
        xSearchCalls: xSearchCalls ?? null,
        verifyCount: verifyCount ?? null,
      });

    const row: Insert = {
      ...rest,
      user_id: rest.user_id ?? ctx.userId ?? null,
      session_id: rest.session_id ?? ctx.sessionId ?? null,
      message_id: rest.message_id ?? ctx.messageId ?? null,
      tool_call_id: rest.tool_call_id ?? ctx.toolCallId ?? null,
      tool_name: rest.tool_name ?? ctx.toolName ?? null,
      cost_usd: cost,
    };

    await createServiceRoleClient().from("api_usage_events").insert(row);
  } catch (error) {
    console.error("logUsage failed", error);
  }
}
