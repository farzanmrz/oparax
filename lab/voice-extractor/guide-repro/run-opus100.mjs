#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { stepCountIs, streamText, tool } from "ai";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const inputPath = resolve(here, "historical-input.json");
const referenceGuidePath = resolve(here, "historical-guide.md");
const systemPromptPath = resolve(repoRoot, "lib/sysprompts/voice-extract.md");
const runsPath = resolve(here, "runs");

const DEFAULT_MODEL = "anthropic/claude-opus-5";
const DEFAULT_EFFORT = "high";
const DEFAULT_CORPUS_SIZE = 100;
const HANDLE = "ReshadRahman";
const SYSTEM_PROMPT_SHA256 = "9321d5eacd6aa7bfb3689b9b5054145a8e5553150a26c0371e02f19e89ec41bb";
const HISTORICAL_TEXT_SHA256 = "7850ee538a77303906c08a297e9199849da5fa8a555d5bb6e1375b89219feaa5";
const HISTORICAL_RAW_GUIDE_SHA256 =
  "ca0848439427dd34dffafcca23f9f47d7956a6548c4d097aee1368478d078ac3";
const MAX_OFF_BEAT_SHARE = 0.5;
const MAX_EXTRACTION_STEPS = 3;
const TIMEOUT_MS = 770_000;

const EMOJI = /\p{RGI_Emoji}/gv;
const HASHTAG = /#[\p{L}\p{N}_]+/gu;

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  let run = `opus100-replay-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`;
  let model = DEFAULT_MODEL;
  let effort = DEFAULT_EFFORT;
  let corpusSize = DEFAULT_CORPUS_SIZE;
  let dryRun = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--run") {
      run = argv[index + 1];
      index += 1;
    } else if (argument === "--model") {
      model = argv[index + 1];
      index += 1;
    } else if (argument === "--effort") {
      effort = argv[index + 1];
      index += 1;
    } else if (argument === "--corpus-size") {
      corpusSize = Number(argv[index + 1]);
      index += 1;
    } else if (argument === "--dry-run") {
      dryRun = true;
    } else if (argument === "--help") {
      console.log(
        "Usage: node run-opus100.mjs [--run <name>] [--model <gateway-model>] [--effort <level>] [--corpus-size 50|100] [--dry-run]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!run || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(run)) {
    throw new Error("--run may contain only letters, digits, dot, underscore, and hyphen");
  }
  if (!model) throw new Error("--model requires a value");
  if (!new Set(["low", "medium", "high"]).has(effort)) {
    throw new Error("--effort must be low, medium, or high");
  }
  if (!new Set([50, 100]).has(corpusSize)) {
    throw new Error("--corpus-size must be 50 or 100");
  }
  return { run, model, effort, corpusSize, dryRun };
}

function share(texts, re) {
  const single = new RegExp(re.source, re.flags.replace("g", ""));
  return texts.filter((text) => single.test(text)).length;
}

function inventory(texts, re) {
  const counts = new Map();
  for (const text of texts) {
    for (const match of text.matchAll(re)) {
      counts.set(match[0], (counts.get(match[0]) ?? 0) + 1);
    }
  }
  const top = [...counts].sort((a, b) => b[1] - a[1]);
  if (top.length === 0) return "none in the corpus";
  const shown = top
    .slice(0, 15)
    .map(([glyph, count]) => `${glyph}×${count}`)
    .join(" ");
  return shown + (top.length > 15 ? ` (+${top.length - 15} rarer)` : "");
}

