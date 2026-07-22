// lib/voice/deploy-guide.ts
//
// A voice guide carries sections that exist so the EXTRACTION side can be verified — today
// `## Dimension Coverage`, a checklist proving the extractor examined every dimension. The
// drafting model gains nothing from them and pays for them on every single draft, forever.
// Measured across 10 lab guides: 235,091 → 197,144 chars, 16.1% off every draft at zero risk.
//
// The general rule: anything in the guide that exists to verify the extractor is stripped
// before the guide becomes a prompt. Store the raw guide (auditable), draft from this output.
// Ported from the lab original (.voice-lab/deploy-guide.py).

/** Sections dropped at deploy. A section runs from its `## Name` heading to the next `## `. */
const LAB_ONLY_SECTIONS = ["Dimension Coverage"];

/** Strip lab-only sections from a raw voice guide, yielding the guide used as a drafting prompt. */
export function deployGuide(rawGuideMd: string): string {
  let md = rawGuideMd;
  for (const name of LAB_ONLY_SECTIONS) {
    md = md.replace(new RegExp(String.raw`^##\s+${name}\b[\s\S]*?(?=^##\s|$(?![\s\S]))`, "gm"), "");
  }
  return `${md.replace(/\n{3,}/g, "\n\n").trim()}\n`;
}
