---
paths:
  - app/**
  - proxy.ts
---

# App routes

- Invoke `vercel:nextjs` before routing / Server Component / Server Action work.
- **Never move or rename `app/auth/confirm/`** — `/auth/confirm` is hardcoded in the Supabase email templates.
- Structure and route detail: `.claude/references/app.md`.
