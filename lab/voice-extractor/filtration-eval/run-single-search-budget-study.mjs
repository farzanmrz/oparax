#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { generateText, Output } from "ai";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
  loadEnvFile(resolve(repoRoot, ".env.local"));
}

const studyPostIds = [
  "1698244914826424730",
  "1961918335953584266",
  "1895781015362425188",
  "1664042755293601792",
  "1599446756387061760",
];

const gateSchema = z.object({
  needs_search: z.boolean(),
  search_query: z.string().nullable(),
  on_beat: z.boolean(),
  reasoning: z.string().min(1),
});
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

function mediaType(media) {
  const url = new URL(media.imageUrl);
  const type = url.searchParams.get("format")?.toLowerCase() ?? url.pathname.split(".").pop();
  if (type === "png") return "image/png";
  if (type === "webp") return "image/webp";
  if (type === "gif") return "image/gif";
  return "image/jpeg";
}

function gatewayCost(result) {
  const metadata = result.providerMetadata?.gateway ?? {};
  return Number(metadata.inferenceCost ?? metadata.cost ?? 0);
}

function buildContent(row, profile, translation, grounding = null) {
  const sourceText = translation?.translation?.trim() || row.postContent;
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
${grounding ? `<web_grounding>\n${xmlText(grounding)}\n</web_grounding>` : ""}
</source>`;
  const content = [{ type: "text", text }];
  if (row.media.length > 0) content.push({ type: "text", text: "\n<attachments>" });
  for (const [index, media] of row.media.slice(0, 4).entries()) {
    content.push({
      type: "text",
      text: `<attachment index="${index + 1}" kind="${media.kind}" representation="original">`,
    });
    content.push({ type: "file", data: new URL(media.imageUrl), mediaType: mediaType(media) });
    content.push({ type: "text", text: "</attachment>" });
  }
  if (row.media.length > 0) content.push({ type: "text", text: "</attachments>" });
  return content;
}

const rows = new Map(
  readJsonl(resolve(here, "consensus-benchmark.jsonl")).map((row) => [row.postId, row]),
);
const profiles = new Map(
  readJsonl(resolve(here, "source-profiles.jsonl")).map((row) => [row.sourceHandle, row]),
);
const translations = new Map(
  readJsonl(resolve(here, "translation-runs/shared-qwen-independent/translations.jsonl")).map(
    (row) => [row.postId, row],
  ),
);
const bioPredictions = new Map(
  readJsonl(resolve(here, "runs/full-link-enriched-bio/predictions.jsonl")).map((row) => [
    row.postId,
    row,
  ]),
);
const baseSystem = readFileSync(resolve(here, "drafter-filter-profile-prompt.md"), "utf8");
const gateSystem = baseSystem.replace(
  "</task>",
  `
Before finalizing the verdict, decide whether one web-grounded lookup is necessary. Request it only when a missing real-world fact could reverse the verdict. If requested, provide one focused search query. Otherwise set the query to null.
</task>`,
);

async function qwenGate(row, profile, translation) {
  return generateText({
    model: "alibaba/qwen3.7-flash",
    system: gateSystem,
    messages: [{ role: "user", content: buildContent(row, profile, translation) }],
    output: Output.object({ name: "SearchGate", schema: gateSchema }),
    reasoning: "medium",
    temperature: 0,
    maxOutputTokens: 1_024,
    maxRetries: 3,
    abortSignal: AbortSignal.timeout(120_000),
    providerOptions: {
      gateway: {
        sort: "cost",
        tags: ["feature:voice-extractor-filtration-eval", "stage:single-search-gate"],
      },
    },
  });
}

async function oneGroundedLookup(row, profile, translation, query) {
  const searchInstruction = {
    type: "text",
    text: `Perform one web-grounded investigation for this classification. Focus on this question:\n${query}\n\nReturn only concise factual evidence relevant to whether the post concerns FC Barcelona. Distinguish verified facts from inference.`,
  };
  return generateText({
    model: "perplexity/sonar",
    messages: [
      {
        role: "user",
        content: [searchInstruction, ...buildContent(row, profile, translation)],
      },
    ],
    temperature: 0,
    maxOutputTokens: 1_024,
    maxRetries: 2,
    abortSignal: AbortSignal.timeout(120_000),
    providerOptions: {
      gateway: {
        tags: ["feature:voice-extractor-filtration-eval", "stage:single-search-grounding"],
      },
    },
  });
}

async function qwenFinal(row, profile, translation, grounding) {
  const system = baseSystem.replace(
    "</task>",
    "\nUse the supplied web grounding as evidence, but reject any unsupported connection to the reporter's beat.\n</task>",
  );
  return generateText({
    model: "alibaba/qwen3.7-flash",
    system,
    messages: [{ role: "user", content: buildContent(row, profile, translation, grounding) }],
    output: Output.object({ name: "FiltrationVerdict", schema: verdictSchema }),
    reasoning: "medium",
    temperature: 0,
    maxOutputTokens: 1_024,
    maxRetries: 3,
    abortSignal: AbortSignal.timeout(120_000),
    providerOptions: {
      gateway: {
        sort: "cost",
        tags: ["feature:voice-extractor-filtration-eval", "stage:single-search-final"],
      },
    },
  });
}

async function evaluate(postId) {
  const row = rows.get(postId);
  if (!row) throw new Error(`Unknown post ${postId}`);
  const profile = profiles.get(row.sourceHandle);
  const translation = translations.get(postId);
  if (!profile || !translation) throw new Error(`Missing context for ${postId}`);
  const gate = await qwenGate(row, profile, translation);
  const gateVerdict = gate.output;
  const query = gateVerdict.needs_search ? gateVerdict.search_query?.trim() || null : null;
  let grounding = null;
  let searchCostUsd = 0;
  let final = null;
  if (query) {
    const search = await oneGroundedLookup(row, profile, translation, query);
    grounding = search.text.trim();
    searchCostUsd = gatewayCost(search);
    final = await qwenFinal(row, profile, translation, grounding);
  }
  const verdict = final?.output ?? gateVerdict;
  return {
    postId,
    sourceHandle: row.sourceHandle,
    expectedOnBeat: row.expectedOnBeat,
    bioWithoutSearchOnBeat: bioPredictions.get(postId)?.predictedOnBeat ?? null,
    requestedSearch: Boolean(query),
    searchQuery: query,
    searchRequests: query ? 1 : 0,
    grounding,
    gateOnBeat: gateVerdict.on_beat,
    gateReasoning: gateVerdict.reasoning,
    predictedOnBeat: verdict.on_beat,
    reasoning: verdict.reasoning,
    correct: verdict.on_beat === row.expectedOnBeat,
    costUsd: {
      gateQwen: gatewayCost(gate),
      groundedSonar: searchCostUsd,
      finalQwen: final ? gatewayCost(final) : 0,
      total: gatewayCost(gate) + searchCostUsd + (final ? gatewayCost(final) : 0),
    },
  };
}

const results = await Promise.all(studyPostIds.map(evaluate));
const artifact = {
  generatedAt: new Date().toISOString(),
  architecture: "Qwen gate -> at most one Sonar grounded request -> Qwen final verdict",
  rows: results.length,
  correct: results.filter((row) => row.correct).length,
  searchRequests: results.reduce((sum, row) => sum + row.searchRequests, 0),
  totalCostUsd: results.reduce((sum, row) => sum + row.costUsd.total, 0),
  results,
};
writeFileSync(
  resolve(here, "single-search-budget-study.json"),
  `${JSON.stringify(artifact, null, 2)}\n`,
);
console.log(JSON.stringify(artifact, null, 2));
