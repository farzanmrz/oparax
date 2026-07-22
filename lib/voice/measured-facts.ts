// lib/voice/measured-facts.ts
//
// The measurable half of a voice guide, computed instead of read. Sparse habits (a hashtag in
// 1 post of 5) leave a weak reading impression and get missed by the extraction model — a count
// over the full corpus cannot. The block this renders is prepended to the extraction input and
// the extraction prompt's `## MEASURED FACTS` section makes its numbers binding: rules must
// agree with them, and a glyph absent from an inventory may not be taught.
// Ported from the lab original (.voice-lab/sdk-lab/extract-fable80.mjs, prompt fable-prod-…-mfacts).

// One emoji per match, ZWJ sequences and flags intact where the runtime supports the `v` flag.
// The CONSTRUCTOR form is required and the ignore below is load-bearing: as a literal, `/…/gv`
// is rejected by tsc under this project's ES2017 target, and on any runtime without `v` it is a
// PARSE error — which the try/catch could never catch, silently killing the fallback.
const EMOJI: RegExp = (() => {
  try {
    // biome-ignore lint/complexity/useRegexLiterals: a literal defeats the runtime feature-detect
    return new RegExp("\\p{RGI_Emoji}", "gv");
  } catch {
    return /\p{Extended_Pictographic}/gu;
  }
})();
const HASHTAG = /#[\p{L}\p{N}_]+/gu;

function share(texts: string[], re: RegExp): number {
  const single = new RegExp(re.source, re.flags.replace("g", ""));
  return texts.filter((t) => single.test(t)).length;
}

function inventory(texts: string[], re: RegExp): string {
  const counts = new Map<string, number>();
  for (const t of texts)
    for (const m of t.matchAll(re)) counts.set(m[0], (counts.get(m[0]) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1]);
  if (!top.length) return "none in the corpus";
  const shown = top
    .slice(0, 15)
    .map(([g, c]) => `${g}×${c}`)
    .join(" ");
  return shown + (top.length > 15 ? ` (+${top.length - 15} rarer)` : "");
}

/** Render the MEASURED STYLE FACTS block for one reporter's corpus of post texts. */
export function measuredFacts(handle: string, postTexts: string[]): string {
  const texts = postTexts.filter((t) => t.trim());
  const n = texts.length;
  const lens = texts.map((t) => t.length).sort((a, b) => a - b);
  const pct = (p: number) => lens[Math.min(n - 1, Math.floor(p * n))];
  const breaks = [0, 0, 0];
  for (const t of texts) breaks[Math.min(2, (t.match(/\n/g) ?? []).length)]++;
  return [
    `MEASURED STYLE FACTS for @${handle} — frequencies computed by code over all ${n} corpus posts.`,
    `- length (chars): median ${pct(0.5)}, p10 ${pct(0.1)}, p90 ${pct(0.9)}, max ${lens[n - 1]}; ${lens.filter((l) => l > 280).length}/${n} posts over 280`,
    `- line breaks: ${breaks[0]}/${n} posts have none, ${breaks[1]}/${n} exactly one, ${breaks[2]}/${n} two or more`,
    `- emoji: ${share(texts, EMOJI)}/${n} posts contain any; full inventory: ${inventory(texts, EMOJI)}`,
    `- hashtags: ${share(texts, HASHTAG)}/${n} posts contain any; full inventory (exact casing): ${inventory(texts, HASHTAG)}`,
    `- mentions (@): ${share(texts, /@\w/g)}/${n} posts; URLs: ${share(texts, /https?:\/\//g)}/${n} posts`,
    `- posts containing: ! ${share(texts, /!/g)}/${n} · ? ${share(texts, /\?/g)}/${n} · ellipsis ${share(texts, /\.\.\.|…/g)}/${n} · em-dash ${share(texts, /—/g)}/${n} · straight " ${share(texts, /"/g)}/${n} · curly “” ${share(texts, /[“”]/g)}/${n} · colon ${share(texts, /:/g)}/${n}`,
    `- ALL-CAPS words (3+ letters): ${share(texts, /\b[A-Z]{3,}\b/g)}/${n} posts`,
  ].join("\n");
}
