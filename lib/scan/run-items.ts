import type { RunItemInsert } from "@/lib/types";

/** A scanned story's core fields (everything a run_items row needs except the draft outcome). */
export interface RunItemStoryFields {
  run_id: string;
  agent_id: string;
  story_title: string;
  story_summary: string;
  source_urls: string[];
  primary_tweet_url: string;
  dedupe_key: string;
}

/**
 * Build a run_items insert from a story's core fields + its draft outcome. ONE place owns the
 * "what does a drafted vs failed item look like in the DB" decision so the saved-run path
 * (persistRunResult) and the create-preview save (save-agent) can't drift:
 *  - success → status "drafted", drafted_text = final_text = text
 *  - failure → recoverable status "failed", drafted_text "" (column is NOT NULL), final_text
 *    null, error_message set. Redraft resets failed→drafted; postRunItem claims drafted|failed.
 */
export function buildRunItemInsert(
  fields: RunItemStoryFields,
  draft: { text: string | null; error?: string | null },
): RunItemInsert {
  if (draft.text) {
    return { ...fields, drafted_text: draft.text, final_text: draft.text, status: "drafted" };
  }
  return {
    ...fields,
    drafted_text: "",
    final_text: null,
    status: "failed",
    error_message: draft.error ?? "Drafting failed.",
  };
}
