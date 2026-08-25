// app/agents/[id]/council-actions.ts
//
// Thin "use server" wrappers around lib/agent/council-query.ts's pure query/shaping —
// this file's only job is supplying the RLS-scoped server client. Both actions are plain
// reads through `drafts` (EXISTS-joined to `agents`, so the RLS client scopes
// ownership automatically): no admin client, no model calls, no writes. Never import
// `draft-council-run.ts`/`lib/sysprompts` here — draft-menu.tsx calls these actions
// directly from a client component, so anything this file imports is reachable from the
// client bundle boundary.
"use server";

import { z } from "zod";
import type { DraftHistoryDetail } from "@/lib/agent/council-query";
import { queryDraftHistory } from "@/lib/agent/council-query";
import {
  type DraftConstruction,
  draftConstructionFromUsage,
  draftOnBeatReasonFromUsage,
} from "@/lib/agent/draft-construction";
import { reasoningTraceState } from "@/lib/agent/reasoning-trace";
import { createClient } from "@/lib/supabase/server";

const persistedNewsPointsSchema = z
  .array(
    z.object({
      reason: z.string().trim().min(1),
      point: z.string().trim().min(1),
    }),
  )
  .min(1);

export type DraftReasoningPoint = { reason: string; point: string };

export type DraftReasoningResult =
  | {
      state: "found";
      onBeatReason: string | null;
      newsPoints: DraftReasoningPoint[] | null;
      construction: DraftConstruction | null;
      edited: boolean;
    }
  | { state: "withheld" | "none"; onBeatReason: null; newsPoints: null; edited: boolean };

/** Legacy rows predate `usage.draftOnBeatReason`. This reads the verdict notes that
 * draft-write appended after the provider trace, never the trace itself. */
function legacyOnBeatReasonOf(reasoning: string): string | null {
  const appendedNotesAt = reasoning.lastIndexOf("\n\nOn beat:");
  const notes =
    appendedNotesAt >= 0
      ? reasoning.slice(appendedNotesAt + 2)
      : reasoning.startsWith("On beat:")
        ? reasoning
        : null;
  const match = notes?.match(
    /^On beat:\s*yes\s*—\s*([^\r\n]+)\r?\nTitle:\r?\n[\s\S]*\r?\nSynthesis:\r?\n[\s\S]+$/i,
  );
  const onBeatReason = match?.[1].trim();
  return onBeatReason || null;
}

export async function fetchDraftHistory(winningDraftId: string): Promise<DraftHistoryDetail> {
  const supabase = await createClient();
  return queryDraftHistory(supabase, winningDraftId);
}

export async function getDraftReasoning(draftId: string): Promise<DraftReasoningResult> {
  const supabase = await createClient();
  const { data: base, error: baseError } = await supabase
    .from("drafts")
    .select("source_post_id, agent_id, news_points, on_beat_reason")
    .eq("id", draftId)
    .maybeSingle();
  if (baseError) throw baseError;
  if (!base) return { state: "none", onBeatReason: null, newsPoints: null, edited: false };

  const parsedPoints =
    base.news_points === null ? null : persistedNewsPointsSchema.safeParse(base.news_points);
  const newsPoints = parsedPoints?.success ? parsedPoints.data : null;
  const directOnBeatReason = base.on_beat_reason?.trim() || null;

  const { data: drafts, error: draftsError } = await supabase
    .from("drafts")
    .select("id, parent_draft_id, model_call_id")
    .eq("source_post_id", base.source_post_id)
    .eq("agent_id", base.agent_id);
  if (draftsError) throw draftsError;

  const callIds = [
    ...new Set(
      (drafts ?? []).map((draft) => draft.model_call_id).filter((id): id is string => id !== null),
    ),
  ];
  const { data: calls, error: callsError } = callIds.length
    ? await supabase.from("model_calls").select("id, model, reasoning, usage").in("id", callIds)
    : { data: [], error: null };
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
    const call = draft.model_call_id ? callsById.get(draft.model_call_id) : undefined;
    if (call?.model === "human-edit") {
      edited = true;
    } else if (call) {
      const construction = draftConstructionFromUsage(call.usage);
      const onBeatReason =
        draftOnBeatReasonFromUsage(call.usage) ??
        (call.reasoning ? legacyOnBeatReasonOf(call.reasoning) : null);
      if (onBeatReason || construction) {
        return {
          state: "found",
          onBeatReason: directOnBeatReason ?? onBeatReason,
          newsPoints,
          construction,
          edited,
        };
      }
      const traceState = reasoningTraceState(call.reasoning, call.usage);
      if (traceState === "withheld") withheld = true;
      // "discarded" follows the same reporter-facing path as "none": the provider is not blamed
      // when the product deliberately kept the trace text out of storage.
    }
    cursor = draft.parent_draft_id;
  }

  if (directOnBeatReason || newsPoints) {
    return {
      state: "found",
      onBeatReason: directOnBeatReason,
      newsPoints,
      construction: null,
      edited,
    };
  }
  return withheld
    ? { state: "withheld", onBeatReason: null, newsPoints: null, edited }
    : { state: "none", onBeatReason: null, newsPoints: null, edited };
}
