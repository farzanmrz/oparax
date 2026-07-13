"use server";

import { z } from "zod";
import { validateCadence } from "@/lib/agent/cadence";
import { deskConfigSchema } from "@/lib/agent/desk-config";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const transcriptSchema = z.array(z.unknown()).min(1);

export type SaveAgentResult = { id: string; error?: never } | { id?: never; error: string };

/**
 * Insert the completed desk as the signed-in reporter. The transcript is the
 * client's full message array (the chat itself is ephemeral — nothing persists
 * the setup conversation but this insert). Returns the new row id for navigation.
 */
export async function saveAgent(input: {
  config: unknown;
  sessionId: string | null;
  transcript: unknown;
}): Promise<SaveAgentResult> {
  const config = deskConfigSchema.safeParse(input.config);
  const transcript = transcriptSchema.safeParse(input.transcript);
  if (!config.success || !transcript.success) {
    return { error: "The desk configuration is incomplete — ask the agent to re-check it." };
  }

  // The chat's save-approval gate already rejects an out-of-rail cadence, but this action is
  // the actual writer and a directly-callable server action — re-check here so a request that
  // never passed through the gate can't persist a schedule that violates the rate rail.
  if (!validateCadence(config.data.cadence).ok) {
    return {
      error: "That scan cadence is outside the allowed limits — ask the agent to adjust it.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired — sign in again to save this desk." };
  }

  const { data, error } = await supabase
    .from("agents")
    .insert({
      user_id: user.id,
      name: config.data.name,
      beat: config.data.beat,
      handles: config.data.handles,
      drafting_instructions: config.data.draftingInstructions,
      account_tier: config.data.accountTier,
      cadence: config.data.cadence,
      setup_session_id: input.sessionId,
      // The transcript is validated only as a non-empty array; its opaque
      // message shape lands in a Json column, so cast (never `any`).
      setup_transcript: transcript.data as Json,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not save your desk. Please try again." };
  }
  return { id: data.id };
}
