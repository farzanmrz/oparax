# Oparax

AI agent for professional news reporters. It watches the reporter's beat on X,
catches stories as they break, and drafts ready-to-post tweets in the
reporter's voice. Assistive by default, autonomous by permission.

**Live:** [oparax.ai](https://oparax.ai)

## How it works

1. **Sign up** with email, then **link your X account** — posting happens
   through it, so it's a required gate before creating agents.
2. **Create an agent**: the X handles to watch, what counts as news on your
   beat, drafting instructions, and example tweets that capture your voice.
3. **Run Agent** — a single Grok (xAI) call searches X live and drafts a tweet
   for every distinct story it finds.
4. **Review** story and draft side by side: edit with a live weighted
   character count, redraft with feedback, then save the agent.
5. **Post** any item to X in one click. Every run keeps its stories, drafts,
   cost, and post history.

Planned next: more sources (news websites, Reddit, Bluesky, LinkedIn, Meta's
platforms), scheduled background monitoring with breaking-news notifications
(email / WhatsApp / push), drafts shaped to each destination platform, and an
autonomous mode for trusted agents that posts and notifies after the fact.

## Tech stack

| Layer | Tech |
| ----- | ---- |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4 + in-house design system (`app/globals.css`) |
| Auth & data | Supabase — email auth + Postgres with row-level security |
| AI | Grok (xAI) via the `openai` SDK — live X search + drafting in one call |
| X integration | X API v2 (OAuth tokens encrypted at rest, app-managed refresh) · `twitter-text` weighted counting · `react-tweet` embeds |
| Hosting | Vercel |

## Project structure

```text
app/           # App Router: landing page (all auth modals), dashboard + agents, API routes
components/    # landing/ (design reference) · logo + icons · legacy dashboard UI pending redesign
lib/           # supabase/ clients · auth/ actions · scan/ + draft/ (Grok pipeline) · x/ (tokens) · types/
public/brand/  # exported logo set
AGENTS.md      # contributor/agent instructions: architecture, data model, design system
```

The database schema is managed directly in Supabase (no migrations in-repo);
its current shape is the generated types in `lib/types/database.ts`.

## Getting started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) — npm and yarn are blocked by a preinstall guard

### Setup

```bash
git clone https://github.com/farzanmrz/oparax-chirp.git
cd oparax-chirp
pnpm install
pnpm dev   # → http://localhost:3000
```

### Environment variables

Create `.env.local` at the project root:

```text
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only

# App origin, used in auth redirect links
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Grok (scan + draft)
XAI_API_KEY=...

# X OAuth app (posting) + at-rest token encryption
X_CLIENT_ID=...
X_CLIENT_SECRET=...
X_TOKEN_ENC_KEY=...                  # 32-byte key for AES-256-GCM
```

### Supabase auth configuration

Auth email links are handled by `app/auth/confirm`, which routes users into
the landing-page modals (signup verification → login modal; password recovery
→ reset modal, with the token consumed only on submit). In the Supabase
dashboard:

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
