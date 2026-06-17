// Shared agent-setup chat logic.
//
// Both the live route (app/api/agents/chat/route.ts) and the dev-only HTTP debug
// endpoint (app/api/agents/chat-debug/route.ts) build their streamText call from
// here so they exercise the SAME model, system prompt, tools, and stop condition.
//
// runScan strategy (E2 Step 2 SPIKE finding):
//   The AI SDK v6 does not expose a public API to merge a nested streamText
//   stream into an outer streamText tool-execute context. Attempting to
//   forward the inner UI message stream (result.toUIMessageStream()) through
//   the outer DataStreamWriter causes protocol-frame collisions because both
//   streams emit overlapping protocol byte sequences (text/0:, 2:, d:).
//   FALLBACK: runScan.execute awaits the scan to full completion, then returns
//   { stories, metrics } as the tool-result part. The outer streamText
//   forwards this as a normal tool-result chunk; the chat UI renders stories
//   from the tool-result part. No live token streaming inside the tool.
//
//   Final scan object accessor: `await result.output`
//   (confirmed in A1/B1: `output` is the v6 name; `experimental_output` is deprecated)

import {
  type ModelMessage,
  type StreamTextOnFinishCallback,
  stepCountIs,
  streamText,
  tool,
  type ToolSet,
} from "ai";
import { z } from "zod";

import { CHAT_MODEL, GATEWAY_PROVIDER_OPTIONS, SCAN_MODEL } from "@/lib/ai/providers";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import {
  buildFetchExampleTweetsTool,
  buildFetchMyRecentPostsTool,
  configTools,
  type XConnectionContext,
} from "@/lib/chat/tools";
import { runScanStream } from "@/lib/scan/run";
import { extractMetrics, storiesFromOutput } from "@/lib/scan/ui-stream";
import { logUsage } from "@/lib/usage/log";

export interface BuildAgentChatStreamOptions {
  /** Already converted ModelMessages (callers run convertToModelMessages). */
  messages: ModelMessage[];
  /** Auth user id — closed over by runScan for cost attribution. */
  userId: string;
  /**
   * When true (the harness), give the client-resolved `setAgentConfig` tool a
   * no-op `execute` so the whole multi-step turn runs server-side in one
   * streamText call. When false/undefined (the route), `setAgentConfig` stays
   * execute-less and is resolved on the client exactly as before.
   */
  autoResolveClientTools?: boolean;
  /**
   * The current user's X-connection state. When connected, the voice step leads
   * with pulling their recent posts (via the fetchMyRecentPosts tool) and the
   * system prompt is told NOT to ask them to connect/authorize again.
   */
  xConnection?: XConnectionContext;
  /**
   * Forwarded to streamText.onFinish (route uses this for logUsage +
   * logChatTurn). Typed against the default `ToolSet` for an ergonomic public
   * signature; the event still carries the concrete tool calls/results at
   * runtime — read fields defensively.
   */
  onFinish?: StreamTextOnFinishCallback<ToolSet>;
}

/**
 * Build the agent-setup chat stream with the canonical model, system prompt,
 * tools, and stop condition. Returns the raw StreamTextResult so callers decide
 * how to consume it (route → toUIMessageStreamResponse; harness → await fields).
 *
 * The return type is inferred (not annotated) so the concrete tool set flows
 * through to callers: annotating it as the default-generic
 * `StreamTextResult<ToolSet, …>` is not assignable from the specific tool-set
 * result because StreamTextResult's tool generic is invariant.
 */
