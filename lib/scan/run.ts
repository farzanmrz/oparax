import type { ToolSet } from "ai";
import { Output, stepCountIs, streamText } from "ai";
import { SCAN_MODEL, xai } from "@/lib/ai/providers";
import { MONITOR_MAX_HANDLES } from "@/lib/scan/handles";
import { buildAgentRunUserPrompt, buildScanInstructions } from "@/lib/scan/prompt";
import { scanResultSchema } from "@/lib/scan/schema";

export interface RunScanInput {
  /** Whether to monitor X at all (binds the xSearch tool). */
  searchX: boolean;
  handles: string[];
  fromDate: string | null;
  toDate: string | null;
  scanningInstructions: string;
  draftingInstructions: string;
  exampleTweets: string[];
  searchWeb: boolean;
  preferredDomains: string[];
}

export function runScanStream(input: RunScanInput) {
  // Enforce the xSearch cap; slice silently so the scan never rejects at runtime.
  // xai.tools.xSearch enforces a hard cap of 10 on allowedXHandles (confirmed runtime,
  // @ai-sdk/xai@3.0.95 source: z.array(z.string()).max(10)). The type definition
  // does NOT reflect this cap.
  const handles = input.handles.slice(0, MONITOR_MAX_HANDLES);

  const tools: ToolSet = {} as ToolSet;
  // xai server-side tools are not ToolSet-compatible (no execute fn); cast via unknown.
  // Bind xSearch only when X monitoring is enabled; otherwise the scan is web-only.
  if (input.searchX) {
    (tools as Record<string, unknown>).x_search = xai.tools.xSearch({
      allowedXHandles: handles.length ? handles : undefined,
      fromDate: input.fromDate ?? undefined,
      toDate: input.toDate ?? undefined,
    });
  }
  if (input.searchWeb) {
    (tools as Record<string, unknown>).web_search = xai.tools.webSearch(
      input.preferredDomains.length
        ? {
            allowedDomains: input.preferredDomains,
          }
        : {},
    );
  }

  return streamText({
    model: xai.responses(SCAN_MODEL),
    system: buildScanInstructions(),
    prompt: buildAgentRunUserPrompt({
      scanningInstructions: input.scanningInstructions,
      draftingInstructions: input.draftingInstructions,
      exampleTweets: input.exampleTweets,
    }),
    tools,
    stopWhen: stepCountIs(5),
    temperature: 0,
    topP: 1,
    maxOutputTokens: 1_000_000,
    output: Output.object({
      schema: scanResultSchema,
    }),
    providerOptions: {
      xai: {
        reasoningEffort: "low",
      },
    },
    // NOTE: `include: ["no_inline_citations"]` is NOT a valid typed xai option (A1 finding) — omitted.
    // Citation cleanliness is enforced by the system prompt ("no raw URLs, no markdown" in drafts).
  });
}
