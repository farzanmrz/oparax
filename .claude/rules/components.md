---
paths:
  - "components/**"
  - "app/**/*.tsx"
---

# UI components

Skills: `vercel:shadcn` when composing or adding any shadcn primitive;
`ai-elements` when touching the chat-surface kit or its consuming surface,
`app/agents/new/**`.

**AGENTS.md's three UI copy & form rules are canonical and always loaded — sentence
case only, no eyebrow headers, uniform form fields.** They are not restated here; a
rule stated twice diverges.

## Vocabulary: "agent" in copy, "desk" in code

Every string a user reads says **agent** — "New agent", "Your agents", "Put an AI news
agent on your beat". Identifiers, props and filenames stay `desk`/`Desk` —
`DeskSwitcher`, `deskDisplayName`, `createDesk`, the `[id]` route's internals.

The split is deliberate, not drift: renaming the internals would touch every module
for no user-visible gain. **Never introduce "desk" into rendered copy.** When a
docstring describes rendered copy, quote what the button actually says — one in
`desk-switcher.tsx` claimed `"+ New desk"` while the button read "New agent".

## Greying: what earns a greyed control

The feed-first / no-sidebar decision and "the container holds the future" are in
AGENTS.md. The rule that bites here:

- **Grey a control that is specified and coming; draw nothing for a stage that isn't.**
  Greying communicates a promise, so an unspecified future stage gets no control at
  all.
- A greyed surface is **reduced opacity + a "Coming soon" badge + `disabled`** — never
  a bordered or dashed container that makes it structurally different from the active
  fields. `app/agents/[id]/setup/sources-card.tsx` is the reference implementation;
  match it rather than inventing a second treatment.

## `components/ui/` and `components/ai-elements/` are vendored

Hand-editing a vendored file gets silently overwritten on the next re-add or upgrade
from its registry. **Wrap or extend; never edit in place.**

`components/ui/alert-dialog.tsx` is stock shadcn, vendored like the rest. Its one
consumer, `app/agents/[id]/desk-controls.tsx`, uses it unmodified for the
*irreversible* delete-desk confirm; the *reversible* pause/resume confirm uses a plain
`Dialog`. That file's comment explains the split.
