// Dev-only debug endpoint for the Oparax new-agent chat.
//
// POST /api/agents/chat-debug
//
// Drives the SAME buildAgentChatStream logic the live route uses, but with
// autoResolveClientTools: true so every tool (including setAgentConfig) resolves
// server-side. Maintains an in-memory session store across requests so
// multi-turn conversations carry full context.
//
// Request body:
//   { sessionId: string; userMessage: string; userEmail?: string; reset?: boolean }
//
// Response body:
//   { text: string; reasoning: string | null; toolCalls: ToolCallLog[]; durationMs: number }
//
// Guard: returns 404 in production. No auth beyond that — dev tool only.
//
// AI SDK v6 fields used (same approach as the former scripts/chat-debug.ts):
//   result.text          → PromiseLike<string>
//   result.reasoningText → PromiseLike<string | undefined>
//   result.steps         → PromiseLike<StepResult[]>  (toolCalls + toolResults per step)
//   result.response      → PromiseLike<{ messages: ResponseMessage[] }>

import type { ModelMessage } from "ai";

import { buildAgentChatStream } from "@/lib/chat/run-chat";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getFreshAccessToken } from "@/lib/x/tokens";

export const runtime = "nodejs";
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Module-scope state (persists across requests within the dev process).
// ---------------------------------------------------------------------------

/** In-memory session store: sessionId → growing ModelMessage array. */
const sessions = new Map<string, ModelMessage[]>();

/** Cache email → userId to avoid repeated admin API calls. */
const emailToUserId = new Map<string, string>();

const DEFAULT_DEBUG_EMAIL = "farzanmrz@gmail.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveUserId(email: string): Promise<string | null> {
  const cached = emailToUserId.get(email.toLowerCase());
  if (cached) return cached;

  const admin = createServiceRoleClient().auth.admin;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      emailToUserId.set(email.toLowerCase(), match.id);
      return match.id;
    }
    if (data.users.length < 200) break;
  }
  return null;
}

// ---------------------------------------------------------------------------
// POST /api/agents/chat-debug
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  // Production guard — this endpoint must never be reachable in prod.
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  // Parse body — plain typeof validation (AGENTS.md convention).
  const rawBody = (await req.json().catch(() => null)) as unknown;
  if (typeof rawBody !== "object" || rawBody === null) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const body = rawBody as Record<string, unknown>;

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
  const userMessage = typeof body.userMessage === "string" ? body.userMessage.trim() : null;
  const userEmail =
    typeof body.userEmail === "string" && body.userEmail.length > 0
      ? body.userEmail
      : DEFAULT_DEBUG_EMAIL;
  const reset = body.reset === true;

  if (!sessionId) {
    return Response.json({ error: "sessionId is required." }, { status: 400 });
  }
  if (!userMessage) {
    return Response.json({ error: "userMessage is required." }, { status: 400 });
  }

  // Resolve the user id via the service-role admin API.
  const userId = await resolveUserId(userEmail);
  if (!userId) {
    return Response.json(
      { error: `Could not resolve user for email: ${userEmail}` },
      { status: 400 },
    );
  }

  // Initialise or reset the session.
  if (reset || !sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  const messages = sessions.get(sessionId) as ModelMessage[];

  // Append the user turn.
  messages.push({ role: "user", content: userMessage });

  const startedAt = Date.now();

  // Reflect the resolved debug user's real X-connection state so the voice step
  // behaves identically to production. Service-role bypasses RLS, so scope by
  // user_id explicitly, and fetch a fresh user token so protected reads behave the
  // same in the harness (getFreshAccessToken persists any rotation). Best-effort.
  const serviceClient = createServiceRoleClient();
  const { data: xConn } = await serviceClient
    .from("x_connections")
    .select("x_username, x_user_id")
    .eq("user_id", userId)
    .maybeSingle<{ x_username: string; x_user_id: string }>();
  let accessToken: string | null = null;
  if (xConn) {
    try {
      accessToken = await getFreshAccessToken(serviceClient, userId);
    } catch (err) {
      console.warn("getFreshAccessToken (debug) failed", err);
    }
  }
  const xConnection = {
    connected: Boolean(xConn),
    username: xConn?.x_username ?? null,
    xUserId: xConn?.x_user_id ?? null,
    accessToken,
  };

  // Run the chat stream with server-side tool resolution.
  const result = buildAgentChatStream({
    messages,
    userId,
    autoResolveClientTools: true,
    xConnection,
  });

  // Await the stream to completion and extract structured fields.
  const [text, reasoningText, steps, response] = await Promise.all([
    result.text,
    result.reasoningText,
    result.steps,
    result.response,
  ]);

  const durationMs = Date.now() - startedAt;

  // Collect tool calls across all steps, paired with their results.
  type ToolCallLog = { name: string; input: unknown; output: unknown };
  const toolCalls: ToolCallLog[] = steps.flatMap((step) =>
    step.toolCalls.map((tc) => {
      const tr = step.toolResults.find((r) => r.toolCallId === tc.toolCallId);
      return {
        name: tc.toolName,
        input: tc.input,
        output: tr ? tr.output : null,
      };
    }),
  );

  // Persist the full assistant response (including tool calls/results) into the
  // session so the next turn carries faithful multi-turn context.
  messages.push(...response.messages);

  return Response.json({
    text,
    reasoning: reasoningText ?? null,
    toolCalls,
    durationMs,
  });
}
