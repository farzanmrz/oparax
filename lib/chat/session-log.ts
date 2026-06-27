import { createServiceRoleClient } from "@/lib/supabase/service-role";

let _client: ReturnType<typeof createServiceRoleClient> | null = null;
function serviceClient() {
  _client ??= createServiceRoleClient();
  return _client;
}

export interface ToolCallLog {
  name: string;
  input?: unknown;
  output?: unknown;
}

/** Flatten AI SDK v6 steps into a tool-call log, pairing each call with its result. */
export function collectToolCalls(
  steps: {
    toolCalls: { toolName: string; toolCallId: string; input?: unknown }[];
    toolResults: { toolCallId: string; output: unknown }[];
  }[],
): ToolCallLog[] {
  return steps.flatMap((step) =>
    step.toolCalls.map((tc) => {
      const tr = step.toolResults.find((r) => r.toolCallId === tc.toolCallId);
      return { name: tc.toolName, input: tc.input, output: tr ? tr.output : undefined };
    }),
  );
}

export interface ChatTurnLog {
  userId: string;
  sessionId: string;
  turnIndex: number;
  userInput: string | null;
  assistantText: string | null;
  reasoning: string | null;
  toolCalls: ToolCallLog[];
  durationMs: number | null;
}

/** Insert one chat exchange into chat_logs. Non-throwing (telemetry must never break a flow). */
export async function logChatTurn(turn: ChatTurnLog): Promise<void> {
  try {
    // chat_logs is not yet in the generated Database types. Cast to a minimal
    // structural type so we can insert without regenerating the full types file
    // (per AGENTS.md guidance).
    const client = serviceClient() as unknown as {
      from: (table: string) => {
        insert: (row: Record<string, unknown>) => Promise<unknown>;
      };
    };
    await client.from("chat_logs").insert({
      user_id: turn.userId,
      session_id: turn.sessionId,
      turn_index: turn.turnIndex,
      user_input: turn.userInput,
      assistant_text: turn.assistantText,
      reasoning: turn.reasoning,
      tool_calls: turn.toolCalls,
      duration_ms: turn.durationMs,
    });
  } catch (error) {
    console.error("logChatTurn failed", error);
  }
}
