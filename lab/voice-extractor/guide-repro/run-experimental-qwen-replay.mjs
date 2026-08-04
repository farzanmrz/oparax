#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { generateText, Output } from "ai";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const runsPath = resolve(here, "runs");
const cohortPath = resolve(runsPath, "drafter-sonnet50-replay-01/cohort.json");
const guidePath = resolve(runsPath, "sonnet50-high-01/guide.md");
const translatorPromptPath = resolve(
  repoRoot,
  "lab/voice-extractor/filtration-eval/translator-prompt.md",
);
const drafterPromptPath = resolve(here, "drafter-voice-nested-input-prompt.md");
const sourceProfilesPath = resolve(
  repoRoot,
  "lab/voice-extractor/filtration-eval/source-profiles.jsonl",
);

const MODEL = "alibaba/qwen3.7-flash";
const BEAT = "I want to monitor all news around FC Barcelona.";
const EXPECTED_SOURCES = 55;
const GUIDE_SHA256 = "120bb94080e28c01363a18d116513d3509a76c8b884f4f0e7350555ff4c84a97";
const MAX_MEDIA = 4;

const translationSchema = z.object({
  translation: z
    .string()
    .nullable()
    .describe("Faithful English translation, or null when no translation is required."),
});

const drafterSchema = z.object({
  on_beat: z.boolean().describe("Whether the source post belongs on the reporter's beat."),
  reasoning: z.string().describe("A concise English explanation of the filtration decision."),
  synthesis: z
    .string()
    .describe("A concise English summary grounded only in the supplied source evidence."),
  draft: z
    .string()
    .nullable()
    .describe("One publishable English X post in the reporter's voice, or null when off-beat."),
});

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readJsonl(path) {
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map(JSON.parse);
}

function writeJsonAtomic(path, value) {
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
}

function parseArgs(argv) {
  let run = "drafter-experimental-qwen-sonnet50-replay-01";
  let concurrency = 8;
  let dryRun = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--run") {
      run = argv[index + 1];
      index += 1;
    } else if (argument === "--concurrency") {
      concurrency = Number(argv[index + 1]);
      index += 1;
    } else if (argument === "--dry-run") {
      dryRun = true;
    } else if (argument === "--help") {
      console.log(
        "Usage: node run-experimental-qwen-replay.mjs [--run <name>] [--concurrency <1-16>] [--dry-run]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!run || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(run)) {
    throw new Error("--run may contain only letters, digits, dot, underscore, and hyphen");
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) {
    throw new Error("--concurrency must be an integer from 1 to 16");
  }
  return { run, concurrency, dryRun };
}

