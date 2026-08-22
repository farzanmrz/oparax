---
name: ui-ux-pro-max
description: "UX and stack-conventions lookup for reviewing UI in this repo: 98 UX guidelines (accessibility, touch targets, states, motion, performance) plus per-stack guidelines for Next.js, React, shadcn/ui and Tailwind. Query it for a severity-tagged Do/Don't rule to cite when judging a UI surface. NOT a design-system generator: this repo's plans align new UI to the app's existing aesthetic rather than inventing visual systems from scratch."
---

# UI/UX Pro Max: UX rules lookup

A queryable rules database trimmed to what this repo can act on: `--domain ux`,
`--domain gsap`, and `--stack {nextjs,react,shadcn,html-tailwind}`. The picker
in `scripts/search.py` is generated from the files that exist, so an
unavailable choice is rejected by argparse rather than failing later as "File
not found".

* **No live flow caller:** QC's screenshot judgment, formerly the one
  caller, was retired with all in-flow browser runs; query this manually
  when reviewing UI.
* **A source of rules to cite, not an aesthetic authority:** the binding
  yardstick for any UI review in this repo is the plan's own stated design
  intent plus root `DESIGN.md`.
* **`--design-system` is inert; don't reach for it.** The design-generation
  corpus (fonts, colors, typography, styles, products, icons, charts, landing
  CSVs) and the non-target stacks were deleted: plans here align to the
  app's existing aesthetic, so a palette or font-pairing generator has
  nothing to contribute.

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
