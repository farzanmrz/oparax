#!/usr/bin/env node
/** Fresh X pull for the source-guide experiment: min(100 posts, last 90 days) per handle,
 *  one timeline page each, app-only bearer. Writes one JSONL per handle plus pull-summary.json.
 *  Handles come from the 20-account lab roster (by-source dir names). */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
loadEnvFile(resolve(repoRoot, ".env.local"));
const BEARER = process.env.X_BEARER_TOKEN;
if (!BEARER) throw new Error("X_BEARER_TOKEN missing");

// Roster typos found 2026-08-03: the lab roster's "DavidOrnstein" resolves to an unrelated
// Swedish account; the Athletic correspondent is @David_Ornstein. Fix at the roster boundary.
const HANDLE_FIXES = { DavidOrnstein: "David_Ornstein" };
const handles = readdirSync(resolve(here, "../filtration-eval/by-source"))
  .filter((f) => f.endsWith(".unlabeled.jsonl"))
  .map((f) => f.replace(".unlabeled.jsonl", ""))
  .map((h) => HANDLE_FIXES[h] ?? h);

const outDir = resolve(here, "pulled");
mkdirSync(outDir, { recursive: true });
const api = (path, params) =>
  fetch(`https://api.x.com/2/${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${BEARER}` },
  }).then(async (r) => ({ status: r.status, body: await r.json() }));

const startTime = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
const summaryPath = resolve(here, "pull-summary.json");
const prior = existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, "utf8")) : null;
const summary = { startTime: prior?.startTime ?? startTime, handles: prior?.handles ?? {} };
// Retry only handles that failed transiently (e.g. 402 credits depleted); keep settled states.
const REFRESH = process.argv.includes("--refresh");
const SETTLED = new Set(
  REFRESH ? ["empty", "invalid", "protected"] : ["ok", "thin", "empty", "invalid", "protected"],
);

// One batched lookup validates the whole roster and returns protected flags.
const lookup = await api("users/by", {
  usernames: handles.join(","),
  "user.fields": "protected,description,name",
});
const found = new Map((lookup.body.data ?? []).map((u) => [u.username.toLowerCase(), u]));
const lookupErrors = new Map(
  (lookup.body.errors ?? []).map((e) => [String(e.value ?? "").toLowerCase(), e.title]),
);

for (const handle of handles) {
  if (SETTLED.has(summary.handles[handle]?.state)) {
    console.log(`${handle}: kept (${summary.handles[handle].state})`);
    continue;
  }
  const user = found.get(handle.toLowerCase());
  if (!user) {
    summary.handles[handle] = {
      state: "invalid",
      reason: lookupErrors.get(handle.toLowerCase()) ?? "not returned",
    };
    continue;
  }
  if (user.protected) {
    summary.handles[handle] = { state: "protected" };
    continue;
  }
  const res = await api(`users/${user.id}/tweets`, {
    max_results: "50",
    exclude: "retweets,replies",
    start_time: startTime,
    "tweet.fields": "created_at,lang,note_tweet,entities,attachments",
    expansions: "attachments.media_keys",
    "media.fields": "type,url,preview_image_url",
  });
  if (res.status !== 200) {
    summary.handles[handle] = {
      state: "error",
      status: res.status,
      detail: JSON.stringify(res.body).slice(0, 200),
    };
    continue;
  }
  const mediaByKey = new Map(
    (res.body.includes?.media ?? []).map((m) => [m.media_key, m]),
  );
  const posts = (res.body.data ?? []).map((t) => {
    const media = (t.attachments?.media_keys ?? [])
      .map((k) => mediaByKey.get(k))
      .filter(Boolean)
      .map((m) => ({ kind: m.type, imageUrl: m.url ?? m.preview_image_url }))
      .filter((m) => m.imageUrl);
    // note_tweet entities live on note_tweet; plain-tweet entities on the tweet.
    const urls = [
      ...(t.entities?.urls ?? []),
      ...(t.note_tweet?.entities?.urls ?? []),
    ]
      .filter((u) => u.expanded_url && !u.expanded_url.includes("/photo/") && !u.expanded_url.includes("/video/"))
      .map((u) => u.expanded_url);
    return {
      postId: t.id,
      date: t.created_at,
      lang: t.lang,
      text: t.note_tweet?.text ?? t.text,
      media,
      links: [...new Set(urls)],
    };
  });
  writeFileSync(
    resolve(outDir, `${handle}.jsonl`),
    posts.map((p) => JSON.stringify(p)).join("\n") + (posts.length ? "\n" : ""),
  );
  summary.handles[handle] = {
    state: posts.length >= 15 ? "ok" : posts.length > 0 ? "thin" : "empty",
    count: posts.length,
    newest: posts[0]?.date ?? null,
    oldest: posts.at(-1)?.date ?? null,
    bio: user.description?.slice(0, 200) ?? "",
    displayName: user.name,
  };
  console.log(`${handle}: ${summary.handles[handle].state} (${posts.length})`);
}
writeFileSync(resolve(here, "pull-summary.json"), JSON.stringify(summary, null, 2));
console.log("done");
