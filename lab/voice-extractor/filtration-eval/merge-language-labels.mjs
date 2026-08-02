#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(here, "language-shards-manifest.json"), "utf8"));
const outputPath = resolve(here, "x-language-labels.jsonl");
const allowed = new Set([
  "am",
  "ar",
  "hy",
  "eu",
  "bn",
  "bg",
  "ca",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "et",
  "fi",
  "fr",
  "ka",
  "de",
  "el",
  "gu",
  "iw",
  "hi",
  "hu",
  "in",
  "it",
  "ja",
  "kn",
  "ko",
  "lv",
  "lt",
  "ml",
  "mr",
  "no",
  "fa",
  "pl",
  "pt",
  "ro",
  "ru",
  "sr",
  "zh-CN",
  "sk",
  "sl",
  "es",
  "sv",
  "ta",
  "te",
  "th",
  "zh-TW",
  "tr",
  "uk",
  "ur",
  "vi",
  "und",
]);
const merged = [];

for (const assignment of manifest.assignments) {
  const inputPath = resolve(here, assignment.input);
  const labelsPath = resolve(here, assignment.output);
  if (!existsSync(labelsPath)) throw new Error(`Missing ${assignment.output}`);
  const inputs = readFileSync(inputPath, "utf8").split("\n").filter(Boolean).map(JSON.parse);
  const labels = readFileSync(labelsPath, "utf8").split("\n").filter(Boolean).map(JSON.parse);
  if (inputs.length !== labels.length) {
    throw new Error(
      `${assignment.shard}: expected ${inputs.length} labels, found ${labels.length}`,
    );
  }
  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index];
    const label = labels[index];
    if (Object.keys(label).sort().join(",") !== "lang,postId") {
      throw new Error(`${assignment.shard}:${index + 1}: expected exactly postId and lang`);
    }
    if (label.postId !== input.postId) {
      throw new Error(`${assignment.shard}:${index + 1}: postId/order mismatch`);
    }
    if (!allowed.has(label.lang)) {
      throw new Error(`${assignment.shard}:${index + 1}: unsupported lang ${label.lang}`);
    }
    merged.push(label);
  }
}

if (new Set(merged.map((row) => row.postId)).size !== manifest.total) {
  throw new Error("Merged language labels contain duplicate or missing post IDs");
}
const counts = Object.fromEntries(
  [...new Set(merged.map((row) => row.lang))]
    .sort()
    .map((lang) => [lang, merged.filter((row) => row.lang === lang).length]),
);
writeFileSync(outputPath, `${merged.map((row) => JSON.stringify(row)).join("\n")}\n`);
writeFileSync(
  resolve(here, "x-language-labels-summary.json"),
  `${JSON.stringify(
    {
      total: merged.length,
      method: "Agent-labeled local emulation of X's BCP-47 lang field; no X API lookup",
      counts,
    },
    null,
    2,
  )}\n`,
);
console.log(JSON.stringify({ total: merged.length, counts }, null, 2));
