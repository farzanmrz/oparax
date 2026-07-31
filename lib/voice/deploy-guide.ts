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

/** `## Beat & Scope` heading matcher — the one section routed to the drafter as its own
 * first-class beatSpec input (#73) instead of riding inside `voiceGuidance`. */
export const BEAT_SCOPE_HEADING_RE = /^##\s+Beat\s*&\s*Scope\b/i;

/** Pulls the `## Beat & Scope` section body (heading excluded) out of a RAW guide.
 * Returns null when the guide has no such section — callers fall back to the reporter's
 * typed `agents.beat` sentence. */
export function extractBeatSpec(rawGuideMd: string): string | null {
  const m = rawGuideMd.match(/^##\s+Beat\s*&\s*Scope\b[^\n]*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/im);
  const body = m?.[1]?.trim();
  return body ? body : null;
}

/** Strips the `## Beat & Scope` section from guide markdown. Used (1) inside deployGuide so a
 * freshly deployed guide never carries the section into drafting, and (2) at compose time on
 * legacy guide_deploy rows written before #73. NOT part of LAB_ONLY_SECTIONS: the section is
 * not lab-only noise, it is rerouted to the drafter as beatSpec via extractBeatSpec(guide_raw). */
export function stripBeatScope(md: string): string {
  return md
    .replace(/^##\s+Beat\s*&\s*Scope\b[\s\S]*?(?=^##\s|$(?![\s\S]))/im, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Strip lab-only sections from a raw voice guide, yielding the guide used as a drafting prompt. */
export function deployGuide(rawGuideMd: string): string {
  let md = rawGuideMd;
  for (const name of LAB_ONLY_SECTIONS) {
    md = md.replace(new RegExp(String.raw`^##\s+${name}\b[\s\S]*?(?=^##\s|$(?![\s\S]))`, "gm"), "");
  }
  return `${stripBeatScope(md)}\n`;
}