export function buildAgentChatStream(opts: BuildAgentChatStreamOptions) {
  const { messages, userId, autoResolveClientTools, xConnection, onFinish } = opts;

  // X-connection-aware voice step: when the account is already connected, tell
  // the model to OFFER to pull their recent posts (the fetchMyRecentPosts tool)
  // as the primary voice option, and never to ask them to connect/authorize
  // again. Appended to the canonical system prompt so the shared logic stays
  // identical across the route + debug harness.
  const system =
    xConnection?.connected && xConnection.username
      ? `${CHAT_SYSTEM_PROMPT}\n\nThe user's X account is ALREADY connected (@${xConnection.username}). At the voice step, OFFER TO PULL THEIR RECENT POSTS automatically via the \`fetchMyRecentPosts\` tool as the primary option — do NOT ask them to connect X again or to authorize anything outside the chat. They may still paste tweet URLs or skip.`
      : CHAT_SYSTEM_PROMPT;

  // Request-scoped tool — closes over the connected user's X identity so it pulls
  // THEIR posts. Always present; returns a not-connected result when X is absent.
  const fetchMyRecentPosts = buildFetchMyRecentPostsTool(xConnection);

  // Request-scoped tool — closes over the user's OAuth token so pasted protected
  // URLs resolve when connected (public/syndication fallback otherwise).
  const fetchExampleTweets = buildFetchExampleTweetsTool(xConnection);

  // ---------------------------------------------------------------------------
  // runScan — closes over `userId` for usage attribution.
  // Fix 1: exampleTweets schema is { url, text }[] to match AgentConfig shape;
  //         we map to text[] before calling runScanStream.
  // Fix 2: user_id is included in logUsage via the closure over userId.
  // ---------------------------------------------------------------------------
  const runScan = tool({
    description:
      "Run the news scan with the current agent config and return drafted stories. Call this only when the user confirms the config is ready.",
    inputSchema: z.object({
      handles: z.array(z.string()),
      scanningInstructions: z.string(),
      draftingInstructions: z.string(),
      exampleTweets: z
        .array(
          z.object({
            url: z.string(),
            text: z.string(),
          }),
        )
        .default([]),
      searchWeb: z.boolean().default(false),
      preferredDomains: z.array(z.string()).default([]),
    }),
    execute: async (input, { toolCallId }) => {
      const scanStartedAt = Date.now();

      // Default recent window: last 7 days in YYYY-MM-DD format.
      const now = new Date();
      const toDate = now.toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fromDate = sevenDaysAgo.toISOString().slice(0, 10);

      const result = runScanStream({
        // The chat flow always monitors X (the model drives handles + optional web).
        searchX: true,
        handles: input.handles,
        fromDate,
        toDate,
        scanningInstructions: input.scanningInstructions,
        draftingInstructions: input.draftingInstructions,
        // Map { url, text }[] → string[] for the scan runner.
        exampleTweets: input.exampleTweets.map((t) => t.text),
        searchWeb: input.searchWeb,
        preferredDomains: input.preferredDomains,
      });

      // Drive the stream to completion and get the structured output.
      // `await result.output` is the v6 accessor (confirmed in A1/B1 spike).
      const [output, metrics] = await Promise.all([
        result.output,
        extractMetrics(result, scanStartedAt),
      ]);
      const stories = output ? storiesFromOutput(output) : [];

      // Telemetry — must not throw. Cost is computed by the engine from tokens +
      // xSearch calls (the old metrics.costUsd was always null for xai.responses).
      await logUsage({
        kind: "scan",
        provider: "xai",
        resolved_provider: "xai",
        model: SCAN_MODEL,
        user_id: userId,
        tool_call_id: toolCallId,
        tool_name: "scan",
        input_tokens: metrics.inputTokens,
        output_tokens: metrics.outputTokens,
        xSearchCalls: metrics.xSearchCalls,
        metadata: {
          elapsedMs: metrics.elapsedMs,
          xSearchCalls: metrics.xSearchCalls,
          storyCount: stories.length,
          triggeredFrom: "chat",
        },
      });

      return {
        stories,
        metrics,
      };
    },
  });

  // setAgentConfig is a CLIENT tool in the route (no execute — resolved in the
  // React layer via onToolCall). For the harness we wrap it with a no-op execute
  // so the whole multi-step turn resolves server-side in a single streamText call.
  const tools = autoResolveClientTools
    ? {
        ...configTools,
        setAgentConfig: tool({
          description: configTools.setAgentConfig.description,
          inputSchema: configTools.setAgentConfig.inputSchema,
          execute: async () => ({ ok: true }),
        }),
        fetchExampleTweets,
        fetchMyRecentPosts,
        runScan,
      }
    : {
        ...configTools,
        fetchExampleTweets,
        fetchMyRecentPosts,
        runScan,
      };

  return streamText({
    model: CHAT_MODEL,
    system,
    messages,
    tools,
    stopWhen: stepCountIs(10),
    providerOptions: { ...GATEWAY_PROVIDER_OPTIONS },
    // The public onFinish is typed against the default ToolSet for ergonomics;
    // cast to the concrete inferred tool set so streamText accepts it. The event
    // is structurally compatible at runtime (callers read fields defensively);
    // routed via `unknown` because the invariant tool generic blocks a direct cast.
    onFinish: onFinish as unknown as StreamTextOnFinishCallback<typeof tools>,
  });
}
