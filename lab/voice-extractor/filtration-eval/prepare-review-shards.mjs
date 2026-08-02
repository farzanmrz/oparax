import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = path.dirname(new URL(import.meta.url).pathname);
const shardDirectory = path.join(directory, "review-shards");
const codexOutputDirectory = path.join(directory, "reviews", "codex-sol", "shards");
const claudeOutputDirectory = path.join(directory, "reviews", "claude-opus", "shards");
const shardCount = 50;

const content = (await readFile(path.join(directory, "golden-labels.jsonl"), "utf8")).trim();
const rows = content ? content.split("\n").map((line) => JSON.parse(line)) : [];
if (rows.length < shardCount) {
  throw new Error(`Cannot split ${rows.length} rows into ${shardCount} non-empty shards`);
}

await Promise.all([
  mkdir(shardDirectory, { recursive: true }),
  mkdir(codexOutputDirectory, { recursive: true }),
  mkdir(claudeOutputDirectory, { recursive: true }),
]);

const baseSize = Math.floor(rows.length / shardCount);
const largerShardCount = rows.length % shardCount;
const shards = [];
let cursor = 0;

for (let index = 0; index < shardCount; index += 1) {
  const number = String(index + 1).padStart(3, "0");
  const size = baseSize + (index < largerShardCount ? 1 : 0);
  const shardRows = rows.slice(cursor, cursor + size);
  const inputPath = `lab/voice-extractor/filtration-eval/review-shards/shard-${number}.jsonl`;
  const codexOutputPath =
    `lab/voice-extractor/filtration-eval/reviews/codex-sol/shards/` +
    `shard-${number}.reviewed.jsonl`;
  const claudeOutputPath =
    `lab/voice-extractor/filtration-eval/reviews/claude-opus/shards/` +
    `shard-${number}.reviewed.jsonl`;

  await writeFile(
    path.join(directory, "review-shards", `shard-${number}.jsonl`),
    `${shardRows.map((row) => JSON.stringify(row)).join("\n")}\n`,
  );
  shards.push({
    shard: index + 1,
    rowStart: cursor + 1,
    rowEnd: cursor + size,
    expectedRows: size,
    inputPath,
    codexOutputPath,
    claudeOutputPath,
  });
  cursor += size;
}

const manifest = {
  generatedAt: new Date().toISOString(),
  source: "lab/voice-extractor/filtration-eval/golden-labels.jsonl",
  reviewContext: "lab/voice-extractor/filtration-eval/review-context.jsonl",
  totalRows: rows.length,
  shardCount,
  split: {
    baseRowsPerShard: baseSize,
    largerShards: largerShardCount,
    largerShardSize: baseSize + 1,
    remainingShardSize: baseSize,
  },
  shards,
};

await writeFile(
  path.join(directory, "review-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(JSON.stringify(manifest.split, null, 2));
