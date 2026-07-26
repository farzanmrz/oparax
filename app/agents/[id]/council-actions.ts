// app/agents/[id]/council-actions.ts
//
// Thin "use server" wrappers around lib/agent/council-query.ts's pure query/shaping —
// this file's only job is supplying the RLS-scoped server client. Both actions are plain
// reads through `post_drafts` (EXISTS-joined to `experiments`, so the RLS client scopes
// ownership automatically): no admin client, no model calls, no writes. Never import
// `draft-council-run.ts`/`lib/sysprompts` here — council-dialog.tsx/draft-history-dialog.tsx
// call these two actions directly from a client component, so anything this file imports
// is reachable from the client bundle boundary.
"use server";

import type { CouncilDetail, DraftHistoryDetail } from "@/lib/agent/council-query";
import { queryCouncilDetail, queryDraftHistory } from "@/lib/agent/council-query";
import { createClient } from "@/lib/supabase/server";

export async function fetchCouncilDetail(
  sourcePostId: string,
  experimentId: string,
): Promise<CouncilDetail> {
  const supabase = await createClient();
  return queryCouncilDetail(supabase, sourcePostId, experimentId);
}

export async function fetchDraftHistory(winningPostDraftId: string): Promise<DraftHistoryDetail> {
  const supabase = await createClient();
  return queryDraftHistory(supabase, winningPostDraftId);
}
