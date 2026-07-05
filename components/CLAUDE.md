# components/

- `ui/` — stock shadcn, installed via CLI (`pnpm dlx shadcn@latest add <name>`). Skill: `vercel:shadcn`. Never hand-edit; re-add/regenerate via the CLI instead.
- `ai-elements/` — the vendored ai-elements kit (conversation, message, prompt-input, tool rendering, …). Skill: `ai-elements`. The full kit is kept deliberately even though the chat uses a handful — v0 and future surfaces compose from what exists here; don't prune.
- `auth-shell.tsx`, `logo.tsx` — the only bespoke shared components: the auth-page frame and the inline-SVG Oparax "orbit" mark (draws with `currentColor`; the wordmark is always plain text next to it, never an image).

Hard guard: no new design primitives, no custom CSS classes — compose from the two kits; theming only via `app/globals.css` tokens.
