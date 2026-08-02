#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const benchmarkPath = resolve(here, "consensus-benchmark.jsonl");
const promptPath = resolve(here, "translator-prompt.md");
const runsPath = resolve(here, "translation-runs");

const DEFAULTS = {
  run: `translations-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`,
  concurrency: 32,
  attempts: 2,
  timeoutMs: 120_000,
  temperature: 0,
  reasoning: "medium",
  model: "alibaba/qwen3.7-flash",
};

const translationSchema = z.object({
  translation: z
    .string()
    .nullable()
    .describe("Faithful English translation, or null when no translation is required."),
});

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map(JSON.parse);
}

function writeJsonAtomic(path, value) {
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
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

function positiveInteger(name, value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer; received ${value}`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} needs a value`);
      index += 1;
      return value;
    };
    if (argument === "--run") options.run = next();
    else if (argument === "--concurrency") {
      options.concurrency = positiveInteger(argument, next());
    } else if (argument === "--attempts") options.attempts = positiveInteger(argument, next());
    else if (argument === "--timeout-ms") {
      options.timeoutMs = positiveInteger(argument, next());
    } else if (argument === "--temperature") options.temperature = Number(next());
    else if (argument === "--reasoning") options.reasoning = next();
    else if (argument === "--model") options.model = next();
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(options.run)) {
    throw new Error("--run may contain only letters, digits, dot, underscore, and hyphen");
  }
  if (!Number.isFinite(options.temperature) || options.temperature < 0 || options.temperature > 2) {
    throw new Error("--temperature must be between 0 and 2");
  }
  if (!["minimal", "low", "medium", "high"].includes(options.reasoning)) {
    throw new Error("--reasoning must be minimal, low, medium, or high");
  }
  return options;
}

function buildContent(row) {
  return [
    `<source_language provider="x">${row.lang}</source_language>`,
    "<source_post>",
    row.postContent,
    "</source_post>",
  ].join("\n");
}

