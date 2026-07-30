// lib/agent/council-query.ts
//
// Pure query + shaping for the "Why this draft" council detail and the draft-history
// parent-chain. Every function here takes an already-scoped Supabase client — it never
// constructs one itself, so callers choose the auth boundary (RLS server client from
// `council-actions.ts`, today the only caller). Deliberately does NOT import
// `lib/agent/draft-council-run.ts`/`lib/sysprompts` — that chain is server-only AND drags
// the drafting prompts into anything that imports it; this module is read-only shaping,
// so it has no business depending on it. The `judgeVerdictShape` below is a parallel,
// intentionally minimal re-declaration of the legacy council judge's two keys (`winner`,
// `rationale`). #73 leaves `judge_verdict` null and stores judge metadata in `judge_review`, so
// this legacy shape remains only for historical rows.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { type ReasoningTraceState, reasoningTraceState } from "./reasoning-trace";
import { sumCosts } from "./usage-cost";

type Client = SupabaseClient<Database>;

const judgeVerdictShape = z.union([
  z.object({ winner: z.number().int(), rationale: z.string() }),
  z.object({ status: z.literal("invalid"), rationale: z.string() }),
]);

// Deliberately NOT read off the stored `usage.reasoningWithheldByProvider` flag. Until this
// slice that flag was written as a restatement of `reasoning == null`, so every traceless call
// carried it. Classifying off the reasoning-token count instead (`reasoning-trace.ts`) reads the
// same distinction out of rows already written, so history stops being described wrongly rather
// than only new rows getting it right.
function traceStateOf(call: NonNullable<ModelCallEmbed>): ReasoningTraceState {
  return reasoningTraceState(call.reasoning, call.usage);
}

export type CouncilMember = {
  draftId: string;
  model: string;
  output: string;
  reasoning: string | null;
  reasoningState: ReasoningTraceState;
  costUsd: number | null;
  isWinner: boolean;
};

type CouncilJudge = {
  model: string;
  reasoning: string | null;
  reasoningState: ReasoningTraceState;
  costUsd: number | null;
  winnerModel: string | null;
  rationale: string | null;
} | null;

export type CouncilGroup = {
  members: CouncilMember[];
  judge: CouncilJudge;
  totalCostUsd: number | null;
};

export type CouncilDetail =
  | { kind: "original"; council: CouncilGroup }
  | { kind: "revision"; revision: CouncilMember; originalCouncil: CouncilGroup | null }
  | { kind: "not_found" };

type ModelCallEmbed = {
  model: string;
  output: string | null;
  reasoning: string | null;
  usage: unknown;
  cost_usd: number | null;
} | null;

type DraftRow = {
  id: string;
  parent_draft_id: string | null;
  is_winner: boolean;
  judge_verdict: unknown;
  created_at: string;
  model_calls: ModelCallEmbed;
};

