"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { attemptVoiceExtraction } from "@/lib/voice/create-desk-extraction";

export type CreateDeskResult = { id: string; error?: never } | { id?: never; error: string };

/** X handles are [A-Za-z0-9_], 1-15 chars — same rail create-desk-extraction.ts's
 *  loadCorpus re-checks before turning a handle into a filesystem path. */
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "");
}

/**
 * Create a desk (an `experiments` row) as the signed-in reporter, then kick off best-effort
 * voice extraction for their handle in `after()` — the request finishes and the client
 * navigates before extraction resolves; a failure there never rolls back the desk (see
 * lib/voice/create-desk-extraction.ts for the full order-of-operations + ledger contract).
 */
export async function createDesk(input: {
  beat: string;
  trackedHandles: string[];
  reporterHandle: string;
}): Promise<CreateDeskResult> {
  const beat = input.beat.trim();
  const reporterHandle = normalizeHandle(input.reporterHandle);
  const trackedHandles = [...new Set(input.trackedHandles.map(normalizeHandle).filter(Boolean))];

  if (!beat) return { error: "Describe the beat this desk should watch." };
  if (!HANDLE_RE.test(reporterHandle)) {
    return { error: "Your X handle should be letters, numbers, and underscores only." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired — sign in again to create this desk." };
  }

  const { data, error } = await supabase
    .from("experiments")
    .insert({
      owner_id: user.id,
      beat,
      reporter_handle: reporterHandle,
      tracked_handles: trackedHandles,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not create your desk. Please try again." };
  }

  after(() => attemptVoiceExtraction(reporterHandle, user.id));

  return { id: data.id };
}
