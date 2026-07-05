---
paths:
  - app/**
  - proxy.ts
---

# App routes

- Invoke `vercel:nextjs` before routing / Server Component / Server Action work.
- App Router: a folder = a URL segment, its `page.tsx`/`route.ts` = what's served. Each distinct URL is its own folder.
- **Never move or rename `app/auth/confirm/`** — `/auth/confirm` is hardcoded in the Supabase email templates.
- Root `proxy.ts` (Next 16's renamed middleware) refreshes the Supabase session on every request; its logic lives in `lib/supabase/middleware.ts`.
