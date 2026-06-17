// Chat-session persistence route.
// POST  — upsert a session's full UIMessage[] into chat_sessions.
// GET   — list the user's recent sessions (for the resume dropdown).
//
// chat_sessions schema (not in generated types — typed loosely per AGENTS.md):
//   id uuid pk, user_id uuid, session_id text, title text,
//   messages jsonb, created_at, updated_at
//   unique(user_id, session_id); RLS: auth.uid() = user_id

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Derive a title from the first user message text (≤ 60 chars). */
function deriveTitle(messages: unknown[]): string {
  for (const msg of messages) {
    if (!isRecord(msg) || msg.role !== "user") continue;
    // AI SDK v6 UIMessage: parts[] with { type: "text", text: string }
    if (Array.isArray(msg.parts)) {
      for (const part of msg.parts) {
        if (isRecord(part) && part.type === "text" && typeof part.text === "string") {
          const t = part.text.trim();
          if (t) return t.length > 60 ? `${t.slice(0, 57)}…` : t;
        }
      }
    }
    // Fallback: plain string content
    if (typeof msg.content === "string" && msg.content.trim()) {
      const t = msg.content.trim();
      return t.length > 60 ? `${t.slice(0, 57)}…` : t;
    }
  }
  return "New conversation";
}

// ---------------------------------------------------------------------------
// POST /api/agents/chat-session
// Body: { sessionId: string; messages: unknown[]; title?: string }
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const {
    sessionId,
    messages,
    title: titleFromClient,
  } = body as {
    sessionId: unknown;
    messages: unknown;
    title?: unknown;
  };

  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "sessionId required." }, { status: 400 });
  }
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages must be an array." }, { status: 400 });
  }

  const title =
    typeof titleFromClient === "string" && titleFromClient.trim()
      ? titleFromClient.trim()
      : deriveTitle(messages);

  // Upsert on (user_id, session_id) — RLS ensures ownership.
  // Cast to any to avoid fighting the generated types (table not tracked in-repo).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertError } = await (supabase as any).from("chat_sessions").upsert(
    {
      user_id: user.id,
      session_id: sessionId,
      title,
      messages,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,session_id" },
  );

  if (upsertError) {
    // Non-blocking: log but never 500 the chat.
    console.error("chat_sessions upsert failed", upsertError);
  }

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// GET /api/agents/chat-session
// Returns: { sessions: { sessionId, title, updatedAt }[] }
// ---------------------------------------------------------------------------
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("chat_sessions")
    .select("session_id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(15);

  if (error) {
    console.error("chat_sessions list failed", error);
    return NextResponse.json({ sessions: [] });
  }

  const sessions = (
    (data as { session_id: string; title: string; updated_at: string }[]) ?? []
  ).map((row) => ({
    sessionId: row.session_id,
    title: row.title,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ sessions });
}
