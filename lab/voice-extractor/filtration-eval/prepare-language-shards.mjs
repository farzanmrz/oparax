#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(here, "consensus-benchmark.jsonl");
const outputDirectory = resolve(here, "language-shards");
const shardCount = 6;

const rows = readFileSync(inputPath, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

mkdirSync(outputDirectory, { recursive: true });
const assignments = [];
let cursor = 0;
for (let index = 0; index < shardCount; index += 1) {
  const remaining = rows.length - cursor;
  const remainingShards = shardCount - index;
  const size = Math.ceil(remaining / remainingShards);
  const shardRows = rows.slice(cursor, cursor + size).map((row) => ({
    postId: row.postId,
    postContent: row.postContent,
  }));
  cursor += size;
  const shard = String(index + 1).padStart(3, "0");
  const input = `language-shards/shard-${shard}.jsonl`;
  const output = `language-labels/shard-${shard}.jsonl`;
  writeFileSync(
    resolve(here, input),
    `${shardRows.map((row) => JSON.stringify(row)).join("\n")}\n`,
  );
  assignments.push({ shard, rows: shardRows.length, input, output });
}

writeFileSync(
  resolve(here, "language-shards-manifest.json"),
  `${JSON.stringify({ total: rows.length, shardCount, assignments }, null, 2)}\n`,
);
console.log(JSON.stringify({ total: rows.length, assignments }, null, 2));
