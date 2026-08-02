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
import { gateway, generateText, NoObjectGeneratedError, Output, stepCountIs } from "ai";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const extractorPromptPath = resolve(here, "extractor-prompt.md");
const promptPaths = {
  baseline: resolve(here, "drafter-filter-prompt.md"),
  profile: resolve(here, "drafter-filter-profile-prompt.md"),
};
const corpusPath = resolve(here, "../corpus-snapshot.jsonl");
const benchmarkPath = resolve(here, "consensus-benchmark.jsonl");
const runsPath = resolve(here, "runs");

const DEFAULTS = {
  run: `run-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`,
  concurrency: 32,
  limit: Number.POSITIVE_INFINITY,
  attempts: 2,
  timeoutMs: 120_000,
  temperature: 0,
  handle: "ReshadRahman",
  beat: "I want to monitor all news around FC Barcelona.",
  extractorModel: "anthropic/claude-sonnet-5",
  classifierModel: "alibaba/qwen3.7-flash",
  dryRun: false,
  extractOnly: false,
  guidance: null,
  noGuidance: false,
  beatPlacement: "system",
  promptMode: "baseline",
  translations: null,
  linkContext: null,
  sourceProfiles: null,
  searchGate: false,
  searchProvider: null,
};

const filtrationVerdictSchema = z.object({
  on_beat: z.boolean().describe("Whether the source story belongs on the reporter's beat."),
  reasoning: z
    .string()
    .min(1)
    .describe("A concise, specific explanation tied to the filtration guidance and source."),
});

