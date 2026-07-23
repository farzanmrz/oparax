"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { attemptVoiceExtraction } from "@/lib/voice/create-desk-extraction";
import { MAX_TRACKED_HANDLES, normalizeValidHandle } from "@/lib/x/handle";

export type CreateDeskResult = { id: string; error?: never } | { id?: never; error: string };

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
  if (!beat) return { error: "Describe the beat this desk should watch." };

  const reporterHandle = normalizeValidHandle(input.reporterHandle);
  if (!reporterHandle) {
    return { error: "Your X handle should be letters, numbers, and underscores only." };
  }

  // Every tracked handle is charset-validated too — not just normalized. An unvalidated handle
  // flows into the ingestion worker's globally-shared X stream rule where it could inject stream
  // operators across tenants (see lib/x/handle.ts). One bad handle rejects the whole submit
  // rather than being silently dropped or stored.
  const trackedHandles: string[] = [];
  for (const raw of input.trackedHandles) {
    if (!raw.trim()) continue; // drop empty chips from the form
    if (trackedHandles.length >= MAX_TRACKED_HANDLES) break; // cap (client enforces too)
    const handle = normalizeValidHandle(raw);
    if (!handle) {
      return {
        error: `"${raw.trim()}" isn't a valid X handle — letters, numbers, and underscores, up to 15.`,
      };
    }
    if (!trackedHandles.includes(handle)) trackedHandles.push(handle);
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

  // Refresh the /agents layout so the site header's desk switcher includes this new desk
  // immediately — without this the switcher renders its stale list and falls back to "Desks".
  revalidatePath("/agents", "layout");

  return { id: data.id };
}
