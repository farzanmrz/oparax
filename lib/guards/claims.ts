import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export async function claimRun(
  job: string,
  ttlSeconds: number,
): Promise<{
  runId: string;
  release: () => Promise<void>;
} | null> {
  z.string().min(1).parse(job);
  z.number().int().positive().parse(ttlSeconds);
  const db = createAdminClient();
  const runId = crypto.randomUUID();
  const { data, error } = await db.rpc("claim_run", {
    p_job: job,
    p_run_id: runId,
    p_ttl_seconds: ttlSeconds,
  });
  if (error) throw error;
  if (!data) return null;
  return {
    runId,
    release: async () => {
      const { error } = await db.rpc("release_run", { p_job: job, p_run_id: runId });
      if (error) throw error;
    },
  };
}
