# Supabase auth setup (dashboard-side configuration)

The app-side flow: auth email links land on `/auth/confirm`
(`app/(auth)/auth/confirm/route.ts`), which routes users onward — signup
verification signs the session back out and lands on `/login` with a success
notice; password recovery forwards to `/auth/reset-password` with the token
consumed only on submit.

For that to work, the Supabase dashboard must be configured as follows.

## 1. Auth → Email Templates

Point the *Confirm signup* and *Reset password* links at the confirm route:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

## 2. Auth → URL Configuration

Keep the Site URL aligned with the current environment host
(`http://localhost:3000` locally, `https://oparax.ai` in production) and allow
those origins as redirect URLs.

## Fresh-clone env setup

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
