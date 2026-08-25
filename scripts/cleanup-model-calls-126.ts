import { execFileSync } from "node:child_process";

const BATCH_SIZE = 500;
const STATEMENT_TIMEOUT = "10s";
const DRY_RUN = process.argv.includes("--dry-run");
const configuredDatabaseUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!configuredDatabaseUrl) {
  throw new Error("Set SUPABASE_DB_URL or DATABASE_URL to the Supabase Postgres connection URL.");
}
const databaseUrl: string = configuredDatabaseUrl;

type ModelCallRow = {
  id: string;
  stage: string;
  reasoning: string | null;
  usage: unknown;
};

function runSql(sql: string): string {
  return execFileSync(
    "psql",
    [
      "-X",
      "--set",
      "ON_ERROR_STOP=1",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--dbname",
      databaseUrl,
    ],
    {
      encoding: "utf8",
      input: sql,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function parseRows(output: string): ModelCallRow[] {
  const trimmed = output.trim();
  if (!trimmed) return [];
  return trimmed.split("\n").map((line) => JSON.parse(line) as ModelCallRow);
}

function readRows(where: string): ModelCallRow[] {
  const rows: ModelCallRow[] = [];
  let lastId: string | null = null;
  for (;;) {
    const after = lastId === null ? "" : `and id > ${sqlString(lastId)}::uuid`;
    const batch = parseRows(
      runSql(`
        select json_build_object(
          'id', id,
          'stage', stage,
          'reasoning', reasoning,
          'usage', usage
        )::text
        from public.model_calls
        where ${where}
          ${after}
        order by id
        limit ${BATCH_SIZE};
      `),
    );
    rows.push(...batch);
    if (batch.length < BATCH_SIZE) return rows;
    lastId = batch.at(-1)?.id ?? null;
  }
}

function legacyOnBeatReasonOf(reasoning: string): string | null {
  const appendedNotesAt = reasoning.lastIndexOf("\n\nOn beat:");
  const notes =
    appendedNotesAt >= 0
      ? reasoning.slice(appendedNotesAt + 2)
      : reasoning.startsWith("On beat:")
        ? reasoning
        : null;
  const match = notes?.match(
    /^On beat:\s*yes\s*\u2014\s*([^\r\n]+)\r?\nTitle:\r?\n[\s\S]*\r?\nSynthesis:\r?\n[\s\S]+$/i,
  );
  const onBeatReason = match?.[1].trim();
  return onBeatReason || null;
}

function chunks<T>(values: T[]): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < values.length; index += BATCH_SIZE) {
    batches.push(values.slice(index, index + BATCH_SIZE));
  }
  return batches;
}

function writeBackfill(rows: Array<{ id: string; reason: string }>): void {
  for (const batch of chunks(rows)) {
    const values = batch
      .map(({ id, reason }) => {
        const encodedReason = Buffer.from(reason, "utf8").toString("base64");
        return `(${sqlString(id)}::uuid, convert_from(decode(${sqlString(encodedReason)}, 'base64'), 'UTF8'))`;
      })
      .join(",\n");
    runSql(`
      begin;
      set local statement_timeout = ${sqlString(STATEMENT_TIMEOUT)};
      with backfill(id, reason) as (
        values ${values}
      )
      update public.model_calls as model_call
      set usage = coalesce(model_call.usage, '{}'::jsonb)
        || jsonb_build_object('draftOnBeatReason', backfill.reason)
      from backfill
      where model_call.id = backfill.id
        and not (coalesce(model_call.usage, '{}'::jsonb) ? 'draftOnBeatReason');
      commit;
    `);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function slimTokenUsage(value: unknown): Record<string, unknown> {
  const usage = asRecord(value);
  const outputTokenDetails = asRecord(usage.outputTokenDetails);
  const inputTokens = finiteNumber(usage.inputTokens);
  const outputTokens = finiteNumber(usage.outputTokens);
  const totalTokens = finiteNumber(usage.totalTokens);
  const reasoningTokens = finiteNumber(outputTokenDetails.reasoningTokens);
  return {
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
    ...(totalTokens === undefined ? {} : { totalTokens }),
    outputTokenDetails: {
      ...(reasoningTokens === undefined ? {} : { reasoningTokens }),
    },
  };
}

function copyPresent(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  key: string,
): void {
  if (Object.hasOwn(source, key)) target[key] = source[key];
}

function projectedUsage(row: ModelCallRow): Record<string, unknown> {
  const usage = asRecord(row.usage);
  if (row.stage === "source_narrowing") {
    return {
      steps: Array.isArray(usage.steps) ? usage.steps.map(slimTokenUsage) : [],
      searchCalls: finiteNumber(usage.searchCalls) ?? 0,
    };
  }

  const projected = slimTokenUsage(usage);
  copyPresent(usage, projected, "reasoningWithheldByProvider");
  if (row.stage === "voice_extraction") {
    copyPresent(usage, projected, "thinkingTokens");
    copyPresent(usage, projected, "scopeExclusion");
    copyPresent(usage, projected, "streamError");
    return projected;
  }
  if (usage.draftConstruction !== null && usage.draftConstruction !== undefined) {
    projected.draftConstruction = usage.draftConstruction;
  }
  if (usage.draftOnBeatReason !== null && usage.draftOnBeatReason !== undefined) {
    projected.draftOnBeatReason = usage.draftOnBeatReason;
  }
  return projected;
}

function hasDroppedFields(row: ModelCallRow): boolean {
  if (row.usage === null || row.usage === undefined) return false;
  const usage = asRecord(row.usage);
  if (row.stage === "source_narrowing") {
    const allowed = new Set(["steps", "searchCalls", "termination"]);
    if (Object.keys(usage).some((key) => !allowed.has(key))) return true;
    const steps = Array.isArray(usage.steps) ? usage.steps : [];
    return steps.some((step) => {
      const stepUsage = asRecord(step);
      const stepAllowed = new Set([
        "inputTokens",
        "outputTokens",
        "totalTokens",
        "outputTokenDetails",
      ]);
      if (Object.keys(stepUsage).some((key) => !stepAllowed.has(key))) return true;
      const details = asRecord(stepUsage.outputTokenDetails);
      return Object.keys(details).some((key) => key !== "reasoningTokens");
    });
  }

  const allowed = new Set([
    "inputTokens",
    "outputTokens",
    "totalTokens",
    "outputTokenDetails",
    "reasoningWithheldByProvider",
    ...(row.stage === "voice_extraction"
      ? ["thinkingTokens", "scopeExclusion", "streamError"]
      : ["draftConstruction", "draftOnBeatReason"]),
  ]);
  if (Object.keys(usage).some((key) => !allowed.has(key))) return true;
  const details = asRecord(usage.outputTokenDetails);
  return Object.keys(details).some((key) => key !== "reasoningTokens");
}

function rowsNeedingCleanup(): ModelCallRow[] {
  return readRows("stage <> 'manual_edit' and (reasoning is not null or usage is not null)").filter(
    (row) => row.reasoning !== null || hasDroppedFields(row),
  );
}

function writeCleanup(rows: ModelCallRow[]): void {
  for (const batch of chunks(rows)) {
    const values = batch
      .map((row) => {
        const encodedUsage = Buffer.from(JSON.stringify(projectedUsage(row)), "utf8").toString(
          "base64",
        );
        return `(${sqlString(row.id)}::uuid, convert_from(decode(${sqlString(encodedUsage)}, 'base64'), 'UTF8')::jsonb)`;
      })
      .join(",\n");
    runSql(`
      begin;
      set local statement_timeout = ${sqlString(STATEMENT_TIMEOUT)};
      with cleanup(id, usage) as (
        values ${values}
      )
      update public.model_calls as model_call
      set usage = cleanup.usage,
          reasoning = null
      from cleanup
      where model_call.id = cleanup.id
        and (model_call.reasoning is not null or model_call.usage is distinct from cleanup.usage);
      commit;
    `);
  }
}

function countsByStage(rows: ModelCallRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.stage, (counts.get(row.stage) ?? 0) + 1);
  return counts;
}

const legacyRows = readRows(
  "stage = 'drafting' and reasoning is not null and not (coalesce(usage, '{}'::jsonb) ? 'draftOnBeatReason')",
);
const legacyWithNotes = legacyRows.filter(
  (row) => typeof row.reasoning === "string" && row.reasoning.includes("On beat:"),
);
const backfill = legacyRows.flatMap((row) => {
  if (typeof row.reasoning !== "string") return [];
  const reason = legacyOnBeatReasonOf(row.reasoning);
  return reason === null ? [] : [{ id: row.id, reason }];
});

console.log(`Backfill matches: ${backfill.length}`);
if (backfill.length === 0 && legacyWithNotes.length > 0) {
  throw new Error(
    `Stopped: ${legacyWithNotes.length} legacy drafting rows contain On beat notes, but none matched the product parser.`,
  );
}
if (!DRY_RUN) writeBackfill(backfill);

const beforeRows = rowsNeedingCleanup();
const before = countsByStage(beforeRows);
if (!DRY_RUN) writeCleanup(beforeRows);
const afterRows = DRY_RUN ? beforeRows : rowsNeedingCleanup();
const after = countsByStage(afterRows);
const stages = [...new Set([...before.keys(), ...after.keys()])].sort();

for (const stage of stages) {
  console.log(`${stage}: before ${before.get(stage) ?? 0}, after ${after.get(stage) ?? 0}`);
}
console.log(DRY_RUN ? "Dry run complete. No rows were changed." : "Cleanup complete.");
