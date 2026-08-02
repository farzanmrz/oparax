#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const benchmark = new Map(
  readJsonl(resolve(here, "consensus-benchmark.jsonl")).map((row) => [row.postId, row]),
);
const baseline = new Map(
  readJsonl(resolve(here, "runs/link-enriched-baseline/predictions.jsonl")).map((row) => [
    row.postId,
    row,
  ]),
);
const bio = new Map(
  readJsonl(resolve(here, "runs/full-link-enriched-bio/predictions.jsonl")).map((row) => [
    row.postId,
    row,
  ]),
);

const improvements = [];
const regressions = [];
const changedButSameCorrectness = [];
for (const [postId, expected] of benchmark) {
  const before = baseline.get(postId);
  const after = bio.get(postId);
  if (!before || !after || before.predictedOnBeat === after.predictedOnBeat) continue;
  const comparison = {
    postId,
    sourceHandle: expected.sourceHandle,
    expectedOnBeat: expected.expectedOnBeat,
    postContent: expected.postContent,
    baselineOnBeat: before.predictedOnBeat,
    baselineReasoning: before.reasoning,
    bioOnBeat: after.predictedOnBeat,
    bioReasoning: after.reasoning,
  };
  if (!before.correct && after.correct) improvements.push(comparison);
  else if (before.correct && !after.correct) regressions.push(comparison);
  else changedButSameCorrectness.push(comparison);
}

const baselineSummary = JSON.parse(
  readFileSync(resolve(here, "runs/link-enriched-baseline/summary.json"), "utf8"),
);
const bioSummary = JSON.parse(
  readFileSync(resolve(here, "runs/full-link-enriched-bio/summary.json"), "utf8"),
);
const artifact = {
  generatedAt: new Date().toISOString(),
  baseline: {
    name: "link-enriched filtration",
    correct: baselineSummary.correct,
    accuracyPercent: baselineSummary.accuracyPercent,
    confusionMatrix: baselineSummary.confusionMatrix,
  },
  treatment: {
    name: "link-enriched filtration plus source bio",
    correct: bioSummary.correct,
    accuracyPercent: bioSummary.accuracyPercent,
    confusionMatrix: bioSummary.confusionMatrix,
  },
  paired: {
    netCorrect: bioSummary.correct - baselineSummary.correct,
    predictionChanges: improvements.length + regressions.length + changedButSameCorrectness.length,
    improvements: improvements.length,
    regressions: regressions.length,
    changedButSameCorrectness: changedButSameCorrectness.length,
  },
  improvements,
  regressions,
  changedButSameCorrectness,
};

writeFileSync(
  resolve(here, "bio-link-enrichment-comparison.json"),
  `${JSON.stringify(artifact, null, 2)}\n`,
);
console.log(JSON.stringify(artifact.paired, null, 2));
