---
paths:
  - "components/**"
  - "app/**/*.tsx"
---

# UI components

## Copy & form conventions — owner hard rule, no exceptions (canonical: AGENTS.md)

Applies to ALL user-facing UI here, overriding the imported design mock:
1. **Sentence case only — never ALL-CAPS.** No `uppercase` utility, no `text-transform: uppercase`, no ALL-CAPS literals — in labels, section headers, badges, eyebrows, buttons, table headers. First word capitalized; keep `X`/`AI`/`Slack` as written.
2. **No eyebrow/kicker headers** — never a small muted category label stacked *above* a title (e.g. "New desk" over "Create desk"); a header is one line. A meaningful description *below* a title (a `DialogDescription`) is fine; a redundant category label above it is not.
3. **Uniform form fields** — every field shares one treatment; a "coming soon" field is greyed (opacity) + a badge, never wrapped in a special bordered/dashed box that makes it structurally different from active fields.

- `vercel:shadcn` when composing or adding any shadcn primitive (`components/ui/**`, or any `.tsx` under `app/` that uses one).
- `ai-elements` when touching the chat-surface kit itself (`components/ai-elements/**`) or its consuming surface, `app/agents/new/**`.

## Greying: what earns a greyed control, and what doesn't

The feed-first/no-sidebar decision and the "container holds the future" principle are in `AGENTS.md`. The rule that bites here:

- **Grey a control that is specified and coming; draw nothing for a stage that isn't.** Greying communicates a promise, so an unspecified future stage gets no control at all. There is deliberately no greyed control anywhere for a capability with no named shape.
- A greyed surface is **reduced opacity + a "Coming soon" badge + `disabled`** — never a special bordered or dashed container that makes it structurally different from the active fields (`AGENTS.md`'s uniform-fields rule). `app/agents/[id]/setup/sources-card.tsx` is the reference implementation; match it rather than inventing a second treatment.

## `components/ui/` and `components/ai-elements/` are vendored

- Hand-editing a vendored file in place gets silently overwritten on the next re-add/upgrade from its registry — wrap or extend instead of editing in place.
- `components/ui/alert-dialog.tsx` is the stock shadcn primitive, vendored like every other `components/ui/**` file — its one consumer, `app/agents/[id]/desk-controls.tsx`, uses it unmodified for the irreversible delete-desk confirm (the reversible pause/resume confirm uses the plain `Dialog` instead — see that file's own comment for the reversible/irreversible split).
