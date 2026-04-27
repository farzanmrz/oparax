# Product Vision

Oparax is an AI-powered social media automation platform. It monitors sources for breaking information, drafts posts in the user's authentic voice, and presents them for review.

> **MVP user:** A football news reporter with 400k+ followers on X.

---

## Part 1 — Current Scope & MVP

### Core Loop

```
  Trigger (every 30-60 min)
        │
        ▼
  Grok 4.2 + X.com Search ──→ No new news? ──→ Wait ──→ ↑
        │
        ▼ (new news found)
  Draft tweet in user's voice
        │
        ▼
  User reviews ──→ Approve / Edit ──→ Post to X
        │
        └──→ Discard
```

### News Detection

| Approach | Status |
| -------- | ------ |
| X API v2 (`retrieve post`, filtered stream) | Explored, shelved — too complex |
| **Grok 4.1** + X.com search tool | **Active experiment** |
| **Grok 4.1** + web search tool | Planned next |

**Why Grok 4.1?** Its reasoning model understands relevance natively (not just keyword-matching), and the X.com search tool gives real-time access without managing stream connections.

### Voice Model

Output should be **indistinguishable** from the user's own writing. Shaped by three layers:

1. **Writing style** — Learned from actual past posts (structure, tone, word choice, emoji usage)
2. **Beliefs & perspective** — The user's opinions and editorial angle
3. **Notes & guidance** — Explicit instructions that evolve over time

> Improves continuously — accepted, edited, and rejected drafts all feed back.

### Build Status

**Done:**

- Email/password auth (Supabase)
- Login/signup UI (shadcn Nova theme, Nunito Sans font)
- Vercel deployment at oparax.com

**Next up:**

- X.com OAuth (required for posting on behalf of user)
- Dashboard and draft review UI
- Grok 4.2 integration for news detection
- Automated trigger (scheduled job every 30-60 min)

---

## Part 2 — The Bigger Vision

Oparax becomes a **brand automation platform**. Companies and digital marketing agencies use it to manage their online presence across every platform — automated posting, engagement, and content generation, all in their configured voice and guidelines.

### What It Does

- **Automated posting** — Given context or triggered by news/events, Oparax drafts and posts across all platforms, adapted to each platform's conventions
- **Engagement automation** — Triggers like *"engage with this user on X.com"* or *"reply to mentions matching this topic"*
- **Writing styles & guidelines** — Each brand/user configures their voice, tone, do's and don'ts — the system follows them strictly
- **Trigger-based reactions** — Set up backend triggers that fire when specific events happen (news breaks, competitor posts, market moves)

### Source Aggregation

```
  Social media search (X, Threads, LinkedIn, etc.)
  News sites & press releases
  LLM web search
  Official search (Google, Bing, etc.)
        │
        ▼
  ┌─────────────────┐       ┌──────────────────┐
  │  Aggregate &    │       │  X (Twitter)     │
  │  Filter         │       │  Instagram       │
  │       ↓         │ ────→ │  Threads         │
  │  Draft per-     │       │  LinkedIn        │
  │  platform       │       │  Bluesky         │
  └─────────────────┘       │  ...others       │
                            └──────────────────┘
```

### Target Users

- **Individual reporters/creators** — The MVP use case, scaled up
- **Digital marketing agencies** — Managing multiple brand accounts across platforms
- **Companies** — Automating their social media presence with consistent branding
