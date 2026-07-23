// lib/agent/council-query.ts
//
// Pure query + shaping for the "Why this draft" council detail and the draft-history
// parent-chain. Every function here takes an already-scoped Supabase client — it never
// constructs one itself, so callers choose the auth boundary (RLS server client from
// `council-actions.ts`, today the only caller). Deliberately does NOT import
// `lib/agent/draft-council-run.ts`/`lib/sysprompts` — that chain is server-only AND drags
// the drafting prompts into anything that imports it; this module is read-only shaping,
// so it has no business depending on it. The `judgeVerdictShape` below is a parallel,
// intentionally minimal re-declaration of the two keys `draft-council-run.ts`'s
// `judgeVerdictSchema` actually writes (`winner`, `rationale` — confirmed by reading that
// file; there is no third `reasons` key despite the design mock showing bulleted verdict
// reasons — the mock's copy doesn't match what the judge model is asked to produce).
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { sumCosts } from "./usage-cost";

type Client = SupabaseClient<Database>;

const judgeVerdictShape = z.object({
  winner: z.number().int(),
  rationale: z.string(),
});

function reasoningWithheld(usage: unknown): boolean {
  return (
    (usage as { reasoningWithheldByProvider?: unknown } | null)?.reasoningWithheldByProvider ===
    true
  );
}

export type CouncilMember = {
  postDraftId: string;
  model: string;
  output: string;
  reasoning: string | null;
  reasoningWithheldByProvider: boolean;
  costUsd: number | null;
  isWinner: boolean;
};

export type CouncilJudge = {
  model: string;
  reasoning: string | null;
  reasoningWithheldByProvider: boolean;
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

function toMember(row: DraftRow): CouncilMember | null {
  if (!row.model_calls) return null;
  return {
    postDraftId: row.id,
    model: row.model_calls.model,
    output: row.model_calls.output ?? "",
    reasoning: row.model_calls.reasoning,
    reasoningWithheldByProvider: reasoningWithheld(row.model_calls.usage),
    costUsd: row.model_calls.cost_usd,
    isWinner: row.is_winner,
  };
}

/** Shapes the judged-original council: the candidate members (`judge_verdict IS NULL`) plus
 *  the judge's own row (`judge_verdict IS NOT NULL`), if either survived. The current winner
 *  is read off each row's own `is_winner` flag — never off `judge_verdict.winner`'s array
 *  index, which is only meaningful at write time and would silently mis-point if a family
 *  failed and the surviving-candidate ordering ever shifted. */
function buildGroup(candidateRows: DraftRow[], judgeRow: DraftRow | undefined): CouncilGroup {
  const members = candidateRows.map(toMember).filter((m): m is CouncilMember => m !== null);
  const winnerModel = members.find((m) => m.isWinner)?.model ?? null;

  let judge: CouncilJudge = null;
  if (judgeRow?.model_calls) {
    const parsed = judgeVerdictShape.safeParse(judgeRow.judge_verdict);
    judge = {
      model: judgeRow.model_calls.model,
      reasoning: judgeRow.model_calls.reasoning,
      reasoningWithheldByProvider: reasoningWithheld(judgeRow.model_calls.usage),
      costUsd: judgeRow.model_calls.cost_usd,
      winnerModel,
      rationale: parsed.success ? parsed.data.rationale : null,
    };
  }

  const totalCostUsd = sumCosts([...members.map((m) => m.costUsd), judge?.costUsd ?? null]);
  return { members, judge, totalCostUsd };
}

const DRAFT_DETAIL_SELECT =
  "id, parent_draft_id, is_winner, judge_verdict, created_at, model_calls(model, output, reasoning, usage, cost_usd)";

/** The current winner's provenance for one story: every `post_drafts` row sharing
 *  `(source_post_id, experiment_id)`, partitioned by `parent_draft_id IS NULL` (the
 *  originally judged council) vs not (a revision). If the current winner is an original
 *  member, the council IS the judged set. If the winner is a revision, its single model
 *  call is the primary content and the judged original council is returned alongside for
 *  the dialog's collapsed "View original council" disclosure — the two are never merged
 *  into one card set, so a superseded council is never presented as if it were current. */
export async function queryCouncilDetail(
  supabase: Client,
  sourcePostId: string,
  experimentId: string,
): Promise<CouncilDetail> {
  const { data, error } = await supabase
    .from("post_drafts")
    .select(DRAFT_DETAIL_SELECT)
    .eq("source_post_id", sourcePostId)
    .eq("experiment_id", experimentId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as DraftRow[];
  const winnerRow = rows.find((r) => r.is_winner);
  if (!winnerRow) return { kind: "not_found" };

  const originals = rows.filter((r) => r.parent_draft_id === null);
  const candidateRows = originals.filter((r) => r.judge_verdict === null);
  const judgeRow = originals.find((r) => r.judge_verdict !== null);

  if (winnerRow.parent_draft_id === null) {
    return { kind: "original", council: buildGroup(candidateRows, judgeRow) };
  }

  const revision = toMember(winnerRow);
  if (!revision) return { kind: "not_found" };
  const originalCouncil = candidateRows.length > 0 ? buildGroup(candidateRows, judgeRow) : null;
  return { kind: "revision", revision, originalCouncil };
}

export type HistoryVersion = {
  postDraftId: string;
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
 *  winner — ONE batched fetch of every `post_drafts` row for the story (not one query per
 *  chain hop), then the chain itself is built in memory by following `parent_draft_id`
 *  pointers through a Map. */
export async function queryDraftHistory(
  supabase: Client,
  winningPostDraftId: string,
): Promise<DraftHistoryDetail> {
  const { data: base, error: baseError } = await supabase
    .from("post_drafts")
    .select("source_post_id, experiment_id")
    .eq("id", winningPostDraftId)
    .maybeSingle();
  if (baseError) throw baseError;
  if (!base) return { kind: "not_found" };

  const { data, error } = await supabase
    .from("post_drafts")
    .select("id, parent_draft_id, feedback, created_at, model_calls(output)")
    .eq("source_post_id", base.source_post_id)
    .eq("experiment_id", base.experiment_id);
  if (error) throw error;

  const rows = (data ?? []) as unknown as HistoryRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));

  // Newest-first by construction: start at the winner and walk parent pointers up to the
  // root (`parent_draft_id === null`), which is always an original council member — a
  // judge row is never any node's parent (`applyCorrection` only ever points a revision's
  // `parent_draft_id` at a previously-winning draft id).
  const chain: HistoryRow[] = [];
  let cursor: string | null = winningPostDraftId;
  while (cursor) {
    const node = byId.get(cursor);
    if (!node) break;
    chain.push(node);
    cursor = node.parent_draft_id;
  }
  if (chain.length === 0) return { kind: "not_found" };

  const versions: HistoryVersion[] = chain.map((row, i) => ({
    postDraftId: row.id,
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
