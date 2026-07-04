// Shared agent-setup chat logic — the create-chat iterate loop.
//
// Both the live route (app/api/agents/chat/route.ts) and the dev-only HTTP debug
// endpoint (app/api/agents/chat-debug/route.ts) build their streamText call from
// here so they exercise the SAME model, system prompt, tools, and stop condition.
//
// TWO PHASES, kept separate (the reporter tunes one, then the other):
//   PHASE 1 — SCAN (find). runScan retrieves news ITEMS only (no drafts). COSTS A SEARCH.
//     The reporter reviews items and tunes retrieval (re-scan) until the net is right.
//   PHASE 2 — DRAFT (write). Once the items are right, draft turns them into one post each.
//     NO search (cheap). The reporter tunes voice (re-draft) until the writing is right.
//   updateConfig (config): record a setting change WITHOUT scanning/drafting. Ephemeral,
//     no DB write — the UI rebuilds the live config by replaying these patches.
//
// scan() produces items; draft() turns items into posts via lib/draft/draft-items.ts
// (the ONE draft entrypoint the saved-agent run also uses — so the two callers can't
// diverge; the saved run just does scan THEN draft in one shot, no loop). The chat preview
// persists NOTHING — save-agent persists the config (and optionally the latest drafts) on Save.

import {
  type ModelMessage,
  type GenerateTextOnEndCallback,
  stepCountIs,
  streamText,
  type ToolSet,
  tool,
} from "ai";
import { z } from "zod";

import { CHAT_MODEL, GATEWAY_PROVIDER_OPTIONS, SCAN_MODEL } from "@/lib/ai/providers";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import { draftItems, logDraftUsage } from "@/lib/draft/draft-items";
import { isValidHandle, normalizeHandle } from "@/lib/scan/handles";
import { runScanStream } from "@/lib/scan/run";
import type {
  DraftToolResult,
  PreviewStory,
  RawStory,
  ScanMetrics,
  ScanToolResult,
} from "@/lib/scan/types";
import { extractMetrics, storiesFromOutput } from "@/lib/scan/ui-stream";
import { logUsage } from "@/lib/usage/log";

export interface BuildAgentChatStreamOptions {
  /** Already converted ModelMessages (callers run convertToModelMessages). */
  messages: ModelMessage[];
  /** Auth user id — closed over by the tools for cost attribution. */
  userId: string;
  /**
   * Forwarded to streamText.onFinish (route uses this for logUsage +
   * logChatTurn). Typed against the default `ToolSet` for an ergonomic public
   * signature; the event still carries the concrete tool calls/results at
   * runtime — read fields defensively.
   */
  onFinish?: GenerateTextOnEndCallback<ToolSet>;
}

/** Ephemeral config patch the updateConfig tool records (no DB write). Partial — the UI
 *  merges it onto the running config by replaying these inputs. */
const configPatchSchema = z.object({
  name: z.string().optional(),
  scanningInstructions: z.string().optional(),
  draftingInstructions: z.string().optional(),
  exampleTweets: z.array(z.object({ url: z.string(), text: z.string() })).optional(),
  sources: z
    .object({
      x: z
        .object({ enabled: z.boolean(), handles: z.array(z.string()).max(10) })
        .partial()
        .optional(),
      web: z
        .object({ enabled: z.boolean(), preferredDomains: z.array(z.string()).max(5) })
        .partial()
        .optional(),
    })
    .partial()
    .optional(),
});

/** Metrics for a no-search leg (the draft tool, or a gated/failed scan). */
function emptyScanMetrics(startedAt: number): ScanMetrics {
  return {
    costUsd: null,
    elapsedMs: Date.now() - startedAt,
    xSearchCalls: 0,
    inputTokens: null,
    outputTokens: null,
  };
}

/**
 * Unwrap the most recent tool-result for `toolName` from the chat history. The v6 ModelMessage
 * tool-result output is { type: "json", value }, with a raw fallback. Returns the value object
 * or undefined.
 */
function latestToolValue(messages: ModelMessage[], toolName: string): unknown {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "tool" || !Array.isArray(m.content)) continue;
    for (const part of m.content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "tool-result" &&
        (part as { toolName?: unknown }).toolName === toolName
      ) {
        const output = (part as { output?: unknown }).output;
        return output && typeof output === "object" && "value" in output
          ? (output as { value: unknown }).value
          : output;
      }
    }
  }
  return undefined;
}

