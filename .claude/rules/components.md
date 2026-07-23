---
paths:
  - "components/**"
  - "app/**/*.tsx"
---

# UI components

- `vercel:shadcn` when composing or adding any shadcn primitive (`components/ui/**`, or any `.tsx` under `app/` that uses one).
- `ai-elements` when touching the chat-surface kit itself (`components/ai-elements/**`) or its consuming surface, `app/agents/new/**`.

## `components/ui/` and `components/ai-elements/` are vendored

- Hand-editing a vendored file in place gets silently overwritten on the next re-add/upgrade from its registry — wrap or extend instead of editing in place.
- `components/ui/alert-dialog.tsx` is the stock shadcn primitive, vendored like every other `components/ui/**` file — its one consumer, `app/agents/[id]/desk-controls.tsx`, uses it unmodified for the irreversible delete-desk confirm (the reversible pause/resume confirm uses the plain `Dialog` instead — see that file's own comment for the reversible/irreversible split).
