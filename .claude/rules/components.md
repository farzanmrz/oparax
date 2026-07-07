---
paths:
  - "components/**"
  - "app/**/*.tsx"
---

# UI components

`vercel:shadcn` when composing or adding any shadcn primitive
(`components/ui/**`, or any `.tsx` under `app/` that uses one).

`ai-elements` when touching the chat-surface kit itself
(`components/ai-elements/**`) or its two consuming surfaces: the create-agent
chat (`app/agents/new/**`) and the per-agent dashboard's Activity tab
(`app/agents/[id]/**`, which also renders `ai-elements`' `Task` component).

## `components/ui/` and `components/ai-elements/` are vendored — extend, don't fork

Both are installed via the shadcn CLI (`components.json`: `style:
"radix-nova"`, `iconLibrary: "hugeicons"`) and v0-designed. Hand-editing a
vendored primitive in place gets silently overwritten the next time it's
re-added/upgraded from its registry — wrap or extend instead of editing in
place, and only touch a vendored file directly when a task genuinely requires
it (there is no registry entry for a one-off change).
