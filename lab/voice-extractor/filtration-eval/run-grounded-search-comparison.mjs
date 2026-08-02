#!/usr/bin/env node

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { gateway, generateText, Output, stepCountIs } from "ai";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
  loadEnvFile(resolve(repoRoot, ".env.local"));
}

const provider = process.argv[2];
if (!new Set(["perplexity", "parallel"]).has(provider)) {
  throw new Error("Usage: node run-grounded-search-comparison.mjs perplexity|parallel");
}
const rowLimit = process.argv[3] ? Number(process.argv[3]) : Number.POSITIVE_INFINITY;
if (!(rowLimit > 0)) throw new Error("Optional row limit must be a positive number");
const concurrency = process.argv[4] ? Number(process.argv[4]) : 64;
if (!(concurrency > 0)) throw new Error("Optional concurrency must be a positive number");
const experiment = process.argv[5] ?? "default";
if (!new Set(["default", "literal-query", "literal-source"]).has(experiment)) {
  throw new Error("Optional experiment must be default, literal-query, or literal-source");
}

const verdictSchema = z.object({
  on_beat: z.boolean(),
  reasoning: z.string().min(1),
});

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
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

function mediaType(media) {
  if (media.imagePath) {
    const type = media.imagePath.split(".").pop()?.toLowerCase();
    if (type === "png") return "image/png";
    if (type === "webp") return "image/webp";
    if (type === "gif") return "image/gif";
    return "image/jpeg";
  }
  const url = new URL(media.imageUrl);
  const type = url.searchParams.get("format")?.toLowerCase() ?? url.pathname.split(".").pop();
  if (type === "png") return "image/png";
  if (type === "webp") return "image/webp";
  if (type === "gif") return "image/gif";
  return "image/jpeg";
}

function renderLinks(linkContext) {
  if (!linkContext?.links?.length) return [];
  const lines = ["<linked_content>"];
  for (const link of linkContext.links) {
    lines.push(`<link type="${xmlAttribute(link.type)}" url="${xmlAttribute(link.sourceUrl)}">`);
    if (link.author) lines.push(`<author>${xmlText(link.author)}</author>`);
    if (link.title) lines.push(`<title>${xmlText(link.title)}</title>`);
    if (link.content) lines.push("<content>", xmlText(link.content), "</content>");
    lines.push("</link>");
  }
  lines.push("</linked_content>");
  return lines;
}

function buildContent(row, profile, translation, linkContext, grounding) {
  const translated = translation?.translation?.trim() || null;
  const normalized = translated ?? row.postContent;
  const sourceText = linkContext?.links?.length
    ? preserveSourceUrls(row.postContent, normalized)
    : normalized;
  const text = [
    "<beat_description>",
    "I want to monitor all news around FC Barcelona.",
    "</beat_description>",
    "",
    "<source>",
    `<source_handle>@${xmlText(row.sourceHandle)}</source_handle>`,
    "<source_profile>",
    `<handle>@${xmlText(profile.sourceHandle)}</handle>`,
    `<display_name>${xmlText(profile.displayName)}</display_name>`,
    `<biography>${xmlText(profile.biography)}</biography>`,
    "</source_profile>",
    "<source_post>",
    sourceText,
    "</source_post>",
    ...renderLinks(linkContext),
    `<web_grounding provider="${provider}">`,
    xmlText(JSON.stringify(grounding)),
    "</web_grounding>",
    "</source>",
  ].join("\n");
  const content = [{ type: "text", text }];
  if (row.media.length > 0) content.push({ type: "text", text: "\n<attachments>" });
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
      mediaType: mediaType(media),
    });
    content.push({ type: "text", text: "</attachment>" });
  }
  if (row.media.length > 0) content.push({ type: "text", text: "</attachments>" });
  return content;
}

function cost(result) {
  const metadata = result.providerMetadata?.gateway ?? {};
  return Number(metadata.inferenceCost ?? metadata.cost ?? 0);
}

