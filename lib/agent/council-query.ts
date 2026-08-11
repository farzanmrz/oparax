// lib/agent/council-query.ts
//
// Pure query + shaping for the draft-history parent-chain. Every function here takes an
// already-scoped Supabase client — it never constructs one itself, so callers choose the auth
// boundary (RLS server client from `council-actions.ts`, today the only caller). Deliberately
// does NOT import `lib/agent/draft-council-run.ts`/`lib/sysprompts` — that chain is
// server-only AND drags the drafting prompts into anything that imports it; this module is
// read-only shaping, so it has no business depending on it.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type ModelCallEmbed = {
  output: string | null;
} | null;

async function fetchModelCalls(
  supabase: Client,
  modelCallIds: string[],
): Promise<Map<string, NonNullable<ModelCallEmbed>>> {
  if (modelCallIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("model_calls")
    .select("id, output")
    .in("id", modelCallIds);
  if (error) throw error;
  return new Map((data ?? []).map((call) => [call.id, call]));
}

export type HistoryVersion = {
  draftId: string;
  depth: number; // 0 = the original council's winner, increasing per correction applied
  createdAt: string;
  isCurrent: boolean;
  text: string;
  /** The reply that produced THIS version — null on the original (depth 0). */
  appliedFeedback: string | null;
};

export type Correction = { reply: string; applied: string };

export type DraftHistoryDetail =
  | { kind: "found"; versions: HistoryVersion[]; corrections: Correction[] } // versions newest-first, corrections oldest-first
  | { kind: "not_found" };

type HistoryRow = {
  id: string;
  parent_draft_id: string | null;
  feedback: string | null;
  created_at: string;
  model_calls: { output: string | null } | null;
};

/** Walks the `parent_draft_id` chain from the current winner back to the original council's
 *  winner — ONE batched fetch of every `drafts` row for the story (not one query per
 *  chain hop), then the chain itself is built in memory by following `parent_draft_id`
 *  pointers through a Map. */
export async function queryDraftHistory(
  supabase: Client,
  winningDraftId: string,
): Promise<DraftHistoryDetail> {
  const { data: base, error: baseError } = await supabase
    .from("drafts")
    .select("source_post_id, agent_id")
    .eq("id", winningDraftId)
    .maybeSingle();
  if (baseError) throw baseError;
  if (!base) return { kind: "not_found" };

  const { data, error } = await supabase
    .from("drafts")
    .select("id, parent_draft_id, feedback, created_at, model_call_id")
    .eq("source_post_id", base.source_post_id)
    .eq("agent_id", base.agent_id);
  if (error) throw error;

  const draftRows = data ?? [];
  const modelCallIds = [
    ...new Set(draftRows.map((row) => row.model_call_id).filter((id): id is string => id !== null)),
  ];
  const modelCallsById = await fetchModelCalls(supabase, modelCallIds);
  const rows: HistoryRow[] = draftRows.map((row) => ({
    ...row,
    model_calls: modelCallsById.get(row.model_call_id) ?? null,
  }));
  const byId = new Map(rows.map((r) => [r.id, r]));

  // Newest-first by construction: start at the winner and walk parent pointers up to the
  // root (`parent_draft_id === null`), which is always an original council member.
  const chain: HistoryRow[] = [];
  const visited = new Set<string>();
  let cursor: string | null = winningDraftId;
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const node = byId.get(cursor);
    if (!node) break;
    chain.push(node);
    cursor = node.parent_draft_id;
  }
  if (chain.length === 0) return { kind: "not_found" };

  const versions: HistoryVersion[] = chain.map((row, i) => ({
    draftId: row.id,
    depth: chain.length - 1 - i,
    createdAt: row.created_at,
    isCurrent: i === 0,
    text: row.model_calls?.output ?? "",
    appliedFeedback: row.feedback,
  }));

  const corrections: Correction[] = chain
    .filter((row): row is HistoryRow & { feedback: string } => row.feedback !== null)
    .reverse() // oldest-first for the thread, versions above stay newest-first
    .map((row) => ({ reply: row.feedback, applied: row.model_calls?.output ?? "" }));

  return { kind: "found", versions, corrections };
}
