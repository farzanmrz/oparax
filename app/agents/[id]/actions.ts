// app/agents/[id]/actions.ts
//
// The desk dashboard's server actions — pause/resume/scan-now (schedule control) and
// draftSelected (the Scans-tab "Draft selected" button). Owner-scoped writes run as the
// signed-in reporter via the RLS client (@/lib/supabase/server). scanNow additionally runs
// a real scan and writes a `runs` row: `runs` is service-role-write-only (RLS), so it verifies
// ownership with the RLS client FIRST, then writes the run with the admin client — same trust
// path as the dispatcher. Every mutation revalidates the desk's own path so the dashboard's
// server-rendered runs/drafts/usage refresh in place.
"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { draftItems } from "@/lib/agent/draft-run";
import { nextFire } from "@/lib/agent/next-run";
import { persistScanRun, persistScanRunError } from "@/lib/agent/persist-run";
import { scanFrequencySchema } from "@/lib/agent/scan-frequency";
import { type NewsItem, newsItemSchema } from "@/lib/agent/scan-result";
import { runScan } from "@/lib/agent/scan-run";
import { searchTemplateSchema } from "@/lib/agent/search-template";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Pause a desk: stop it firing and clear the scheduled next run. */
export async function pauseAgent(agentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("agents")
    .update({ status: "paused", next_run_at: null })
    .eq("id", agentId);
  if (error) return { ok: false, error: "Could not pause the desk. Please try again." };
  revalidatePath(`/agents/${agentId}`);
  return { ok: true };
}

/**
 * Resume a paused desk — re-derives the next fire from the desk's own saved scan
 * frequency. A malformed persisted schedule can't be resumed as-is (there is no valid
 * next fire to compute), so this returns an error rather than guessing one.
 */
export async function resumeAgent(agentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("scan_frequency")
    .eq("id", agentId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the desk's schedule." };

  const scanFrequency = scanFrequencySchema.safeParse(data.scan_frequency);
  if (!scanFrequency.success) {
    return {
      ok: false,
      error: "This desk's saved schedule is malformed and can't be resumed as-is.",
    };
  }

  const { error: updateError } = await supabase
    .from("agents")
    .update({
      status: "active",
      next_run_at: nextFire(scanFrequency.data, new Date()).toISOString(),
    })
    .eq("id", agentId);
  if (updateError) return { ok: false, error: "Could not resume the desk. Please try again." };
  revalidatePath(`/agents/${agentId}`);
  return { ok: true };
}

/**
 * Run a scan immediately (works local and deployed — no cron needed for a manual scan). Verifies
 * ownership + reads the desk with the RLS client, inserts a `running` run via the admin client
 * (runs are service-role-write-only), revalidates so the dashboard shows the running run, then
 * completes the scan in `after()` so the button returns fast; the dashboard's bounded refresh
 * flips the row to done/failed when it lands. The schedule ledger (`next_run_at`) is left
 * untouched — a manual scan is a one-off, not a scheduled fire.
 */
export async function scanNow(agentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .select("beat, handles, scan_frequency, status, search_template")
    .eq("id", agentId)
    .maybeSingle();
  if (error || !agent) return { ok: false, error: "Could not load the desk." };
  if (agent.status !== "active") return { ok: false, error: "Resume the desk before scanning." };

  const freq = scanFrequencySchema.safeParse(agent.scan_frequency);
  if (!freq.success) return { ok: false, error: "This desk's saved schedule is malformed." };

  // A malformed template is not a scan-blocker — fall back to drafting the calls fresh.
  const template = searchTemplateSchema.safeParse(agent.search_template);
  const searchTemplate = template.success ? template.data : null;

  // Ownership is proven (the RLS select above returned the row); write the run with the admin
  // client since `runs` has no authenticated insert policy — same path the dispatcher uses.
  const admin = createAdminClient();
  const { data: run, error: insertError } = await admin
    .from("runs")
    .insert({ agent_id: agentId, source: "manual" })
    .select("id")
    .single();
  if (insertError || !run) return { ok: false, error: "Could not start a scan. Please try again." };

  const { beat, handles } = agent;
  const scanFrequency = freq.data;
  after(async () => {
    try {
      const result = await runScan({ beat, handles, scanFrequency, searchTemplate });
      await persistScanRun(admin, run.id, result);
    } catch (e) {
      // Unexpected throw (Pass 1 / gateway) — nothing partial to preserve.
      await persistScanRunError(admin, run.id, e);
    }
  });

  revalidatePath(`/agents/${agentId}`);
  return { ok: true };
}

const draftSelectedItemsSchema = z.array(newsItemSchema).min(1).max(10);

/**
 * Draft up to 10 selected Scans-tab items in the desk's saved voice: one DeepSeek call
 * drafts all of them (`draftItems`), then one `drafts` row is inserted per item, each
 * carrying the batch's `usage` (informational per-row — there is no rollup over drafts).
 */
export async function draftSelected(agentId: string, items: NewsItem[]): Promise<ActionResult> {
  const parsed = draftSelectedItemsSchema.safeParse(items);
  if (!parsed.success) return { ok: false, error: "Select 1–10 items to draft." };

  const supabase = await createClient();
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("drafting_instructions, account_tier")
    .eq("id", agentId)
    .maybeSingle();
  if (agentError || !agent) {
    return { ok: false, error: "Could not load the desk's drafting settings." };
  }

  const accountTier = agent.account_tier === "premium" ? "premium" : "standard";
  // draftItems calls the model and throws on a gateway error or a draft/item count mismatch —
  // catch it so the action honors the ActionResult contract instead of surfacing an unhandled
  // rejection to the client's startTransition (the other actions all return {ok:false} on failure).
  let drafts: string[];
  let usage: unknown;
  let costUsd: number | null;
  try {
    ({ drafts, usage, costUsd } = await draftItems({
      draftingInstructions: agent.drafting_instructions,
      accountTier,
      items: parsed.data,
    }));
  } catch {
    return { ok: false, error: "Could not draft those items. Please try again." };
  }

  const rows = parsed.data.map((item, i) => ({
    agent_id: agentId,
    item: item as Json,
    text: drafts[i],
    usage: usage as Json,
    source: "manual",
    cost_deepseek: costUsd != null ? costUsd / parsed.data.length : null,
  }));

  const { error: insertError } = await supabase.from("drafts").insert(rows);
  if (insertError) {
    return { ok: false, error: "Drafted the items but could not save them. Please try again." };
  }
  revalidatePath(`/agents/${agentId}`);
  return { ok: true };
}
