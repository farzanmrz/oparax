---
name: ui-ux-pro-max
description: "UX and stack-conventions lookup for reviewing UI in this repo: 98 UX guidelines (accessibility, touch targets, states, motion, performance) plus per-stack guidelines for Next.js, React, shadcn/ui and Tailwind. Query it for a severity-tagged Do/Don't rule to cite when judging a UI surface. NOT a design-system generator — this repo's plans are [design: reuse] and never invent visual systems."
---

# UI/UX Pro Max — UX rules lookup

**Trimmed for oparax, 2026-07-30: 1.8 MB → 412 KB.** What survives is what this repo can
act on — `--domain ux`, `--domain gsap`, and `--stack {nextjs,react,shadcn,html-tailwind}`.
The picker in `scripts/search.py` is generated from the files that exist, so an unavailable
choice is rejected by argparse rather than failing later as "File not found".

Deleted, deliberately: the 18 stacks this repo does not target (SwiftUI, Flutter, WPF,
WinUI, JavaFX, Avalonia, Uno, UWP, Three.js, Laravel, Angular, Vue, Svelte, Astro,
Nuxt, React Native, Jetpack Compose), and the design-**generation** corpus — 743 KB of
Google Fonts plus the colors, typography, styles, products, icons, charts and landing
CSVs. This repo's plans carry `[design: reuse]`: no new visual patterns and no new
spacing/radius/colour decisions, so a font-pairing or palette generator has nothing to
contribute here. The `--design-system` flag is inert as a result; don't reach for it.

**This is a source of rules to cite, not an aesthetic authority.** The binding yardstick
for any UI review in this repo is the plan's own `[design: reuse]` contract plus AGENTS.md's
UI copy rules — see `feature-find`'s design critic, which is this skill's one live caller.

**This skill is not invoked directly — `feature-find`'s design critic calls the
script by path.** Zero direct invocations across 104 recorded sessions, so the
upstream rule tables that used to sit here (14 KB) were removed rather than
carried in every session's skill listing. The database they described is intact
and queryable:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack shadcn   # or nextjs, react, html-tailwind
```

`references/quick-reference.md` and `references/pro-rules.md` still hold the full
rule text — read them on demand, never by default.
