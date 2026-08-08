# Oparax

Oparax is an AI news desk for reporters: connect an X account and website sources to a desk, and the app watches them, filters what lands on the desk's beat, and drafts posts in the reporter's own voice — measured from their real posting corpus, never hand-authored — delivered to Slack for review. Drafting is automatic; posting is always the reporter's decision. It runs as a Next.js app on Vercel (beta at beta.oparax.ai, production at oparax.ai) with Supabase for data and auth and isolated Railway workers for source polling and ingest.

Feature work moves through a cross-model flow: ideas are stubbed and specced in Claude Code (`/ft-plan`, `/ft-spec`), built in Codex (`/ft-build`), QC'd across both apps plus external review lanes — codex, grok, agy, cline — (`/ft-qc`: find → browse → fix), and shipped (`/ft-ship`) as one squashed commit to `beta`, then promoted to `main`. The GitHub issue holds the spec and the durable QC record; work happens on `ft/<issue#>` branches.

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
