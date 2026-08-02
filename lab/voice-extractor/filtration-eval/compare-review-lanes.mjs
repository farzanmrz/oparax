import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = path.dirname(new URL(import.meta.url).pathname);
const reviewsDirectory = path.join(directory, "reviews");

async function readJsonLines(filePath) {
  const content = (await readFile(filePath, "utf8")).trim();
  return content ? content.split("\n").map((line) => JSON.parse(line)) : [];
}

async function readLane(lane) {
  const rows = [];
  for (let index = 1; index <= 50; index += 1) {
    const number = String(index).padStart(3, "0");
    rows.push(
      ...(await readJsonLines(
        path.join(reviewsDirectory, lane, "shards", `shard-${number}.reviewed.jsonl`),
      )),
    );
  }
  return rows;
}

function meaningfulQuote(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value.post_id ?? value.id ?? value.url ?? value.description),
  );
}

function hasInspectableContext(context) {
  return Boolean(
    context &&
      ((context.photos?.length ?? 0) > 0 ||
        (context.videos?.length ?? 0) > 0 ||
        (context.externalImageUrls?.length ?? 0) > 0 ||
        (context.externalVideoUrls?.length ?? 0) > 0 ||
        context.externalUrl ||
        meaningfulQuote(context.quotedPost)),
  );
}

const luna = await readJsonLines(path.join(directory, "golden-labels.jsonl"));
const codex = await readLane("codex-sol");
const claude = await readLane("claude-opus");
const context = await readJsonLines(path.join(directory, "review-context.jsonl"));
const claudeBlocked = JSON.parse(
  await readFile(path.join(reviewsDirectory, "claude-opus", "context-blocked.json"), "utf8"),
);

const codexById = new Map(codex.map((row) => [row.postId, row]));
const claudeById = new Map(claude.map((row) => [row.postId, row]));
const contextById = new Map(context.map((row) => [row.postId, row]));
const claudeBlockedIds = new Set(claudeBlocked.map((row) => row.postId));

const comparison = luna.map((row) => {
  const codexRow = codexById.get(row.postId);
  const claudeRow = claudeById.get(row.postId);
  if (!codexRow || !claudeRow) throw new Error(`Missing review for ${row.postId}`);
  if (
    codexRow.sourceHandle !== row.sourceHandle ||
    claudeRow.sourceHandle !== row.sourceHandle ||
    codexRow.postContent !== row.postContent ||
    claudeRow.postContent !== row.postContent ||
    codexRow.onBeat !== row.onBeat ||
    claudeRow.onBeat !== row.onBeat
  ) {
    throw new Error(`Review lane mutated original fields for ${row.postId}`);
  }
  return {
    postId: row.postId,
    sourceHandle: row.sourceHandle,
    postContent: row.postContent,
    onBeat: row.onBeat,
    codexSolOnBeat: codexRow.codexSolOnBeat,
    claudeOpusOnBeat: claudeRow.claudeOpusOnBeat,
    claudeContextBlocked: claudeBlockedIds.has(row.postId),
    contextThin:
      [...row.postContent].length < 40 && !hasInspectableContext(contextById.get(row.postId)),
  };
});

const patterns = {
  allAgree: 0,
  codexClaudeAgainstLuna: 0,
  lunaClaudeAgainstCodex: 0,
  lunaCodexAgainstClaude: 0,
};
const bySource = {};
for (const row of comparison) {
  let pattern;
  if (row.onBeat === row.codexSolOnBeat && row.onBeat === row.claudeOpusOnBeat) {
    pattern = "allAgree";
  } else if (row.codexSolOnBeat === row.claudeOpusOnBeat) {
    pattern = "codexClaudeAgainstLuna";
  } else if (row.onBeat === row.claudeOpusOnBeat) {
    pattern = "lunaClaudeAgainstCodex";
  } else {
    pattern = "lunaCodexAgainstClaude";
  }
  patterns[pattern] += 1;
  if (!bySource[row.sourceHandle]) {
    bySource[row.sourceHandle] = {
      total: 0,
      allAgree: 0,
      codexClaudeAgainstLuna: 0,
      lunaClaudeAgainstCodex: 0,
      lunaCodexAgainstClaude: 0,
    };
  }
  const source = bySource[row.sourceHandle];
  source.total += 1;
  source[pattern] += 1;
}

const disagreements = comparison.filter(
  (row) => !(row.onBeat === row.codexSolOnBeat && row.onBeat === row.claudeOpusOnBeat),
);
const adjudicationQueue = comparison.filter(
  (row) =>
    row.onBeat !== row.codexSolOnBeat ||
    row.onBeat !== row.claudeOpusOnBeat ||
    row.claudeContextBlocked ||
    row.contextThin,
);
const summary = {
  generatedAt: new Date().toISOString(),
  total: comparison.length,
  patterns,
  totalDisagreements: disagreements.length,
  adjudicationQueue: adjudicationQueue.length,
  context: {
    claudeContextBlocked: comparison.filter((row) => row.claudeContextBlocked).length,
    contextThin: comparison.filter((row) => row.contextThin).length,
    disagreementsClaudeContextBlocked: disagreements.filter((row) => row.claudeContextBlocked)
      .length,
    disagreementsContextThin: disagreements.filter((row) => row.contextThin).length,
  },
  bySource,
  note: "Descriptive comparison only. No row has been adjudicated and no source lane was modified.",
};

const jsonLines = (rows) => `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
await writeFile(path.join(reviewsDirectory, "comparison.jsonl"), jsonLines(comparison));
await writeFile(path.join(reviewsDirectory, "disagreements.jsonl"), jsonLines(disagreements));
await writeFile(
  path.join(reviewsDirectory, "adjudication-queue.jsonl"),
  jsonLines(adjudicationQueue),
);
await writeFile(
  path.join(reviewsDirectory, "comparison-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);

console.log(JSON.stringify(summary, null, 2));
