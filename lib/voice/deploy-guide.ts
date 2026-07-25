// lib/voice/deploy-guide.ts
//
// A voice guide may carry sections that exist so the EXTRACTION side can be verified. The
// drafting model gains nothing from them and pays for them on every single draft, forever, so
// they are stripped here. Measured across 10 lab guides when `## Dimension Coverage` was still
// generated: 235,091 → 197,144 chars, 16.1% off every draft at zero risk.
//
// `LAB_ONLY_SECTIONS` is EMPTY today, and that is the intended state — not an oversight. The
// one entry it ever held, `## Dimension Coverage`, is no longer emitted at all: Anthropic's
// Opus 5 prompting guidance says self-verification scaffolding causes over-verification with no
// quality gain, so the extraction prompt stopped asking for it (see `.claude/rules/voice.md`).
// Not generating a section beats generating and stripping it — the same 16.1% is now saved at
// extraction time too, instead of being paid for and thrown away.
//
// The mechanism stays because the RULE outlives its one instance: anything in the guide that
// exists to verify the extractor is stripped before the guide becomes a prompt. Store the raw
// guide (auditable), draft from this output — that split is what `voice_guides` provenance
// depends on, and it must not collapse just because the strip list is momentarily empty. Adding
// a lab-only section to the extraction prompt means adding its heading here in the same commit.
// Ported from the lab original (.voice-lab/deploy-guide.py).

/** Sections dropped at deploy. A section runs from its `## Name` heading to the next `## `.
 *  Empty by design — see the file header before adding or removing an entry. */
const LAB_ONLY_SECTIONS: string[] = [];

/** Strip lab-only sections from a raw voice guide, yielding the guide used as a drafting prompt. */
export function deployGuide(rawGuideMd: string): string {
  let md = rawGuideMd;
  for (const name of LAB_ONLY_SECTIONS) {
    md = md.replace(new RegExp(String.raw`^##\s+${name}\b[\s\S]*?(?=^##\s|$(?![\s\S]))`, "gm"), "");
  }
  return `${md.replace(/\n{3,}/g, "\n\n").trim()}\n`;
}