function searchTool() {
  if (provider === "perplexity") {
    return gateway.tools.perplexitySearch({
      maxResults: 5,
      maxTokensPerPage: 512,
      maxTokens: 2_500,
    });
  }
  return gateway.tools.parallelSearch({
    mode: "agentic",
    maxResults: 5,
    excerpts: { maxCharsPerResult: 2_000, maxCharsTotal: 10_000 },
  });
}

async function dispatchSearch(query, model) {
  return generateText({
    model,
    system:
      "Call the available web_search tool exactly once. Use the supplied query as the complete search goal without adding the monitored beat or presumed answer. Do not answer the research question yourself.",
    prompt: `<search_query>\n${query}\n</search_query>`,
    tools: { web_search: searchTool() },
    toolChoice: { type: "tool", toolName: "web_search" },
    stopWhen: stepCountIs(1),
    reasoning: "none",
    temperature: 0,
    maxOutputTokens: 256,
    maxRetries: 3,
    abortSignal: AbortSignal.timeout(180_000),
    providerOptions: {
      gateway: {
        sort: "cost",
        tags: ["feature:voice-extractor-filtration-eval", `search:${provider}`],
      },
    },
  });
}

async function searchOnce(query) {
  let result;
  const dispatcherModel = "alibaba/qwen3.7-flash";
  try {
    result = await dispatchSearch(query, dispatcherModel);
  } catch {
    result = await dispatchSearch(query, dispatcherModel);
  }
  const calls = result.steps.flatMap((step) => step.toolCalls);
  const results = result.steps.flatMap((step) => step.toolResults);
  if (calls.length === 0 || results.length === 0) {
    throw new Error(`Expected at least one ${provider} search result`);
  }
  return {
    query,
    arguments: calls.map((call) => call.input),
    evidence: results.map((toolResult) => toolResult.output),
    searchCalls: calls.length,
    dispatcherModel,
    callerCostUsd: cost(result),
  };
}

const benchmark = readJsonl(resolve(here, "consensus-benchmark.jsonl"));
const profiles = new Map(
  readJsonl(resolve(here, "source-profiles.jsonl")).map((row) => [row.sourceHandle, row]),
);
const translations = new Map(
  readJsonl(resolve(here, "translation-runs/shared-qwen-independent/translations.jsonl")).map(
    (row) => [row.postId, row],
  ),
);
const links = new Map(
  readJsonl(resolve(here, "external-link-context-snapshot.jsonl")).map((row) => [row.postId, row]),
);
const baseline = new Map(
  readJsonl(resolve(here, "runs/full-link-enriched-bio/predictions.jsonl")).map((row) => [
    row.postId,
    row,
  ]),
);
const gateRun =
  experiment === "literal-query"
    ? "full-link-enriched-bio-search-gate-literal-query"
    : "full-link-enriched-bio-search-gate";
const gate = new Map(
  readJsonl(resolve(here, "runs", gateRun, "predictions.jsonl")).map((row) => [row.postId, row]),
);
const system = readFileSync(resolve(here, "drafter-filter-profile-prompt.md"), "utf8")
  .replaceAll("{{REPORTER_HANDLE}}", "ReshadRahman")
  .replaceAll("{{BEAT_DESCRIPTION_SECTION}}", "")
  .replaceAll("{{FILTRATION_GUIDANCE_SECTION}}", "")
  .replace(
    "</task>",
    "\nUse supplied web grounding as evidence. Reject any connection to the beat that the evidence does not support.\n</task>",
  );

const runPath = resolve(
  here,
  "runs",
  `full-link-enriched-bio-grounded-${provider}${experiment === "default" ? "" : `-${experiment}`}`,
);
mkdirSync(runPath, { recursive: true });
const searchedPath = resolve(runPath, "searched-predictions.jsonl");
const errorsPath = resolve(runPath, "errors.jsonl");
const completed = new Map(readJsonl(searchedPath).map((row) => [row.postId, row]));
const pending = benchmark
  .filter((row) => gate.get(row.postId)?.needsSearch && !completed.has(row.postId))
  .slice(0, rowLimit);