function measuredFacts(handle, postTexts) {
  const texts = postTexts.filter((text) => text.trim());
  const count = texts.length;
  if (count === 0) throw new Error("Cannot measure an empty corpus");
  const lengths = texts.map((text) => text.length).sort((a, b) => a - b);
  const percentile = (p) => lengths[Math.min(count - 1, Math.floor(p * count))];
  const breaks = [0, 0, 0];
  for (const text of texts) breaks[Math.min(2, (text.match(/\n/g) ?? []).length)] += 1;
  return [
    `MEASURED STYLE FACTS for @${handle} — frequencies computed by code over all ${count} corpus posts.`,
    `- length (chars): median ${percentile(0.5)}, p10 ${percentile(0.1)}, p90 ${percentile(0.9)}, max ${lengths[count - 1]}; ${lengths.filter((length) => length > 280).length}/${count} posts over 280`,
    `- line breaks: ${breaks[0]}/${count} posts have none, ${breaks[1]}/${count} exactly one, ${breaks[2]}/${count} two or more`,
    `- emoji: ${share(texts, EMOJI)}/${count} posts contain any; full inventory: ${inventory(texts, EMOJI)}`,
    `- hashtags: ${share(texts, HASHTAG)}/${count} posts contain any; full inventory (exact casing): ${inventory(texts, HASHTAG)}`,
    `- mentions (@): ${share(texts, /@\w/g)}/${count} posts; URLs: ${share(texts, /https?:\/\//g)}/${count} posts`,
    `- posts containing: ! ${share(texts, /!/g)}/${count} · ? ${share(texts, /\?/g)}/${count} · ellipsis ${share(texts, /\.\.\.|…/g)}/${count} · em-dash ${share(texts, /—/g)}/${count} · straight " ${share(texts, /"/g)}/${count} · curly “” ${share(texts, /[“”]/g)}/${count} · colon ${share(texts, /:/g)}/${count}`,
    `- ALL-CAPS words (3+ letters): ${share(texts, /\b[A-Z]{3,}\b/g)}/${count} posts`,
  ].join("\n");
}

function parseCorpus(text) {
  const marker = "THE CORPUS (most recent first):\n\n";
  const start = text.indexOf(marker);
  if (start < 0) throw new Error("Historical input has no corpus marker");
  const corpus = text.slice(start + marker.length);
  const header = /^\[(\d+)\] \S+ (?:LONG )?\(♥\d+ ↻\d+\)(?: \[MEDIA: [^\]]+\])?: /gm;
  const matches = [...corpus.matchAll(header)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index : corpus.length;
    return {
      id: match[1],
      raw: corpus.slice(start, end).replace(/\n$/, ""),
      text: corpus.slice(start + match[0].length, end).replace(/\n$/, ""),
    };
  });
}

function selectInput(messages, firstText, posts, corpusSize) {
  const selectedPosts = posts.slice(0, corpusSize);
  let effectiveText = firstText;
  if (corpusSize !== posts.length) {
    const factsStart = firstText.indexOf(`MEASURED STYLE FACTS for @${HANDLE}`);
    const corpusMarker = "THE CORPUS (most recent first):\n\n";
    if (factsStart < 0 || firstText.indexOf(corpusMarker) < 0) {
      throw new Error("Historical input is missing the facts or corpus marker");
    }
    effectiveText = [
      firstText.slice(0, factsStart).trimEnd(),
      measuredFacts(
        HANDLE,
        selectedPosts.map((post) => post.text),
      ),
      corpusMarker + selectedPosts.map((post) => post.raw).join("\n"),
    ].join("\n\n");
  }

  const selectedIds = new Set(selectedPosts.map((post) => post.id));
  const originalContent = messages[0].content;
  const content = [{ type: "text", text: effectiveText }];
  const selectedMedia = [];
  for (let index = 2; index < originalContent.length; index += 2) {
    const label = originalContent[index];
    const file = originalContent[index + 1];
    const postId = label?.type === "text" ? label.text.match(/^\[(\d+)\]/)?.[1] : null;
    if (postId && selectedIds.has(postId) && file?.type === "file") {
      selectedMedia.push(label, file);
    }
  }
  if (selectedMedia.length > 0) content.push(originalContent[1], ...selectedMedia);

  return {
    selectedPosts,
    effectiveText,
    content: content.map((part) =>
      part.type === "file" && typeof part.data === "string" && /^https?:\/\//.test(part.data)
        ? { ...part, data: new URL(part.data) }
        : part,
    ),
    mediaFiles: selectedMedia.length / 2,
  };
}

