import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = path.dirname(new URL(import.meta.url).pathname);
const labelFiles = [
  "fcbarcelona.labeled.jsonl",
  "group_1.labeled.jsonl",
  "group_2.labeled.jsonl",
  "group_3.labeled.jsonl",
  "group_4.labeled.jsonl",
  "group_5.labeled.jsonl",
];
const uncertaintyFiles = [
  "fcbarcelona.json",
  "group_1.json",
  "group_2.json",
  "group_3.json",
  "group_4.json",
  "group_5.json",
];
const requiredKeys = ["onBeat", "postContent", "postId", "sourceHandle"];

async function readJsonLines(filePath) {
  const content = (await readFile(filePath, "utf8")).trim();
  return content ? content.split("\n").map((line) => JSON.parse(line)) : [];
}

function sameKeys(row) {
  return JSON.stringify(Object.keys(row).sort()) === JSON.stringify(requiredKeys);
}

const candidates = await readJsonLines(path.join(directory, "candidate-posts.unlabeled.jsonl"));
const candidateById = new Map(candidates.map((row) => [row.postId, row]));
const labelsById = new Map();

for (const filename of labelFiles) {
  const rows = await readJsonLines(path.join(directory, "labels", filename));
  for (const row of rows) {
    if (!sameKeys(row)) throw new Error(`${filename}: invalid keys for ${row.postId}`);
    if (typeof row.onBeat !== "boolean") {
      throw new Error(`${filename}: non-boolean onBeat for ${row.postId}`);
    }
    const candidate = candidateById.get(row.postId);
    if (!candidate) throw new Error(`${filename}: unknown postId ${row.postId}`);
    if (candidate.sourceHandle !== row.sourceHandle || candidate.postContent !== row.postContent) {
      throw new Error(`${filename}: mutated candidate fields for ${row.postId}`);
    }
    if (labelsById.has(row.postId)) {
      throw new Error(`${filename}: duplicate postId ${row.postId}`);
    }
    labelsById.set(row.postId, row);
  }
}

if (labelsById.size !== candidates.length) {
  const missing = candidates
    .filter((candidate) => !labelsById.has(candidate.postId))
    .map((candidate) => candidate.postId);
  throw new Error(
    `Expected ${candidates.length} labels, received ${labelsById.size}; ` +
      `missing ${missing.join(", ")}`,
  );
}

const goldenLabels = candidates.map((candidate) => labelsById.get(candidate.postId));
const uncertaintyById = new Map();
for (const filename of uncertaintyFiles) {
  const rows = JSON.parse(await readFile(path.join(directory, "uncertainty", filename), "utf8"));
  for (const row of rows) {
    if (!labelsById.has(row.postId)) {
      throw new Error(`${filename}: uncertainty references unknown ${row.postId}`);
    }
    uncertaintyById.set(row.postId, row);
  }
}
const uncertainty = candidates
  .filter((candidate) => uncertaintyById.has(candidate.postId))
  .map((candidate) => uncertaintyById.get(candidate.postId));

const onBeat = goldenLabels.filter((row) => row.onBeat).length;
const summary = {
  generatedAt: new Date().toISOString(),
  total: goldenLabels.length,
  onBeat,
  offBeat: goldenLabels.length - onBeat,
  uncertain: uncertainty.length,
  validation: {
    exactCandidateIdSet: true,
    uniquePostIds: true,
    exactFourFieldSchema: true,
    candidateFieldsPreserved: true,
    booleanLabels: true,
    originalCandidateOrderPreserved: true,
  },
};

await writeFile(
  path.join(directory, "golden-labels.jsonl"),
  `${goldenLabels.map((row) => JSON.stringify(row)).join("\n")}\n`,
);
await writeFile(
  path.join(directory, "uncertainty", "all.json"),
  `${JSON.stringify(uncertainty, null, 2)}\n`,
);
await writeFile(
  path.join(directory, "labeling-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);

console.log(JSON.stringify(summary, null, 2));
