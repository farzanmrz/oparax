# Oparax

AI news desk for professional reporters. It watches the reporter's beat,
catches stories as they break, and drafts ready-to-post updates in the
reporter's voice. Assistive by default, autonomous by permission.

**Live:** [oparax.ai](https://oparax.ai) — note: production (`main`) still
serves the previous legacy app until the next dev→main promote. The tree on
`dev` is the bare rebuild baseline described below.

## What exists today

The repo is a deliberately bare baseline being rebuilt one primitive at a time
on [eve](https://github.com/vercel/eve):

- **Auth** — password-only Supabase email auth through plain stub pages
  (`/login`, `/signup`, `/forgot-password`, `/auth/reset-password`).
- **Dashboard** — two entries: Agents and Settings (username, delete account,
  sign out).
- **Agents chat** — a minimal eve chat at `/dashboard/agents`
  (`useEveAgent` + ai-elements). **Localhost only** for now: deployed
  `/eve/v1/*` rejects browser requests until a Supabase-session channel auth
  exists.
- **Eve TUI** — the agent is built and debugged frontend-free with
  `npx eve dev`.

The agent itself is three files in `agent/`: a DeepSeek chat orchestrator and
a Grok xSearch scan tool that searches X for news on the reporter's beat.

## Tech stack

| Layer | Tech |
| ----- | ---- |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| UI | Stock shadcn/ui + vendored ai-elements — no custom design system (design iteration happens in v0) |
| Auth | Supabase — password-only email auth (Postgres app schema: none — the legacy tables are being dropped) |
| Agent | eve `0.18.1` (pinned exact; agent in `agent/`, mounted same-origin by `withEve()`) |
| AI | AI SDK v7 — DeepSeek via AI Gateway (chat orchestrator) + Grok xSearch via `@ai-sdk/xai` (scan tool) |
| Hosting | Vercel |

## Project structure

```text
agent/         # the eve agent: agent.ts (DeepSeek orchestrator) · instructions.md · tools/grok_twitter_search.ts
app/           # landing + auth pages (login, signup, forgot/reset) · auth/confirm route · dashboard/{agents,settings}
components/    # ui/ (stock shadcn) · ai-elements/ (vendored chat components) · logo.tsx (brand mark)
lib/           # supabase/ clients · auth/ server actions · validation
docs/          # triage.md — the deferred-work backlog
CLAUDE.md      # agent instructions: stack, commands, repo map, rules (nested CLAUDE.md files per area)
```

## Getting started

### Prerequisites

- Node.js 24 (pinned via `engines`)
- [pnpm](https://pnpm.io/) — npm and yarn are blocked by a preinstall guard

### Setup

```bash
git clone https://github.com/farzanmrz/oparax-chirp.git
cd oparax-chirp
pnpm install
pnpm dev       # → http://localhost:3000 (Next + eve's dev worker)
npx eve dev    # optional: the eve TUI, frontend-free agent chat
```

### Environment variables

Create `.env.local` at the project root:

```text
# Supabase (auth)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...

# Grok xSearch scan tool (@ai-sdk/xai)
XAI_API_KEY=...

# AI Gateway (DeepSeek chat model) — local dev only; deployed gateway auth is Vercel OIDC
AI_GATEWAY_API_KEY=...
```

### Supabase auth configuration

Auth email links are handled by `app/auth/confirm`, which routes users to the
auth pages: signup verification signs the session back out and lands on
`/login` with a success notice; password recovery forwards to
`/auth/reset-password` with the token consumed only on submit. In the
Supabase dashboard:

1. **Auth → Email Templates** — point the *Confirm signup* and *Reset
   password* links at the confirm route:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
   ```

2. **Auth → URL Configuration** — keep the Site URL aligned with the current
   environment host (`http://localhost:3000` locally, `https://oparax.ai` in
   production) and allow those origins as redirect URLs.

## License

[GNU Affero General Public License v3.0](LICENSE)
