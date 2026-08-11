import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type IngestDelivery, processDelivery } from "@/lib/agent/draft-pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RegressionFixture } from "./cases";

const QC_AGENT_ID = "5a71eac5-6701-4810-be32-357d26e775e5";
const QC_AUTHOR_HANDLE = "ReshadRahman";

async function fixtureById(id: string): Promise<RegressionFixture> {
  const directory = join(process.cwd(), "lab/draft-pipeline-regression/fixtures");
  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")) as {
    fixtures: string[];
  };
  const filename = manifest.fixtures.find((entry) => entry === `${id}.json`);
  if (!filename) throw new Error(`Unknown regression fixture: ${id}`);
  return JSON.parse(await readFile(join(directory, filename), "utf8")) as RegressionFixture;
}

async function assertIsolatedDesk(): Promise<void> {
  const admin = createAdminClient();
  const { data: agents, error } = await admin.from("agents").select("id, status, tracked_handles");
  if (error) throw error;
  const matches = (agents ?? []).filter((agent) =>
    agent.tracked_handles.some((handle) => handle.toLowerCase() === QC_AUTHOR_HANDLE.toLowerCase()),
  );
  if (matches.length !== 1 || matches[0]?.id !== QC_AGENT_ID || matches[0]?.status !== "active") {
    throw new Error(
      `QC replay refused: ${QC_AUTHOR_HANDLE} must map uniquely to active test desk ${QC_AGENT_ID}`,
    );
  }
}

async function main(): Promise<void> {
  const fixtureId = process.argv[2];
  if (!fixtureId) throw new Error("Usage: pnpm qc:replay-delivery <fixture-id>");
  const fixture = await fixtureById(fixtureId);
  if (fixture.source.identity.kind !== "x") {
    throw new Error("QC replay currently accepts X delivery fixtures only");
  }
  await assertIsolatedDesk();
  const freshId = `qc-${fixture.id}-${randomUUID()}`;
  const delivery: IngestDelivery = {
    source: "x",
    x_post_id: freshId,
    author_handle: QC_AUTHOR_HANDLE,
    text: fixture.source.text,
    posted_at: new Date().toISOString(),
    lang: fixture.source.lang,
    media: fixture.source.media,
    raw: { qcFixtureId: fixture.id, originalSourcePostId: fixture.source.sourcePostId },
  };
  const result = await processDelivery(delivery);
  const deskResult = result.drafted.find((item) => item.agentId === QC_AGENT_ID);
  const outcome = result.lowSignal
    ? "low_signal"
    : deskResult?.skipped
      ? `skipped:${deskResult.skipped}`
      : deskResult
        ? "drafted"
        : "unmatched";
  console.log(JSON.stringify({ fixtureId, sourcePostId: result.sourcePostId, outcome }));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
