---
paths:
  - app/**
  - components/**
---

# Design system

- No custom design system: compose UI only from `components/ui/` (stock shadcn) and `components/ai-elements/` (vendored) — no bespoke CSS classes, no new design primitives, and don't prune either kit.
- Theme only through `app/globals.css` tokens.
- `auth-shell.tsx` and `logo.tsx` are the only permitted bespoke shared components.
- Skills: `vercel:shadcn` for shadcn; `ai-elements` for the chat surface.