/** The news items from the most recent scan, so the `draft` tool can draft them WITHOUT a
 *  new search. */
function latestScanItems(messages: ModelMessage[]): RawStory[] {
  const v = latestToolValue(messages, "runScan") as { items?: unknown } | undefined;
  return Array.isArray(v?.items) ? (v.items as RawStory[]) : [];
}

/** Map dedupeKey → last good draft text, so a re-draft that fails an item falls back to its
 *  previous good draft instead of wiping it to "". */
function latestDraftByKey(messages: ModelMessage[]): Record<string, string> {
  const v = latestToolValue(messages, "draft") as { stories?: unknown } | undefined;
  const out: Record<string, string> = {};
  if (Array.isArray(v?.stories)) {
    for (const s of v.stories as PreviewStory[]) {
      if (s?.dedupeKey && typeof s.draft === "string" && s.draft) out[s.dedupeKey] = s.draft;
    }
  }
  return out;
}

/**
 * Build the agent-setup chat stream with the canonical model, system prompt, the three
 * tools, and stop condition. Returns the raw StreamTextResult so callers decide how to
 * consume it (route → toUIMessageStreamResponse; harness → await fields).
 *
 * The return type is inferred (not annotated) so the concrete tool set flows through to
 * callers: annotating it as the default-generic StreamTextResult is not assignable from the
 * specific tool-set result (the tool generic is invariant).
 */
