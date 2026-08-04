#!/usr/bin/env node
/** Link resolution for the pulled corpus, T2-style: X-post links resolved deterministically
 *  via batch tweet lookup; external links fetched for title/description. No web search.
 *  Output: link-context.json  { url: { kind: "x"|"page", text } } */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
loadEnvFile(resolve(here, "../../..", ".env.local"));
const BEARER = process.env.X_BEARER_TOKEN;

const context = (() => {
  try { return JSON.parse(readFileSync(resolve(here, "link-context.json"), "utf8")); }
  catch { return {}; }
})();
const allLinks = new Set();
for (const f of readdirSync(resolve(here, "pulled")).filter((f) => f.endsWith(".jsonl"))) {
  for (const line of readFileSync(resolve(here, "pulled", f), "utf8").trim().split("\n")) {
    if (line) for (const u of JSON.parse(line).links ?? []) allLinks.add(u);
  }
}
const links = [...allLinks].filter((u) => !context[u]);
const xIds = new Map(); // url -> status id
for (const u of links) {
  const m = u.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/);
  if (m) xIds.set(u, m[1]);
}
const external = links.filter((u) => !xIds.has(u));
console.log(`links: ${links.length} (${xIds.size} x-posts, ${external.length} external)`);



// X links: batch lookup, 100 ids per call.
const ids = [...new Set(xIds.values())];
const byId = new Map();
for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100);
  const r = await fetch(
    `https://api.x.com/2/tweets?ids=${batch.join(",")}&tweet.fields=text,note_tweet&expansions=author_id&user.fields=username`,
    { headers: { Authorization: `Bearer ${BEARER}` } },
  ).then((r) => r.json());
  const users = new Map((r.includes?.users ?? []).map((u) => [u.id, u.username]));
  for (const t of r.data ?? []) byId.set(t.id, `@${users.get(t.author_id) ?? "?"}: ${t.note_tweet?.text ?? t.text}`);
  for (const e of r.errors ?? []) byId.set(String(e.value ?? e.resource_id ?? ""), "(unavailable X post)");
}
for (const [url, id] of xIds) context[url] = { kind: "x", text: (byId.get(id) ?? "(unresolved)").slice(0, 400) };

// External links: fetch title + description. Failures skipped silently.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36";
async function fetchPage(u) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000), redirect: "follow" });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 200_000);
    const pick = (re) => html.match(re)?.[1]?.replaceAll(/\s+/g, " ").trim() ?? "";
    const title = pick(/<title[^>]*>([^<]{1,300})/i);
    const desc =
      pick(/<meta[^>]+property="og:description"[^>]+content="([^"]{1,400})"/i) ||
      pick(/<meta[^>]+name="description"[^>]+content="([^"]{1,400})"/i);
    const text = [title, desc].filter(Boolean).join(" — ");
    return text || null;
  } catch { return null; }
}
let done = 0;
const queue = [...external];
async function worker() {
  while (queue.length) {
    const u = queue.shift();
    const text = await fetchPage(u);
    if (text) context[u] = { kind: "page", text: text.slice(0, 400) };
    if (++done % 50 === 0) console.log(`external ${done}/${external.length}`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
writeFileSync(resolve(here, "link-context.json"), JSON.stringify(context, null, 1));
console.log(`resolved: ${Object.keys(context).length}/${links.length}`);
