---
paths:
  - app/**
  - components/**
---

# Design system

- **No custom design system.** Compose UI from stock shadcn (`components/ui/`) and the vendored ai-elements (`components/ai-elements/`) only — no bespoke CSS classes, no new design primitives.
- Theme changes go through `app/globals.css` tokens only.
- Add shadcn components via the CLI (never hand-edit `components/ui/`):
  ```bash
  pnpm dlx shadcn@latest add <name>
  ```
- Don't prune the vendored ai-elements kit — the full set is kept deliberately for v0 and future surfaces.
- `auth-shell.tsx` and `logo.tsx` are the only permitted bespoke shared components.
- Design iteration happens in v0 (PRs into `dev`); Claude Code owns function, review, and merges.
- Skills: `vercel:shadcn` for shadcn work; `ai-elements` for chat-surface work.
