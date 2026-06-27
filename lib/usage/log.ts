import { currentUsageContext } from "@/lib/usage/context";
import { computeCostUsd } from "@/lib/usage/cost";
import type { UsageKind, UsageProvider } from "@/lib/usage/types";

/**
 * One model/API call's cost + usage. The persistent usage subsystem
 * (api_usage_events table + dashboard) was removed — this is now a lightweight
 * TRACE: it computes the cost and prints a single readable line so the
 * tool -> API -> cost relationship is observable during a run while we rebuild
 * usage from scratch. Fields mirror the old persisted shape so call sites are
 * unchanged.
 */
export interface UsageEvent {
  kind: UsageKind;
  provider: UsageProvider;
  resolved_provider?: string | null;
  model?: string | null;
  user_id?: string | null;
  agent_id?: string | null;
  run_id?: string | null;
  session_id?: string | null;
  message_id?: string | null;
  tool_call_id?: string | null;
  tool_name?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
  gateway_generation_id?: string | null;
  /** Pre-computed cost (when the caller already knows it); else the engine fills it. */
  cost_usd?: number | null;
  /** Gateway market-rate cost from providerMetadata.gateway.marketCost (BYOK estimate). */
  gatewayMarketCost?: number | null;
  /** xSearch invocations (scan) for the cost engine. */
  xSearchCalls?: number | null;
  /** Handles checked (x_verify) for the cost engine. */
  verifyCount?: number | null;
}

/**
 * Trace one model/API call: compute its cost and print a single structured line.
 * Merges the per-request attribution context (tool/session/message). Never throws
 * — telemetry must never break a user flow.
 * @param event - the usage event to trace
 */
export async function logUsage(event: UsageEvent): Promise<void> {
  try {
    const ctx = currentUsageContext();
    const cost =
      event.cost_usd ??
      computeCostUsd({
        kind: event.kind,
        model: event.model ?? null,
        inputTokens: event.input_tokens ?? null,
        outputTokens: event.output_tokens ?? null,
        gatewayMarketCost: event.gatewayMarketCost ?? null,
        xSearchCalls: event.xSearchCalls ?? null,
        verifyCount: event.verifyCount ?? null,
      });

    const tool = event.tool_name ?? ctx.toolName ?? "-";
    const api =
      event.resolved_provider && event.resolved_provider !== event.provider
        ? `${event.provider}(${event.resolved_provider})`
        : event.provider;
    const session = event.session_id ?? ctx.sessionId ?? "-";

    console.info(
      `[usage] kind=${event.kind} tool=${tool} api=${api} model=${event.model ?? "-"} ` +
        `in=${event.input_tokens ?? 0} out=${event.output_tokens ?? 0} ` +
        `cost=$${cost.toFixed(6)} session=${session}`,
    );
  } catch (error) {
    console.error("logUsage trace failed", error);
  }
}
