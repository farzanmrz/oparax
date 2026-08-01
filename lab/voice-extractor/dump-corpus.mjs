// lab/voice-extractor/dump-corpus.mjs
//
// Builds the Workbench user-message file for voice-extractor prompt iteration:
// the 50 most recent corpus posts in the SAME line format production sends
// (lib/voice/extract-guide.ts buildExtractionContent), preceded by the same
// MEASURED STYLE FACTS block (lib/voice/measured-facts.ts, mirrored here).
// Text-only: media is marked but never attached. Reads corpus-snapshot.jsonl
// (dumped from corpus_posts); re-dump that file if the corpus grows stale.
//
// Usage: node lab/voice-extractor/dump-corpus.mjs > lab/voice-extractor/reshad-corpus-50.txt
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const N = 50;
const HANDLE = "ReshadRahman";
const BEAT = "I wanna monitor all news around FC Barcelona.";
const AGENT = "fb986a9b-d360-4b7f-b823-3771fbf7316e";

const rows = fs
  .readFileSync(path.join(HERE, "corpus-snapshot.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l))
  .filter((r) => r.agent_id === AGENT)
  .sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at))
  .slice(0, N);

// --- measured facts, mirroring lib/voice/measured-facts.ts exactly ---
const EMOJI = /\p{RGI_Emoji}/gv;
const HASHTAG = /#[\p{L}\p{N}_]+/gu;
const share = (texts, re) => {
  const single = new RegExp(re.source, re.flags.replace("g", ""));
  return texts.filter((t) => single.test(t)).length;
};
const inventory = (texts, re) => {
  const counts = new Map();
  for (const t of texts) for (const m of t.matchAll(re)) counts.set(m[0], (counts.get(m[0]) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1]);
  if (!top.length) return "none in the corpus";
  const shown = top.slice(0, 15).map(([g, c]) => `${g}×${c}`).join(" ");
  return shown + (top.length > 15 ? ` (+${top.length - 15} rarer)` : "");
};
const texts = rows.map((r) => r.text ?? "").filter((t) => t.trim());
const n = texts.length;
const lens = texts.map((t) => t.length).sort((a, b) => a - b);
const pct = (p) => lens[Math.min(n - 1, Math.floor(p * n))];
const breaks = [0, 0, 0];
for (const t of texts) breaks[Math.min(2, (t.match(/\n/g) ?? []).length)]++;
const facts = [
  `MEASURED STYLE FACTS for @${HANDLE} — frequencies computed by code over all ${n} corpus posts.`,
  `- length (chars): median ${pct(0.5)}, p10 ${pct(0.1)}, p90 ${pct(0.9)}, max ${lens[n - 1]}; ${lens.filter((l) => l > 280).length}/${n} posts over 280`,
  `- line breaks: ${breaks[0]}/${n} posts have none, ${breaks[1]}/${n} exactly one, ${breaks[2]}/${n} two or more`,
  `- emoji: ${share(texts, EMOJI)}/${n} posts contain any; full inventory: ${inventory(texts, EMOJI)}`,
  `- hashtags: ${share(texts, HASHTAG)}/${n} posts contain any; full inventory (exact casing): ${inventory(texts, HASHTAG)}`,
  `- mentions (@): ${share(texts, /@\w/g)}/${n} posts; URLs: ${share(texts, /https?:\/\//g)}/${n} posts`,
  `- posts containing: ! ${share(texts, /!/g)}/${n} · ? ${share(texts, /\?/g)}/${n} · ellipsis ${share(texts, /\.\.\.|…/g)}/${n} · em-dash ${share(texts, /—/g)}/${n} · straight " ${share(texts, /"/g)}/${n} · curly “” ${share(texts, /[“”]/g)}/${n} · colon ${share(texts, /:/g)}/${n}`,
  `- ALL-CAPS words (3+ letters): ${share(texts, /\b[A-Z]{3,}\b/g)}/${n} posts`,
].join("\n");

// --- corpus lines, production format (media marked, never attached) ---
const lines = rows.map((p) => {
  const mediaMark = p.has_media ? " [MEDIA: attached on X — not shown in this lab file]" : "";
  const date = p.posted_at.slice(0, 10);
  return `[${p.x_post_id}] ${date} ${p.is_long ? "LONG " : ""}(♥${p.like_count} ↻${p.repost_count})${mediaMark}: ${p.text}`;
});

if (process.argv[2] === "bare") {
  const bare = rows
    .map((p) => `<post date="${p.posted_at.slice(0, 10)}">\n${p.text}\n</post>`)
    .join("\n\n");
  process.stdout.write(bare + "\n");
} else {
  process.stdout.write(
    `REPORTER: @${HANDLE}\n\nTHE BEAT, IN THE REPORTER'S OWN WORDS:\n${BEAT}\n\n${facts}\n\nTHE CORPUS (most recent first):\n\n${lines.join("\n")}\n`,
  );
}

// --- bare mode: `node dump-corpus.mjs bare` → XML-tagged posts only (no header,
// no facts block, no ids/engagement) — the Workbench document attachment while
// the rest of the input lives in the prompt boxes. ---