let cursor = 0;
let processed = 0;

async function evaluate(row) {
  const query =
    experiment === "literal-source" ? row.postContent.trim() : gate.get(row.postId)?.searchQuery;
  if (!query) throw new Error(`Missing search query for ${row.postId}`);
  const grounding = await searchOnce(query);
  const result = await generateText({
    model: "alibaba/qwen3.7-flash",
    system,
    messages: [
      {
        role: "user",
        content: buildContent(
          row,
          profiles.get(row.sourceHandle),
          translations.get(row.postId),
          links.get(row.postId),
          grounding.evidence,
        ),
      },
    ],
    output: Output.object({ name: "FiltrationVerdict", schema: verdictSchema }),
    reasoning: "medium",
    temperature: 0,
    maxOutputTokens: 1_024,
    maxRetries: 3,
    abortSignal: AbortSignal.timeout(180_000),
    providerOptions: {
      gateway: {
        sort: "cost",
        tags: ["feature:voice-extractor-filtration-eval", `grounded-final:${provider}`],
      },
    },
  });
  return {
    postId: row.postId,
    sourceHandle: row.sourceHandle,
    expectedOnBeat: row.expectedOnBeat,
    baselineOnBeat: baseline.get(row.postId).predictedOnBeat,
    predictedOnBeat: result.output.on_beat,
    correct: result.output.on_beat === row.expectedOnBeat,
    reasoning: result.output.reasoning,
    searchQuery: query,
    searchArguments: grounding.arguments,
    searchEvidence: grounding.evidence,
    searchDispatcherModel: grounding.dispatcherModel,
    searchCalls: grounding.searchCalls,
    searchFeeUsd: grounding.searchCalls * 0.005,
    callerCostUsd: grounding.callerCostUsd,
    finalCostUsd: cost(result),
  };
}

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= pending.length) return;
    const row = pending[index];
    try {
      const prediction = await evaluate(row);
      appendFileSync(searchedPath, `${JSON.stringify(prediction)}\n`);
      completed.set(row.postId, prediction);
    } catch (error) {
      appendFileSync(
        errorsPath,
        `${JSON.stringify({ postId: row.postId, error: error.message ?? String(error) })}\n`,
      );
    }
    processed += 1;
    if (processed % 25 === 0 || processed === pending.length) {
      console.log(`${provider}: ${processed}/${pending.length}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, () => worker()));

let correct = 0;
let searchedCorrect = 0;
let searchedCompleted = 0;
let improvements = 0;
let regressions = 0;
for (const row of benchmark) {
  const original = baseline.get(row.postId);
  const searched = completed.get(row.postId);
  const finalCorrect = searched?.correct ?? original.correct;
  if (finalCorrect) correct += 1;
  if (searched) {
    searchedCompleted += 1;
    if (searched.correct) searchedCorrect += 1;
    if (searched.correct && !original.correct) improvements += 1;
    if (!searched.correct && original.correct) regressions += 1;
  }
}
const searchedRows = [...completed.values()];
const summary = {
  generatedAt: new Date().toISOString(),
  provider,
  benchmarkRows: benchmark.length,
  baselineCorrect: 1_252,
  baselineAccuracyPercent: 93.71,
  requestedSearchRows: [...gate.values()].filter((row) => row.needsSearch).length,
  searchedCompleted,
  missingSearchRows: [...gate.values()].filter((row) => row.needsSearch).length - searchedCompleted,
  searchedCorrect,
  improvements,
  regressions,
  netChange: improvements - regressions,
  correct,
  accuracyPercent: Number(((correct / benchmark.length) * 100).toFixed(2)),
  searchCalls: searchedRows.reduce((sum, row) => sum + row.searchCalls, 0),
  searchFeeUsd: searchedRows.reduce((sum, row) => sum + row.searchFeeUsd, 0),
  qwenCostUsd: searchedRows.reduce((sum, row) => sum + row.callerCostUsd + row.finalCostUsd, 0),
};
writeFileSync(resolve(runPath, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