function xmlText(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function xmlAttribute(value) {
  return xmlText(value).replaceAll('"', "&quot;");
}

function preserveSourceUrls(original, normalized) {
  const urls = original.match(/https?:\/\/[^\s<>]+/g) ?? [];
  const missing = urls.filter((url) => !normalized.includes(url));
  return missing.length > 0 ? `${normalized}\n${missing.join("\n")}` : normalized;
}

function mediaElementName(kind) {
  if (new Set(["image", "photo"]).has(kind)) return "photo";
  if (kind === "video") return "video";
  if (kind === "animated_gif") return "animated_gif";
  throw new Error(`Unsupported attachment kind: ${kind}`);
}

function imageMediaType(url) {
  const extension = new URL(url).pathname.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return "image/jpeg";
}

function buildTranslationContent(source) {
  return [
    '<source_language provider="x">und</source_language>',
    "<source_post>",
    source.text,
    "</source_post>",
  ].join("\n");
}

function buildDrafterContent(source, biography, translation) {
  const normalizedText = translation?.trim() || source.text;
  const sourceText = preserveSourceUrls(source.text, normalizedText);
  const content = [
    {
      type: "text",
      text: [
        `<beat>\n${xmlText(BEAT)}\n</beat>`,
        "",
        `<post platform="x" author="@${xmlAttribute(source.authorHandle)}">`,
        "<author_bio>",
        xmlText(biography),
        "</author_bio>",
        "<content>",
        xmlText(sourceText),
        "</content>",
      ].join("\n"),
    },
  ];
  if (source.media.length > 0) {
    content.push({ type: "text", text: "<attachments>" });
    for (const media of source.media.slice(0, MAX_MEDIA)) {
      const element = mediaElementName(media.kind);
      content.push({ type: "text", text: `<${element}>` });
      content.push({
        type: "file",
        data: new URL(media.imageUrl),
        mediaType: imageMediaType(media.imageUrl),
      });
      content.push({ type: "text", text: `</${element}>` });
    }
    content.push({ type: "text", text: "</attachments>" });
  }
  content.push({ type: "text", text: "</post>" });
  return content;
}

function usageShape(usage) {
  return {
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    totalTokens: usage?.totalTokens ?? null,
    reasoningTokens: usage?.outputTokenDetails?.reasoningTokens ?? null,
    cachedInputTokens: usage?.inputTokenDetails?.cacheReadTokens ?? null,
  };
}

function gatewayShape(providerMetadata) {
  const gateway = providerMetadata?.gateway ?? {};
  const rawCost = gateway.inferenceCost ?? gateway.cost;
  const parsedCost = Number(rawCost);
  return {
    generationId: typeof gateway.generationId === "string" ? gateway.generationId : null,
    costUsd: Number.isFinite(parsedCost) ? parsedCost : null,
  };
}

async function runStage({ system, content, output, maxOutputTokens, stage, run }) {
  const result = await generateText({
    model: MODEL,
    system,
    messages: [{ role: "user", content }],
    output,
    reasoning: "medium",
    temperature: 0,
    maxOutputTokens,
    maxRetries: 3,
    abortSignal: AbortSignal.timeout(180_000),
    providerOptions: {
      gateway: {
        sort: "cost",
        tags: ["feature:voice-extractor-filtration-eval", `run:${run}`, `stage:${stage}`],
      },
    },
  });
  return {
    output: result.output,
    usage: usageShape(result.usage),
    gateway: gatewayShape(result.providerMetadata),
  };
}

async function replayOne(source, context) {
  const startedAt = new Date().toISOString();
  const translationResult = await runStage({
    system: context.translatorSystem,
    content: [{ type: "text", text: buildTranslationContent(source) }],
    output: Output.object({ name: "Translation", schema: translationSchema }),
    maxOutputTokens: 1_024,
    stage: "translation",
    run: context.run,
  });
  const translation = translationResult.output.translation?.trim() || null;
  const draftResult = await runStage({
    system: context.drafterSystem,
    content: buildDrafterContent(
      source,
      context.biographyByHandle.get(source.authorHandle) ?? "",
      translation,
    ),
    output: Output.object({ name: "DrafterVerdict", schema: drafterSchema }),
    maxOutputTokens: 2_048,
    stage: "drafting",
    run: context.run,
  });
  const verdict = {
    onBeat: draftResult.output.on_beat,
    reasoning: draftResult.output.reasoning.trim(),
    synthesis: draftResult.output.synthesis.trim(),
    draft: draftResult.output.on_beat ? draftResult.output.draft?.trim() || null : null,
  };
  if (verdict.onBeat && !verdict.draft) {
    throw new Error("Drafter returned an empty draft for an on-beat source");
  }
  return {
    ...source,
    translation,
    replayDraft: verdict.draft,
    replayVerdict: verdict,
    usage: {
      translation: translationResult.usage,
      drafting: draftResult.usage,
    },
    gateway: {
      translation: translationResult.gateway,
      drafting: draftResult.gateway,
    },
    startedAt,
    completedAt: new Date().toISOString(),
    error: null,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const localEnvPath = resolve(repoRoot, ".env.local");
  if (existsSync(localEnvPath)) loadEnvFile(localEnvPath);
  if (!options.dryRun && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("AI Gateway auth missing");
  }

  const cohort = JSON.parse(readFileSync(cohortPath, "utf8"));
  if (cohort.length !== EXPECTED_SOURCES) {
    throw new Error(`Expected ${EXPECTED_SOURCES} frozen sources, got ${cohort.length}`);
  }
  const guide = readFileSync(guidePath, "utf8");
  if (hash(guide) !== GUIDE_SHA256) throw new Error("Sonnet 50 guide drifted");
  const translatorSystem = readFileSync(translatorPromptPath, "utf8").trim();
  const drafterPrompt = readFileSync(drafterPromptPath, "utf8").trim();
  const drafterSystem = `${drafterPrompt}\n\n<voice_guide>\n${guide.trim()}\n</voice_guide>`;
  const profiles = readJsonl(sourceProfilesPath);
  const biographyByHandle = new Map(
    profiles.map((profile) => [profile.sourceHandle, profile.biography ?? ""]),
  );
  biographyByHandle.set("David_Ornstein", "");

  const summary = {
    run: options.run,
    sourceCohortRun: "drafter-sonnet50-replay-01",
    cohortSources: cohort.length,
    sourcesWithMedia: cohort.filter((row) => row.media.length > 0).length,
    mediaItems: cohort.reduce((sum, row) => sum + row.media.length, 0),
    model: MODEL,
    temperature: 0,
    reasoning: "medium",
    translatorMaxOutputTokens: 1_024,
    drafterMaxOutputTokens: 2_048,
    beat: BEAT,
    guide: "sonnet50-high-01",
    guideSha256: hash(guide),
    translatorPromptSha256: hash(translatorSystem),
    drafterTemplateSha256: hash(drafterPrompt),
    compiledDrafterSystemSha256: hash(drafterSystem),
    inputMode: "nested XML",
    sourceProfiles: true,
    linkedContent: "none available in the frozen 55-source archive",
    webSearch: false,
    sourceLanguageRouting:
      "historical payloads did not retain X language codes; every source uses und and the unchanged translator prompt decides whether to translate",
  };
  if (options.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const runPath = resolve(runsPath, options.run);
  if (existsSync(runPath)) throw new Error(`Run already exists: ${runPath}`);
  mkdirSync(runPath, { recursive: true });
  writeJsonAtomic(resolve(runPath, "cohort.json"), cohort);
  writeFileSync(resolve(runPath, "translator-system-prompt.txt"), `${translatorSystem}\n`);
  writeFileSync(resolve(runPath, "drafter-system-prompt.txt"), `${drafterSystem}\n`);
  const startedAt = new Date().toISOString();
  writeJsonAtomic(resolve(runPath, "metadata.json"), {
    ...summary,
    status: "running",
    startedAt,
  });

  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < cohort.length) {
      const source = cohort[cursor];
      cursor += 1;
      try {
        results.push(
          await replayOne(source, {
            run: options.run,
            translatorSystem,
            drafterSystem,
            biographyByHandle,
          }),
        );
        console.log(`[${results.length}/${cohort.length}] completed source ${source.index}`);
      } catch (error) {
        results.push({
          ...source,
          translation: null,
          replayDraft: null,
          replayVerdict: { onBeat: false },
          usage: null,
          gateway: null,
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        });
        console.error(`[${results.length}/${cohort.length}] failed source ${source.index}`, error);
      }
      results.sort((left, right) => left.index - right.index);
      writeJsonAtomic(resolve(runPath, "results.json"), results);
    }
  }

  console.log(
    `Starting ${options.run}: ${cohort.length} frozen sources, ${options.concurrency} workers, translator then drafter`,
  );
  await Promise.all(Array.from({ length: options.concurrency }, () => worker()));
  const failures = results.filter((row) => row.error);
  writeJsonAtomic(resolve(runPath, "metadata.json"), {
    ...summary,
    status: failures.length === 0 ? "complete" : "partial",
    completed: results.length - failures.length,
    failures: failures.length,
    startedAt,
    completedAt: new Date().toISOString(),
  });
  console.log(
    JSON.stringify({ completed: results.length - failures.length, failures: failures.length }),
  );
  if (failures.length > 0) process.exitCode = 1;
}

await main();
