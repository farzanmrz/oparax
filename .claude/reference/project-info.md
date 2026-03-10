# Project Info

## Accounts & Repository

- **GitHub**: `farzanmrz/oparax-chirp`
- **GitHub email**: `farzanmrz@gmail.com`
- **Contributors**: Farzan Mirza (sole contributor)

## Supabase

- Credentials stored in root `.env` and `frontend/.env.local`
- See `.env.local` for project URL and publishable key

## X.com API

- **Endpoint**: `https://api.x.com/2/tweets/search/recent`
- **Credentials** in root `.env`: `X_BEARER_TOKEN`, `X_CONSUMER_KEY`, `X_SECRET_KEY`
- **Frontend experiment scripts**: `frontend/scripts/grok-search.ts`, `frontend/scripts/prompts.ts`

## Vercel

- **Live** at [oparax.com](https://oparax.com)
- Root directory set to `frontend`
- Keep Root Directory as `frontend` (do not switch to repo root)
- Auto-deploys from `main` branch on GitHub push
- Env vars (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) configured
  in Vercel dashboard
- Custom domain: `oparax.com` (GoDaddy DNS —
  A record → Vercel IP, CNAME www → cname.vercel-dns.com)

## Environment Variables

### Root `.env` (Python / X API)

| Variable | Purpose |
| -------- | ------- |
| `X_BEARER_TOKEN` | X API v2 Bearer token |
| `X_CONSUMER_KEY` | X API consumer key |
| `X_SECRET_KEY` | X API consumer secret |

### `frontend/.env.local` (Next.js / Supabase)

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |

## Development Commands

### Preferred (run from repo root)

```bash
pnpm install      # Installs frontend dependencies via root postinstall
pnpm dev          # Dev server at http://localhost:3000 (delegates to frontend/)
pnpm build        # Production build (delegates to frontend/)
pnpm start        # Serve production build (delegates to frontend/)
pnpm lint         # ESLint (delegates to frontend/)
pnpm test         # Run Vitest tests (delegates to frontend/)
pnpm test:watch   # Run Vitest watch mode (delegates to frontend/)
```

### Direct Frontend (also valid)

```bash
cd frontend
pnpm dev
pnpm build
pnpm test
```

### Python (run from root)

```bash
uv sync
```
