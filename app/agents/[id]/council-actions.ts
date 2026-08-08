// app/agents/[id]/council-actions.ts
//
// Thin "use server" wrappers around lib/agent/council-query.ts's pure query/shaping —
// this file's only job is supplying the RLS-scoped server client. Both actions are plain
// reads through `drafts` (EXISTS-joined to `agents`, so the RLS client scopes
// ownership automatically): no admin client, no model calls, no writes. Never import
// `draft-council-run.ts`/`lib/sysprompts` here — council-dialog.tsx/draft-menu.tsx
// call these two actions directly from a client component, so anything this file imports
// is reachable from the client bundle boundary.
"use server";

import type { CouncilDetail, DraftHistoryDetail } from "@/lib/agent/council-query";
import { queryCouncilDetail, queryDraftHistory } from "@/lib/agent/council-query";
import {
  type DraftConstruction,
  draftConstructionFromUsage,
  draftOnBeatReasonFromUsage,
} from "@/lib/agent/draft-construction";
import { reasoningTraceState } from "@/lib/agent/reasoning-trace";
import { createClient } from "@/lib/supabase/server";

export type DraftReasoningResult =
  | {
      state: "found";
      onBeatReason: string;
      construction: DraftConstruction | null;
      edited: boolean;
    }
  | { state: "withheld" | "none"; onBeatReason: null; edited: boolean };

/** Legacy rows predate `usage.draftOnBeatReason`. This fallback extracts a single line but
 * never renders the provider trace itself. */
function legacyOnBeatReasonOf(reasoning: string): string | null {
  const matches = [...reasoning.matchAll(/(?:^|\n)On beat:\s*yes\s*—\s*([^\r\n]+)/gi)];
  const match = matches.at(-1);
  const onBeatReason = match?.[1]?.trim();
  return onBeatReason || null;
}

export async function fetchCouncilDetail(
  sourcePostId: string,
  agentId: string,
): Promise<CouncilDetail> {
  const supabase = await createClient();
  return queryCouncilDetail(supabase, sourcePostId, agentId);
}

export async function fetchDraftHistory(winningDraftId: string): Promise<DraftHistoryDetail> {
  const supabase = await createClient();
  return queryDraftHistory(supabase, winningDraftId);
}

export async function getDraftReasoning(draftId: string): Promise<DraftReasoningResult> {
  const supabase = await createClient();
  const { data: base, error: baseError } = await supabase
    .from("drafts")
    .select("source_post_id, agent_id")
    .eq("id", draftId)
    .maybeSingle();
  if (baseError) throw baseError;
  if (!base) return { state: "none", onBeatReason: null, edited: false };

  const { data: drafts, error: draftsError } = await supabase
    .from("drafts")
    .select("id, parent_draft_id, model_call_id")
    .eq("source_post_id", base.source_post_id)
    .eq("agent_id", base.agent_id);
  if (draftsError) throw draftsError;

  const callIds = [...new Set((drafts ?? []).map((draft) => draft.model_call_id))];
  const { data: calls, error: callsError } = await supabase
    .from("model_calls")
    .select("id, model, reasoning, usage")
    .in("id", callIds);
  if (callsError) throw callsError;

  const draftsById = new Map((drafts ?? []).map((draft) => [draft.id, draft]));
  const callsById = new Map((calls ?? []).map((call) => [call.id, call]));
  const visited = new Set<string>();
  let cursor: string | null = draftId;
  let edited = false;
  let withheld = false;

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const draft = draftsById.get(cursor);
    if (!draft) break;
    const call = callsById.get(draft.model_call_id);
    if (call?.model === "human-edit") {
      edited = true;
    } else if (call) {
      const onBeatReason =
        draftOnBeatReasonFromUsage(call.usage) ??
        (call.reasoning ? legacyOnBeatReasonOf(call.reasoning) : null);
      if (onBeatReason) {
        return {
          state: "found",
          onBeatReason,
          construction: draftConstructionFromUsage(call.usage),
          edited,
        };
      }
      if (reasoningTraceState(call.reasoning, call.usage) === "withheld") withheld = true;
    }
    cursor = draft.parent_draft_id;
  }

  return withheld
    ? { state: "withheld", onBeatReason: null, edited }
    : { state: "none", onBeatReason: null, edited };
}
