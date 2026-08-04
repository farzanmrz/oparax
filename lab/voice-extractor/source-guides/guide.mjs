#!/usr/bin/env node
/** Per-source beat-pattern extraction: one Sonnet structured-output call per source.
 *  Input: newest 50 posts (owner decision 2026-08-03) from the fresh 90-day pull, with
 *  images / video poster frames and resolved link context; lab-corpus fallback only when
 *  no fresh pull exists (provenance recorded). Output: guides/<handle>.json + report.md. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { generateText, Output } from "ai";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
loadEnvFile(resolve(repoRoot, ".env.local"));

const BEAT = "I want to monitor all news around FC Barcelona.";
const MODEL = "anthropic/claude-sonnet-5";
const POST_CAP = 50;
const IMAGE_BUDGET = 50;
const summary = JSON.parse(readFileSync(resolve(here, "pull-summary.json"), "utf8"));
const profiles = new Map(
  readFileSync(resolve(here, "../filtration-eval/source-profiles.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l))
    .map((p) => [p.sourceHandle, p]),
);
const linkContext = existsSync(resolve(here, "link-context.json"))
  ? JSON.parse(readFileSync(resolve(here, "link-context.json"), "utf8"))
  : {};

const schema = z.object({
  counts: z.object({ onBeat: z.number(), offBeat: z.number(), unclear: z.number() }),
  skew: z.enum(["mixed", "almost_all_on_beat", "almost_all_off_beat", "insufficient"]),
  priorLine: z
    .string()
    .describe("One sentence a downstream filter can use as this account's prior."),
  onBeatPatterns: z
    .array(
      z.object({
        pattern: z.string().describe("One recurring shape of ON-beat post from THIS account."),
        exampleIndexes: z.array(z.number()).min(1).max(2),
        examplesEnglish: z
          .array(z.string())
          .min(1)
          .max(2)
          .describe(
            "Faithful English text of each example, same order as exampleIndexes. Identical to the original when the post is already English. The downstream filter reads posts in English, so quoted examples must be English.",
          ),
      }),
    )
    .max(5),
  offBeatPatterns: z
    .array(
      z.object({
        pattern: z.string().describe("One recurring shape of OFF-beat post from THIS account."),
        exampleIndexes: z.array(z.number()).min(1).max(2),
        examplesEnglish: z.array(z.string()).min(1).max(2),
      }),
    )
    .max(5),
});

function imageMediaType(imageUrl) {
  const url = new URL(imageUrl);
  const type =
    url.searchParams.get("format")?.toLowerCase() ?? url.pathname.split(".").pop()?.toLowerCase();
  if (type === "png") return "image/png";
  if (type === "webp") return "image/webp";
  if (type === "gif") return "image/gif";
  return "image/jpeg";
}

function loadPosts(handle) {
  const fresh = resolve(here, "pulled", `${handle}.jsonl`);
  if (existsSync(fresh)) {
    const rows = readFileSync(fresh, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
      .slice(0, POST_CAP);
    if (rows.length >= 15)
      return {
        provenance: "fresh-90d",
        posts: rows.map((r) => ({
          date: r.date,
          lang: r.lang,
          text: r.text,
          media: r.media ?? [],
          links: r.links ?? [],
        })),
      };
  }
  const lab = resolve(here, "../filtration-eval/by-source", `${handle}.unlabeled.jsonl`);
  if (existsSync(lab)) {
    const rows = readFileSync(lab, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    if (rows.length >= 15)
      return {
        provenance: "lab-corpus-stale",
        posts: rows
          .slice(0, POST_CAP)
          .map((r) => ({ date: null, lang: null, text: r.postContent, media: [], links: [] })),
      };
  }
  return null;
}

async function runSource(handle) {
  const loaded = loadPosts(handle);
  if (!loaded) return { handle, state: summary.handles[handle]?.state ?? "no-data" };
  const bio = summary.handles[handle]?.bio || profiles.get(handle)?.biography || "";
  let imagesUsed = 0;
  const content = [
    {
      type: "text",
      text: [
        `A reporter's beat: "${BEAT}"`,
        `Below are recent posts from ONE source account, @${handle} (bio: ${JSON.stringify(bio)}).`,
        "Each post may be followed by its attached images and by the resolved content of links it carries.",
        "An attachment labeled `video` is one representative poster frame, not the complete video.",
        "An attachment labeled `animated_gif` is one representative frame, not the complete animation.",
        "Posts carry X's machine-detected BCP-47 lang code; read non-English posts natively.",
        "Judge each post against the beat, then report:",
        "- counts of on-beat / off-beat / unclear posts,",
        "- the account's skew,",
        "- ONE pattern per DISTINCT recurring shape you actually observe, for each class — never invent a pattern that has no posts behind it; if a class has fewer than 2 posts, return no patterns for that class and let the prior line carry it,",
        "- for each pattern, 1-2 example post indexes, plus the faithful English text of each chosen example (identical to the original when already English) — the downstream filter reads posts in English.",
        "Off-beat includes: other clubs' news with no Barcelona angle, other sports, celebrity/lifestyle content, city-of-Barcelona-but-not-the-club content, and engagement bait.",
      ].join("\n"),
    },
  ];
  for (const [i, p] of loaded.posts.entries()) {
    const mediaNote = (p.media ?? []).map((m) => m.kind).join(",");
    content.push({
      type: "text",
      text: `<post i="${i}"${p.date ? ` date="${p.date.slice(0, 10)}"` : ""}${p.lang ? ` lang="${p.lang}"` : ""}${mediaNote ? ` media="${mediaNote}"` : ""}>\n${p.text}\n</post>`,
    });
    for (const m of p.media ?? []) {
      if (imagesUsed >= IMAGE_BUDGET) {
        content.push({ type: "text", text: `(image budget reached — ${m.kind} not attached)` });
        continue;
      }
      imagesUsed += 1;
      content.push({
        type: "file",
        data: new URL(m.imageUrl),
        mediaType: imageMediaType(m.imageUrl),
      });
    }
    for (const u of p.links ?? []) {
      const ctx = linkContext[u];
      if (ctx)
        content.push({
          type: "text",
          text: `[link in post ${i}] ${ctx.kind === "x" ? "links to X post" : u.split("/")[2]}: ${ctx.text}`,
        });
    }
  }
  const result = await generateText({
    model: MODEL,
    maxRetries: 3,
    abortSignal: AbortSignal.timeout(300_000),
    providerOptions: { anthropic: { thinking: { type: "adaptive", effort: "medium" } } },
    output: Output.object({ name: "SourceBeatGuide", schema }),
    messages: [{ role: "user", content }],
  });
  const gateway = result.providerMetadata?.gateway ?? {};
  return {
    handle,
    state: "ok",
    provenance: loaded.provenance,
    nPosts: loaded.posts.length,
    nImages: imagesUsed,
    posts: loaded.posts,
    usage: {
      inputTokens: result.usage?.inputTokens ?? null,
      outputTokens: result.usage?.outputTokens ?? null,
      cost: gateway.inferenceCost ?? gateway.cost ?? null,
    },
    guide: result.output,
  };
}

const only = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1]
  : null;
const handles = Object.keys(summary.handles).filter((h) => !only || h === only);
mkdirSync(resolve(here, "guides"), { recursive: true });
const results = [];
const queue = [...handles];
async function worker() {
  while (queue.length) {
    const h = queue.shift();
    try {
      const r = await runSource(h);
      results.push(r);
      console.log(
        `${h}: ${r.state}${
          r.guide
            ? ` (${r.guide.counts.onBeat}on/${r.guide.counts.offBeat}off, ${r.guide.onBeatPatterns.length}+${r.guide.offBeatPatterns.length} patterns, ${r.provenance}, $${r.usage.cost ?? "?"})`
            : ""
        }`,
      );
      if (r.guide)
        writeFileSync(
          resolve(here, "guides", `${h}.json`),
          JSON.stringify({ ...r, posts: undefined }, null, 2),
        );
    } catch (e) {
      results.push({ handle: h, state: "model-error", error: String(e).slice(0, 300) });
      console.log(`${h}: MODEL ERROR ${String(e).slice(0, 120)}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));

const spent = results.reduce((s, r) => s + (Number(r.usage?.cost) || 0), 0);
const tokens = results.reduce((s, r) => s + (r.usage?.inputTokens ?? 0), 0);
console.log(
  `TOTAL: ${results.filter((r) => r.guide).length} guides, ${tokens} input tokens, $${spent.toFixed(4)} model cost`,
);

// Readable report: rules first, English example text under each rule.
const lines = [
  "# Per-source beat guides — experiment output",
  "",
  "_Input: newest 50 posts per source from the fresh 90-day X pull (with images/poster frames",
  "and resolved links). Examples are quoted in English because the downstream filter reads",
  "posts in English (translation replaces the original in its input)._",
  "",
];
for (const r of results.sort((a, b) => a.handle.localeCompare(b.handle))) {
  lines.push(`## @${r.handle}`);
  if (r.state !== "ok" || !r.guide) {
    lines.push(`_No guide: ${r.state}${r.error ? ` — ${r.error}` : ""}_\n`);
    continue;
  }
  const g = r.guide;
  lines.push(
    `_${r.provenance} · ${r.nPosts} posts · ${g.counts.onBeat} on / ${g.counts.offBeat} off / ${g.counts.unclear} unclear · skew: ${g.skew}_`,
  );
  lines.push(`\n**Prior:** ${g.priorLine}\n`);
  for (const [title, pats] of [
    ["On-beat patterns", g.onBeatPatterns],
    ["Off-beat patterns", g.offBeatPatterns],
  ]) {
    lines.push(`### ${title}`);
    if (!pats.length) lines.push("_(none — carried by the prior)_");
    for (const p of pats) {
      lines.push(`- **${p.pattern}**`);
      p.examplesEnglish.forEach((t, j) => {
        const i = p.exampleIndexes[j];
        const lang = r.posts[i]?.lang;
        lines.push(
          `  > ${t.replaceAll("\n", " ").slice(0, 220)}${lang && lang !== "en" ? ` _(orig ${lang})_` : ""}`,
        );
      });
    }
    lines.push("");
  }
}
writeFileSync(resolve(here, "report.md"), lines.join("\n"));
console.log("report written");
