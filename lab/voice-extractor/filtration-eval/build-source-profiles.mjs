#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const recordsDirectory = resolve(here, "source-profile-records");
const benchmarkPath = resolve(here, "consensus-benchmark.jsonl");
const outputPath = resolve(here, "source-profiles.jsonl");

const sourceHandles = [
  ...new Set(
    readFileSync(benchmarkPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line).sourceHandle),
  ),
].sort((left, right) => left.localeCompare(right));

const filesByHandle = new Map(
  readdirSync(recordsDirectory)
    .filter((filename) => filename.endsWith(".json"))
    .map((filename) => [filename.slice(0, -5).toLowerCase(), filename]),
);

const profiles = sourceHandles.map((sourceHandle) => {
  const filename = filesByHandle.get(sourceHandle.toLowerCase());
  if (!filename) throw new Error(`Missing source profile record for @${sourceHandle}`);

  const records = JSON.parse(readFileSync(resolve(recordsDirectory, filename), "utf8"));
  if (!Array.isArray(records) || records.length !== 1) {
    throw new Error(`${filename} must contain exactly one Bright Data post record`);
  }

  const record = records[0];
  if (typeof record.biography !== "string" || record.biography.trim().length === 0) {
    throw new Error(`${filename} has no source biography`);
  }

  return {
    sourceHandle,
    fetchedHandle: record.user_posted,
    displayName: record.name,
    biography: record.biography,
  };
});

writeFileSync(outputPath, `${profiles.map((profile) => JSON.stringify(profile)).join("\n")}\n`);
console.log(`Wrote ${profiles.length} source profiles to ${outputPath}`);
