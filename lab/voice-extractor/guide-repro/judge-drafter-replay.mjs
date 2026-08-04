#!/usr/bin/env node

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
let run = "drafter-sonnet50-replay-01";
for (let index = 0; index < process.argv.slice(2).length; index += 1) {
  const argument = process.argv.slice(2)[index];
  if (argument === "--run") {
    run = process.argv.slice(2)[index + 1];
    index += 1;
  } else if (argument === "--help") {
    console.log("Usage: node judge-drafter-replay.mjs [--run <name>]");
    process.exit(0);
  } else {
    throw new Error(`Unknown argument: ${argument}`);
  }
}
if (!run || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(run)) {
  throw new Error("--run may contain only letters, digits, dot, underscore, and hyphen");
}
const runPath = resolve(here, "runs", run);
const resultsPath = resolve(runPath, "results.json");
const outputPath = resolve(runPath, "judgment.json");

const judgmentSchema = z.object({
  judgments: z.array(
    z.object({
      index: z.number().int().min(1).max(55),
      grade: z.enum(["exact", "near", "partial", "fail"]),
      semanticScore: z.number().int().min(0).max(4),
      voiceFormatScore: z.number().int().min(0).max(4),
      reason: z.string(),
    }),
  ),
});

function writeJsonAtomic(path, value) {
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
}

const system = `You are evaluating a controlled drafter replay. For each numbered row, compare the HISTORICAL draft with the REPLAY draft. The historical draft is the comparison target even if you would personally write it differently.

Grade definitions:
- exact: identical after trivial whitespace normalization.
- near: interchangeable for this experiment. The same major claims are present, the output language is the same, and the broad post mode/voice is compatible. Minor paraphrasing, punctuation, emoji, hashtag, link, or attribution placement differences are allowed.
- partial: the same core story remains, but a significant fact is omitted/added, the language changes, or the post mode/voice materially changes.
- fail: the replay would be skipped because REPLAY_ON_BEAT is false, or its meaning/output is fundamentally incompatible with the historical draft.

Hard rules:
1. REPLAY_ON_BEAT=false is always fail because the historical pipeline would emit no replay draft.
2. A historical English draft replayed substantially in Spanish is partial at best, never near.
3. Do not reward the replay merely for being better written; judge closeness to the historical target.
4. semanticScore: 4=same major factual content, 3=one meaningful omission/addition, 2=core story only, 1=weak overlap, 0=incompatible/skipped.
5. voiceFormatScore: 4=same post family and closely matching voice, 3=compatible with visible differences, 2=material mode/register change, 1=weak resemblance, 0=incompatible/skipped.
6. Return exactly one judgment for every index 1 through 55, in ascending order. Keep each reason to one short sentence.`;

const rows = JSON.parse(readFileSync(resultsPath, "utf8"));
if (rows.length !== 55) throw new Error(`Expected 55 replay rows, got ${rows.length}`);
const input = rows
  .map(
    (row) =>
      `INDEX ${row.index}\nREPLAY_ON_BEAT: ${row.replayVerdict.onBeat}\nSOURCE: ${row.text}\nHISTORICAL: ${row.historicalDraft}\nREPLAY: ${row.replayDraft}`,
  )
  .join("\n\n---\n\n");

const envPath = resolve(repoRoot, ".env.local");
loadEnvFile(envPath);
const result = await generateObject({
  model: "anthropic/claude-sonnet-5",
  schema: judgmentSchema,
  system,
  prompt: input,
  providerOptions: {
    anthropic: { thinking: { type: "adaptive", effort: "high", display: "summarized" } },
  },
  abortSignal: AbortSignal.timeout(600_000),
});

const judgments = result.object.judgments.slice().sort((a, b) => a.index - b.index);
if (judgments.length !== 55 || judgments.some((row, index) => row.index !== index + 1)) {
  throw new Error("Judge did not return exactly one ordered result for indices 1 through 55");
}
const counts = Object.fromEntries(
  ["exact", "near", "partial", "fail"].map((grade) => [
    grade,
    judgments.filter((row) => row.grade === grade).length,
  ]),
);
writeJsonAtomic(outputPath, {
  evaluator: "anthropic/claude-sonnet-5",
  thinking: "adaptive/high",
  rubricCloseGrades: ["exact", "near"],
  counts,
  closeCount: counts.exact + counts.near,
  closeRate: (counts.exact + counts.near) / judgments.length,
  usage: result.usage,
  judgments,
});
console.log(JSON.stringify({ counts, closeCount: counts.exact + counts.near }, null, 2));
