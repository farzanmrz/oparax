// Chat route — AI SDK Gateway streamText with config-compiler tools + runScan.
//
// The streamText configuration (model, system prompt, tools, runScan, stop
// condition) lives in lib/chat/run-chat.ts so this route and the dev-only HTTP
// debug endpoint (app/api/agents/chat-debug/route.ts) share the exact same chat
// logic. This
// route owns only the HTTP concerns: auth, body parsing, attribution ids, and
// the onFinish telemetry (logUsage + logChatTurn).

import { convertToModelMessages } from "ai";

import { CHAT_MODEL } from "@/lib/ai/providers";
import { buildAgentChatStream } from "@/lib/chat/run-chat";
import { collectToolCalls, logChatTurn } from "@/lib/chat/session-log";
import { createClient } from "@/lib/supabase/server";
import { withUsageContext } from "@/lib/usage/context";
import { logUsage } from "@/lib/usage/log";

export const runtime = "nodejs";
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// POST /api/agents/chat
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  // Auth guard — identical to scan route.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Authentication required.", {
      status: 401,
    });
  }

  const startedAt = Date.now();

  // Parse request body — plain typeof validation, no zod for HTTP body (AGENTS.md convention).
  const rawBody = (await req.json().catch(() => null)) as unknown;
  if (typeof rawBody !== "object" || rawBody === null) {
    return new Response("Invalid JSON.", {
      status: 400,
    });
  }
  const body = rawBody as Record<string, unknown>;
  const { messages } = body;
  if (!Array.isArray(messages)) {
    return new Response("messages must be an array.", {
      status: 400,
    });
  }

  // Attribution ids for usage telemetry. The AI SDK useChat transport sends the
  // conversation `id` in the request body; the triggering turn is the last message
  // in `messages`. Reading these server-side means no chat-UI change is needed.
  const sessionId = typeof body.id === "string" ? body.id : null;
  const lastMessage = messages[messages.length - 1] as { id?: unknown } | undefined;
  const messageId =
    lastMessage && typeof lastMessage.id === "string"
      ? lastMessage.id
      : typeof body.messageId === "string"
        ? body.messageId
        : null;

  // Chat-log session id: prefer the stable per-mount id sent by the client;
  // fall back to the conversation id or a fresh UUID.
  const chatSessionId =
    typeof body.sessionId === "string" && body.sessionId.length > 0
      ? body.sessionId
      : (sessionId ?? crypto.randomUUID());

  // Compute the latest user input (text of the last role:"user" message).
  type RawMessage = { role?: unknown; parts?: unknown[]; content?: unknown };
  const userMessages = (messages as RawMessage[]).filter((m) => m.role === "user");
  const lastUserMsg = userMessages[userMessages.length - 1] as RawMessage | undefined;
  const lastUserText: string | null = (() => {
    if (!lastUserMsg) return null;
    // AI SDK v6 UIMessage shape: parts array with { type: "text", text: string }
    if (Array.isArray(lastUserMsg.parts)) {
      const textParts = lastUserMsg.parts.filter(
        (p): p is { type: string; text: string } =>
          typeof p === "object" && p !== null && (p as { type?: unknown }).type === "text",
      );
      if (textParts.length > 0) return textParts.map((p) => p.text).join("");
    }
    // Fallback: plain string content
    if (typeof lastUserMsg.content === "string") return lastUserMsg.content;
    return null;
  })();

  // turnIndex = number of user messages seen so far (0-based: first turn is index 0).
  const turnIndex = Math.max(0, userMessages.length - 1);

  // convertToModelMessages is async in AI SDK v6.
  const modelMessages = await convertToModelMessages(messages);

  // Stream the chat inside the usage-attribution context so logUsage() (here and
  // inside the runScan tool) auto-attributes to this user+session. The streamText
  // config (model, system prompt, the single runScan tool, stop condition) is
  // built by buildAgentChatStream — shared with the debug harness.
  return withUsageContext({ userId: user.id, sessionId, messageId }, () => {
    const result = buildAgentChatStream({
      messages: modelMessages,
      userId: user.id,
      onFinish: async (event) => {
        // Telemetry — must not break the response (non-throwing).
        try {
          const { inputTokens, outputTokens } = event.totalUsage;
          // The gateway reports the resolved BYOK provider + a market-rate cost
          // (its own `cost` is ~$0 for BYOK). Read both defensively.
          const gw = (event.providerMetadata?.gateway ?? {}) as Record<string, unknown>;
          const routing = (gw.routing ?? {}) as Record<string, unknown>;
          const resolved = (routing.finalProvider ?? routing.resolvedProvider) as
            | string
            | undefined;
          const marketCost = gw.marketCost != null ? Number(gw.marketCost) : null;
          await logUsage({
            kind: "chat",
            provider: "gateway",
            resolved_provider: resolved ?? null,
            model: CHAT_MODEL,
            user_id: user.id,
            input_tokens: inputTokens ?? null,
            output_tokens: outputTokens ?? null,
            gatewayMarketCost: marketCost,
            gateway_generation_id: typeof gw.generationId === "string" ? gw.generationId : null,
          });
        } catch (err) {
          console.error("logUsage (chat) failed", err);
        }

        // Per-turn chat logging for debugging.
        // onFinish event shape (AI SDK v6): extends StepResult + { steps, totalUsage, ... }
        // - event.text          → final assistant text (last step's text content joined)
        // - event.reasoningText → reasoning text (string | undefined)
        // - event.steps         → StepResult[], each with toolCalls + toolResults
        try {
          await logChatTurn({
            userId: user.id,
            sessionId: chatSessionId,
            turnIndex,
            userInput: lastUserText,
            assistantText: event.text || null,
            reasoning: event.reasoningText ?? null,
            toolCalls: collectToolCalls(event.steps),
            durationMs: Date.now() - startedAt,
          });
        } catch (err) {
          console.error("logChatTurn failed", err);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  });
}
