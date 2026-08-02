#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const benchmarkPath = resolve(here, "consensus-benchmark.jsonl");
const urlSnapshotPath = resolve(here, "link-url-snapshot.jsonl");
const linkedImagesDirectory = resolve(here, "linked-page-images");
const outputPath = resolve(here, "external-link-context-snapshot.jsonl");
const URL_PATTERN = /https?:\/\/[^\s<>]+/g;
const EXTERNAL_TYPES = new Set(["article", "webpage", "video", "image"]);

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function cachedImagePath(imageUrl, filenames) {
  const prefix = createHash("sha256").update(imageUrl).digest("hex");
  const filename = filenames.find((candidate) => candidate.startsWith(`${prefix}.`));
  return filename ? `linked-page-images/${filename}` : null;
}

if (!existsSync(urlSnapshotPath)) {
  throw new Error("link-url-snapshot.jsonl is missing; run build-link-context.mjs first");
}

const benchmark = readJsonl(benchmarkPath);
const urlResults = new Map(readJsonl(urlSnapshotPath).map((row) => [row.sourceUrl, row]));
const imageFilenames = existsSync(linkedImagesDirectory) ? readdirSync(linkedImagesDirectory) : [];
const rows = benchmark.map((row) => {
  const links = (row.postContent.match(URL_PATTERN) ?? []).flatMap((sourceUrl) => {
    const result = urlResults.get(sourceUrl);
    if (!result || !EXTERNAL_TYPES.has(result.type)) return [];
    const media = (result.media ?? []).flatMap((item) => {
      if (!item.imageUrl) return [];
      const imagePath = cachedImagePath(item.imageUrl, imageFilenames);
      return imagePath ? [{ imagePath, kind: item.kind ?? "image" }] : [];
    });
    return [
      {
        sourceUrl,
        resolvedUrl: result.resolvedUrl,
        redirects: result.redirects,
        status: result.status,
        contentType: result.contentType,
        type: result.type,
        title: result.title ?? null,
        content: result.content ?? null,
        media,
      },
    ];
  });
  return { postId: row.postId, links };
});

writeFileSync(outputPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);

const links = rows.flatMap((row) => row.links);
console.log(
  JSON.stringify(
    {
      posts: rows.length,
      enrichedPosts: rows.filter((row) => row.links.length > 0).length,
      links: links.length,
      types: Object.fromEntries(
        [...EXTERNAL_TYPES].map((type) => [
          type,
          links.filter((link) => link.type === type).length,
        ]),
      ),
      linksWithText: links.filter((link) => link.title || link.content).length,
      linksWithMedia: links.filter((link) => link.media.length > 0).length,
    },
    null,
    2,
  ),
);