async function fetchModelCalls(
  supabase: Client,
  modelCallIds: string[],
): Promise<Map<string, NonNullable<ModelCallEmbed>>> {
  if (modelCallIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("model_calls")
    .select("id, model, output, reasoning, usage, cost_usd")
    .in("id", modelCallIds);
  if (error) throw error;
  return new Map((data ?? []).map((call) => [call.id, call]));
}

function toMember(row: DraftRow): CouncilMember | null {
  if (!row.model_calls) return null;
  return {
    draftId: row.id,
    model: row.model_calls.model,
    output: row.model_calls.output ?? "",
    reasoning: row.model_calls.reasoning,
    reasoningState: traceStateOf(row.model_calls),
    costUsd: row.model_calls.cost_usd,
    isWinner: row.is_winner,
  };
}

/** Shapes the judged-original council: the candidate members (`judge_verdict IS NULL`) plus
 *  the judge's own row (`judge_verdict IS NOT NULL`), if either survived. The current winner
 *  is read off each row's own `is_winner` flag — never off `judge_verdict.winner`'s array
 *  index, which is only meaningful at write time and would silently mis-point if a family
 *  failed and the surviving-candidate ordering ever shifted. */
function buildGroup(candidateRows: DraftRow[], judgeRows: DraftRow[]): CouncilGroup {
  const members = candidateRows.map(toMember).filter((m): m is CouncilMember => m !== null);
  const winnerModel = members.find((m) => m.isWinner)?.model ?? null;

  // The dialog displays ONE judge card (a single platform's judge, today the only case that
  // occurs), but the cost total below still sums EVERY judge row — not just the displayed one
  // — so it doesn't silently undercount the moment a story carries more than one platform's
  // judge (`PLATFORMS` growing past X).
  const judgeRow = judgeRows.find((r) => r.model_calls);
  let judge: CouncilJudge = null;
  if (judgeRow?.model_calls) {
    const parsed = judgeVerdictShape.safeParse(judgeRow.judge_verdict);
    judge = {
      model: judgeRow.model_calls.model,
      reasoning: judgeRow.model_calls.reasoning,
      reasoningState: traceStateOf(judgeRow.model_calls),
      costUsd: judgeRow.model_calls.cost_usd,
      winnerModel,
      rationale: parsed.success ? parsed.data.rationale : null,
    };
  }

  const totalCostUsd = sumCosts([
    ...members.map((m) => m.costUsd),
    ...judgeRows.map((r) => r.model_calls?.cost_usd ?? null),
  ]);
  return { members, judge, totalCostUsd };
}

const DRAFT_DETAIL_SELECT =
  "id, parent_draft_id, is_winner, judge_verdict, created_at, model_call_id";

/** The current winner's provenance for one story: every `drafts` row sharing
 *  `(source_post_id, agent_id)`, partitioned by `parent_draft_id IS NULL` (the
 *  originally judged council) vs not (a revision). If the current winner is an original
 *  member, the council IS the judged set. If the winner is a revision, its single model
 *  call is the primary content and the judged original council is returned alongside for
 *  the dialog's collapsed "View original council" disclosure — the two are never merged
 *  into one card set, so a superseded council is never presented as if it were current. */
export async function queryCouncilDetail(
  supabase: Client,
  sourcePostId: string,
  agentId: string,
): Promise<CouncilDetail> {
  const { data, error } = await supabase
    .from("drafts")
    .select(DRAFT_DETAIL_SELECT)
    .eq("source_post_id", sourcePostId)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const draftRows = data ?? [];
  const modelCallIds = [
    ...new Set(draftRows.map((row) => row.model_call_id).filter((id): id is string => id !== null)),
  ];
  const modelCallsById = await fetchModelCalls(supabase, modelCallIds);
  const rows: DraftRow[] = draftRows.map((row) => ({
    ...row,
    model_calls: modelCallsById.get(row.model_call_id) ?? null,
  }));
  const winnerRow = rows.find((r) => r.is_winner);
  if (!winnerRow) return { kind: "not_found" };

  const originals = rows.filter((r) => r.parent_draft_id === null);
  const candidateRows = originals.filter((r) => r.judge_verdict === null);
  const judgeRows = originals.filter((r) => r.judge_verdict !== null);

  if (winnerRow.parent_draft_id === null) {
    return { kind: "original", council: buildGroup(candidateRows, judgeRows) };
  }

  const revision = toMember(winnerRow);
  if (!revision) return { kind: "not_found" };
  const originalCouncil = candidateRows.length > 0 ? buildGroup(candidateRows, judgeRows) : null;
  return { kind: "revision", revision, originalCouncil };
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
  // root (`parent_draft_id === null`), which is always an original council member — a
  // judge row is never any node's parent (`applyCorrection` only ever points a revision's
  // `parent_draft_id` at a previously-winning draft id).
  const chain: HistoryRow[] = [];
  let cursor: string | null = winningDraftId;
  while (cursor) {
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