function buildScopeTool(posts) {
  const byId = new Map(posts.map((post) => [post.id, post]));
  let captured = null;
  return {
    tools: {
      exclude_off_beat_posts: tool({
        description:
          "Exclude posts that fall outside the reporter's stated beat, then recompute the MEASURED FACTS block over only the posts that remain. Call this ONCE, after you have read the whole corpus and before you write the guide. The block this returns REPLACES the one in your input and is the binding one. If every post is on beat, do not call this at all.",
        inputSchema: z.object({
          offBeatPostIds: z
            .array(z.string())
            .describe(
              "The post ids ([id] in the corpus listing) that fall outside the stated beat.",
            ),
          reason: z
            .string()
            .describe(
              "One sentence naming the categories being excluded, e.g. 'gaming clips and personal posts, neither of which is Barcelona football news'.",
            ),
        }),
        execute: async ({ offBeatPostIds, reason }) => {
          const unknown = offBeatPostIds.filter((id) => !byId.has(id));
          const known = [...new Set(offBeatPostIds.filter((id) => byId.has(id)))];
          const excludedShare = posts.length > 0 ? known.length / posts.length : 0;
          if (excludedShare > MAX_OFF_BEAT_SHARE) {
            const note =
              `REFUSED: ${known.length} of ${posts.length} posts (${Math.round(excludedShare * 100)}%) is over ` +
              `the ${Math.round(MAX_OFF_BEAT_SHARE * 100)}% ceiling on how much of a corpus may be ` +
              "excluded. The MEASURED FACTS block below is unchanged and still covers every post. " +
              "Write the guide against it, and record the off-beat categories under Beat & Scope's " +
              "Excludes instead.";
            captured = { postIds: known, reason, applied: false, note };
            return {
              applied: false,
              note,
              measuredFacts: measuredFacts(
                HANDLE,
                posts.map((post) => post.text),
              ),
            };
          }
          const kept = posts.filter((post) => !known.includes(post.id));
          const note =
            `Excluded ${known.length} of ${posts.length} posts. The MEASURED FACTS block below is ` +
            `recomputed over the remaining ${kept.length} and REPLACES the one in your input.` +
            (unknown.length > 0
              ? ` NOTE: ${unknown.length} id(s) you listed are not in this corpus and were ignored: ${unknown.join(", ")}.`
              : "");
          captured = { postIds: known, reason, applied: true, note };
          return {
            applied: true,
            note,
            measuredFacts: measuredFacts(
              HANDLE,
              kept.map((post) => post.text),
            ),
          };
        },
      }),
    },
    read: () => captured,
  };
}

