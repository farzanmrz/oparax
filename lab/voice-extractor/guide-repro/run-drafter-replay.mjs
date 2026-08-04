#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const runsPath = resolve(here, "runs");
const guidePath = resolve(here, "runs/sonnet50-high-01/guide.md");
const extractionInputPath = resolve(here, "historical-input.json");
const systemPromptPath = resolve(here, "historical-draft-ground.md");
const contractPath = resolve(here, "historical-draft-contract.md");

const AGENT_ID = "ed384080-9adb-4f75-9953-c9496b88f045";
const START_AT = "2026-07-27T09:53:49.984782Z";
const END_AT = "2026-07-29T09:53:49.984782Z";
const EXPECTED_SOURCES = 55;
const MODEL = "openai/gpt-5-nano";
const BEAT = "Give it the same tone as X account @ReshadRahman";
const HANDLE = "ReshadRahman";
const EXCLUDED_POST_ID = "2080760513689215216";
const CEILING = 280;
const MAX_MEDIA = 4;
const SYSTEM_PROMPT_SHA256 = "ffca5ddd64979332d27995802d2941c36bc5f364b7216864a082ca425c8fe82a";
const CONTRACT_SHA256 = "a634f8306e61fae16e0fe6a241d27daddcf3caf5d083905191860e3ce20265f9";
const GUIDE_SHA256 = "120bb94080e28c01363a18d116513d3509a76c8b884f4f0e7350555ff4c84a97";

const EMOJI = /\p{RGI_Emoji}/gv;
const HASHTAG = /#[\p{L}\p{N}_]+/gu;

const groundVerdictSchema = z.object({
  mediaDescription: z.string().nullable(),
  language: z.string(),
  translation: z.string().nullable(),
  onBeat: z.boolean(),
  onBeatReason: z.string(),
  needsContext: z.boolean(),
  firstDraft: z.string(),
});

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeJsonAtomic(path, value) {
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
}

function parseArgs(argv) {
  let run = "drafter-sonnet50-replay-01";
  let concurrency = 4;
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
        "Usage: node run-drafter-replay.mjs [--run <name>] [--concurrency <1-10>] [--dry-run]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!run || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(run)) {
    throw new Error("--run may contain only letters, digits, dot, underscore, and hyphen");
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10) {
    throw new Error("--concurrency must be an integer from 1 to 10");
  }
  return { run, concurrency, dryRun };
}

function share(texts, re) {
  const single = new RegExp(re.source, re.flags.replace("g", ""));
  return texts.filter((value) => single.test(value)).length;
}

