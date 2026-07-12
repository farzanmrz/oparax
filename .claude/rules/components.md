---
paths:
  - "components/**"
  - "app/**/*.tsx"
---

# UI components

- `vercel:shadcn` when composing or adding any shadcn primitive (`components/ui/**`, or any `.tsx` under `app/` that uses one).
- `ai-elements` when touching the chat-surface kit itself (`components/ai-elements/**`) or its two consuming surfaces: `app/agents/new/**` and `app/agents/[id]/**`.

## `components/ui/` and `components/ai-elements/` are vendored

- Hand-editing a vendored file in place gets silently overwritten on the next re-add/upgrade from its registry — wrap or extend instead of editing in place.
- `components/sidebar-peek.tsx` is the wrap-not-edit precedent (layers hover-peek over the stock sidebar from outside). The one deliberate in-place deviation is `components/ui/sidebar.tsx`'s Hugeicons trigger-icon swap — intentional, and must be re-applied if the primitive is ever re-added from the registry.
