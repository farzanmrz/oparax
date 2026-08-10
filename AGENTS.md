# Oparax

Oparax is an AI news desk for reporters: connect an X account and website sources to a desk, and the app watches them, filters what lands on the desk's beat, and drafts posts in the reporter's own voice — measured from their real posting corpus, never hand-authored — delivered to Slack for review. Drafting is automatic; posting is always the reporter's decision. It runs as a Next.js app on Vercel (beta at beta.oparax.ai, production at oparax.ai) with Supabase for data and auth and isolated Railway workers for source polling and ingest.

Feature work moves through a two-app flow where stages split on who is required: the owner plans with Claude (`/ft-plan`, Opus 4.8), Codex authors and labors (`/ft-spec`, `/ft-build`, `/ft-qc`, `/ft-fix`, all on `gpt-5.6-sol` high, with a grok second-opinion lane), and Fable 5 judges at exactly two points (`/ft-gate` on unsure specs, `/ft-judge` on QC findings). The owner walks the result on localhost before `/ft-ship` squashes to `beta`, and closes the issue only after checking production. Work happens on `ft/<issue#>` branches; verbose artifacts live in local `.feature/` files, and the issue carries only the stub, the approved decisions, and one QC marker per round.

Issues are labeled, and the label routes the work:

| Label | Meaning | Flow |
| --- | --- | --- |
| `bug` | Existing behavior or data integrity is wrong | bf flow (fast: branch, fix, prove the broken path, ship) |
| `feature` | New customer-facing capability | the ft flow above |
| `cleanup` | Removal, simplification, dead code | ft flow minus design stages |
| `meta` | Skills, agent workflow, repository process | direct on `beta` (owner-directed) |
| `docs` | Documentation-only work | direct on `beta` |

- `DESIGN.md` is the visual contract: the design system every UI change aligns to.
- Frontend test login: `testuser@oparax.ai` / `hello123` — an agentic-test-only dummy account; owner-requested browser login is pre-authorized.

### Dormant: switched off, not missing

Don't rebuild them; rows name their lever or reactivation condition. (Temporary section: the dormant-code-removal slice deletes this table when it ships.)

| Capability | Lever | Where |
| --- | --- | --- |
| LinkedIn / Bluesky drafting | `PLATFORMS` plus per-platform pipeline drafting | `lib/agent/desk-config.ts` |
| Story clustering (many posts → one story) | `CLUSTERING_ENABLED` | `lib/agent/cluster.ts` |
| Email draft delivery + reply-to-correct | `EMAIL_DELIVERY_ENABLED` | `lib/agent/draft-pipeline.ts` |
| Auto-post (post without review) | `AUTO_POST_ENABLED` | `lib/agent/desk-config.ts` |
| Council history UI on draft cards | Mount `<CouncilDialog>` in `DraftBox` (currently deferred) | `app/agents/[id]/council-dialog.tsx` |
