---
paths:
  - app/**
  - components/**
---

# Design system

- Compose UI only from the two vendored kits — no bespoke CSS classes, no new design primitives, and don't prune either:
  - `components/ui/` — stock shadcn; add components via `pnpm dlx shadcn@latest add <name>` (never hand-edit). Skill: `vercel:shadcn`.
  - `components/ai-elements/` — the chat-surface kit. Skill: `ai-elements`.
- Theme only through `app/globals.css` tokens.
- `auth-shell.tsx` and `logo.tsx` are the only permitted bespoke shared components.
- Design iteration happens in v0 (PRs into `dev`); Claude Code owns function, review, and merges.