function writeJsonAtomic(path, value) {
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
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

function gatewayShape(steps) {
  let costUsd = null;
  let generationId = null;
  for (const step of steps) {
    const gateway = step.providerMetadata?.gateway ?? {};
    const rawCost = gateway.inferenceCost ?? gateway.cost;
    const parsedCost = Number(rawCost);
    if (Number.isFinite(parsedCost)) costUsd = (costUsd ?? 0) + parsedCost;
    if (typeof gateway.generationId === "string") generationId = gateway.generationId;
  }
  return { generationId, costUsd };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const localEnvPath = resolve(repoRoot, ".env.local");
  const systemPrompt = readFileSync(systemPromptPath, "utf8");
  const referenceGuide = readFileSync(referenceGuidePath, "utf8");
  const messages = JSON.parse(readFileSync(inputPath, "utf8"));
  const firstText = messages[0]?.content?.find((part) => part.type === "text")?.text;
  if (!firstText) throw new Error("Historical input has no primary text part");
  const posts = parseCorpus(firstText);
  const fileCount = messages[0].content.filter((part) => part.type === "file").length;

  if (hash(systemPrompt) !== SYSTEM_PROMPT_SHA256) {
    throw new Error("Production extractor prompt no longer matches the historical prompt hash");
  }
  if (hash(firstText) !== HISTORICAL_TEXT_SHA256) {
    throw new Error("Historical input text failed its frozen SHA-256 check");
  }
  if (hash(referenceGuide.replace(/\n$/, "")) !== HISTORICAL_RAW_GUIDE_SHA256) {
    throw new Error("Historical guide failed its frozen SHA-256 check");
  }
  if (posts.length !== 100 || fileCount !== 47) {
    throw new Error(`Historical input shape drifted: ${posts.length} posts and ${fileCount} files`);
  }

  const selected = selectInput(messages, firstText, posts, options.corpusSize);
  const selectedFacts = measuredFacts(
    HANDLE,
    selected.selectedPosts.map((post) => post.text),
  );
  const inputSummary = {
    model: options.model,
    effort: options.effort,
    corpusPosts: selected.selectedPosts.length,
    mediaFiles: selected.mediaFiles,
    historicalInputTextSha256: hash(firstText),
    effectiveInputTextSha256: hash(selected.effectiveText),
    corpusPostIdsSha256: hash(selected.selectedPosts.map((post) => post.id).join("\n")),
    measuredFacts: selectedFacts,
  };
  if (options.dryRun) {
    console.log(JSON.stringify(inputSummary, null, 2));
    return;
  }

  if (!process.env.AI_GATEWAY_API_KEY && existsSync(localEnvPath)) loadEnvFile(localEnvPath);
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("AI Gateway auth missing: set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN");
  }

  const scope = buildScopeTool(selected.selectedPosts);
  const runPath = resolve(runsPath, options.run);
  if (existsSync(runPath)) throw new Error(`Run already exists: ${runPath}`);
  mkdirSync(runPath, { recursive: true });

  const startedAt = new Date().toISOString();
  console.log(
    `Starting ${options.run}: ${options.model}, adaptive/${options.effort}, ${selected.selectedPosts.length} posts, ${selected.mediaFiles} media files`,
  );
  const heartbeat = setInterval(() => console.log(`Still running ${options.run}...`), 30_000);
  const result = streamText({
    model: options.model,
    system: systemPrompt,
    messages: [{ role: "user", content: selected.content }],
    maxOutputTokens: undefined,
    tools: scope.tools,
    stopWhen: stepCountIs(MAX_EXTRACTION_STEPS),
    providerOptions: {
      anthropic: {
        thinking: { type: "adaptive", effort: options.effort, display: "summarized" },
      },
    },
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
  });

  try {
    for await (const _part of result.fullStream) {
      // Draining the complete stream is what resolves steps, usage, and finish reason.
    }
  } finally {
    clearInterval(heartbeat);
  }

  const [steps, usage, finishReason] = await Promise.all([
    result.steps,
    result.usage,
    result.finishReason,
  ]);
  let guideRaw = "";
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    if (steps[index].text.trim()) {
      guideRaw = steps[index].text;
      break;
    }
  }
  if (!guideRaw.trim())
    throw new Error(`Extraction returned no guide (${finishReason ?? "unknown"})`);
  const reasoning = steps
    .map((step) => step.reasoningText?.trim())
    .filter(Boolean)
    .join("\n\n");
  const completedAt = new Date().toISOString();
  const metadata = {
    run: options.run,
    model: options.model,
    thinking: { type: "adaptive", effort: options.effort, display: "summarized" },
    corpusPosts: selected.selectedPosts.length,
    mediaFiles: selected.mediaFiles,
    systemPromptSha256: hash(systemPrompt),
    historicalInputTextSha256: hash(firstText),
    effectiveInputTextSha256: hash(selected.effectiveText),
    corpusPostIdsSha256: inputSummary.corpusPostIdsSha256,
    measuredFacts: selectedFacts,
    historicalReferenceRawGuideSha256: HISTORICAL_RAW_GUIDE_SHA256,
    outputGuideSha256: hash(guideRaw),
    outputGuideChars: [...guideRaw].length,
    finishReason: finishReason ?? null,
    scopeExclusion: scope.read(),
    usage: usageShape(usage),
    gateway: gatewayShape(steps),
    startedAt,
    completedAt,
  };

  writeFileSync(resolve(runPath, "guide.md"), guideRaw);
  if (reasoning) writeFileSync(resolve(runPath, "reasoning.md"), reasoning);
  writeJsonAtomic(resolve(runPath, "metadata.json"), metadata);
  console.log(JSON.stringify(metadata, null, 2));
}

await main();
