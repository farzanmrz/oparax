"use server";

import { after } from "next/server";
import { z } from "zod";
import { deskConfigSchema } from "@/lib/agent/desk-config";
import { nextFire } from "@/lib/agent/next-run";
import { extractOnboardingResults } from "@/lib/agent/onboarding-extract";
import { validateScanFrequency } from "@/lib/agent/scan-frequency";
import {
  collectAssistantText,
  executedSearchParts,
  extractSearchTemplate,
} from "@/lib/agent/search-template";
import { sumCosts } from "@/lib/agent/usage-cost";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const transcriptSchema = z.array(z.unknown()).min(1);

export type SaveAgentResult = { id: string; error?: never } | { id?: never; error: string };

/**
 * Insert the completed desk as the signed-in reporter. The transcript is the client's full message
 * array, stored verbatim on the desk and also mined here for its frozen search template and, on a
 * successful insert, the chat's own preview scan + drafts (persisted best-effort below so they don't
 * remain ephemeral). Returns the new row id for navigation.
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

  // The chat's save-approval gate already rejects an out-of-rail scan frequency, but this
  // action is the actual writer and a directly-callable server action — re-check here so a
  // request that never passed through the gate can't persist a schedule that breaks the rail.
  if (!validateScanFrequency(config.data.scanFrequency).ok) {
    return {
      error: "That scan frequency is outside the allowed limits — ask the agent to adjust it.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired — sign in again to save this desk." };
  }

  // The frozen search template: the drafted x_search calls the chat's scan actually executed,
  // captured once here so scheduled/manual runs replay them instead of re-drafting a query.
  const searchTemplate = extractSearchTemplate(transcript.data);

  const { data, error } = await supabase
    .from("agents")
    .insert({
      user_id: user.id,
      name: config.data.name,
      beat: config.data.beat,
      handles: config.data.handles,
      drafting_instructions: config.data.draftingInstructions,
      account_tier: config.data.accountTier,
      scan_frequency: config.data.scanFrequency,
      status: "active",
      next_run_at: nextFire(config.data.scanFrequency, new Date()).toISOString(),
      setup_session_id: input.sessionId,
      // The transcript is validated only as a non-empty array; its opaque
      // message shape lands in a Json column, so cast (never `any`).
      setup_transcript: transcript.data as Json,
      search_template: searchTemplate as Json,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not save your desk. Please try again." };
  }

  // Persist the onboarding chat's preview scan + drafts to the new desk so its detail page shows them
  // immediately (they were ephemeral before ft/63). Best-effort: any failure here must NOT fail the
  // save — the desk already exists. Runs/drafts are written with the admin client (runs is
  // service-role-write-only; ownership is already proven by the desk insert above as this user) — the
  // same trust path scanNow uses.
  const executedScans = executedSearchParts(transcript.data);
  if (executedScans.length > 0) {
    try {
      const admin = createAdminClient();
      const { data: run } = await admin
        .from("runs")
        .insert({ agent_id: data.id, source: "onboarding" })
        .select("id")
        .single();
      if (run) {
        after(async () => {
          // The desk's real onboarding grok spend — summed from the executed searches' own costUsd.
          const grokCost = sumCosts(executedScans.map((p) => p.costUsd));
          try {
            const extracted = await extractOnboardingResults({
              assistantText: collectAssistantText(transcript.data),
            });
            await admin
              .from("runs")
              .update({
                status: "done",
                result: { items: extracted.items } as Json,
                cost_grok: grokCost,
                cost_deepseek: extracted.costUsd,
                usage: { extract: extracted.usage } as Json,
                finished_at: new Date().toISOString(),
              })
              .eq("id", run.id)
              .eq("status", "running");

            // One drafts row per draft that resolves to a presented item; unmatched drafts are dropped
            // (there is nowhere to attach a draft with no item snapshot).
            const draftRows = extracted.drafts
              .filter(
                (d): d is { itemIndex: number; text: string } =>
                  d.itemIndex != null && d.itemIndex >= 0 && d.itemIndex < extracted.items.length,
              )
              .map((d) => ({
                agent_id: data.id,
                item: extracted.items[d.itemIndex] as Json,
                text: d.text,
                source: "onboarding" as const,
                cost_deepseek: null,
              }));
            if (draftRows.length > 0) await admin.from("drafts").insert(draftRows);
          } catch (e) {
            // Extraction/gateway failed — preserve the real onboarding grok spend on a failed run
            // rather than dropping to a blank one (mirrors scan-run's soft-fail intent).
            await admin
              .from("runs")
              .update({
                status: "failed",
                error: e instanceof Error ? e.message : String(e),
                cost_grok: grokCost,
                finished_at: new Date().toISOString(),
              })
              .eq("id", run.id)
              .eq("status", "running");
          }
        });
      }
    } catch {
      // Could not even start the onboarding run — the desk is saved; nothing else to do.
    }
  }

  return { id: data.id };
}