const searchGateSchema = z.object({
  needs_search: z.boolean().optional().default(false),
  search_query: z.string().nullable().optional().default(null),
  on_beat: z.boolean().describe("The provisional beat verdict using currently available evidence."),
  reasoning: z.string().min(1),
});

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

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function writeJsonAtomic(path, value) {
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parsePositiveInteger(name, value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer; received ${value}`);
  }
  return parsed;
}

function parseTemperature(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 2) {
    throw new Error(`--temperature must be between 0 and 2; received ${value}`);
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
      options.concurrency = parsePositiveInteger(argument, next());
    } else if (argument === "--limit") options.limit = parsePositiveInteger(argument, next());
    else if (argument === "--attempts") {
      options.attempts = parsePositiveInteger(argument, next());
    } else if (argument === "--timeout-ms") {
      options.timeoutMs = parsePositiveInteger(argument, next());
    } else if (argument === "--temperature") options.temperature = parseTemperature(next());
    else if (argument === "--handle") options.handle = next().replace(/^@/, "");
    else if (argument === "--beat") options.beat = next();
    else if (argument === "--extractor-model") options.extractorModel = next();
    else if (argument === "--classifier-model") options.classifierModel = next();
    else if (argument === "--guidance") options.guidance = resolve(next());
    else if (argument === "--translations") options.translations = resolve(next());
    else if (argument === "--link-context") options.linkContext = resolve(next());
    else if (argument === "--source-profiles") options.sourceProfiles = resolve(next());
    else if (argument === "--search-gate") options.searchGate = true;
    else if (argument === "--search-provider") options.searchProvider = next();
    else if (argument === "--no-guidance") options.noGuidance = true;
    else if (argument === "--beat-placement") options.beatPlacement = next();
    else if (argument === "--prompt-mode") options.promptMode = next();
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--extract-only") options.extractOnly = true;
    else if (argument === "--help") {
      console.log(`Usage:
  pnpm lab:filtration-eval -- --run <name> [options]

Options:
  --concurrency <n>       Simultaneous Qwen calls (default: 32)
  --limit <n>             Evaluate only the first n benchmark rows
  --attempts <n>          Whole-call attempts after SDK transport retries (default: 2)
  --timeout-ms <n>        Per-call timeout (default: 120000)
  --temperature <n>       Qwen sampling temperature (default: 0)
  --extract-only          Run the extractor and stop before Qwen
  --guidance <path>       Skip extraction and use an existing guidance file
  --no-guidance           Skip extraction; use only the reporter's raw beat as the baseline
  --beat-placement <site> Put the raw beat in system or user (default: system)
  --prompt-mode <mode>    baseline or profile (default: baseline)
  --translations <path>  Shared translation JSONL (required)
  --link-context <path>  Cached production-feasible link context JSONL (required)
  --source-profiles <p>  Source-account profiles JSONL; required by profile mode
  --search-gate          Measure search requests without executing any search
  --search-provider <p>  Let Qwen search directly: perplexity or parallel
  --extractor-model <id>  Override anthropic/claude-sonnet-5
  --classifier-model <id> Override alibaba/qwen3.7-flash
  --dry-run               Materialize inputs/config without calling either model`);
      process.exit(0);
    } else throw new Error(`Unknown argument: ${argument}`);
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(options.run)) {
    throw new Error("--run may contain only letters, digits, dot, underscore, and hyphen");
  }
  if (options.noGuidance && options.guidance) {
    throw new Error("--no-guidance and --guidance cannot be used together");
  }
  if (options.noGuidance && options.extractOnly) {
    throw new Error("--no-guidance and --extract-only cannot be used together");
  }
  if (!new Set(["system", "user"]).has(options.beatPlacement)) {
    throw new Error("--beat-placement must be either system or user");
  }
  if (!new Set(["baseline", "profile"]).has(options.promptMode)) {
    throw new Error("--prompt-mode must be baseline or profile");
  }
  if (options.translations === null) throw new Error("--translations is required");
  if (options.linkContext === null) throw new Error("--link-context is required");
  if (options.promptMode === "profile" && options.sourceProfiles === null) {
    throw new Error("--prompt-mode profile requires --source-profiles");
  }
  if (options.promptMode === "baseline" && options.sourceProfiles !== null) {
    throw new Error("--source-profiles is only valid with --prompt-mode profile");
  }
  if (options.searchGate && options.promptMode !== "profile") {
    throw new Error("--search-gate requires --prompt-mode profile");
  }
  if (options.searchGate && options.searchProvider !== null) {
    throw new Error("--search-gate and --search-provider cannot be combined");
  }
  if (
    options.searchProvider !== null &&
    !new Set(["perplexity", "parallel"]).has(options.searchProvider)
  ) {
    throw new Error("--search-provider must be perplexity or parallel");
  }
  return options;
}

function buildExtractorInput(handle, beat, corpus) {
  const lines = corpus.map((post) => {
    const mediaMark = post.has_media
      ? " [MEDIA: attachment recorded, but its URL is absent from this lab snapshot]"
      : "";
    return `[${post.x_post_id}] ${post.posted_at} ${post.is_long ? "LONG " : ""}(♥${post.like_count} ↻${post.repost_count})${mediaMark}: ${post.text}`;
  });

  return [
    `REPORTER: @${handle}`,
    "",
    "THE BEAT, IN THE REPORTER'S OWN WORDS:",
    beat.trim() || "(not stated)",
    "",
    "THE CORPUS (most recent first):",
    "",
    lines.join("\n"),
  ].join("\n");
}

function imageMediaType(media) {
  if (media.imagePath) {
    const extension = media.imagePath.split(".").pop()?.toLowerCase();
    if (extension === "png") return "image/png";
    if (extension === "webp") return "image/webp";
    if (extension === "gif") return "image/gif";
    return "image/jpeg";
  }
  const url = new URL(media.imageUrl);
  const format = url.searchParams.get("format")?.toLowerCase();
  const extension = url.pathname.split(".").pop()?.toLowerCase();
  const type = format ?? extension;
  if (type === "png") return "image/png";
  if (type === "webp") return "image/webp";
  if (type === "gif") return "image/gif";
  return "image/jpeg";
}

function buildClassifierSystemPrompt(template, handle, beatDescription, guidance, beatPlacement) {
  const beatDescriptionSection =
    beatPlacement === "system"
      ? `<beat_description>\n${beatDescription.trim() || "(not stated)"}\n</beat_description>`
      : "";
  const filtrationGuidanceSection = guidance.trim()
    ? `<extracted_guidance>\n<filtration>\n${guidance.trim()}\n</filtration>\n</extracted_guidance>`
    : "";
  const replacements = {
    "{{REPORTER_HANDLE}}": handle,
    "{{BEAT_DESCRIPTION_SECTION}}": beatDescriptionSection,
    "{{FILTRATION_GUIDANCE_SECTION}}": filtrationGuidanceSection,
  };
  let prompt = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    prompt = prompt.replaceAll(placeholder, value);
  }
  if (prompt.includes("{{")) throw new Error("Drafter prompt contains an unresolved placeholder");
  return prompt.trim();
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

function renderLinkedContent(linkContext) {
  if (!linkContext?.links?.length) return [];
  const lines = ["<linked_content>"];
  let linkedMediaIndex = 0;
  for (const link of linkContext.links) {
    lines.push(`<link type="${xmlAttribute(link.type)}" url="${xmlAttribute(link.sourceUrl)}">`);
    if (link.author) lines.push(`<author>${xmlText(link.author)}</author>`);
    if (link.title) lines.push(`<title>${xmlText(link.title)}</title>`);
    if (link.content) lines.push("<content>", xmlText(link.content), "</content>");
    for (const media of link.media ?? []) {
      linkedMediaIndex += 1;
      if (linkedMediaIndex <= 4) {
        lines.push(
          `<media ref="linked-media-${linkedMediaIndex}" type="${xmlAttribute(media.kind)}" />`,
        );
      }
    }
    for (const sourceIndex of link.sourceMediaIndexes ?? []) {
      const kind = link.xDestination?.mediaKind === "video" ? "video_frame" : "image";
      lines.push(`<media ref="source-media-${sourceIndex + 1}" type="${kind}" />`);
    }
    lines.push("</link>");
  }
  lines.push("</linked_content>");
  return lines;
}

function buildClassifierContent(row, options, translationRecord, linkContext, sourceProfile) {
  const translatedText = translationRecord?.translation?.trim() || null;
  const normalizedText = translatedText ?? row.postContent;
  const sourceText = linkContext?.links?.length
    ? preserveSourceUrls(row.postContent, normalizedText)
    : normalizedText;
  const sourceProfileSection =
    options.promptMode === "profile"
      ? [
          "<source_profile>",
          `<handle>@${xmlText(sourceProfile.sourceHandle)}</handle>`,
          `<display_name>${xmlText(sourceProfile.displayName)}</display_name>`,
          `<biography>${xmlText(sourceProfile.biography)}</biography>`,
          "</source_profile>",
        ]
      : [];
  const text = [
    options.beatPlacement === "user"
      ? `<beat_description>\n${options.beat.trim() || "(not stated)"}\n</beat_description>\n`
      : null,
    "<source>",
    `<source_handle>@${row.sourceHandle}</source_handle>`,
    ...sourceProfileSection,
    "<source_post>",
    sourceText,
    "</source_post>",
    ...renderLinkedContent(linkContext),
    "</source>",
  ]
    .filter((part) => part !== null)
    .join("\n");

  const content = [{ type: "text", text }];
  if (row.media.length > 0) {
    content.push({
      type: "text",
      text: "\n<attachments>",
    });
    for (const [index, media] of row.media.slice(0, 4).entries()) {
      const representation = media.kind === "photo" ? "original" : "poster_frame";
      content.push({
        type: "text",
        text: `<attachment index="${index + 1}" kind="${media.kind}" representation="${representation}">`,
      });
      content.push({
        type: "file",
        data: media.imagePath
          ? readFileSync(resolve(here, media.imagePath))
          : new URL(media.imageUrl),
        mediaType: imageMediaType(media),
      });
      content.push({ type: "text", text: "</attachment>" });
    }
    content.push({ type: "text", text: "</attachments>" });
  } else if (row.hasUnattachedVideo) {
    content.push({
      type: "text",
      text: "\nA video exists, but this benchmark export has no poster-frame image to attach.",
    });
  }
  const linkedMedia = (linkContext?.links ?? []).flatMap((link) => link.media ?? []).slice(0, 4);
  if (linkedMedia.length > 0) {
    content.push({ type: "text", text: "\n<linked_attachments>" });
    for (const [index, media] of linkedMedia.entries()) {
      content.push({
        type: "text",
        text: `<attachment ref="linked-media-${index + 1}" kind="${media.kind}">`,
      });
      content.push({
        type: "file",
        data: media.imagePath
          ? readFileSync(resolve(here, media.imagePath))
          : new URL(media.imageUrl),
        mediaType: imageMediaType(media),
      });
      content.push({ type: "text", text: "</attachment>" });
    }
    content.push({ type: "text", text: "</linked_attachments>" });
  }
  return content;
}

async function runExtractor(options, systemPrompt, extractorInput) {
  const result = await generateText({
    model: options.extractorModel,
    system: systemPrompt,
    messages: [{ role: "user", content: [{ type: "text", text: extractorInput }] }],
    providerOptions: {
      anthropic: { thinking: { type: "adaptive", effort: "medium", display: "summarized" } },
      gateway: {
        tags: ["feature:voice-extractor-filtration-eval", `run:${options.run}`, "stage:extractor"],
      },
    },
    maxRetries: 3,
    abortSignal: AbortSignal.timeout(770_000),
  });
  return {
    guidance: result.text.trim(),
    metadata: {
      model: options.extractorModel,
      reasoning: result.reasoningText || null,
      finishReason: result.finishReason,
      usage: usageShape(result.usage),
      gateway: gatewayShape(result.providerMetadata),
    },
  };
}

async function classify(
  row,
  classifierSystemPrompt,
  options,
  translationRecord,
  linkContext,
  sourceProfile,
) {
  let lastError;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      let searchTools;
      if (options.searchProvider === "perplexity") {
        searchTools = {
          web_search: gateway.tools.perplexitySearch({
            maxResults: 5,
            maxTokensPerPage: 512,
            maxTokens: 2_500,
          }),
        };
      } else if (options.searchProvider === "parallel") {
        searchTools = {
          web_search: gateway.tools.parallelSearch({
            mode: "agentic",
            maxResults: 5,
            excerpts: {
              maxCharsPerResult: 2_000,
              maxCharsTotal: 10_000,
            },
          }),
        };
      }
      const result = await generateText({
        model: options.classifierModel,
        system: classifierSystemPrompt,
        messages: [
          {
            role: "user",
            content: buildClassifierContent(
              row,
              options,
              translationRecord,
              linkContext,
              sourceProfile,
            ),
          },
        ],
        output: Output.object({
          name: options.searchGate ? "SearchGate" : "FiltrationVerdict",
          schema: options.searchGate ? searchGateSchema : filtrationVerdictSchema,
        }),
        tools: searchTools,
        stopWhen: searchTools ? stepCountIs(2) : undefined,
        reasoning: "medium",
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
              "stage:filtration",
            ],
          },
        },
      });
      const verdict = result.output;
      const gatewayMetadata = gatewayShape(result.providerMetadata);
      const searchCalls = result.steps
        .flatMap((step) => step.toolCalls)
        .filter((call) => call.toolName === "web_search");
      return {
        postId: row.postId,
        sourceHandle: row.sourceHandle,
        expectedOnBeat: row.expectedOnBeat,
        predictedOnBeat: verdict.on_beat,
        correct: verdict.on_beat === row.expectedOnBeat,
        // Match production's deterministic normalization: X already identified English, so
        // never persist a model paraphrase/copy as though it were a translation.
        translation: null,
        usedTranslation: Boolean(translationRecord?.translation),
        reasoning: verdict.reasoning.trim(),
        needsSearch: options.searchGate ? verdict.needs_search : null,
        searchQuery:
          options.searchGate && verdict.needs_search ? verdict.search_query?.trim() || null : null,
        searchCalls: searchCalls.length,
        searchFeeUsd: searchCalls.length * 0.005,
        searchProvider: options.searchProvider,
        mediaAttached: row.media.length,
        attempt,
        durationMs: Date.now() - startedAt,
        usage: usageShape(result.usage),
        ...gatewayMetadata,
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

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function metricsFor(rows, predictions) {
  let truePositive = 0;
  let trueNegative = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  let callsWithCost = 0;
  let searchCalls = 0;
  let searchFeeUsd = 0;
  let durationMs = 0;
  const bySource = {};

  for (const row of rows) {
    const prediction = predictions.get(row.postId);
    if (!prediction) continue;
    if (row.expectedOnBeat && prediction.predictedOnBeat) truePositive += 1;
    else if (!row.expectedOnBeat && !prediction.predictedOnBeat) trueNegative += 1;
    else if (!row.expectedOnBeat && prediction.predictedOnBeat) falsePositive += 1;
    else falseNegative += 1;

    inputTokens += prediction.usage.inputTokens ?? 0;
    outputTokens += prediction.usage.outputTokens ?? 0;
    if (prediction.costUsd !== null) {
      costUsd += prediction.costUsd;
      callsWithCost += 1;
    }
    searchCalls += prediction.searchCalls ?? 0;
    searchFeeUsd += prediction.searchFeeUsd ?? 0;
    durationMs += prediction.durationMs ?? 0;

    bySource[row.sourceHandle] ??= { total: 0, correct: 0 };
    const source = bySource[row.sourceHandle];
    source.total += 1;
    if (prediction.correct) source.correct += 1;
  }

  for (const source of Object.values(bySource)) {
    source.accuracy = ratio(source.correct, source.total);
  }

  const completed = truePositive + trueNegative + falsePositive + falseNegative;
  const searchRequested = [...predictions.values()].filter(
    (prediction) => prediction.needsSearch,
  ).length;
  return {
    generatedAt: new Date().toISOString(),
    requested: rows.length,
    completed,
    missing: rows.length - completed,
    correct: truePositive + trueNegative,
    accuracy: ratio(truePositive + trueNegative, completed),
    accuracyPercent:
      completed === 0
        ? null
        : Number((((truePositive + trueNegative) / completed) * 100).toFixed(2)),
    confusionMatrix: { truePositive, trueNegative, falsePositive, falseNegative },
    onBeatPrecision: ratio(truePositive, truePositive + falsePositive),
    onBeatRecall: ratio(truePositive, truePositive + falseNegative),
    onBeatF1:
      truePositive === 0
        ? null
        : (2 * truePositive) / (2 * truePositive + falsePositive + falseNegative),
    searchGate: {
      requested: searchRequested,
      rate: ratio(searchRequested, completed),
      ratePercent:
        completed === 0 ? null : Number(((searchRequested / completed) * 100).toFixed(2)),
    },
    search: {
      provider: [...predictions.values()].find((prediction) => prediction.searchProvider)
        ?.searchProvider,
      calls: searchCalls,
      rowsSearched: [...predictions.values()].filter((prediction) => prediction.searchCalls > 0)
        .length,
      feeUsd: searchFeeUsd,
    },
    usage: {
      inputTokens,
      outputTokens,
      costUsd: callsWithCost > 0 ? costUsd : null,
      callsWithCost,
    },
    averageDurationMs: ratio(durationMs, completed),
    bySource,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const localEnvPath = resolve(repoRoot, ".env.local");
  if (!process.env.AI_GATEWAY_API_KEY && existsSync(localEnvPath)) loadEnvFile(localEnvPath);
  if (!options.dryRun && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("AI Gateway auth missing: set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN");
  }
  if (!existsSync(benchmarkPath)) {
    throw new Error("consensus-benchmark.jsonl is missing; run build-consensus-benchmark.mjs");
  }

  const extractorPrompt = readFileSync(extractorPromptPath, "utf8");
  const drafterPromptPath = promptPaths[options.promptMode];
  const drafterPrompt = readFileSync(drafterPromptPath, "utf8");
  const corpus = readJsonl(corpusPath);
  const benchmark = readJsonl(benchmarkPath).slice(0, options.limit);
  const suppliedGuidance = options.guidance ? readFileSync(options.guidance, "utf8").trim() : null;
  const translationRows = options.translations ? readJsonl(options.translations) : [];
  const translations = new Map(translationRows.map((row) => [row.postId, row]));
  const linkContextRows = options.linkContext ? readJsonl(options.linkContext) : [];
  const linkContexts = new Map(linkContextRows.map((row) => [row.postId, row]));
  const sourceProfileRows = options.sourceProfiles ? readJsonl(options.sourceProfiles) : [];
  const sourceProfiles = new Map(sourceProfileRows.map((row) => [row.sourceHandle, row]));
  const missingTranslations = benchmark.filter((row) => !translations.has(row.postId));
  if (missingTranslations.length > 0) {
    throw new Error(
      `Shared translation file is missing ${missingTranslations.length} benchmark rows`,
    );
  }
  const missingLinkContexts = benchmark.filter((row) => !linkContexts.has(row.postId));
  if (missingLinkContexts.length > 0) {
    throw new Error(`Link context file is missing ${missingLinkContexts.length} benchmark rows`);
  }
  if (options.promptMode === "profile") {
    const missingProfiles = benchmark.filter((row) => !sourceProfiles.has(row.sourceHandle));
    if (missingProfiles.length > 0) {
      throw new Error(`Source profile file is missing ${missingProfiles.length} benchmark rows`);
    }
  }
  const extractorInput = buildExtractorInput(options.handle, options.beat, corpus);
  const runPath = resolve(runsPath, options.run);
  mkdirSync(runPath, { recursive: true });

  const config = {
    createdAt: new Date().toISOString(),
    run: options.run,
    reporter: options.handle,
    beat: options.beat,
    extractorModel: options.extractorModel,
    classifierModel: options.classifierModel,
    concurrency: options.concurrency,
    attempts: options.attempts,
    timeoutMs: options.timeoutMs,
    temperature: options.temperature,
    benchmarkRows: benchmark.length,
    benchmarkSha256: hash(readFileSync(benchmarkPath)),
    suppliedGuidanceSha256: suppliedGuidance === null ? null : hash(suppliedGuidance),
    noGuidance: options.noGuidance,
    beatPlacement: options.beatPlacement,
    promptMode: options.promptMode,
    translations: options.translations,
    translationsSha256:
      options.translations === null ? null : hash(readFileSync(options.translations)),
    linkContext: options.linkContext,
    linkContextSha256:
      options.linkContext === null ? null : hash(readFileSync(options.linkContext)),
    sourceProfiles: options.sourceProfiles,
    sourceProfilesSha256:
      options.sourceProfiles === null ? null : hash(readFileSync(options.sourceProfiles)),
    extractorPrompt: "extractor-prompt.md",
    extractorPromptSha256: hash(extractorPrompt),
    drafterPrompt: drafterPromptPath.split("/").at(-1),
    drafterPromptSha256: hash(drafterPrompt),
    extractorInputSha256: hash(extractorInput),
    webSearch: options.searchProvider !== null,
    searchGate: options.searchGate,
    searchProvider: options.searchProvider,
    mediaMaxPerStory: 4,
    extractorCorpusMediaAttached: 0,
    measuredStyleFactsIncluded: false,
    scopeRecomputeToolIncluded: false,
  };
  const configPath = resolve(runPath, "config.json");
  if (existsSync(configPath)) {
    const previous = JSON.parse(readFileSync(configPath, "utf8"));
    for (const key of [
      "reporter",
      "beat",
      "extractorModel",
      "classifierModel",
      "temperature",
      "benchmarkRows",
      "benchmarkSha256",
      "suppliedGuidanceSha256",
      "noGuidance",
      "beatPlacement",
      "promptMode",
      "translationsSha256",
      "linkContextSha256",
      "sourceProfilesSha256",
      "searchGate",
      "searchProvider",
      "extractorPromptSha256",
      "drafterPromptSha256",
      "extractorInputSha256",
    ]) {
      if (previous[key] !== config[key]) {
        throw new Error(
          `Run ${options.run} already exists with a different ${key}; use a new run name`,
        );
      }
    }
  } else writeJsonAtomic(configPath, config);
  writeFileSync(resolve(runPath, "extractor-input.txt"), extractorInput);

  if (options.dryRun) {
    console.log(`Dry run prepared ${benchmark.length} rows at ${runPath}`);
    return;
  }

  const guidancePath = resolve(runPath, "extractor-output.md");
  let guidance;
  if (options.noGuidance) guidance = "";
  else if (suppliedGuidance !== null) {
    guidance = suppliedGuidance;
    writeFileSync(guidancePath, `${guidance}\n`);
  } else if (existsSync(guidancePath)) guidance = readFileSync(guidancePath, "utf8").trim();
  else {
    console.log(
      `Running extractor (${options.extractorModel}) over ${corpus.length} corpus posts…`,
    );
    const extraction = await runExtractor(options, extractorPrompt, extractorInput);
    guidance = extraction.guidance;
    if (!guidance) throw new Error("Extractor returned empty filtration guidance");
    writeFileSync(guidancePath, `${guidance}\n`);
    writeJsonAtomic(resolve(runPath, "extractor-call.json"), extraction.metadata);
  }

  if (options.extractOnly) {
    console.log(`Extractor guidance written to ${guidancePath}`);
    return;
  }

  let classifierSystemPrompt = buildClassifierSystemPrompt(
    drafterPrompt,
    options.handle,
    options.beat,
    guidance,
    options.beatPlacement,
  );
  if (options.searchGate) {
    classifierSystemPrompt = classifierSystemPrompt.replace(
      "</task>",
      `
Before finalizing the provisional verdict, decide whether one web-grounded lookup is necessary because a missing real-world fact could reverse the verdict.

When a lookup is necessary, construct the query only from exact wording and URLs present inside <source_post>. You may select or reorder that wording, but do not add the beat, source biography, club, person, event, interpretation, synonym, or any other wording absent from <source_post>. When no lookup is necessary, set the query to null.
</task>`,
    );
  }
  if (options.searchProvider !== null) {
    classifierSystemPrompt = classifierSystemPrompt.replace(
      "</task>",
      `
<web_search>
Web search is available. Use it only when missing real-world context prevents a reliable verdict and the result could change the verdict. If needed, make exactly one focused search request, then use the returned evidence together with the post text, media, linked content, source profile, and beat. If the existing evidence is sufficient, decide without searching.
</web_search>
</task>`,
    );
  }
  writeFileSync(resolve(runPath, "classifier-system-prompt.txt"), `${classifierSystemPrompt}\n`);

  const predictionsPath = resolve(runPath, "predictions.jsonl");
  const errorsPath = resolve(runPath, "errors.jsonl");
  const predictions = new Map(readJsonl(predictionsPath).map((row) => [row.postId, row]));
  const pending = benchmark.filter((row) => !predictions.has(row.postId));
  let cursor = 0;
  let completedThisProcess = 0;
  const processStartedAt = Date.now();
  console.log(
    `Evaluating ${pending.length} pending of ${benchmark.length} rows with concurrency ${options.concurrency}…`,
  );

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= pending.length) return;
      const row = pending[index];
      try {
        const prediction = await classify(
          row,
          classifierSystemPrompt,
          options,
          translations.get(row.postId),
          linkContexts.get(row.postId),
          sourceProfiles.get(row.sourceHandle),
        );
        appendFileSync(predictionsPath, `${JSON.stringify(prediction)}\n`);
        predictions.set(row.postId, prediction);
      } catch (error) {
        const malformed = NoObjectGeneratedError.isInstance(error);
        appendFileSync(
          errorsPath,
          `${JSON.stringify({
            postId: row.postId,
            at: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
            rawOutput: malformed ? error.text : null,
            usage: malformed ? usageShape(error.usage) : null,
          })}\n`,
        );
      }
      completedThisProcess += 1;
      if (completedThisProcess % 25 === 0 || completedThisProcess === pending.length) {
        const seconds = Math.round((Date.now() - processStartedAt) / 1_000);
        console.log(
          `${completedThisProcess}/${pending.length} processed this session (${seconds}s)`,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, pending.length) }, () => worker()),
  );
  const summary = metricsFor(benchmark, predictions);
  writeJsonAtomic(resolve(runPath, "summary.json"), summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