export function buildAgentChatStream(opts: BuildAgentChatStreamOptions) {
  const { messages, userId, onFinish } = opts;

  // runScan (find knob) — COSTS A SEARCH. Returns news ITEMS only; drafting is a separate,
  // user-initiated phase. The input also carries the config the UI derives.
  const runScan = tool({
    description:
      "Scan for news items. COSTS A SEARCH. Returns ITEMS ONLY — do NOT draft here; drafting is a separate step the reporter triggers after the items look right. Call this once there is a beat (scanningInstructions) and at least one source (X and/or web), and again for any retrieval critique that changes WHAT to find ('wider net', 'confirmed only', 'also watch @x'). The name is proposed, not required to scan.",
    inputSchema: z.object({
      name: z
        .string()
        .describe("Proposed agent name; the reporter can rename — required only at Save."),
      handles: z.array(z.string()).default([]),
      scanningInstructions: z.string(),
      searchX: z
        .boolean()
        .default(true)
        .describe("Monitor X. True unless the reporter chose web-only."),
      searchWeb: z.boolean().default(false),
      preferredDomains: z.array(z.string()).default([]),
    }),
    execute: async (input, { toolCallId }): Promise<ScanToolResult> => {
      const scanStartedAt = Date.now();

      // Gate: need a beat + at least one source. Refuse here (no Grok call) rather than pay
      // for a search.
      if (!input.scanningInstructions.trim() || (!input.searchX && !input.searchWeb)) {
        return {
          items: [],
          metrics: emptyScanMetrics(scanStartedAt),
          notice:
            "I need a beat to watch and at least one source (X and/or the web) before I can scan.",
        };
      }

      // Default recent window: last 7 days in YYYY-MM-DD format.
      const now = new Date();
      const toDate = now.toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fromDate = sevenDaysAgo.toISOString().slice(0, 10);

      // Normalize handles to bare usernames (strip @); the saved config validates HANDLE_RE.
      const handles = input.handles.map(normalizeHandle).filter(isValidHandle);

      let items: RawStory[];
      let metrics: ScanMetrics;
      try {
        const result = runScanStream({
          searchX: input.searchX,
          handles,
          fromDate,
          toDate,
          scanningInstructions: input.scanningInstructions,
          searchWeb: input.searchWeb,
          preferredDomains: input.preferredDomains,
          // Bound the scan like the saved run so a hung Grok call fails fast instead of
          // riding to the HTTP wall.
          abortSignal: AbortSignal.timeout(240_000),
        });
        const [output, m] = await Promise.all([
          result.output,
          extractMetrics(result, scanStartedAt),
        ]);
        metrics = m;
        items = output ? storiesFromOutput(output) : [];
      } catch {
        return {
          items: [],
          metrics: emptyScanMetrics(scanStartedAt),
          notice: "The scan didn't finish — try again, or narrow the beat or sources.",
        };
      }

      // Scan telemetry — must not throw.
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
          storyCount: items.length,
          triggeredFrom: "chat",
        },
      });

      // A successful-but-empty scan still needs a visible signal + a recovery path: surface a
      // notice so the card row renders it (and the model can offer to widen) instead of the
      // transcript showing nothing.
      if (items.length === 0) {
        return {
          items,
          metrics,
          notice:
            "No matching news in the last 7 days — want me to cast a wider net or adjust the sources?",
        };
      }
      return { items, metrics };
    },
  });

  // draft (write knob) — turn the most recent scan's items into one post each, in the current
  // voice. NO search. Used for the first draft AND for voice/style critiques ('punchier',
  // 'drop the hashtags', 'more formal').
  const draft = tool({
    description:
      "Turn the most recent scan's items into one post each, in the current voice. NO search — it reuses the items already on screen, so it's fast and cheap. Use it when the reporter is happy with the items and wants drafts, and again for any voice/style critique. Do not call it before a scan has produced items.",
    inputSchema: z.object({
      draftingInstructions: z.string(),
      exampleTweets: z.array(z.object({ url: z.string(), text: z.string() })).default([]),
    }),
    execute: async (input, { toolCallId, messages: turnMessages }): Promise<DraftToolResult> => {
      const startedAt = Date.now();
      // Prefer the in-turn messages (carry a scan result produced earlier in THIS turn);
      // fall back to the request history.
      const history = turnMessages ?? messages;
      const items = latestScanItems(history);
      if (items.length === 0) {
        return {
          stories: [],
          metrics: emptyScanMetrics(startedAt),
          notice: "Let's run a scan first — then I can draft those items in your voice.",
        };
      }
      const priorByKey = latestDraftByKey(history);
      const cfg = {
        draftingInstructions: input.draftingInstructions,
        exampleTweets: input.exampleTweets.map((t) => t.text),
      };
      const drafts = await draftItems(items, cfg);
      logDraftUsage(drafts, {
        user_id: userId,
        tool_call_id: toolCallId,
        metadata: { triggeredFrom: "chat" },
      });
      // A per-item failure falls back to its previous good draft (if any) so a re-draft never
      // wipes text the reporter already had; only a never-drafted item shows the empty state.
      const stories: PreviewStory[] = items.map((story, i) => {
        const d = drafts[i];
        return { ...story, draft: d?.ok ? d.text : (priorByKey[story.dedupeKey] ?? "") };
      });
      return { stories, metrics: emptyScanMetrics(startedAt) };
    },
  });

  // updateConfig (config knob) — record a setting change WITHOUT scanning/drafting.
  const updateConfig = tool({
    description:
      "Record a change to the agent's configuration — name, beat, sources (X handles / web domains), voice, or example tweets — WITHOUT running a scan or draft. Use whenever the reporter states or changes a setting ('also watch @handle', 'rename it', 'add this site', 'keep posts under 500 characters'). It does not search, draft, or save; it updates the live config the reporter sees.",
    inputSchema: configPatchSchema,
    execute: async (input) => {
      // Ephemeral: no model call, no search, NO DB write. The UI rebuilds the live config by
      // replaying these patches; echo it back so the model can confirm specifics.
      return { ok: true as const, applied: input };
    },
  });

  const tools = { runScan, draft, updateConfig };

  return streamText({
    model: CHAT_MODEL,
    system: CHAT_SYSTEM_PROMPT,
    messages,
    tools,
    stopWhen: stepCountIs(10),
    providerOptions: { ...GATEWAY_PROVIDER_OPTIONS },
    // The public onFinish is typed against the default ToolSet for ergonomics; cast to the
    // concrete inferred tool set so streamText accepts it. The event is structurally
    // compatible at runtime (callers read fields defensively); routed via `unknown` because
    // the invariant tool generic blocks a direct cast.
    onFinish: onFinish as unknown as GenerateTextOnEndCallback<typeof tools>,
  });
}
