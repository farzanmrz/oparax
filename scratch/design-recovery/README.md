# Four paired Oparax design previews

September 30, 2026. Current preview: http://localhost:3100/. The real product remains on http://localhost:3000/.

After reboot, from the repository root, run:

```sh
python3 scratch/design-recovery/start-preview.py
```

Use the floating controls for directions 1-4 and Landing/Feed. Each starts dark, with a light switch. Direct Feed summarizes one source item; Clustered Feed brings related reports together. These are historical sample cards, not live Qwen output or an authenticated product.

## Latest owner correction and current result

The extreme plum/coral, teal/gold, mint/cobalt and amber experiments were rejected. Their active overrides are removed. The original navy, white and blue palette is restored. Direction 1 is the exact baseline; 2 adds only a faint blue glow, 3 a slight cool background tint, and 4 crisper borders/shadows. No colored story slabs or source rails.

The four fixed sans-serif candidates remain Hanken Grotesk, Inter, Manrope and Source Sans 3. Hanken Grotesk was used in the earlier liked Signal Flow and Working Monitor previews. None is permanently locked.

The roadmap shows the selected 13 source platforms on the left and X, WhatsApp, Slack, SMS and Email delivery on the right. Official artwork appears directly on the page, preserving its own colors and background, with no generic white tile. GitHub and Product Hunt also use official artwork wherever represented. Email and SMS use generic icons.

The X conversation is black in both page themes, with a gray incoming message and the real Oparax sender avatar. Its styling is a recognizable depiction, not a verified pixel-perfect copy of current X.

Doubled margins remain 56px desktop and 32px mobile. Feed pages are called Your feed and have no topic subsections. The four liked arrangements remain.

## Continuity and decisions

- owner-brief.md: chronological owner preferences, newest correction last.
- council-palette-reset/brief.md: latest verbatim request and cumulative context.
- council-palette-reset/summary.md: six-model regular council, disagreements and host decisions.
- opus-palette-reset, opus-roadmap-reset, opus-delivery-reset: separate screenshot-informed Opus decisions.
- opus-rendered-reset: final screenshot-informed Opus adjudication after implementation.
- site/public/roadmap-brands/PROVENANCE.md: official artwork sources.
- evidence/reset*: current screenshots. Use evidence/settled2-dark.png through settled4-dark.png for hydrated dark captures, and settled-pricing-dark.png for dark pricing. Older captures remain only as review evidence, not active alternatives.
- opus-capture-confirmation: bounded final confirmation of the corrected dark captures.

Everything is saved under this visible scratch folder. The production code, DESIGN.md and permanent theme tokens are unchanged. No feature build, amendment or formal QC was launched.

All requested council and Opus reviews are complete. Final Opus confirmation found no blocker to owner review. Browser checks and TypeScript passed; preview now uses port 3100 alongside the product on 3000.
