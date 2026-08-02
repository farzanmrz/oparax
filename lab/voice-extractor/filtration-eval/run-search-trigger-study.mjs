#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { gateway, generateText } from "ai";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const localEnvPath = resolve(repoRoot, ".env.local");
if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
  loadEnvFile(localEnvPath);
}

const studyPostIds = [
  "1698244914826424730",
  "1961918335953584266",
  "1895781015362425188",
  "1664042755293601792",
  "1599446756387061760",
];

const verdictSchema = z.object({
  on_beat: z.boolean(),
  reasoning: z.string().min(1),
});

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function xmlText(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function preserveSourceUrls(original, normalized) {
  const urls = original.match(/https?:\/\/[^\s<>]+/g) ?? [];
  const missing = urls.filter((url) => !normalized.includes(url));
  return missing.length > 0 ? `${normalized}\n${missing.join("\n")}` : normalized;
}

function mediaType(media) {
  const url = new URL(media.imageUrl);
  const format = url.searchParams.get("format")?.toLowerCase();
  const extension = url.pathname.split(".").pop()?.toLowerCase();
  const type = format ?? extension;
  if (type === "png") return "image/png";
  if (type === "webp") return "image/webp";
  if (type === "gif") return "image/gif";
  return "image/jpeg";
}

function buildContent(row, profile, translation, linkContext) {
  const translatedText = translation?.translation?.trim() || null;
  const sourceText = linkContext.links.length
    ? preserveSourceUrls(row.postContent, translatedText ?? row.postContent)
    : (translatedText ?? row.postContent);
  const text = `<beat_description>
I want to monitor all news around FC Barcelona.
</beat_description>

<source>
<source_handle>@${xmlText(row.sourceHandle)}</source_handle>
<source_profile>
<handle>@${xmlText(profile.sourceHandle)}</handle>
<display_name>${xmlText(profile.displayName)}</display_name>
<biography>${xmlText(profile.biography)}</biography>
</source_profile>
<posted_at>${xmlText(row.datePosted)}</posted_at>
<source_post>
${sourceText}
</source_post>
</source>`;
  const content = [{ type: "text", text }];
  if (row.media.length > 0) content.push({ type: "text", text: "\n<attachments>" });
  for (const [index, media] of row.media.slice(0, 4).entries()) {
    const representation = media.kind === "photo" ? "original" : "poster_frame";
    content.push({
      type: "text",
      text: `<attachment index="${index + 1}" kind="${media.kind}" representation="${representation}">`,
    });
    content.push({ type: "file", data: new URL(media.imageUrl), mediaType: mediaType(media) });
    content.push({ type: "text", text: "</attachment>" });
  }
  if (row.media.length > 0) content.push({ type: "text", text: "</attachments>" });
  return content;
}

function parseVerdict(text) {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return verdictSchema.parse(JSON.parse(unfenced));
}

const rows = readJsonl(resolve(here, "consensus-benchmark.jsonl"));
const rowsById = new Map(rows.map((row) => [row.postId, row]));
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
const baselinePredictions = new Map(
  readJsonl(resolve(here, "runs/link-enriched-baseline/predictions.jsonl")).map((row) => [
    row.postId,
    row,
  ]),
);
const baseSystemPrompt = readFileSync(resolve(here, "drafter-filter-profile-prompt.md"), "utf8");

const policies = {
  optional:
    "Web search is available. Search at most once only when missing real-world context prevents a reliable verdict and the result could change that verdict. Otherwise decide without searching.",
  forced:
    "For this controlled study, use web search exactly once before deciding. Search for the missing real-world context most likely to change the verdict, using the post date, distinctive wording, and named or visible entities.",
};

async function classify(row, mode) {
  const profile = profiles.get(row.sourceHandle);
  const translation = translations.get(row.postId);
  const linkContext = links.get(row.postId);
  if (!profile || !translation || !linkContext)
    throw new Error(`Missing context for ${row.postId}`);
  const system = baseSystemPrompt.replace(
    "</task>",
    `\n<search_policy>\n${policies[mode]}\n</search_policy>\n</task>`,
  );
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const startedAt = Date.now();
    try {
      const result = await generateText({
        model: "alibaba/qwen3.7-flash",
        system,
        messages: [
          {
            role: "user",
            content: buildContent(row, profile, translation, linkContext),
          },
        ],
        tools: {
          web_search: gateway.tools.perplexitySearch({
            maxResults: 5,
            maxTokensPerPage: 512,
            maxTokens: 2_500,
          }),
        },
        toolChoice: mode === "forced" ? { type: "tool", toolName: "web_search" } : "auto",
        reasoning: "medium",
        temperature: 0,
        maxOutputTokens: 1_024,
        maxRetries: 3,
        abortSignal: AbortSignal.timeout(180_000),
        providerOptions: {
          gateway: {
            sort: "cost",
            tags: [
              "feature:voice-extractor-filtration-eval",
              "stage:search-trigger-study",
              `mode:${mode}`,
            ],
          },
        },
      });
      const verdict = parseVerdict(result.text);
      const searchCalls = result.steps
        .flatMap((step) => step.toolCalls)
        .filter((call) => call.toolName === "web_search");
      const gatewayMetadata = result.providerMetadata?.gateway ?? {};
      return {
        postId: row.postId,
        sourceHandle: row.sourceHandle,
        expectedOnBeat: row.expectedOnBeat,
        baselinePrediction: baselinePredictions.get(row.postId)?.predictedOnBeat ?? null,
        baselineReasoning: baselinePredictions.get(row.postId)?.reasoning ?? null,
        mode,
        predictedOnBeat: verdict.on_beat,
        correct: verdict.on_beat === row.expectedOnBeat,
        reasoning: verdict.reasoning,
        searched: searchCalls.length > 0,
        searchCalls,
        searchFeeUsd: searchCalls.length * 0.005,
        inferenceCostUsd: Number(gatewayMetadata.inferenceCost ?? gatewayMetadata.cost ?? 0),
        usage: result.usage,
        attempt,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const studyRows = studyPostIds.map((postId) => {
  const row = rowsById.get(postId);
  if (!row) throw new Error(`Unknown benchmark post ${postId}`);
  return row;
});

const optional = await Promise.all(studyRows.map((row) => classify(row, "optional")));
const forced = await Promise.all(studyRows.map((row) => classify(row, "forced")));
const results = [...optional, ...forced];
const summarize = (modeRows) => ({
  rows: modeRows.length,
  correct: modeRows.filter((row) => row.correct).length,
  searches: modeRows.filter((row) => row.searched).length,
  searchFeesUsd: modeRows.reduce((sum, row) => sum + row.searchFeeUsd, 0),
  inferenceCostUsd: modeRows.reduce((sum, row) => sum + row.inferenceCostUsd, 0),
});
const artifact = {
  generatedAt: new Date().toISOString(),
  baseline: "link-enriched filtration (93.04%)",
  context: "same link-enriched input plus source bio",
  optional: summarize(optional),
  forced: summarize(forced),
  results,
};

writeFileSync(resolve(here, "search-trigger-study.json"), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify(artifact, null, 2));
