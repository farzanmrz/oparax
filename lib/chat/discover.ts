// Grounded source discovery for the agent-setup chat.
//
// The chat model (deepseek via Gateway) has no search grounding, so asked to
// suggest X handles or news sites it would invent plausible-but-arbitrary picks
// from training memory (the "FC Barcelona accounts from nowhere" bug). These
// helpers ground suggestions in REAL, current data via a small direct grok-4.3 +
// xSearch/webSearch call (the scan's provider) and return structured candidates;
// callers verify/validate before presenting. Non-throwing: any failure returns []
// so the chat never hangs.

import { Output, type ToolSet, stepCountIs, streamText } from "ai";
import { z } from "zod";
import { SCAN_MODEL, xai } from "@/lib/ai/providers";
import { extractMetrics } from "@/lib/scan/ui-stream";
import { logUsage } from "@/lib/usage/log";

export interface DiscoveredHandle {
  handle: string;
  name: string;
  why: string;
}

export interface DiscoveredSite {
  domain: string;
  name: string;
  why: string;
}

const handlesSchema = z.object({
  handles: z
    .array(
      z.object({
        handle: z.string().describe("Exact X username, no leading @"),
        name: z.string().describe("Account display name"),
        why: z.string().describe("One short phrase: why it fits the beat"),
      }),
    )
    .max(12),
});

const sitesSchema = z.object({
  sites: z
    .array(
      z.object({
        domain: z.string().describe("Bare domain, e.g. theathletic.com"),
        name: z.string().describe("Publication name"),
        why: z.string().describe("One short phrase: why it fits the beat"),
      }),
    )
    .max(8),
});

const HANDLES_SYSTEM =
  "You find real, currently-active X (Twitter) accounts a reporter should follow for a given beat. " +
  "Use the x_search tool to ground EVERY suggestion in accounts that actually appear in search results. " +
  "Only return accounts that genuinely exist and are active. Never invent handles.";

const SITES_SYSTEM =
  "You find real, reputable news websites a reporter should monitor for a given beat. " +
  "Use the web_search tool to ground EVERY suggestion in sites that actually appear in search results. " +
  "Only return sites that genuinely exist. Never invent domains.";

/**
 * Discover real, active X handles for a beat. Non-throwing; [] on failure.
 * Returned handles are UNVERIFIED — the caller runs verifyHandles before showing them.
 */
export async function discoverHandles(topic: string): Promise<DiscoveredHandle[]> {
  const startedAt = Date.now();
  try {
    const tools: ToolSet = {} as ToolSet;
    (tools as Record<string, unknown>).x_search = xai.tools.xSearch({});

    const result = streamText({
      model: xai.responses(SCAN_MODEL),
      system: HANDLES_SYSTEM,
      prompt: `Beat: ${topic}\n\nReturn up to 10 real, active X accounts most worth following for this beat.`,
      tools,
      stopWhen: stepCountIs(4),
      temperature: 0,
      maxOutputTokens: 8000,
      output: Output.object({ schema: handlesSchema }),
      providerOptions: { xai: { reasoningEffort: "low" } },
    });

    const [output, metrics] = await Promise.all([result.output, extractMetrics(result, startedAt)]);

    await logUsage({
      kind: "scan",
      provider: "xai",
      resolved_provider: "xai",
      model: SCAN_MODEL,
      input_tokens: metrics.inputTokens,
      output_tokens: metrics.outputTokens,
      xSearchCalls: metrics.xSearchCalls,
      metadata: {
        purpose: "discover_handles",
        elapsedMs: metrics.elapsedMs,
        found: output?.handles?.length ?? 0,
      },
    });

    return output?.handles ?? [];
  } catch (err) {
    console.error("discoverHandles failed", err);
    return [];
  }
}

/**
 * Discover real news sites for a beat. Non-throwing; [] on failure.
 * Returned domains are UNVALIDATED — the caller runs validateSites before showing them.
 */
export async function discoverSites(topic: string): Promise<DiscoveredSite[]> {
  const startedAt = Date.now();
  try {
    const tools: ToolSet = {} as ToolSet;
    (tools as Record<string, unknown>).web_search = xai.tools.webSearch({});

    const result = streamText({
      model: xai.responses(SCAN_MODEL),
      system: SITES_SYSTEM,
      prompt: `Beat: ${topic}\n\nReturn up to 5 real, reputable news sites most worth monitoring for this beat.`,
      tools,
      stopWhen: stepCountIs(4),
      temperature: 0,
      maxOutputTokens: 8000,
      output: Output.object({ schema: sitesSchema }),
      providerOptions: { xai: { reasoningEffort: "low" } },
    });

    const [output, metrics] = await Promise.all([result.output, extractMetrics(result, startedAt)]);

    await logUsage({
      kind: "scan",
      provider: "xai",
      resolved_provider: "xai",
      model: SCAN_MODEL,
      input_tokens: metrics.inputTokens,
      output_tokens: metrics.outputTokens,
      xSearchCalls: metrics.xSearchCalls,
      metadata: {
        purpose: "discover_sites",
        elapsedMs: metrics.elapsedMs,
        found: output?.sites?.length ?? 0,
      },
    });

    return output?.sites ?? [];
  } catch (err) {
    console.error("discoverSites failed", err);
    return [];
  }
}
