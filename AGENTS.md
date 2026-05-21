# Project Overview

Oparax is an AI-powered social media automation tool for professional news reporters. It monitors X (Twitter) for breaking stories and drafts posts in the user's voice. The primary use case is a football news reporter with 400k+ followers on X.

## Project Structure

Next.js App Router app at the repo root.

```text
.
├── package.json                      # Deps + scripts (pnpm dev / build / lint)
├── next.config.ts                    # Next.js config
├── components.json                   # shadcn config
├── tsconfig.json                     # TypeScript config (strict, @/* alias)
│
├── app/                              # App Router routes
│   ├── page.tsx                      # / — redirects to /login
│   ├── layout.tsx                    # Root layout (fonts, providers, Toaster)
│   ├── globals.css                   # Tailwind v4 theme (@theme inline)
│   │
│   ├── login/                        # Email + password sign-in
│   ├── signup/
│   │   └── check-email/              # Post-signup "verify your inbox" screen
│   ├── auth/
│   │   ├── confirm/                  # Email verification handler (token → session)
│   │   └── reset-password/           # Password reset form (after clicking reset link)
│   ├── forgot-password/              # Email-entry form to start password reset
│   │
│   ├── dashboard/                    # Protected — auth guard lives in dashboard/layout.tsx
│   │   ├── settings/                 # Account settings (sign out, etc.)
│   │   └── workflows/
│   │       ├── new/                  # Workflow creation form + streaming test scan
│   │       └── [id]/                 # Workflow detail — trigger panel + scan history
│   │
│   └── api/
│       ├── scan/route.ts             # POST — streams Grok x_search via SSE
│       └── draft/route.ts            # POST — generates draft tweets from a knowledge bank
│
├── components/
│   ├── ui/                           # shadcn primitives (button, card, input, table, sidebar, ...)
│   │
│   ├── app-sidebar.tsx               # Sidebar shell (logo + nav + user dropdown)
│   ├── nav-main.tsx                  # Sidebar nav with active-route state
│   ├── nav-user.tsx                  # User dropdown (avatar + sign out)
│   │
│   ├── login-form.tsx                # Auth forms — paired with their route's actions.ts
│   ├── signup-form.tsx
│   ├── forgot-password-form.tsx
│   ├── reset-password-form.tsx
│   ├── submit-button.tsx             # Shared submit button with pending state
│   │
│   ├── workflow-card.tsx             # Workflow tile on the dashboard list
│   ├── workflow-drafting-studio.tsx  # Top-level drafting UI on workflows/[id]
│   ├── stepper.tsx                   # Multi-step progress indicator inside the studio
│   ├── handle-input.tsx              # @handle chip input (uses lib/scan-constraints)
│   │
│   ├── knowledge-bank-panel.tsx      # Renders parsed KnowledgeBank from a scan run
│   ├── draft-profile-editor.tsx      # Edits the DraftingProfile (instructions + examples)
│   ├── draft-preview-panel.tsx       # Live preview of generated draft tweets
│   ├── tweet-url-grid.tsx            # Grid of source tweet URLs with react-tweet embeds
│   ├── scan-result.tsx               # Renders Grok output — parses citations, embeds tweets via react-tweet
│   └── stored-scan-output.tsx        # Renders historical scan-run output (handles legacy + new schema)
│
├── lib/                              # Domain logic
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client (RSC + server actions)
│   │   └── middleware.ts             # Session-refresh utility (called by proxy.ts)
│   ├── xai.ts                        # Grok client (openai SDK → api.x.ai/v1) + response-text extractor
│   ├── prompts.ts                    # AI prompts — convention: sysprompt_<id> / usrprompt_<id>
│   ├── workflow-drafting.ts          # KnowledgeBank/DraftedTweet types, parsers, localStorage persistence
│   ├── scan-constraints.ts           # Handle regex + MAX_HANDLES (shared by api/scan + workflows/new)
│   ├── validation.ts                 # validateAuthForm / validateSignupForm
│   ├── auth-errors.ts                # mapAuthError() — Supabase error → user message
│   └── utils.ts                      # cn() class-merging helper
│
├── hooks/                            # use-mobile.ts (responsive viewport helper)
├── public/                           # Static assets
│
├── scripts/
│   ├── enforce-pnpm.cjs              # Preinstall guard — blocks npm/yarn
│   ├── grok-search.ts                # Personal Grok scratchpad (manual iteration — leave alone)
│   └── prompts.ts                    # Scratchpad prompts for grok-search.ts only — unrelated to lib/prompts.ts
│
└── proxy.ts                          # Next.js per-request hook — refreshes Supabase session.
                                      # MISLEADINGLY NAMED: NOT Supabase middleware (that's lib/supabase/middleware.ts)
```

### Notes

- **Auth flow.** Sign-up walks the user through three pages: `signup/` (form posts to its colocated `actions.ts`, which calls Supabase `signUp`), `signup/check-email/` (static "we sent you a verification email" screen), and `auth/confirm/` (handles the magic-link token Supabase emails, exchanges it for a session, and redirects to `/dashboard`). Password reset flows similarly: `forgot-password/` (request email) → magic link → `auth/reset-password/` (set new password). Each flow's form lives in `components/<flow>-form.tsx` and submits to its route's `actions.ts`.

- **Drafting studio composition.** `workflow-drafting-studio.tsx` is the entry point rendered on `dashboard/workflows/[id]/`. It composes `knowledge-bank-panel`, `draft-profile-editor`, `draft-preview-panel`, `tweet-url-grid`, and `stepper.tsx` into the multi-step drafting UI. Shared state types and the localStorage persistence layer live in `lib/workflow-drafting.ts`.
