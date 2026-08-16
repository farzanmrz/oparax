# Oparax

The owner is a technical AI engineer who is vibe-coding this entire project: he does not know TypeScript, Next.js, or the web-stack machinery underneath it. Every explanation, every surfaced decision, and every skill or doc written for him states things in plain product-and-AI terms first — never assume he can read a diff, a type signature, or a framework idiom to figure out what something means.

Oparax is an AI news desk for reporters: connect an X account and website sources to a desk, and the app watches them, filters what lands on the desk's beat, and drafts posts in the reporter's own voice — measured from their real posting corpus, never hand-authored — surfaced in the app for review. Drafting is automatic; posting is always the reporter's decision. It runs as a Next.js app on Vercel (beta at beta.oparax.ai, production at oparax.ai) with Supabase for data and auth and isolated Railway workers for source polling and ingest.

Feature work moves through a two-stage Claude Code flow where every stage is OWNER-TRIGGERED, no stage auto-dispatches the next; each session ends by naming the next command. `/feature` talks the idea through with the owner, writes the plain-language plan, writes the technical spec, runs a cross-model critique plus adjudication, and on the owner's approval creates the GitHub issue and cuts `ft/<issue#>` from beta. `/build <N>` then builds the slice, runs the gates, proves the acceptance journeys, runs cross-model QC against the real diff, and fixes and reverifies what QC and the journeys turned up. The owner walks the result on localhost before `/ship <N>` squashes to `beta`, and closes the issue only after checking production. Work happens on `ft/<issue#>` branches; verbose artifacts live in local `.feature/` files, and the issue carries the approved plan, the technical spec, and one QC marker per round.

Bug fixes run through the same three commands (the old bf skill stack is retired). The `/feature` conversation starts from the broken behavior instead of a new idea: capture the exact repro first, then the plan's "What happens" section describes the corrected behavior and its acceptance journey IS the repro, re-proven. Branches use `bf/<issue#>` (the start script takes `--prefix bf`) and the issue gets the `bug` label. A trivial owner-reported fix can skip the critique workflow at the owner's word; everything else runs the full flow.

Issues are labeled, and the label routes the work:

| Label | Meaning | Flow |
| --- | --- | --- |
| `bug` | Existing behavior or data integrity is wrong | same three commands, on `bf/<issue#>`: repro-first `/feature` → `/build <N>` → `/ship <N>` |
| `feature` | New customer-facing capability | the feature flow above: `/feature` → `/build <N>` → `/ship <N>` |
| `cleanup` | Removal, simplification, dead code | the feature flow above, minus the design/critique stages |
| `meta` | Skills, agent workflow, repository process | direct on `beta` (owner-directed) |
| `docs` | Documentation-only work | direct on `beta` |

- `DESIGN.md` is the visual contract: the design system every UI change aligns to.
- Frontend test login: `testuser@oparax.ai` / `hello123` — an agentic-test-only dummy account; owner-requested browser login is pre-authorized.
- The proof bar, everywhere: does it build, does it boot, can the owner and a user access and experience the functionality? That is the ship bar. The owner and real users are the deep test; no comprehensive suites, benchmarks, multi-case harnesses, or deployment checks — ever — unless the owner explicitly orders one. Pushing the branch is the end of the job.
- Supabase deployment convention: there is exactly one shared Supabase project; migrations apply to it during build through the normal workflow. A migration that retires a live signature (dropping an old RPC, tightening a column) opens an accepted transient window until the slice ships — that window is the owner's standing decision, so never block a build to ask for a preview branch, a deployment window, or migration-timing authorization.
- Vocabulary: when the owner says "onboarder" or "extractor," that means every touchpoint currently on `anthropic/claude-sonnet-5` (or `-opus-5`) — `lib/agent/beat-gate.ts`, `lib/sources/onboard-source.ts`, `lib/voice/extract-guide.ts`, and any future top-tier compiler stage — not one file. The qwen-based downstream stages (filter, synthesize, translate, write) are excluded from that term.
