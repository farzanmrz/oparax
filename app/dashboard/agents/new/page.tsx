import type { UIMessage } from "ai";
import type { RecentSession } from "@/components/agents/agent-chat";
import { AgentChat } from "@/components/agents/agent-chat";
import { createClient } from "@/lib/supabase/server";

/**
 * New-agent page: chat-first create flow.
 *
 * Supports resuming a past session via ?session=<sessionId>.
 * Also fetches the user's recent sessions for the resume dropdown.
 *
 * @returns the create-agent page
 */
export default async function NewAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const resumeSessionId = typeof params.session === "string" ? params.session.trim() : null;

  const [
    { data: connection },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("x_connections").select("id").maybeSingle<{ id: string }>(),
    supabase.auth.getUser(),
  ]);

  // Prefer user_metadata.avatar_url (set by OAuth providers); null if absent.
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const avatarUrl = typeof meta.avatar_url === "string" && meta.avatar_url ? meta.avatar_url : null;

  // Fetch user's recent sessions for the dropdown (always, regardless of resume).
  // chat_sessions is not in the generated types — cast loosely per AGENTS.md.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessionsData } = user
    ? await (supabase as any)
        .from("chat_sessions")
        .select("session_id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(15)
    : { data: null };

  const recentSessions: RecentSession[] = (
    (sessionsData as { session_id: string; title: string; updated_at: string }[] | null) ?? []
  ).map((row) => ({
    sessionId: row.session_id,
    title: row.title,
    updatedAt: row.updated_at,
  }));

  // If a session param is present, attempt to load that session's messages.
  let initialMessages: UIMessage[] | undefined;
  let resolvedSessionId: string | undefined;

  if (resumeSessionId && user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessionRow } = await (supabase as any)
      .from("chat_sessions")
      .select("messages")
      .eq("session_id", resumeSessionId)
      .maybeSingle();

    const row = sessionRow as { messages: UIMessage[] } | null;
    if (row && Array.isArray(row.messages) && row.messages.length > 0) {
      initialMessages = row.messages as UIMessage[];
      resolvedSessionId = resumeSessionId;
    }
    // If not found / no messages → fall through to fresh chat (both props stay undefined)
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <AgentChat
        xConnected={Boolean(connection)}
        userAvatarUrl={avatarUrl}
        initialMessages={initialMessages}
        sessionId={resolvedSessionId}
        recentSessions={recentSessions}
      />
    </div>
  );
}
