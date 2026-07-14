import { createAgentUIStreamResponse } from "ai";
import { createDeskAgent } from "@/lib/agent/agent";
import { createClient } from "@/lib/supabase/server";

// The agent turn fans out to DeepSeek reasoning + up to five parallel grok /responses calls
// (1 x_keyword_search + 3–4 x_semantic_search, each bounded at 150s in xai.ts). Match the cron
// route's ceiling so a long fan-out finishes in-function instead of the platform default cutting
// the stream mid-flight (which surfaces to the reporter as a dropped page, not an error). Fluid
// Compute only bills active CPU, so a high ceiling costs nothing on fast turns.
export const maxDuration = 300;

// A streamed agent turn commits HTTP 200 before any token, so a mid-stream failure is invisible
// to Vercel's status-based error views. Without an onError the AI SDK masks the real cause to a
// generic "An error occurred." AND logs nothing — a JSON-parse abort in the tool loop then dies
// with no server trace (the gap that made the first prod failure un-diagnosable). Log the true
// error here, and hand the reporter one honest, retryable line instead of the mask.
function reportStreamError(error: unknown): string {
  console.error("[/api/chat] stream error:", error);
  const message = error instanceof Error ? error.message : String(error);
  // A malformed tool-call from the model reads as a JSON-parse failure — name it plainly and tell
  // the reporter what to do, rather than leaking the raw offending payload into the chat.
  if (/JSON parsing failed|Invalid.*tool|tool call/i.test(message)) {
    return "The search step hit a formatting error mid-request. Please send that message again.";
  }
  return "Something went wrong on that turn. Please try again.";
}

// The create-agent chat turn. Supabase-authed on same-origin cookies (proxy.ts refreshes the
// session); anonymous POST fails closed with 401. A fresh agent per request so the injected
// clock block is stamped at this turn's start.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let messages: unknown;
  try {
    messages = (await request.json())?.messages;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(messages)) {
    return Response.json({ error: "messages must be an array" }, { status: 400 });
  }
  // Two failure phases, two guards. `onError` only sees errors raised once the stream is live;
  // createAgentUIStreamResponse first awaits validateUIMessages, which throws on a malformed
  // (but array-shaped) payload BEFORE any stream exists — that reject would otherwise surface as
  // an untagged 500. Catch it here so the same "log the truth, return an honest status" contract
  // covers setup too.
  try {
    return await createAgentUIStreamResponse({
      agent: createDeskAgent(),
      uiMessages: messages,
      onError: reportStreamError,
    });
  } catch (error) {
    console.error("[/api/chat] setup error:", error);
    return Response.json({ error: "invalid message payload" }, { status: 400 });
  }
}
