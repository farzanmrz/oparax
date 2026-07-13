import { createAgentUIStreamResponse } from "ai";
import { createDeskAgent } from "@/lib/agent/agent";
import { createClient } from "@/lib/supabase/server";

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
  return createAgentUIStreamResponse({ agent: createDeskAgent(), uiMessages: messages });
}
