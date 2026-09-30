import "server-only";

import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { captureAiGeneration } from "@/lib/observability/posthog-ai";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import { normalizeValidHandle } from "@/lib/x/handle";
import { runOnboarding } from "./engine";
import { BuildStateSchema } from "./types";

class LeaseLost extends Error {}

export async function claimBuild(monitorId: string, runId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("claim_build", {
    p_monitor: monitorId,
    p_run_id: runId,
    p_lease_seconds: 600,
  });
  if (error) throw error;
  return data;
}

const logSchema = z.array(
  z.object({ step: z.number().int(), message: z.string(), at: z.string() }),
);

export async function runBuild(monitorId: string, runId: string): Promise<void> {
  const db = createAdminClient();
  let step = 1;
  const renew = async () => {
    if (!(await claimBuild(monitorId, runId))) throw new LeaseLost();
  };
  const update = async (values: Database["public"]["Tables"]["monitors"]["Update"]) => {
    const { data, error } = await db
      .from("monitors")
      .update(values)
      .eq("id", monitorId)
      .eq("status", "building")
      .eq("build_lease_owner", runId)
      .gt("build_lease_until", new Date().toISOString())
      .select("id");
    if (error) throw error;
    if (!data.length) throw new LeaseLost();
  };
  try {
    await renew();
    const { data: monitor, error } = await db
      .from("monitors")
      .select("*")
      .eq("id", monitorId)
      .single();
    if (error) throw error;
    step = Math.max(1, monitor.build_step);
    if (!monitor.x_user_id) throw new Error("Confirmed X identity is missing");
    const xUserId = monitor.x_user_id;
    const resume = BuildStateSchema.parse(monitor.build_state ?? {});
    if (
      (resume.profile && resume.profile.id !== xUserId) ||
      (resume.x_user_id && resume.x_user_id !== xUserId)
    )
      throw new Error("Resumed X identity does not match this agent");
    const log = logSchema.parse(monitor.build_log);
    const result = await runOnboarding({
      handle: monitor.handle,
      beat: monitor.beat,
      monitorId,
      runId,
      resume,
      report: async (nextStep, message) => {
        await renew();
        step = nextStep;
        log.push({ step, message, at: new Date().toISOString() });
        await update({ build_step: step, build_log: log, build_error: null });
      },
      checkpoint: async (state) => {
        const checked = BuildStateSchema.parse(state);
        if (checked.profile?.id !== xUserId || checked.x_user_id !== xUserId)
          throw new Error("Checkpoint X identity does not match this agent");
        await update({ build_state: checked, profile: checked.profile });
      },
      onGeneration: (generation) => {
        captureAiGeneration({
          distinctId: monitorId,
          traceId: runId,
          spanId: crypto.randomUUID(),
          stage: "onboarding",
          model: generation.model,
          usage: generation.usage,
          latencyMs: generation.latencyMs,
          streamed: false,
          generationId: null,
          inputMessages: generation.messages.map((message) => ({
            role: message.role,
            content:
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content),
          })),
          outputText: generation.output,
          properties: {
            $ai_total_cost_usd: generation.charged,
            market_cost_usd: generation.market,
          },
        });
      },
    });
    if (result.profile.id !== xUserId)
      throw new Error("Final X identity does not match this agent");
    await renew();
    const { data: knownSources, error: sourcesError } = await db
      .from("sources")
      .select("id,target,name,x_user_id")
      .eq("kind", "x_account");
    if (sourcesError) throw sourcesError;
    const knownAccounts = new Map(
      knownSources.map((source) => [
        normalizeValidHandle(
          source.target.replace(/\/+$/, "").split("/").pop() ?? "",
        )?.toLowerCase(),
        source,
      ]),
    );
    const accounts = result.final.accounts.map((account) => {
      const handle = normalizeValidHandle(account.handle)?.toLowerCase();
      if (!handle) throw new Error("Recommended account has an invalid handle");
      return { ...account, handle };
    });
    const newSources = accounts
      .filter((account) => !knownAccounts.has(account.handle))
      .map((account) => ({
        id: `x-${account.handle}`,
        kind: "x_account" as const,
        target: `https://x.com/${account.handle}`,
        name: account.handle,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    const monitorSources = result.final.sites
      .map((site) => ({ source_id: site.id, score: site.score, why: site.why }))
      .sort((a, b) => a.source_id.localeCompare(b.source_id));
    const monitorAccounts = accounts
      .map((account) => ({
        handle: account.handle,
        name: knownAccounts.get(account.handle)?.name ?? account.handle,
        x_user_id: knownAccounts.get(account.handle)?.x_user_id ?? null,
        score: account.score,
        why: account.why,
      }))
      .sort((a, b) => a.handle.localeCompare(b.handle));
    await renew();
    const completion = await db.rpc("complete_build", {
      p_monitor: monitorId,
      p_run_id: runId,
      p_x_user_id: xUserId,
      p_profile: result.profile as unknown as Json,
      p_brief: result.brief as unknown as Json,
      p_new_sources: newSources as unknown as Json,
      p_monitor_sources: monitorSources as unknown as Json,
      p_accounts: monitorAccounts as unknown as Json,
    });
    if (completion.error) throw completion.error;
    if (completion.data === "lease_lost") throw new LeaseLost();
    if (completion.data === "identity_mismatch")
      throw new Error("Completion X identity does not match this agent");
    if (completion.data !== "completed") throw new Error("Completion returned an invalid outcome");
    track("agent_built", { cost_usd: result.costUsd }, monitorId);
    track("trial_started", { monitor_id: monitorId, trigger: "build_completed" }, monitorId);
  } catch (error) {
    if (error instanceof LeaseLost) return;
    reportServerException(error, { distinctId: monitorId, tags: { area: "onboarding", step } });
    const message = error instanceof Error ? error.message : String(error);
    const { data, error: saveError } = await db
      .from("monitors")
      .update({
        status: "failed",
        build_error: `${step}: ${message}`,
        build_lease_until: null,
        build_lease_owner: null,
      })
      .eq("id", monitorId)
      .eq("status", "building")
      .eq("build_lease_owner", runId)
      .gt("build_lease_until", new Date().toISOString())
      .select("id");
    if (saveError)
      reportServerException(saveError, { tags: { area: "onboarding", stage: "save_failure" } });
    if (data?.length) track("agent_build_failed", { step }, monitorId);
  }
}