function inventory(texts, re) {
  const counts = new Map();
  for (const value of texts) {
    for (const match of value.matchAll(re)) {
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

function parseExtractionCorpus(text) {
  const marker = "THE CORPUS (most recent first):\n\n";
  const start = text.indexOf(marker);
  if (start < 0) throw new Error("Frozen extraction input has no corpus marker");
  const corpus = text.slice(start + marker.length);
  const header = /^\[(\d+)\] \S+ (?:LONG )?\(♥\d+ ↻\d+\)(?: \[MEDIA: [^\]]+\])?: /gm;
  const matches = [...corpus.matchAll(header)];
  return matches.map((match, index) => ({
    id: match[1],
    text: corpus
      .slice(
        (match.index ?? 0) + match[0].length,
        index + 1 < matches.length ? matches[index + 1].index : corpus.length,
      )
      .replace(/\n$/, ""),
  }));
}

function composeVoiceGuidance(guide, facts) {
  const parts = guide
    .trim()
    .split(/\n(?=##\s)/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const sections = parts.filter((part) => part.startsWith("##"));
  if (sections.length === 0) throw new Error("Sonnet 50 guide has no level-2 sections");
  return [
    "Voice rules — follow every rule below when drafting this reporter's post.",
    ...sections.map((section) => `- ${section}`),
    "",
    facts,
  ].join("\n");
}

function mediaFromRaw(raw) {
  const media = raw?.includes?.media;
  if (!Array.isArray(media)) return [];
  return media
    .map((item) => ({
      kind: item?.type,
      imageUrl: item?.url ?? item?.preview_image_url,
    }))
    .filter((item) => typeof item.kind === "string" && typeof item.imageUrl === "string")
    .slice(0, MAX_MEDIA);
}

function imageMediaType(url) {
  const ext = new URL(url).pathname.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

function buildPrompt(source, voiceGuidance, contract) {
  return [
    `Character ceiling for the draft: ${CEILING} (a ceiling, never a target).`,
    "",
    "THE BEAT, IN THE REPORTER'S OWN WORDS:",
    BEAT,
    "",
    "THE REPORTER'S VOICE GUIDANCE:",
    voiceGuidance,
    "",
    "DRAFTING CONTRACT:",
    contract,
    "",
    `SOURCE POST by @${source.authorHandle}:`,
    source.text,
  ].join("\n");
}

function buildContent(source, voiceGuidance, contract) {
  const content = [{ type: "text", text: buildPrompt(source, voiceGuidance, contract) }];
  if (source.media.length > 0) {
    content.push({
      type: "text",
      text: "\nATTACHED MEDIA — the images below are this post's attachments. A video or GIF is represented by its poster frame.",
    });
    for (const media of source.media) {
      content.push({ type: "text", text: `${media.kind}:` });
      content.push({
        type: "file",
        data: new URL(media.imageUrl),
        mediaType: imageMediaType(media.imageUrl),
      });
    }
  }
  return content;
}

function one(value) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadCohort(supabase) {
  const { data, error } = await supabase
    .from("drafts")
    .select(
      "id,created_at,source_post_id,model_calls!inner(model,output,role),source_posts!inner(id,author_handle,text,raw)",
    )
    .eq("agent_id", AGENT_ID)
    .gte("created_at", START_AT)
    .lt("created_at", END_AT)
    .eq("model_calls.role", "grounding")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const bySource = new Map();
  for (const row of data ?? []) {
    if (bySource.has(row.source_post_id)) continue;
    const modelCall = one(row.model_calls);
    const sourcePost = one(row.source_posts);
    bySource.set(row.source_post_id, {
      index: bySource.size + 1,
      sourcePostId: row.source_post_id,
      historicalDraftId: row.id,
      historicalCreatedAt: row.created_at,
      historicalModel: modelCall?.model,
      historicalDraft: modelCall?.output,
      authorHandle: sourcePost?.author_handle ?? "",
      text: sourcePost?.text ?? "",
      media: mediaFromRaw(sourcePost?.raw),
    });
  }
  const cohort = [...bySource.values()];
  if (cohort.length !== EXPECTED_SOURCES) {
    throw new Error(
      `Historical cohort drifted: expected ${EXPECTED_SOURCES}, got ${cohort.length}`,
    );
  }
  const bad = cohort.filter(
    (row) => row.historicalModel !== MODEL || !row.historicalDraft || !row.text,
  );
  if (bad.length > 0) throw new Error(`${bad.length} cohort rows failed model/output/text checks`);
  return cohort;
}

function usageShape(usage) {
  return {
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    totalTokens: usage?.totalTokens ?? null,
    reasoningTokens: usage?.outputTokenDetails?.reasoningTokens ?? null,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const localEnvPath = resolve(repoRoot, ".env.local");
  if (existsSync(localEnvPath)) loadEnvFile(localEnvPath);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) throw new Error("Missing Supabase admin environment");

  const systemPrompt = readFileSync(systemPromptPath, "utf8");
  const contract = readFileSync(contractPath, "utf8");
  const guide = readFileSync(guidePath, "utf8");
  if (hash(systemPrompt) !== SYSTEM_PROMPT_SHA256)
    throw new Error("Historical system prompt drifted");
  if (hash(contract) !== CONTRACT_SHA256) throw new Error("Historical draft contract drifted");
  if (hash(guide) !== GUIDE_SHA256) throw new Error("Sonnet 50 guide drifted");

  const extractionMessages = JSON.parse(readFileSync(extractionInputPath, "utf8"));
  const extractionText = extractionMessages[0]?.content?.find((part) => part.type === "text")?.text;
  if (!extractionText) throw new Error("Frozen extraction input has no text");
  const corpus = parseExtractionCorpus(extractionText);
  const newest49 = corpus
    .slice(0, 50)
    .filter((post) => post.id !== EXCLUDED_POST_ID)
    .map((post) => post.text);
  if (newest49.length !== 49)
    throw new Error(`Expected binding corpus of 49, got ${newest49.length}`);
  const facts = measuredFacts(HANDLE, newest49);
  const voiceGuidance = composeVoiceGuidance(guide, facts);

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const cohort = await loadCohort(supabase);
  const summary = {
    run: options.run,
    agentId: AGENT_ID,
    window: { startAt: START_AT, endAt: END_AT },
    cohortSources: cohort.length,
    sourcesWithMedia: cohort.filter((row) => row.media.length > 0).length,
    mediaItems: cohort.reduce((sum, row) => sum + row.media.length, 0),
    model: MODEL,
    reasoning: "low",
    guide: "sonnet50-high-01",
    bindingCorpusPosts: newest49.length,
    systemPromptSha256: hash(systemPrompt),
    contractSha256: hash(contract),
    guideSha256: hash(guide),
    voiceGuidanceSha256: hash(voiceGuidance),
    measuredFacts: facts,
  };
  if (options.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("AI Gateway auth missing");
  }

  const runPath = resolve(runsPath, options.run);
  if (existsSync(runPath)) throw new Error(`Run already exists: ${runPath}`);
  mkdirSync(runPath, { recursive: true });
  writeJsonAtomic(resolve(runPath, "cohort.json"), cohort);
  writeJsonAtomic(resolve(runPath, "metadata.json"), {
    ...summary,
    status: "running",
    startedAt: new Date().toISOString(),
  });

  const results = [];
  let cursor = 0;
  const startedAt = new Date().toISOString();
  async function worker() {
    while (cursor < cohort.length) {
      const source = cohort[cursor];
      cursor += 1;
      const callStartedAt = new Date().toISOString();
      try {
        const generated = await generateObject({
          model: MODEL,
          reasoning: "low",
          schema: groundVerdictSchema,
          system: systemPrompt,
          messages: [{ role: "user", content: buildContent(source, voiceGuidance, contract) }],
          abortSignal: AbortSignal.timeout(240_000),
        });
        results.push({
          ...source,
          replayDraft: generated.object.firstDraft.trim().replaceAll("**", ""),
          replayVerdict: {
            ...generated.object,
            firstDraft: generated.object.firstDraft.trim().replaceAll("**", ""),
          },
          usage: usageShape(generated.usage),
          callStartedAt,
          callCompletedAt: new Date().toISOString(),
          error: null,
        });
        console.log(`[${results.length}/${cohort.length}] completed source ${source.index}`);
      } catch (error) {
        results.push({
          ...source,
          replayDraft: null,
          replayVerdict: null,
          usage: null,
          callStartedAt,
          callCompletedAt: new Date().toISOString(),
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        });
        console.error(`[${results.length}/${cohort.length}] failed source ${source.index}`, error);
      }
      results.sort((a, b) => a.index - b.index);
      writeJsonAtomic(resolve(runPath, "results.json"), results);
    }
  }

  console.log(
    `Starting ${options.run}: ${cohort.length} historical sources, ${options.concurrency} workers`,
  );
  await Promise.all(Array.from({ length: options.concurrency }, () => worker()));
  const failures = results.filter((row) => row.error);
  const completedAt = new Date().toISOString();
  writeJsonAtomic(resolve(runPath, "metadata.json"), {
    ...summary,
    status: failures.length === 0 ? "complete" : "partial",
    completed: results.length - failures.length,
    failures: failures.length,
    startedAt,
    completedAt,
  });
  console.log(
    JSON.stringify({ completed: results.length - failures.length, failures: failures.length }),
  );
  if (failures.length > 0) process.exitCode = 1;
}

await main();
