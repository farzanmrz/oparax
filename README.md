# Oparax

AI-powered social media automation for professional news reporters.
Monitors news sources on X, surfaces breaking stories,
and drafts posts in the user's voice.

**Live:** [oparax.com](https://oparax.com)

## Motivation

Built around a validated use case: a football news reporter
with 400k+ followers on X (~$1,400/month from social media)
manually monitors dozens of accounts and news sources
to catch breaking stories before competitors.
Customer research was conducted before any code was written.

## Roadmap

Two independent pipelines planned:

- **Pipeline A (News Intelligence):** Monitor X accounts,
  cluster by topic, assess newsworthiness, alert user.
  Currently in Phase 1: X API experimentation.
- **Pipeline B (Content Generation):** Learn user writing
  style from past posts, draft in their voice,
  feedback loop, auto-post. Not started yet.

## Tech Stack

| Category | Tool | Version |
| -------- | ---- | ------- |
| Framework | Next.js (App Router) | 16.1.6 |
| UI Library | React | 19.2.3 |
| Language | TypeScript | 5.9.3 |
| Styling | Tailwind CSS v4 | 4.2.0 |
| Components | shadcn/ui (Nova style) | 3.8.5 |
| Icons | Hugeicons | 1.1.5 |
| Auth & Database | Supabase | 2.97.0 |
| Testing | Vitest + RTL | 4.0.18 |
| Social API | X API v2 | - |
| Intelligence | Grok API | planned |
| Content Gen | Claude API | planned |
| Deployment | Vercel | - |
| Python | Python + uv | 3.11+ |

## Project Structure

```text
oparax-chirp/
├── frontend/            # Next.js app
│   ├── app/             # Pages and routes (App Router)
│   │   ├── login/       # Login page + server action
│   │   ├── signup/      # Signup page + server action
│   │   ├── dashboard/   # Protected dashboard
│   │   └── auth/        # Email verification handler
│   ├── components/      # shadcn/ui components
│   ├── lib/             # Supabase clients, validation
│   └── __tests__/       # Vitest unit tests
├── scripts/             # Project scripts (PNPM guard, Python experiments)
├── .claude/             # Claude Code config + reference
├── CLAUDE.md            # Claude Code project instructions
├── pyproject.toml       # Python dependencies (uv)
└── .env                 # API credentials (git-ignored)
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- [uv](https://docs.astral.sh/uv/) — Python package manager
- [pnpm](https://pnpm.io/) — Node.js package manager

### Setup

```bash
# Clone the repo
git clone https://github.com/farzanmrz/oparax-chirp.git
cd oparax-chirp

# Install Python dependencies
uv sync

# Install JS dependencies (delegates to frontend/)
pnpm install

# Start frontend dev server (delegates to frontend/)
pnpm dev
```

The frontend dev server runs at `http://localhost:3000`.

### Direct Frontend Commands (Optional)

You can still run frontend commands directly:

```bash
cd frontend
pnpm dev
pnpm build
pnpm test
```

### Environment Variables

Create `.env` at the project root:

```text
X_BEARER_TOKEN=your_x_api_token
X_CONSUMER_KEY=your_consumer_key
X_SECRET_KEY=your_secret_key
```

Create `frontend/.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

### Running Tests

```bash
pnpm test         # Single run (root wrapper)
pnpm test:watch   # Watch mode (root wrapper)
```

## Coding Agents

- **Claude Code:** Uses [`CLAUDE.md`](CLAUDE.md)
  for project context, with detailed reference docs
  in `.claude/reference/`

## License

[GNU Affero General Public License v3.0](LICENSE)
