#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const comparisonPath = resolve(here, "reviews/comparison.jsonl");
const contextPath = resolve(here, "review-context.jsonl");
const languageLabelsPath = resolve(here, "x-language-labels.jsonl");
const outputPath = resolve(here, "consensus-benchmark.jsonl");
const summaryPath = resolve(here, "consensus-benchmark-summary.json");

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const contexts = new Map(readJsonl(contextPath).map((row) => [row.postId, row]));
const languageLabels = new Map(readJsonl(languageLabelsPath).map((row) => [row.postId, row.lang]));
const rows = readJsonl(comparisonPath)
  .filter((row) => row.onBeat === row.codexSolOnBeat && row.onBeat === row.claudeOpusOnBeat)
  .map((row) => {
    const context = contexts.get(row.postId);
    if (!context) throw new Error(`Missing review context for ${row.postId}`);
    const lang = languageLabels.get(row.postId);
    if (!lang) throw new Error(`Missing X-style language label for ${row.postId}`);

    const media = (context.photos ?? [])
      .map((imageUrl) => ({ kind: "photo", imageUrl }))
      .slice(0, 4);
    const posterFramePath = `video-poster-frames/${row.postId}.jpg`;
    const hasNativeVideo = (context.videos?.length ?? 0) > 0;
    if (media.length === 0 && hasNativeVideo && existsSync(resolve(here, posterFramePath))) {
      media.push({ kind: "video", imagePath: posterFramePath });
    }

    return {
      postId: row.postId,
      sourceHandle: row.sourceHandle,
      lang,
      postContent: row.postContent,
      expectedOnBeat: row.onBeat,
      datePosted: context.datePosted,
      postUrl: context.postUrl,
      externalUrl: context.externalUrl,
      media,
      hasUnattachedVideo: hasNativeVideo && media.length === 0,
    };
  });

const byLabel = rows.reduce(
  (counts, row) => {
    counts[row.expectedOnBeat ? "onBeat" : "offBeat"] += 1;
    return counts;
  },
  { onBeat: 0, offBeat: 0 },
);

const summary = {
  generatedAt: new Date().toISOString(),
  source: "reviews/comparison.jsonl rows where Luna, Codex Sol, and Claude Opus agree",
  total: rows.length,
  ...byLabel,
  withAttachedImages: rows.filter((row) => row.media.length > 0).length,
  nativePhotoRows: rows.filter((row) => row.media.some((media) => media.kind === "photo")).length,
  derivedVideoPosterFrames: rows.filter((row) => row.media.some((media) => media.kind === "video"))
    .length,
  videoOnlyWithoutPosterFrame: rows.filter((row) => row.hasUnattachedVideo).length,
  excludedLinkPreviewRows: rows.filter(
    (row) => (contexts.get(row.postId)?.externalImageUrls?.length ?? 0) > 0,
  ).length,
  languages: Object.fromEntries(
    [...new Set(rows.map((row) => row.lang))]
      .sort()
      .map((lang) => [lang, rows.filter((row) => row.lang === lang).length]),
  ),
};

if (rows.length !== 1_336) {
  throw new Error(`Expected 1,336 unanimous rows, found ${rows.length}`);
}

writeFileSync(outputPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
