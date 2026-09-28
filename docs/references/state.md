# Where things stand

Read this first in any new session, before the roadmap. Updated September 27, 2026. This is the handoff: where things are, what is open, and how to explain things to the owner. Every decision is one line in [decisions.md](decisions.md); every account and key is in [setup.md](../setup.md); history is in git.

## How the owner wants to be answered

Plain product terms, a reason with every recommendation, no em dashes, nothing invented and presented as his decision, whole-picture answers rather than a literal answer to one sentence, and no new documents for him to read (files are for the agents; he reads chat).

## Where things are

- **Onboarding runs as code, and the code is the specification** (owner, September 27: "the code is the spec"). Cut down the same evening (owner, September 27, evening: "I've overcomplicated for no damn reason"); council, Astra and Fable): `runOnboarding` in `lib/onboarding/engine.ts` looks the person up on X (profile and pinned post), reads their 10 newest own posts of the past 3 months (a thread is one post, pictures attached), then Jev (`typesafe-ai/jev`) scores every table row and every account they quote (not a mention) in one request, and code keeps those at 0.35 or above (owner, later that evening: "Introduce Jev again for the table scoring"). One structured call to `openai/gpt-6-luna-fast` at high reasoning, through the Vercel AI Gateway, picks from what passed: up to 10 sites and feeds in total (a feed wins a close call; a stream that repeats another pick is skipped) and at least 5 X accounts, each with its score and one sentence of why. When fewer than 5 accounts fit, the model names search terms, code runs one X search for accounts, Jev scores the authors, and a second call gives the final answer. No tools, no link reading, no source checking and no row writing: `checker.ts` and the row writer are gone, and the shared table no longer grows from onboarding. `prompts.ts` holds the system prompt; `types.ts` the shared types. Measured, Liam: without Jev 23 seconds, 8 sites, 7 accounts, $0.277; with Jev 24 seconds, Jev passed 107 of 150, 9 sites, 8 accounts, $0.278. Web search (Perplexity) is not in the loop; he wants it explained before deciding. `app/api/onboarding/route.ts` streams a build to the bare page `app/onboarding` (five preset people); the login is skipped on localhost and required elsewhere. `docs/onboarding-algorithm.md` was deleted; its September 19 version is in git at `1e9e0bc`.
- **Changed on September 27, each one a line in decisions.md.** The owner's rulings: the model sees images (photos as the photo, videos and GIFs as their freeze frame, in the person's posts, quoted posts and search results; picture-only posts are kept); a linked PDF is reported to the model and not read (`unpdf` removed); a from-scratch rebuild was started and dropped the same day, and the original code stayed. The assistant's work: the web search tool was left out of the port, because the Gateway runs it server-side and its cap could not be enforced, so the model names feeds it knows and code checks them; the original code was cleaned under the Laziness rule with no change in behavior, at the owner's request, after a council (Astra, Gemini Pro), and one live run of Liam on the page completed every tool. Outside the product: a Grok council or review lane that fails on exhausted Grok usage reruns once on Cursor's `grok-4.7-high-fast` (owner).
- **The lab is finished and kept as it is** (owner, September 27: "leave them as they are"). `scratch/onboarding-loop`, `scratch/explainers`, `scratch/downstream`, `scratch/notes/lab-state.md` and `scratch/notes/path.md` are the record of the September 26 to 27 lab, not the current state. Nothing under `scratch/` is edited or moved.
- **Downstream is unchanged.** It exists only as the lab design (Python, in `scratch/downstream`); [downstream-algorithm.md](../downstream-algorithm.md) is its plan.
- **Git.** The page itself is committed (28fbb05 and 9c013d6) on local `beta`, which with the September 26 meta commits is eight commits ahead of `origin/beta` and not pushed; `main` is still the September 24 promote. Everything else from September 27 (images, PDFs, the cleanup, the deleted spec, these doc edits) is uncommitted in the working tree, at the owner's word.
- **Foundation, accounts and design, as on September 24.** `https://oparax.ai` serves the placeholder homepage, `/privacy` and `/terms`; every account and key is set up (setup.md); DESIGN.md is the contract and Claude Design is synced.

## Open

1. **Issue 143's brief is stale.** It still describes the September 19 Grok design and names the deleted spec; it is updated, or pushed back on, before `/feature 143`.
2. **Contact delivery.** The public Contact dialog sends nothing, yet the privacy policy tells people to request account deletion through Contact. Wiring it to deliver messages is the first thing to build before real users.
3. **Not blocking:** his yes on tests and alerts as one loop (decisions.md), the PostHog Slack alert, source-map upload (setup.md), and the principles wording in AGENTS.md (the "about 400 lines" limit is the assistant's number).

## Next

Owner, September 28: planning is over and the whole product (onboarding, the feed page and its algorithm, the landing page, sign-up, payment, alerts) is built in one feature call; issues #143 to #147 are closed (decisions.md, Tooling). The step-by-step walkthrough stopped at micro-step 1; its record stays at the top of `scratch/notes/evolving-fixes-and-their-reasons.md`.

## Rulings still needed, by issue

- **Issue 2:** the open lines and numbers in downstream-algorithm.md section 14 (the fit line, the join and adds lines, and the assistant's numbers there), plus the OPEN downstream lines in decisions.md (the writer model, what Jev is told about the person, what a new monitor shows on day zero, where polling runs and how often).
- **Issue 5:** how watched X accounts arrive (polling looks best; none of the three assistant options is decided); the price (not decided).
- **Later:** email and Slack as alert channels (the owner's lean: after the slices); per-service budgets (after real usage).

## How to explain what he has said he does not hold

- **The whole project:** in his own five issues (onboarding, the feed page with its algorithm, the landing page and the whole flow, sign-up, after sign-up), never nine slices. Keep the shape: product, money, accounts, onboarding, downstream, agent or pipeline, X delivery, Stripe, what was invented, path.
- **The onboarding algorithm:** the three steps the code runs (look the person up, read their newest posts, recommend from the table with the one optional search), each with what goes in and what comes out, never as prompts.
- **The downstream algorithm:** one step at a time in chat before issue 2; each ruling goes into downstream-algorithm.md with his name and date. Every R-numbered rule there is the assistant's proposal until it carries his date.
- **Agent or pipeline:** since the September 27 cut, onboarding is a fixed pipeline too (code reads the person, one Luna fast call recommends, one optional X search and a second call); the downstream is a fixed pipeline, and should be. In this repo "agent" means one monitor.
