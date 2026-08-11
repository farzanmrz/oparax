# Oparax

Oparax is an AI news desk for reporters: connect an X account and website sources to a desk, and the app watches them, filters what lands on the desk's beat, and drafts posts in the reporter's own voice — measured from their real posting corpus, never hand-authored — surfaced in the app for review. Drafting is automatic; posting is always the reporter's decision. It runs as a Next.js app on Vercel (beta at beta.oparax.ai, production at oparax.ai) with Supabase for data and auth and isolated Railway workers for source polling and ingest.

Feature work moves through a two-app flow where stages split on who is required: the owner plans with Claude (`/ft-plan`, Opus 4.8), Codex authors and labors (`/ft-spec`, `/ft-build`, `/ft-qc`, `/ft-fix`, all on `gpt-5.6-sol` high, with a grok second-opinion lane), and Fable 5 judges at exactly two points (`/ft-gate` on unsure specs, `/ft-judge` on QC findings). The owner walks the result on localhost before `/ft-ship` squashes to `beta`, and closes the issue only after checking production. Work happens on `ft/<issue#>` branches; verbose artifacts live in local `.feature/` files, and the issue carries only the stub, the approved decisions, and one QC marker per round.

Bug fixes run the bf flow on `bf/<issue#>` branches, tiered by weight (`tier:` header in the brief): `/bf-plan` (Claude, Sonnet 5 or Opus 4.8) captures evidence before any code and authors the brief plus test charter; quick and small tiers close with the owner in that session (small adds low-dial grok + Codex critiques), while deep fires high-dial critiques and hands to `/bf-adj` (Fable 5, fresh cold session) which adjudicates, presents, writes the issue, and cuts the branch. `/bf-fix` (Codex) executes and re-proves the exact repro (small tier embeds its charter QC); deep adds `/bf-qc` (Codex) and `/bf-judge` (Fable 5). `/bf-ship` lands onto `beta`, or onto `main` as a hotfix with a beta cherry-pick; the owner walks localhost, checks production, and closes.

Issues are labeled, and the label routes the work:

| Label | Meaning | Flow |
| --- | --- | --- |
| `bug` | Existing behavior or data integrity is wrong | the bf flow above: `/bf-plan` → (`/bf-adj` deep) → `/bf-fix` → (`/bf-qc` → `/bf-judge` deep) → `/bf-ship` |
| `feature` | New customer-facing capability | the ft flow above |
| `cleanup` | Removal, simplification, dead code | ft flow minus design stages |
| `meta` | Skills, agent workflow, repository process | direct on `beta` (owner-directed) |
| `docs` | Documentation-only work | direct on `beta` |

- `DESIGN.md` is the visual contract: the design system every UI change aligns to.
- Frontend test login: `testuser@oparax.ai` / `hello123` — an agentic-test-only dummy account; owner-requested browser login is pre-authorized.
