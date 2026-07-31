---
name: ui-ux-pro-max
description: "UX and stack-conventions lookup for reviewing UI in this repo: 98 UX guidelines (accessibility, touch targets, states, motion, performance) plus per-stack guidelines for Next.js, React, shadcn/ui and Tailwind. Query it for a severity-tagged Do/Don't rule to cite when judging a UI surface. NOT a design-system generator: this repo's plans are [design: reuse] and never invent visual systems."
---

# UI/UX Pro Max: UX rules lookup

A queryable rules database trimmed to what this repo can act on: `--domain ux`,
`--domain gsap`, and `--stack {nextjs,react,shadcn,html-tailwind}`. The picker
in `scripts/search.py` is generated from the files that exist, so an
unavailable choice is rejected by argparse rather than failing later as "File
not found".

* **Not invoked directly:** `feature-find`'s design critic (this skill's one
  live caller) calls the script by path.
* **A source of rules to cite, not an aesthetic authority:** the binding
  yardstick for any UI review in this repo is the plan's own `[design: reuse]`
  contract plus the repo's UI copy rules (see `feature-find`'s design critic).
* **`--design-system` is inert; don't reach for it.** The design-generation
  corpus (fonts, colors, typography, styles, products, icons, charts, landing
  CSVs) and the non-target stacks were deleted: `[design: reuse]` plans give a
  palette or font-pairing generator nothing to contribute here.

## Query

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
```

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack shadcn
```

`--stack` also accepts `nextjs`, `react`, and `html-tailwind`.

## References

* **`references/quick-reference.md` and `references/pro-rules.md`** hold the
  full rule text: read them on demand, never by default.
