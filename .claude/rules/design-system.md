---
paths:
  - app/**
  - components/**
---

# Design system

- **No custom design system.** Compose UI from stock shadcn (`components/ui/`) + the vendored ai-elements (`components/ai-elements/`) ONLY — no bespoke CSS classes, no new design primitives.
- Theme changes go through `app/globals.css` tokens only.
- Add shadcn components via the CLI — `pnpm dlx shadcn@latest add <name>` — which reads root `components.json` (style, aliases, css entry). Never hand-edit `components/ui/`; re-add via the CLI instead.
- The full ai-elements kit is vendored deliberately even though the chat uses a handful — v0 and future surfaces compose from what exists here; don't prune.
- `auth-shell.tsx` and `logo.tsx` are the only bespoke shared components (the auth-page frame; the inline-SVG orbit mark drawing with `currentColor` — the wordmark is always plain text next to it, never an image).
- Design iteration happens in v0 (each chat commits to its own `v0/*` branch, PRs into `dev`); Claude Code owns function, review, and merges.
- Skills: `vercel:shadcn` for shadcn work; `ai-elements` for chat-surface work.