async function translate(row, system, options) {
  let lastError;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const result = await generateText({
        model: options.model,
        system,
        messages: [{ role: "user", content: [{ type: "text", text: buildContent(row) }] }],
        output: Output.object({ name: "Translation", schema: translationSchema }),
        reasoning: options.reasoning,
        temperature: options.temperature,
        maxOutputTokens: 1_024,
        maxRetries: 3,
        abortSignal: AbortSignal.timeout(options.timeoutMs),
        providerOptions: {
          gateway: {
            sort: "cost",
            tags: [
              "feature:voice-extractor-filtration-eval",
              `run:${options.run}`,
              "stage:translation",
            ],
          },
        },
      });
      const translation = result.output.translation?.trim() || null;
      if (row.lang !== "en" && row.lang !== "und" && translation === null) {
        throw new Error(`Translation was required for language ${row.lang}`);
      }
      return {
        postId: row.postId,
        lang: row.lang,
        translation,
        skipped: false,
        attempt,
        durationMs: Date.now() - startedAt,
        usage: usageShape(result.usage),
        ...gatewayShape(result.providerMetadata),
      };
    } catch (error) {
      lastError = error;
      if (attempt < options.attempts) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const localEnvPath = resolve(repoRoot, ".env.local");
  if (!process.env.AI_GATEWAY_API_KEY && existsSync(localEnvPath)) loadEnvFile(localEnvPath);
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("AI Gateway auth missing: set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN");
  }

  const benchmark = readJsonl(benchmarkPath);
  const system = readFileSync(promptPath, "utf8").trim();
  const runPath = resolve(runsPath, options.run);
  mkdirSync(runPath, { recursive: true });
  const config = {
    createdAt: new Date().toISOString(),
    run: options.run,
    model: options.model,
    concurrency: options.concurrency,
    attempts: options.attempts,
    timeoutMs: options.timeoutMs,
    temperature: options.temperature,
    reasoning: options.reasoning,
    benchmarkRows: benchmark.length,
    benchmarkSha256: hash(readFileSync(benchmarkPath)),
    prompt: "translator-prompt.md",
    promptSha256: hash(system),
    englishPolicy: "deterministic null without a model call",
  };
  const configPath = resolve(runPath, "config.json");
  if (existsSync(configPath)) {
    const previous = JSON.parse(readFileSync(configPath, "utf8"));
    for (const key of [
      "model",
      "temperature",
      "reasoning",
      "benchmarkRows",
      "benchmarkSha256",
      "promptSha256",
    ]) {
      if (previous[key] !== config[key]) {
        throw new Error(`Translation run ${options.run} has a different ${key}; use a new name`);
      }
    }
  } else writeJsonAtomic(configPath, config);
  writeFileSync(resolve(runPath, "system-prompt.txt"), `${system}\n`);

  const translationsPath = resolve(runPath, "translations.jsonl");
  const errorsPath = resolve(runPath, "errors.jsonl");
  const translations = new Map(readJsonl(translationsPath).map((row) => [row.postId, row]));
  for (const row of benchmark) {
    if (row.lang === "en" && !translations.has(row.postId)) {
      const translation = {
        postId: row.postId,
        lang: row.lang,
        translation: null,
        skipped: true,
        attempt: 0,
        durationMs: 0,
        usage: usageShape(null),
        generationId: null,
        costUsd: null,
      };
      appendFileSync(translationsPath, `${JSON.stringify(translation)}\n`);
      translations.set(row.postId, translation);
    }
  }

  const pending = benchmark.filter((row) => row.lang !== "en" && !translations.has(row.postId));
  let cursor = 0;
  let completed = 0;
  const startedAt = Date.now();
  console.log(
    `Translating ${pending.length} pending non-English/und rows with concurrency ${options.concurrency}…`,
  );

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= pending.length) return;
      const row = pending[index];
      try {
        const result = await translate(row, system, options);
        appendFileSync(translationsPath, `${JSON.stringify(result)}\n`);
        translations.set(row.postId, result);
      } catch (error) {
        const malformed = NoObjectGeneratedError.isInstance(error);
        appendFileSync(
          errorsPath,
          `${JSON.stringify({
            postId: row.postId,
            at: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
            rawOutput: malformed ? error.text : null,
          })}\n`,
        );
      }
      completed += 1;
      if (completed % 25 === 0 || completed === pending.length) {
        console.log(
          `${completed}/${pending.length} processed this session (${Math.round((Date.now() - startedAt) / 1_000)}s)`,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, pending.length) }, () => worker()),
  );

  const rows = [...translations.values()];
  const modelRows = rows.filter((row) => !row.skipped);
  const requiredRows = benchmark.filter((row) => row.lang !== "en" && row.lang !== "und");
  const requiredPresent = requiredRows.filter(
    (row) => translations.get(row.postId)?.translation,
  ).length;
  const summary = {
    generatedAt: new Date().toISOString(),
    requested: benchmark.length,
    completed: rows.length,
    missing: benchmark.length - rows.length,
    modelCalls: modelRows.length,
    requiredTranslations: requiredRows.length,
    requiredPresent,
    undRows: benchmark.filter((row) => row.lang === "und").length,
    undTranslated: benchmark.filter(
      (row) => row.lang === "und" && translations.get(row.postId)?.translation,
    ).length,
    usage: {
      inputTokens: modelRows.reduce((sum, row) => sum + (row.usage.inputTokens ?? 0), 0),
      outputTokens: modelRows.reduce((sum, row) => sum + (row.usage.outputTokens ?? 0), 0),
      costUsd: modelRows.reduce((sum, row) => sum + (row.costUsd ?? 0), 0),
      callsWithCost: modelRows.filter((row) => row.costUsd !== null).length,
    },
  };
  writeJsonAtomic(resolve(runPath, "summary.json"), summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
