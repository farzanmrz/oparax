# Everything in decisions.md, for your keep, drop or change

171 entries, numbered A1 to A49 (product, onboarding, downstream), B1 to B89 (models through tooling) and C1 to C33 (legacy through the October design restart). Answer by number, for example "drop A2, B24; keep C29; change B26". The cross-check at the end lists contradictions (X1 to X20), duplicates, stale entries and everything tabled.

# decisions.md audit, part 1 (A1 to A49)

Scope: "The product", "Onboarding algorithm" and "Downstream algorithm" (lines 7 to 63 of docs/references/decisions.md). Read-only audit; nothing in the repo was edited. References like "(Alerts section)" point at entries outside this part.

Reading the flags: STALE = about something since removed or changed. SUPERSEDED-UNMARKED = a later entry overrides it but it does not say so. AGENT-ADDED? = no owner quote and no clear owner instruction. A second flag is shown after a plus sign only when AGENT-ADDED? also applies.

| # | Title | Status as written | Date | Decided by | Plain meaning | Flag |
|---|---|---|---|---|---|---|
| A1 | Monitoring only | LOCKED | Sep 14 | owner (quoted) | Oparax only watches, judges and alerts; it never drafts posts or posts to X for anyone. | |
| A2 | No account to start | LOCKED (second half SUPERSEDED Sep 28) | Sep 19 | owner (no quote) | Typing a handle and one sentence builds your page with no account. Sign-up-first (feature 151) now contradicts the first half, and the entry never says so. | SUPERSEDED-UNMARKED |
| A3 | Ten sources shown, at least five X accounts | LOCKED | Sep 19 | owner (no quote) | A new person is shown ten sources, at least five of them X accounts; ten is a display number, not a cap on watching. | |
| A4 | Bot alerts once a day | LOCKED (REFINED Sep 28) | Sep 19 | owner (no quote) | The bot DMs once a day (30 a month); the top tier later gets a 15-minute mini digest instead. | |
| A5 | Product Hunt API, email them at first payer | LOCKED | Sep 22 | owner (quoted) | Use Product Hunt's API under his personal account now, and email Product Hunt when the first person pays. | |
| A6 | Budgets set after usage is observed | LOCKED (REFINED Sep 28) | Sep 22 | owner (quoted) | Do not set per-service spending limits until real usage is seen, except two guards set up front. | |
| A7 | GitHub and Product Hunt as daily digests | LOCKED (REFINED Sep 28) | Sep 19 | owner (no quote) | GitHub and Product Hunt arrive as optional daily digests added later; the Oct 2 ruling that every source is an equal input overrides the separate-digest idea. | SUPERSEDED-UNMARKED |
| A8 | Five test people get links | LOCKED | Sep 19 | owner (no quote) | He builds monitors for five test people himself and sends them links; later entries say three creators plus himself and Kush as strangers. | SUPERSEDED-UNMARKED |
| A9 | Unclaimed monitor stops at day three | SUPERSEDED (was LOCKED) | Sep 19 (superseded Sep 28) | owner (no quote) | The old clock and claiming rules are replaced; only "the person messages the bot first" survives. | STALE |
| A10 | No duplicate items sent | LOCKED | Sep 16 | owner (no quote) | The same item must never be sent to a person twice. | DUPLICATE of "One DM per story, ever" (Alerts section) |
| A11 | Text fills its container | LOCKED | Sep 24 | owner (no quote) | No maximum line width; text runs to the edge of the card or frame. | DESIGN-LEFTOVER |
| A12 | The logo links home | LOCKED | Sep 24 | owner (no quote) | The logo and name are one link back to the home page on every page. | DESIGN-LEFTOVER |
| A13 | What a new monitor shows on day zero | LOCKED (was OPEN) | Sep 28 (first said Sep 26) | owner (no quote) | A new monitor starts with each source's 10 newest items from the last 2 days, run through the normal steps. | |
| A14 | Chat-first monitor creation | REJECTED | Jul 22 | unclear | Making a monitor by chatting was dropped for a plain form with a live preview; no reason was recorded. | STALE + AGENT-ADDED? |
| A15 | More than one monitor, teams, image reading, crawling, news APIs, discovery experiments | REJECTED (image part SUPERSEDED Sep 27) | Sep 19 | owner (no quote) | A bundle of things not in the plan; the image-reading piece was later reversed. | |
| A16 | Grok reads the person, Jev ranks, Grok fills gaps, code builds the page | SUPERSEDED (was LOCKED) | Sep 18 to 21 (superseded Sep 27) | owner (quoted) | The old onboarding design; replaced by a nine-tool loop, which was itself cut the same evening (A29), so the entry points at a design that no longer exists. | STALE |
| A17 | Sources under 0.35 from Jev are dropped | LOCKED | Sep 18 | owner (quoted) | A source Jev rates below 0.35 is removed and never shown, because it is too risky. | |
| A18 | Jev as a tool inside Grok's loop | REJECTED (SUPERSEDED Sep 27) | Sep 18 | unclear | Cost reason for not letting the model call Jev; moot since the loop is gone. | STALE + AGENT-ADDED? |
| A19 | Grok's own web search for finding sources | REJECTED | Sep 14 | unclear | Grok's built-in search cost 3 to 5 times more with no better picks. | DUPLICATE of A28 + AGENT-ADDED? |
| A20 | X search as a default tool in the gap-filling pass | REJECTED | Sep 18 | owner (no quote) | Dropped a default X search that cost about 23 cents a build; a conditional one stays. Three layers of later rewrites are stacked inside it. | STALE |
| A21 | Qwen anywhere in onboarding | REJECTED | Sep 19 | owner (no quote) | Qwen invented details in 6 of 8 rows in one test, so it is banned from onboarding. | |
| A22 | Bright Data's X dataset | REJECTED | Jul 25 and Sep 17 | unclear | Bright Data could not return posts (X sign-up wall) and its license bars competitors. | AGENT-ADDED? |
| A23 | Handle lookup against X's API at onboarding | REJECTED | Sep 19 | owner (no quote) | Says onboarding should not look up a handle via X's API, but the current onboarding does exactly that (profile read and "Handle not found"). | CONTRADICTS A29 |
| A24 | Grok agent's six-step cap, 30-post read, 8 turns | SUPERSEDED (was assistant's numbers) | Sep 27 | assistant | Old limits on the retired Grok agent; replaced by other limits that were then also removed. | STALE + AGENT-ADDED? |
| A25 | The model sees post images | LOCKED | Sep 27 | owner (quoted) | Photos, and freeze frames of videos and GIFs, are given to the model; picture-only posts are kept. | |
| A26 | Reading linked PDFs at onboarding | REJECTED | Sep 27 | owner (quoted) | Linked PDFs are no longer read (only the file name and preview card are reported); the PDF package was removed. All link reading was cut later that evening, so it is now moot. | STALE |
| A27 | Step-by-step rebuild of onboarding | REJECTED | Sep 27 | owner (quoted) | He decided not to rebuild onboarding from scratch; the old code was cleaned instead, then cut again that evening. | STALE |
| A28 | A web search tool in onboarding | DROPPED | Sep 27 | assistant | The assistant removed model web search because the system could not cap its use; onboarding now finds no new streams at all. | |
| A29 | Onboarding cut to three steps | LOCKED | Sep 27 evening | owner (quoted) | Onboarding is now: look up the profile, read 10 posts, one model call picks sources; all tools and the website read removed. | |
| A30 | Jev scores the table again, and the picking rules | LOCKED | Sep 27 evening | owner (quoted) | Jev scores every candidate (0.35 floor), picks total "10", feeds beat news pages, and a merely quoted account is not auto-qualified. Contradicts A29's "up to ten sites and feeds and at least five accounts" (the Liam run showed 9 sites plus 8 accounts). | CONTRADICTS A29 |
| A31 | Profile request no longer fetches the latest post | LOCKED | Sep 27 | owner (quoted) | An unused billed field was dropped from the profile call. | TOO-DETAILED |
| A32 | Location is not given to the model | LOCKED | Sep 27 | owner (quoted) | The person's X location is hidden from the model because it can mislead (Dubai versus Barcelona). | |
| A33 | Profile picture kept for the page, not the model | LOCKED | Sep 27 | owner (quoted) | The avatar is stored so the page can show it. | |
| A34 | Storing the profile in the database | NOT RULED (OPEN) | Sep 27 | assistant | His question "should we even pull this?" became an open recommendation to trim; a later Sep 28 night entry already records the profile request as trimmed. | SUPERSEDED-UNMARKED + AGENT-ADDED? |
| A35 | Onboarding page runs only the steps explained so far | APPLIED (SUPERSEDED Sep 28) | Sep 27 | owner (quoted) | A temporary switch showed only the X lookup while he was walked through the code; it is scaffolding that was meant to be removed. | STALE |
| A36 | Onboarding cost, measured | RECORDED | Sep 27 | unclear | Cost figures per test person; the entry itself says these live in cogs.md. | TOO-DETAILED + AGENT-ADDED? |
| A37 | Jev judges fit, writer writes a card, checks, one DM a day | (no status word) | Sep 17 to 21 | assistant | The overall downstream pipeline, which the entry itself says is mostly the assistant's design and "proposal until it carries an owner date". | AGENT-ADDED? |
| A38 | Two views: single cards first, grouped later | SUPERSEDED (was LOCKED) | Sep 22 (superseded Sep 28) | owner (quoted) | Build order replaced by A39; that the person can see both views stays. | STALE |
| A39 | Grouping stays in this build, articles only at first | LOCKED | Sep 28 | owner (quoted) | Items about one story fold into one card now; the 72-hour window and 0.75 lines are untuned assistant defaults. | |
| A40 | Nothing is translated before Jev | LOCKED | Sep 19 | owner (no quote) | Jev judges Catalan and Spanish items in their own language. | |
| A41 | Cards written from title and summary only | REJECTED | Sep 19 | owner (quoted) | The writer gets the full article text, not just the feed's title and summary. | |
| A42 | Support and headline checks at a 0.5 line | LOCKED (for the lab) | Sep 21 | owner (quoted) | The fact-check strictness was set for the lab experiment, which has since been archived. | STALE |
| A43 | Card shape: headline plus one to five fact lines | LOCKED | Aug 28 | owner (no quote) | A card is a headline and one to five fact lines, each with its source. Overlaps A37, and predates the Sep 14 pivot. | DUPLICATE of A37 |
| A44 | The fit line for articles | LOCKED (was OPEN) | Sep 28 (first agreed Sep 26) | owner (no quote) | 0.5 and up counts as relevant, under 0.35 is off, the middle counts as off. | |
| A45 | What Jev is told about the person | OPEN | none | unclear | Asked what information about the person Jev should get; the Sep 28 night entry (a saved brief on the person that Jev reads) already answers it. | SUPERSEDED-UNMARKED + AGENT-ADDED? |
| A46 | 6,000 chars, 20,000 kept, 72-hour window, 0.75 lines | RECORDED | Sep 26 and Sep 28 | owner (no quote) | Text limits are gone; the window and two lines are untuned assistant defaults. Repeats the defaults already in A39. | DUPLICATE of A39 |
| A47 | The writer model | LOCKED (was OPEN) | Sep 28 (first said Sep 26) | owner (no quote) | Cards are written by Qwen 3.7 Flash, with Jev doing the checks. | |
| A48 | Fact checking stays as R18 | LOCKED | Sep 28 | owner (quoted) | Jev checks each fact, code checks the quoted spans, one repair pass, no second checker model. | |
| A49 | Assistant proposals (second judgment, daily item budget, demote off-beat source, share link) | (no status word) | none | assistant | A list of ideas the assistant floated and nobody approved. | AGENT-ADDED? |

## Counts

Entries: 49 (15 in The product, 21 in Onboarding algorithm, 13 in Downstream algorithm).

Decided by: owner (quoted) 19, owner (no quote) 19, assistant 5, unclear 6.

Flags (rows with the flag, counting second flags): STALE 11, SUPERSEDED-UNMARKED 5, DUPLICATE 4, CONTRADICTS 2, DESIGN-LEFTOVER 2, TOO-DETAILED 2, AGENT-ADDED? 10. Blank (no flag): 20 rows.

## Git evidence for AGENT-ADDED? entries

The whole ledger was created in one commit, `a0da26e` (2026-09-23, "meta: design skills for Claude and Codex, design moves to Claude Design, the handoff file and the decisions ledger"). Its body says only that decisions.md "is the one-line ledger"; the file header says it was "Compiled ... from the git history (all 707 commits), the docs, and the owner's own messages". The commit cites the owner for the design-skills work ("Phase 0A (owner, September 23)"), not for any ledger entry, and was co-authored by Claude Fable 5.1. So the ledger as a whole was an agent compilation, not entries he asked to be locked one by one.

`git log -L` for each flagged line (current line number, entry, commits that touched it, newest first):

- line 22, A14 Chat-first monitor creation: a0da26e only. Created in the compilation commit; no owner citation. Sources are a July commit (b175d2c).
- lines 29 and 30, A18 and A19: f925014 (2026-09-28, "feat: onboarding cut to three steps with Jev scoring the table; docs, ledger and handoff updated"), originally a0da26e. The f925014 body cites "Owner, September 27 to 28" for the onboarding cut generally, not for these lines; the edits to them are "SUPERSEDED" notes added by the assistant.
- line 33, A22 Bright Data: f925014, originally a0da26e. Same pattern.
- line 35, A24 six-step cap: f925014 (the supersession note), originally a0da26e.
- line 45, A34 Storing the profile: ae3457c (2026-09-28, "docs: the September 28 rulings (tiers, the free week, alerts, polling, the pool, spend guards), the labs archived"). Body cites no owner words; it says it records "the owner's rulings of September 28", but this entry is explicitly NOT RULED and is the assistant's recommendation.
- line 47, A36 Onboarding cost: ae3457c, same commit. This was one of the "14 entries of the lab's evolving-fixes note" folded in when the lab folder was deleted; it is a measurement, not a decision.
- line 51, A37 pipeline: a0da26e only; never edited since. Text says the design is the assistant's.
- line 59, A45 What Jev is told: f925014, then f95d352 (2026-09-23, "meta: lock the September 23 agreements down: ..."), originally a0da26e. It is still marked OPEN even though a Sep 28 night entry (commit 7cf3290) answers it; nobody went back to close it.
- line 63, A49 Assistant proposals: a0da26e only.

Commit author on every one is "Farzan Mirza" (his git identity), with a Claude co-author trailer on those inspected (a0da26e, f925014, ae3457c all Claude Fable 5.1), so authorship alone does not show who decided. Per-entry owner words appear only inside the entry text, which is how the "owner (quoted)" column was set.

## Other notes

- Several "owner (no quote)" entries dated Sep 19 and Sep 16 come from the deleted September 19 onboarding spec and roadmap.md, which cannot be checked from this file.
- A13, A44 and A47 each rest on "the owner's one yes on the reconciliation" (Sep 28): a single yes that covered several separate decisions at once, with no per-item quote.
- A46 and A39 repeat the same three default numbers; A29 and A30 disagree about how many sources are picked.

# Part 2 audit of decisions.md: Models and the Gateway through Tooling, the flow, and testing (B1 to B89)

Source: docs/references/decisions.md lines 65 to 173 (from "## Models and the Gateway" to just before "## Legacy code"). Read-only audit; nothing was edited. L-numbers in the Title column are decisions.md line numbers.

Method notes. Decided by follows who the entry says made the decision, not just whether a quote appears (an owner question quoted inside an assistant recommendation counts as assistant). Several flags can apply to one row; counts below count each flag. Flags are my judgment from reading the file and checking AGENTS.md, DESIGN.md and the git log, not owner rulings.

| # | Title (short) | Status as written | Date | Decided by | What it means | Flag |
|---|---|---|---|---|---|---|
| B1 | Every model call goes through the Vercel AI Gateway, including Jev (L67) | LOCKED | Sep 21 | owner (no quote) | All AI calls, including the Jev scoring service, are routed through one gateway account. |  |
| B2 | Grok 4.7 replaces Grok 4.6 (L68) | LOCKED (then SUPERSEDED for onboarding) | Sep 21 | owner (no quote) | Upgraded to a cheaper Grok version; onboarding no longer uses Grok at all, only a review lane does. | STALE |
| B3 | Claude Sonnet for onboarding (L69) | REJECTED | Sep 17 to 18 | unclear | Sonnet was turned down for onboarding in favour of Grok, which was itself replaced later. | STALE |
| B4 | Jev removed, then restored (L70) | REJECTED, then LOCKED | Sep 17, Sep 18 | owner (no quote) | Jev was dropped one day and brought back the next; the reason for the round trip was never written down. | STALE |
| B5 | Gemini 3.7 Flash as the writer (L71) | Superseded (no caps) | Aug 22 | unclear | An old writer model from the retired drafting product; the current writer is a different model. | STALE |
| B6 | Review lanes: Grok 4.7 Build Fast and Gemini 3.8 Flash everywhere (L72) | LOCKED | Sep 21 | owner (no quote) | Two named models were to review every piece of work; later review rosters replaced this. | SUPERSEDED-UNMARKED |
| B7 | Vercel Pro hosts the app; only main deploys (L76) | LOCKED (pause part SUPERSEDED) | Sep 11 to 12 | owner (no quote) | The site runs on a paid Vercel plan and only the main branch goes public; the old pause is over. |  |
| B8 | Production published by the owner's word, outside the weekly promote (L77) | LOCKED | Sep 24 | owner (no quote) | The owner can push the public site live outside the weekly schedule; this was done twice on Sep 24 for Google verification. | STALE |
| B9 | Railway removed (L78) | REMOVED | Sep 12 | owner (no quote) | The Railway server host is gone, the project deleted, and nothing is being billed. |  |
| B10 | How watched X accounts' posts arrive (L79) | LOCKED | Sep 28 | owner (no quote) | Check each watched X account on a timer (every minute for Wire, every five minutes otherwise) instead of holding a live stream open. | TOO-DETAILED |
| B11 | Where website polling runs and how often (L80) | OPEN | undated (Sep 16 question) | assistant | Sites and feeds would be checked about every minute from a Vercel timer; never formally ruled in this entry. | SUPERSEDED-UNMARKED, AGENT-ADDED? |
| B12 | Onboarding runs as a plain tool-loop agent in one function call (L81) | APPLIED (assistant recommendation) | Sep 22; applied Sep 27 | assistant | Onboarding was built as one AI program calling tools in a loop in a single request; that loop was cut the same week. | STALE, AGENT-ADDED? |
| B13 | eve as the framework (L82) | REJECTED | July 13 | unclear | The eve agent framework was turned down because it could not deploy at the time. |  |
| B14 | Every monitor as its own agent loop (L83) | OPEN (assistant says no) | Sep 22 | assistant | The assistant advises against giving each monitor a free-roaming AI loop; fixed steps are cheaper and easier to check. | AGENT-ADDED? |
| B15 | Bright Data in the first build (L84) | LEFT OUT | Sep 19 | assistant | The paid scraping service is skipped for now because most sources can be read directly; it can return if a wanted source needs it. |  |
| B16 | Supabase Auth stays; Clerk is rejected (L88) | LOCKED | Sep 22 | owner (quoted) | Keep Supabase for sign-in and do not add Clerk. |  |
| B17 | Supabase connected by hand-pasted keys, not the Vercel marketplace (L89) | none given | undated | unclear | Describes how Supabase is wired today; no one is recorded as deciding anything. | TOO-DETAILED |
| B18 | Stripe, hosted checkout, day-seven freeze, flat monthly price (L93) | LOCKED (as slice 7) | undated | owner (no quote) | Payments use Stripe's hosted checkout with a freeze on day seven; the entry also carries a long history of an abandoned August attempt. | STALE, TOO-DETAILED |
| B19 | Stripe through the Vercel marketplace or a direct account (L94) | SUPERSEDED (was OPEN) | Sep 24 | assistant | An old open question about how to connect Stripe; answered by the direct-account entry. | STALE |
| B20 | Stripe's own metered billing for the monthly allowance (L95) | none (assistant recommendation, not ruled) | Sep 22 | assistant | The assistant advises a flat price with usage counted in our own ledger rather than Stripe's metered billing. | AGENT-ADDED? |
| B21 | The Stripe Claude Code plugin (L96) | SUPERSEDED (was LATER) | Sep 24 | assistant | Whether to install the Stripe plugin for the coding tools; it has since been installed. | STALE |
| B22 | The price (L97) | SUPERSEDED (was OPEN) | Sep 28 | owner (quoted) | Records that the owner struck the assistant's $29 figure; replaced by the three tiers. | STALE |
| B23 | Three tiers (L98) | LOCKED | Sep 28 | owner (quoted) | Hobby $5, Creator $30 and Wire $99 a month, with different watched-post allowances and alert speeds. |  |
| B24 | The free week (L99) | LOCKED | Sep 28 | owner (quoted) | No account to start; the free week begins at the first outside page view, the page freezes on day seven, and paying through Stripe checkout is the sign-up. | CONTRADICTS line-186 entry (Sep 29 sign-up-first, outside this part) |
| B25 | One monthly pool is the only allowance number (L100) | LOCKED | Sep 28 | owner (quoted) | Each plan has one monthly pool of watched X posts instead of per-account limits; the free week carries 300. |  |
| B26 | Public spending (L101) | LOCKED | Sep 28 | owner (quoted) | Caps what Oparax spends on anonymous page builds and sets guards on X credits and AI Gateway budget. | SUPERSEDED-UNMARKED, CONTRADICTS B89, TOO-DETAILED |
| B27 | Runaway spending guards, in code (L102) | LOCKED | Sep 28 | owner (no quote) | A list of code safeguards (cost rows, claims, retry limits, watchdog) so one bug cannot burn money. | TOO-DETAILED, AGENT-ADDED? |
| B28 | X DM through the Oparax bot is the first channel (L106) | LOCKED | Sep 16 to 17 | owner (quoted) | Alerts reach people as direct messages on X from the Oparax bot. |  |
| B29 | One DM per story, ever; no instant alerts (L107) | LOCKED | Sep 28 | owner (quoted) | A story is clustered and the person gets exactly one message for it, with a link to the story on the site. |  |
| B30 | Email (Resend) and Slack as cheaper optional channels (L108) | LATER | Sep 22 | owner (quoted) | Email and Slack alerts are wanted but deliberately after the main work. |  |
| B31 | In-repo Slack feed and email delivery of the old drafting product (L109) | REMOVED | Aug 10 | unclear | A development-era Slack simulation from the old drafting product was deleted. | STALE |
| B32 | The bot handle (L110) | LOCKED | Sep 24 | owner (no quote) | The project's own bot account is the bot; no separate plain @oparax account is created. |  |
| B33 | Bot identity in fetches (L111) | LOCKED | Sep 19 | owner (no quote) | When fetching websites, Oparax presents itself as an ordinary browser, not as a labelled bot. |  |
| B34 | Claude follows family aliases; Codex keeps explicit versions (L115) | LOCKED | Sep 29 | owner (quoted) | Claude models are named by family alias (opus, fable, sonnet) so new releases are picked up automatically. |  |
| B35 | Pinned models and the same CLI reviewers from either host (L117) | LOCKED | Sep 29 | owner (quoted) | Review models pinned to exact versions and run the same way from either coding tool; the version-pin part was reversed the same day. | SUPERSEDED-UNMARKED, TOO-DETAILED |
| B36 | Three Cursor lanes and a Claude Opus lane added to critique and QC (L119) | LOCKED (Opus part SUPERSEDED) | Sep 23 | owner (quoted) | Extra reviewer models were added to plan critique and QC; the Opus route has since changed. | STALE |
| B37 | Every UI skill has three jobs (L120) | LOCKED | Sep 23 | owner (quoted) | Each UI skill must shape the plan, guide the build and check the result. |  |
| B38 | Design skills installed for Claude and Codex (L121) | LOCKED | Sep 23 | owner (quoted) | Four design skills were installed and two removed; the entry also mentions a slice 6 email skill. | TOO-DETAILED, STALE |
| B39 | cstack and pstack (L122) | REJECTED | Sep 23 | assistant | Two outside tool packs were not installed; their useful principles became a section in AGENTS.md. | AGENT-ADDED? |
| B40 | A browser-walking verify step (L123) | REJECTED again | Sep 23 | owner (quoted) | No automated step that clicks through the app; a small screenshot check is separate. |  |
| B41 | A screenshot check in QC (L124) | LOCKED | Sep 23 | owner (quoted) | QC may start the app out of sight and screenshot pages at two widths in dark and light; nothing else. |  |
| B42 | Reviewers read the slice's skill files (L125) | LOCKED | Sep 23 | owner (no quote) | Reviewers are given the same skill files the builder used so they can judge fairly. | TOO-DETAILED |
| B43 | Engineering principles in AGENTS.md, graded by a principles lens (L126) | LOCKED (mechanism) | Sep 23 | owner (quoted) | The engineering rules live in AGENTS.md because both tool families always read it. |  |
| B44 | Five issues, the owner's structure (L127) | LOCKED | Sep 23 | owner (no quote) | The first five-issue split of the work (onboarding, feed, landing, sign-up, after sign-up). | SUPERSEDED-UNMARKED |
| B45 | Docs consolidated (L128) | LOCKED | Sep 23 | owner (quoted) | The docs folder was reduced to the plan, two algorithms, seed, setup and references. |  |
| B46 | Tests and alerts as one loop (L129) | OPEN (assistant proposal) | Sep 23 | assistant | The assistant proposes a few unit tests, one error alert and a test per bug fix; owner asked to keep the thread but never ruled. | AGENT-ADDED?, CONTRADICTS B53 and B69 (PostHog alert) |
| B47 | All eight runner lanes verified (L130) | none (a test report) | Sep 24 | unclear | A record that eight reviewer models answered a smoke test; not a decision. | TOO-DETAILED, STALE |
| B48 | The five issues written fresh (L131) | LOCKED | Sep 24 | owner (quoted) | The same five issues were rewritten with better ordering and the old ones closed; then all were closed on Sep 28. | DUPLICATE of B44, SUPERSEDED-UNMARKED |
| B49 | The flow: /feature, $build, /qc, /ship, /promote with fixed lanes (L132) | LOCKED | Aug 15, refined to Sep 22 | owner (no quote) | The stage-by-stage workflow exists, with a warning that it has been rewritten many times. |  |
| B50 | The proof bar (L133) | LOCKED | Aug 10 | owner (no quote) | Proof means it builds, boots, and the owner and a user can try it; no big test suites unless he orders one. |  |
| B51 | Unit tests (vitest) (L134) | REMOVED | May 21 | unclear | The unit-test setup was deleted as unused and never restored. |  |
| B52 | Browser-driven verification inside the flow (L135) | REMOVED | Aug 8 to 10 | unclear | Browser verify skills and deployment checkers were taken out of the flow. | DUPLICATE of B40 (partly) |
| B53 | Testing going forward (L136) | OPEN (assistant recommendation) | Sep 22 | assistant | The assistant advises no test program now, only narrow tests next to money or security code. | AGENT-ADDED?, CONTRADICTS B46 |
| B54 | Skill bundles (L137) | LOCKED table plus OPEN assistant recommendation | undated | assistant | A table groups skills per kind of work; the assistant also suggests extra Jev and billing rows. | SUPERSEDED-UNMARKED, AGENT-ADDED? |
| B55 | X Ads (L138) | LOCKED (in scope) | Sep 14 to 19 | owner (no quote) | X Ads is in scope, but only the owner may create or launch a campaign. |  |
| B56 | PostHog is the one dashboard (L139) | LOCKED | undated | owner (no quote) | PostHog is the single place for analytics and alerts. |  |
| B57 | Sentry (L140) | REMOVED | Aug 18 | unclear | Sentry was removed and PostHog took over error reporting. |  |
| B58 | Astra High is the only build model (L141) | LOCKED | Sep 24 | owner (quoted) | Feature and QC always build with Astra High; no model question. |  |
| B59 | The "feature flow" prompt hook (L142) | LOCKED | Sep 24 | owner (quoted) | A hook defines the phrase "feature flow" as the whole chain of stages. |  |
| B60 | Railway is out of the stack (L143) | LOCKED | Sep 24 | owner (quoted) | Railway plugin, skill and bundle row were deleted. | DUPLICATE of B9 |
| B61 | Login is email, Google and X through Supabase Auth (L144) | LOCKED | Sep 24 | owner (quoted) | Sign-in offers email, Google and X; his quote names only X and Google, and the build issue it points to is closed. | STALE |
| B62 | Clear the ground (L145) | LOCKED | Sep 24 | owner (quoted) | All legacy drafting code and database tables were wiped before the new build; this happened and shipped. | STALE |
| B63 | All keys and accounts set up now, not per issue (L146) | LOCKED | Sep 24 | owner (quoted) | Set up all keys and accounts up front; Vercel holds them as readable shared variables. | TOO-DETAILED |
| B64 | GitHub digest token has no expiration and reads public repos only (L147) | LOCKED | Sep 24 | owner (no quote) | The GitHub token never expires and can only read public repositories. | TOO-DETAILED |
| B65 | Store Product Hunt's application credentials as well (L148) | LOCKED | Sep 24 | owner (quoted) | Product Hunt's key and secret are saved in Vercel for later use. | TOO-DETAILED |
| B66 | Keep the existing Oparax domains and bot handle (L149) | LOCKED | Sep 24 | owner (no quote) | No domain removal or bot rename is part of account setup. | DUPLICATE of B32, TOO-DETAILED |
| B67 | Temporary policy links during account setup (L150) | SUPERSEDED | Sep 24 | unclear | Placeholder privacy and terms links were replaced by real pages. | STALE |
| B68 | Skill exposure and the bundle-check hook (L151) | REJECTED | Sep 24 | owner (quoted) | No extra machinery for selectively exposing skills; the bundle table stays as is. | CONTRADICTS line-192 entry (Sep 29 selectively exposed skills, outside this part) |
| B69 | A live-facts snapshot in the lane brief, and the PostHog alert (L152) | DROPPED | Sep 24 | owner (quoted) | Two ideas were dropped as not worth the bother. |  |
| B70 | Worktrees and parallel builds (L153) | SUPERSEDED (was NOT NOW) | Sep 24 | owner (quoted) | Parallel builds were postponed, then allowed on Sep 28; AGENTS.md now again requires an explicit owner request. | STALE |
| B71 | The council skill (L154) | LOCKED | Sep 24 | owner (quoted) | A user-invoked skill that asks several AI models for advice; its default roster has since changed. | SUPERSEDED-UNMARKED, TOO-DETAILED |
| B72 | The critique runner accepts the RESULT marker after a preface (L155) | LOCKED | Sep 24 | assistant | A small fix so reviewers who write a sentence before their result are not marked invalid. | TOO-DETAILED, AGENT-ADDED? |
| B73 | Critique folded into council; one file for model ids (L156) | LOCKED | Sep 24 | owner (quoted) | Critique became part of council and model ids live in one file. |  |
| B74 | Terra removed from every lane; Claude models named by alias (L157) | LOCKED (alias part SUPERSEDED) | Sep 24 | owner (quoted) | The Terra model was dropped everywhere; the alias choice was reversed then restored on Sep 29. | STALE |
| B75 | Cursor best-of-n in place of the three Cursor lanes (L158) | REJECTED | Sep 24 | owner (no quote) | A best-of-n option was turned down because reviews need every lane's findings. |  |
| B76 | A payments bundle (L159) | LOCKED | Sep 24 | owner (no quote) | A separate skill bundle for the two Stripe skills. |  |
| B77 | Stripe on a direct account, not the Vercel marketplace (L160) | RECORDED | Sep 24 | owner (no quote) | The owner created the Stripe account directly. |  |
| B78 | The design system changes only on the owner's word (L161) | LOCKED | Sep 24 | owner (quoted) | No agent edits DESIGN.md or the theme unless he approves it in his current session. |  |
| B79 | Two QC findings on #148 left for later issues (L162) | RECORDED | Sep 24 | unclear | Two small old QC findings, a bold hero heading and a pageview identity glitch, parked for issues that no longer exist. | STALE, DESIGN-LEFTOVER |
| B80 | Grok lanes fall back to Cursor until the weekly reset (L163) | LOCKED | Sep 27 | owner (quoted) | When Grok's quota runs out, its review lanes run on Cursor until Tuesday, then switch back. | TOO-DETAILED |
| B81 | The pinned post reaches the model with its pictures and quoted post (L164) | LOCKED | Sep 27 | owner (quoted) | Onboarding reads the person's pinned post with images and quote; belongs under onboarding, not tooling. |  |
| B82 | A handle with no X account shows "Handle not found" (L165) | LOCKED | Sep 27 | owner (quoted) | A wrong handle gives a clear form error instead of a blank crash; belongs under onboarding. |  |
| B83 | Kimi and GLM join the council's defaults (L166) | LOCKED | Sep 27 | owner (quoted) | Two more models are asked by default in council advice and critique. |  |
| B84 | Planning ends; the whole product is built in one feature (L167) | LOCKED | Sep 28 | owner (quoted) | Stop planning and build everything in one feature; the five issues were closed. |  |
| B85 | The build process (L168) | LOCKED | Sep 28 | owner (no quote) | Rules for committing, QC, parallel worktrees, five pause conditions and stock-look UI; several parts are no longer true. | SUPERSEDED-UNMARKED, DESIGN-LEFTOVER, TOO-DETAILED |
| B86 | The labs are archived and deleted (L169) | LOCKED | Sep 28 | owner (no quote) | The experiments folder was saved as a git tag and removed from the working tree. | TOO-DETAILED |
| B87 | The whole-product plan's rulings of the night of Sep 28 (L171) | LOCKED | Sep 28 | owner (quoted) | About two dozen separate rulings in one bullet: spend, polling, DM time, brief, naming, contact, watchdog and more. | TOO-DETAILED, DUPLICATE of B10 (polling cadence), CONTRADICTS line-186 entry (sign-up first) |
| B88 | The bot's transport (L172) | VERIFIED | Sep 28 | owner (no quote) | A real DM was sent from the bot token as a live check. | TOO-DETAILED |
| B89 | The AI Gateway budget is a soft cap (L173) | RECORDED | Sep 28 | unclear | Corrects the earlier claim that the Gateway budget is a hard stop; the old claim was left in place. |  |
## Git evidence for the AGENT-ADDED? rows

Commit author on every commit below is "Farzan Mirza" (his git identity), and every commit body carries a "Co-Authored-By: Claude ..." line, so authorship does not separate his words from an agent's. What can be checked is whether the commit message cites him for that entry.

`git log -L <line>,<line>:docs/references/decisions.md` results (newest first):

| Row | Line | Commits that touched the line | Does the message cite the owner for this entry? |
|---|---|---|---|
| B11 website polling | 80 | ae3457c (Sep 28), 8491897 (Sep 24), a0da26e (Sep 23) | No. a0da26e says the ledger is "the one-line ledger"; ae3457c says it "records the owner's rulings of September 28" in general; 8491897 is about design-system approval. Nothing names polling. |
| B12 Grok tool-loop agent | 81 | f925014 (Sep 28), a0da26e (Sep 23) | No. f925014 cites "Owner, September 27 to 28" for the onboarding cut, which in fact removed the tool loop this entry describes. |
| B14 every monitor an agent loop | 83 | a0da26e only | No. Created in the ledger's first commit; only "Phase 0A (owner, September 23)" appears, and it is about design skills. |
| B20 Stripe metered billing | 95 | f95d352 (Sep 23), a0da26e (Sep 23) | No. f95d352 title says "lock the September 23 agreements down" but its body lists QC screenshots, skill files, principles, slices and docs, not Stripe. |
| B27 runaway spending guards | 102 | ae3457c (Sep 28), a0da26e | Only generically ("records the owner's rulings of September 28"). The entry's own text quotes no owner words and reads as the assistant's design list. |
| B39 cstack and pstack | 122 | a0da26e only | No. Entry itself says "assistant after a 13-agent review, owner did not object". |
| B46 tests and alerts loop | 129 | f95d352 only | No. Entry says the owner "said this thread was let go", then records the assistant's proposal anyway. |
| B53 testing going forward | 136 | a0da26e only | No. Entry is "assistant's recommendation after five external critiques". |
| B54 skill bundles | 137 | 8491897 (Sep 24), a0da26e | No. 8491897's message is about the design system and em dashes. The OPEN jev and billing rows are the assistant's. |
| B72 RESULT marker | 155 | d721862 (Sep 26), ac3d98b, b0f2430 (Sep 24) | No. b0f2430's message is "#148 shipped, the counsel skill, the runner's lenient marker..."; entry says "LOCKED (assistant)". |

Where the entries came from. Of the 89 entries, blame attributes the current text of 18 to a0da26e (Sep 23, the commit that created decisions.md, written by the assistant "compiled ... from the git history, the docs, and the owner's own messages"), 13 to ae3457c (Sep 28 rulings), 11 to f95d352 (Sep 23), 9 to f925014 (Sep 28, a feature commit that also edited the ledger), 8 to f0400bd (Sep 24), and the rest to 13 other commits. Two of the 28 commits that ever touched the file are "feat:" code commits (f925014, 3cc4d5e), so the ledger was also edited as a side effect of feature work. The file's own header line says assistant entries are allowed ("assistant (a design he has not confirmed)"), so assistant-labelled rows are by design, not accident.

## Things the owner will want to know (for the keep or cut call)

1. Status counts as written: LOCKED 56 (including partly superseded ones), REJECTED 7, REMOVED 5, SUPERSEDED 6, OPEN 4, RECORDED 3, no status 3, and one each of APPLIED, LEFT OUT, LATER, DROPPED, VERIFIED. About 12 rows are records of events or facts, not decisions (REMOVED, RECORDED, VERIFIED, APPLIED, test reports).
2. Biggest live contradiction: B24 (the free week: no account to start, no claiming, paying is the sign-up) and B87 (a sign-in with no agent leads to the landing box) against the Sep 29 line-186 entry and the current AGENTS.md ("151 makes entry sign-up first"). Nothing marks the free-week mechanics as replaced. That line 186 also says "his earlier X-only intent", but B61 (L144, Sep 24) already says email, Google and X.
3. Model and review roster rows are the most churned: B6, B35, B36, B71, B74 and B80 each describe a roster or model list that a later Sep 29 entry changed. Aliases (B74, Sep 24) were replaced by pins (B35, Sep 29), then pins by aliases again (B34, Sep 29), and B35 and B74 are not marked.
4. B26 (Public spending) still says "$200 a day" and "hard stop"; B87 says the $200 is a total and B89 says the Gateway budget is a soft cap. B89 corrects the text without fixing B26.
5. B85 (the build process) says worktrees and parallel builds are allowed; the current AGENTS.md says component branches or worktrees need an explicit owner request. It also says "stock shadcn Mira now, with Claude Design per page later", which the Oct 1 to 2 design reset removed.
6. B44 and B48 are the same five-issue plan twice, both ended by B84 (Sep 28, issues closed).
7. B81 and B82 are onboarding rulings filed under Tooling.
8. Outside this part: Part 1 line 15 says GitHub star-threshold alerts were parked, but B87 says they are in the digest, and Oct 2 line 224 says GitHub is just a source, with the separate digest pending change.

# decisions.md audit, part 3 (line 175 to end of file)

Scope: the sections "Legacy code" (lines 175 to 186), "September 29 workflow simplification" (188 to 198), "September 30 tooling realignment" (201 to 210) and "October 1 to 2 design system restart" (212 to 228) of docs/references/decisions.md. Read-only audit. 33 entries, numbered C1 to C33. Entries in the file above line 175 are other parts' work, so a few flags point at them by line number.

Reading the "Decided by" column: "owner (quoted)" means the entry carries his words in quotation marks. "owner (no quote)" means the entry says owner but quotes nothing, so the claim cannot be checked from the file itself. "assistant" means the entry is the assistant's own record or recommendation.

| # | Title | Status as written | Date | Decided by | What it means in plain words | Flag |
|---|---|---|---|---|---|---|
| C1 | Issue #131, August monitoring pivot branch | RETIRED | September | owner (no quote) | An old August attempt at the monitoring product was never merged; it is kept only as an archive tag and its five database tables are gone. | STALE |
| C2 | Voice, drafting and posting code | LOCKED as dead | Sept 18 to 22 | owner (no quote) | The old drafting and posting product is dead; the entry also holds a 22 September size audit of how much old code there was. | STALE |
| C3 | Clear the ground, completion | SHIPPED | Sept 24 | assistant | Records that the legacy code and 69,993 old database rows were deleted on 24 September, and that an earlier "all tables empty" claim was an assistant error. | STALE; TOO-DETAILED |
| C4 | Design tooling before a rendered choice | AUTHORIZED | Sept 28 | owner (quoted) | He allowed the design tool setup (shadcn skill, Studio, React Bits catalog) so you could "build toward something"; it was a one-time permission, not a purchase. | STALE; DESIGN-LEFTOVER |
| C5 | Design guidance for external CLIs is additive only | LOCKED | Sept 29 | owner (quoted) | When adding design guidance for other agents' command-line tools, never turn off anything they already have; only add. | |
| C6 | Reviewer additions remain read-only | AUTHORIZED | Sept 29 | owner (no quote) | Review agents may be given extra skills and research tools, but they stay read-only and get selected guidance, not whole plugin catalogs. | |
| C7 | New-account entry choices | REQUESTED | Sept 29 | owner (no quote) | He asked for sign-up with X, Google or email and password, then blank onboarding, then the feed; it says feature 151 must be amended first, which has since happened (see C17). | STALE |
| C8 | Fable plans; Astra drafts the detail once | SUPERSEDED | Sept 29 | owner (no quote) | An earlier 29 September planning arrangement that the next entry (C9) replaced; kept only as history. | STALE |
| C9 | Detailed planning pair and joint adjudication | LOCKED | Sept 29 | owner (no quote) | After he approves a plain plan, Fable and Astra each draft the detail, reconcile, then both answer the outside reviewers' findings together. | TOO-DETAILED |
| C10 | Reviewer skill coverage includes the product stack | LOCKED | Sept 29 | owner (no quote) | Reviewers should be able to load skills for AI Gateway, AI SDK, AI Elements and Supabase when relevant, still read-only; reviewer counts were left "under discussion". | TOO-DETAILED |
| C11 | Advice council keeps other providers and one outside voice | LOCKED | Sept 29 | owner (quoted) | The default advice panel drops Fable and Astra and uses Sol 6.1 (from Claude Code) or Opus (from Codex) plus Gemini, Grok, Kimi, GLM and Muse. | SUPERSEDED-UNMARKED; CONTRADICTS #12 |
| C12 | Retain Astra in advice and feature/amend | LOCKED | Sept 29 | owner (quoted) | He put Astra back as the advice default and in feature and amend critique, listing the exact reviewer rosters for each stage. | TOO-DETAILED |
| C13 | QC retains Astra alongside Sol | LOCKED | Sept 29 | owner (quoted) | Automatic quality checking uses nine named reviewers, Astra added back next to Sol. | TOO-DETAILED |
| C14 | Visual annotation interpretation in project instructions | LOCKED | Sept 30 | owner (quoted) | When he sends dictated visual comments, agents read them as intent and treat selectors and screenshots as evidence; this lives as a short rule in the project AGENTS.md, not a hook or global file. | |
| C15 | React Bits Pro access and toolkit | AUTHORIZED | Sept 30 | owner (no quote) | Pro was bought; its license key is pulled into ignored env files and its skill exposed to agents, alongside shadcn and AI Elements. | AGENT-ADDED?; TOO-DETAILED |
| C16 | Lane checks and evidence | OWNER-REPORTED | Sept 30 | owner (no quote) | He says he manually checked every review lane and all work; automated checks are recorded as separate evidence. This is a status report, not a decision. | AGENT-ADDED? |
| C17 | Signup-first source status | RECORDED | Sept 30 | assistant | A status note: feature 151 code supports X, Google and email sign-up with 31 steps built, and no clean QC or owner acceptance is established. Status belongs in state.md, not here. | AGENT-ADDED?; STALE |
| C18 | Focused records and Git cleanup | AUTHORIZED | Sept 30 | owner (no quote) | One-time permission to compact the instruction files, fix conflicting records, push 151 and prune obsolete branches (no main deletion, no force-push). | AGENT-ADDED?; STALE |
| C19 | Compact operating instructions | (none; dated entry) | Sept 30 | owner (no quote) | AGENTS.md must stay under 9,000 characters and bytes, with detail pushed into reference files. | AGENT-ADDED?; TOO-DETAILED |
| C20 | Retained branches | CONFIRMED | Sept 30 | owner (no quote) | Keep only beta, main and ft/151; other branches are removed after preserving them (verified: the repo now has exactly those three). | AGENT-ADDED? |
| C21 | Old theming guidance removed; reference-led-design is the method | LOCKED | Oct 2 | owner (quoted) | All old palette, font and theme guidance is deleted; visual work follows the reference-led-design skill and his own words, and older design rulings no longer bind. | |
| C22 | Three feed directions accepted, none chosen | OPEN | Oct 2 | owner (quoted) | Window, Newsroom and Deck all work in dark and light; he cannot yet pick one. | |
| C23 | Functional color is allowed | LOCKED | Oct 1 to 2 | owner (quoted) | Color is fine when it carries meaning (green healthy, amber warning, red failure), not as decoration. | |
| C24 | The feed carries the design; the landing follows | LOCKED | Oct 1 | owner (no quote) | Visual themes are worked out on the feed page, and the landing page is derived from that. | |
| C25 | Reading without clicking, balanced by subtraction | LOCKED | Oct 2 | owner (quoted) | Every page shows its content without clicking or scrolling, and the feed shows several stories at once, but the way to get there is removing things, not adding them. | |
| C26 | Theme exploration only when he asks | LOCKED | Oct 2 | owner (no quote) | If he dislikes the theme or accent, the agent asks before starting a separate color exploration, and never explores by default once a theme is fixed. | AGENT-ADDED? |
| C27 | References only from platforms he names | LOCKED | Oct 2 | owner (quoted) | Design inspiration may come only from products he has named (Linear, Supabase, Vercel, Ramp, Stripe, X, Facebook, Perplexity Discover, Feedly). | |
| C28 | A report is one input from one unique source | LOCKED | Oct 2 | owner (quoted) | "Report" means one input from one source (tweet, article, repository); cards name the kind and never show two different counts side by side. | |
| C29 | All sources are equal inputs | LOCKED | Oct 2 | owner (quoted) | GitHub and Product Hunt are ordinary sources like X, RSS and websites, which conflicts with the earlier plan of separate daily digests. | CONTRADICTS earlier digest entries (line 15, and line 171 on star thresholds in the digest) |
| C30 | Status tiles for glanceable state | LOCKED | Oct 2 | owner (quoted) | He picked "number 3" of the council's options for small tiles showing state at a glance; the options themselves are not in this file. | |
| C31 | Images when balanced | LOCKED | Oct 2 | owner (quoted) | A story card can show an image when one exists, and cards with and without images must look right together. | |
| C32 | Google News feeds by recommendation and user approval | LOCKED | Oct 2 | owner (quoted) | The agent may suggest a Google News feed, but the person must approve adding it. | |
| C33 | Articles rewritten into credited cards | LOCKED | Oct 2 | owner (quoted) | Articles are rewritten into cards in our own wording while still crediting the original writer. | |

## Counts

Entries: 33.

Decided by: owner (quoted) 17 (C4, C5, C11, C12, C13, C14, C21, C22, C23, C25, C27, C28, C29, C30, C31, C32, C33); owner (no quote) 14 (C1, C2, C6, C7, C8, C9, C10, C15, C16, C18, C19, C20, C24, C26); assistant 2 (C3, C17); unclear 0.

Flags (a row can carry two): blank 14; STALE 8; TOO-DETAILED 7; AGENT-ADDED? 7; CONTRADICTS 2 (C11, C29); SUPERSEDED-UNMARKED 1 (C11); DESIGN-LEFTOVER 1 (C4); DUPLICATE 0. 19 rows carry at least one flag.

## Notes beyond the flags

- C14 restates what is already in the project AGENTS.md "Visual feedback" section, so the entry could shrink to one line pointing there (not flagged DUPLICATE because the duplicate is outside decisions.md).
- C11 and C12 disagree on the advice default (Sol versus Astra) and C11 is not marked superseded. C12 does say it replaces the "advice Sol default", so the pair resolves to C12, but C11 stays in the file with LOCKED on it. The older "Tooling" section (line 117, outside this part) still says council runs ten lanes plus Muse and QC coordination is Sonnet medium; C12 and C13 say eight and nine, so those lines conflict with this part and carry no SUPERSEDED mark.
- C10 ends with "reviewer counts ... remain under discussion", which C12 and C13 settled the same day.
- C21 says earlier palette, font, theme and direction rulings no longer bind. Those older rulings (for example lines 19 and 20, "Text fills its container" and "The logo links home", and line 161 on the design system changing only on his word) still sit above in the file without any mark; they are DESIGN-LEFTOVER candidates for the other parts' reviewers.
- C16, C17, C18 and C20 are status reports or one-time permissions, not durable decisions; they are the entries most likely to be removable without losing anything the owner decided.
- C26 and C27 are rules about how agents behave; C27 has a quote, C26 does not.

## Git evidence (who and what added the AGENT-ADDED? entries)

All commits are authored under the owner's own git identity ("Farzan Mirza", the same name on every commit), so the author field does not show whether the owner or an agent wrote the text. The only useful signals are the commit messages and trailers. `git blame -L 175,228` plus `git log -L` give this line-to-commit map:

| Entry (line) | Commit that added it | Date | What the commit message says | Cites the owner? |
|---|---|---|---|---|
| C15 React Bits Pro (203) | f1da394 | 2026-09-30 | Subject only: "meta: align Pro guidance and simplify feature execution". No body. | No. Neither decisions.md nor an owner instruction is mentioned. |
| C16 Lane checks (204) | f1da394 | 2026-09-30 | Same commit and message as C15. | No. |
| C17 Signup-first status (205) | f1da394 | 2026-09-30 | Same commit and message as C15. | No. |
| C18 Focused records and Git cleanup (206) | f1da394 | 2026-09-30 | Same commit and message as C15. | No. |
| C14 Visual annotation (198) | f1da394 | 2026-09-30 | Same commit and message as C15. | No (but the entry itself quotes him). |
| C19 Compact operating instructions (208) | 62c5d53 | 2026-09-30 | Subject only: "docs: record verified workflow and branch consolidation". No body, no trailer. | No. |
| C20 Retained branches (210) | 2170c23 | 2026-10-01 | Body says the owner ordered design theming rules removed and that decisions.md gained "the owner's dated October 1 to 2 design rulings". It does not mention branches. | No for this entry. The commit's owner citation covers the design rulings only. |
| C26 Theme exploration (221) | 2170c23 | 2026-10-01 | Same commit; its body does cite the owner's design rulings and the evidence files, with trailer "Co-Authored-By: Claude Opus 5.5". | Partly. The commit cites "the owner's dated October 1 to 2 design rulings" as a group, with the evidence file OPEN-ITEMS.md, but the entry has no quote. |

Supporting commits for context:

- C6, C7 (lines 185, 186) and C9 to C13 (190 to 197): commit 2b93bac, 2026-09-29, "Owner-authorized edits made in the design-delivery chat", trailer "Co-Authored-By: Claude Fable 5.1". It is the one commit in this part whose message states owner authorization, and it lists the planning protocol, the eight-lane critique and nine-lane QC rosters. This matches C12 and C13 in content.
- C4 (181): commit 021fe9a, 2026-09-28, "meta: connect official shadcn and design catalogs to feature flow". No body.
- C1, C2 (177, 178): commit 3cc4d5e, 2026-09-24, the feature commit "clear the ground" (#148). C3 (179): commit b0f2430, 2026-09-24, "docs: #148 shipped ... the inventory error corrected". These were agent work recorded the same day as the deletion.
- 2170c23 also edited lines 190 to 192, 203 to 206, 210 and 216 to strip design theming text, so these entries were touched after they were first written; the removed wording is retrievable at 867c023 or the tag archive/design-theming-2026-10-02.
- `git blame` shows the section header "September 30 tooling realignment" (line 201) and the whole October section were added in 2170c23, whose message says it moved the design rulings in so "the pointers lead somewhere".

Conclusion on provenance: nothing in the commit messages for C15 to C20 shows the owner asked for those entries to be added to decisions.md. Entries C14, C19 and C20 may reflect his real statements (C14 quotes him, C20 repeats a dictated branch name) but the commits that stored them do not say so, which fits his suspicion that agents record from chat without a "lock this in" instruction.

## Checks done against the repo

- Branches present: beta, main, ft/151 (local) and origin counterparts. C20 matches reality.
- Archive tags named in C1, C3 and C21 exist (archive/ft-131-monitoring-pivot, archive/legacy-drafting, archive/design-theming-2026-10-02).
- The evidence files cited by C15, C16 and the October section exist under scratch/ (reactbits-pro-setup/lane-audit.md, design-recovery/focus-review/); scratch/tooling-sync-2026-09-30/request.md exists too.
- Not verified: the owner quotes themselves (no transcript was searched), and whether the 31-step build in C17 is committed as claimed beyond the five commit hashes named there.

# decisions.md cross-check (all three parts together)

Read-only. Nothing in the repo was edited. Row numbers (A, B, C) are the inventory rows in part1.md, part2.md and part3.md; "L" numbers are line numbers in docs/references/decisions.md. File content and git history were treated as data. Quotes are copied from the file.

The file has 171 entries: A1 to A49 (The product, Onboarding algorithm, Downstream algorithm), B1 to B89 (Models and the Gateway through Tooling), C1 to C33 (Legacy code through the October design restart).

Who decided, across all 171: owner with his words quoted 75, owner named but nothing quoted 59, assistant 19, nobody named 18.

## Corrections to the inventories

- Part 2 note 5 says B85 (L168, the build process) names "stock shadcn Mira" and "Claude Design". The current file does not. A search of decisions.md for "stock", "Claude Design" and "Mira" finds nothing. Those words were removed in commit 2170c23. So the DESIGN-LEFTOVER flag on B85 is wrong and the "no longer true" part of B85 is only the worktree claim (X12 below).
- Part 3 flags C7 as stale because 151 "has since been amended". That is true, but C17 (L205) is the entry that says so, and C17 tells the reader to treat the older records as history. The two entries are consistent only if you read both. See soft tension T4.

## 1. Entries that contradict each other

Hard contradictions: two entries cannot both be current. "Later" means which one carries the newer date. In the "older entry marked?" column, no means the older entry says nothing about being replaced.

| # | Rows | What each says | Later | Older entry marked? |
|---|---|---|---|---|
| X1 | A2 (L10), B24 (L99), B87 (L171) against C7 (L186) and C17 (L205) | A2: "No account to start. LOCKED (September 19, owner). Handle plus one sentence builds a page." B24: "no claiming; paying through Stripe checkout is the sign-up". B87: "a sign-in with an email that has no agent leads to the landing box". C7: "allow X, Google, and native email/password sign-up, then blank onboarding". C17: current 151 code does exactly that. AGENTS.md: "151 makes entry sign-up first." | C7 (Sep 29), C17 (Sep 30) | A2: only its second half. B24, B87: no. roadmap.md line 9 does call the Sep 28 journey "historical where it conflicts with 151"; decisions.md never says so. |
| X2 | B26 (L101) against B87 (L171) and B89 (L173) | B26: "$200 a day on anonymous builds" and the AI Gateway budget "is a hard stop". B87: the $200 "is a total, not a day". B89: the Gateway budget "is a soft cap ... Corrects the 'hard stop' wording of the Public spending line above." | B87, B89 (Sep 28 night) | B26 not changed. roadmap.md lines 95 and 145 still say "daily cap of $200". Also B26 guards "anonymous builds", which X1 removes. |
| X3 | A23 (L34) against A29 (L40) and B82 (L165) | A23: "Handle lookup against X's API at onboarding. REJECTED (September 19, owner)." A29: "Code reads the profile". B82: "A handle with no X account shows 'Handle not found'". | A29, B82 (Sep 27) | No. |
| X4 | A3 (L11) and A29 (L40) against A30 (L41) | A3: "Ten sources shown, at least five X accounts recommended". A29: "up to ten sites and feeds and at least five accounts". A30: "'10 in total', not 20". The Liam run in A30 gave 9 sites plus 8 accounts. So is ten the total, or ten sites plus five or more accounts? | A30 (same evening as A29) | No. |
| X5 | A34 (L45) against B87 (L171) and A32 (L43) | A34: "NOT RULED ... OPEN for his call". B87: "the profile request trimmed and the affiliation fetch dropped". | B87 (Sep 28 night) | No. |
| X6 | A45 (L59) against B87 (L171) | A45: "OPEN ... Ruling needed". B87: "onboarding ends with a detailed brief on the person, saved once, read by Jev in every judgment". | B87 | No. |
| X7 | B11 (L80) against B87 (L171) | B11: "Where website polling runs and how often. OPEN". B87: "sites and feeds polled every minute". | B87 | No. B10 (L79) covers the X-account half and repeats the cadence. |
| X8 | A7 (L15) against B87 (L171) and C29 (L224) | A7: GitHub and Product Hunt are "optional switches ... Star-threshold alerts ... were parked by the assistant". B87: "GitHub star thresholds are in the digest". C29: "GitHub by itself is not a separate thing from the sources. It is also a source." and says today's separate digest (issue 136) is pending change. Three different answers on one topic. | C29 (Oct 2) | No. L127 and L131 still call #136 "tabled" while L167 says "#136 ... stays open". |
| X9 | A8 (L16) against B87 (L171) | A8: "The five test people get links; the owner builds their monitors himself." B87: "the owner and Kush start from the blank landing page like strangers, the warm DMs go to the three creators, no special seats". | B87 | No. |
| X10 | B12 (L81) against A29 (L40) | B12: onboarding "runs as a plain AI SDK tool-loop agent ... APPLIED September 27". A29, the same evening: "Removed: all nine tools". B12 cites `app/api/onboarding/route.ts` with an 800-second limit; that file does not exist (see section 3). | A29 | No. A29 only says it supersedes "the lines above". |
| X11 | B44 (L127) and B48 (L131) against B84 (L167) | B44 and B48: five issues #143 to #147 as the build order. B84: "Replaces the five-issue build order of September 23". | B84 (Sep 28) | B84 says so about roadmap section 13. B44 and B48 do not. |
| X12 | B70 (L153) and B85 (L168) against AGENTS.md line 38 and the run-plan skill | B70, B85: "worktrees and parallel builds are allowed". AGENTS.md: "Component branches or worktrees require an explicit owner request." run-plan SKILL.md line 33: "No component branch or worktree is created." roadmap.md line 122 still says "builds them in parallel worktrees". | AGENTS.md and the skills (the Sep 30 compaction) | B85 is not marked. decisions.md holds no dated owner word reversing his Sep 28 ruling, so the owner should say which one stands. |
| X13 | B35 (L117) against B34 (L115) | B35: models "pinned" at `claude-opus-5-5` and so on. B34: use aliases `opus`, `fable`, `sonnet`; "Supersedes only the Claude version pins in the earlier September 29 ruling below." | B34 | B34 points at it; B35 itself is unmarked. B74 (L157) alias line is also unmarked. |
| X14 | B35 (L117) against C12 (L195) and C13 (L197) | B35: "ten lanes" and "Automatic QC coordination is Sonnet 5.5". C12: critique is eight reviewers. C13: "QC runs nine reviewers". The code agrees with C12 and C13 (review-lanes.md line 12). | C13 | No. |
| X15 | C11 (L193) against C12 (L195) | C11: "LOCKED ... Default advice from Claude Code is Sol 6.1". C12: "Keep Astra as the default" and "supersedes the advice Sol default". Same day. | C12 | C11 not marked, still says LOCKED. |
| X16 | C10 (L192) against C12 and C13 | C10: "Reviewer counts ... remain under discussion". C12 and C13 settled the counts the same day. | C12, C13 | No. |
| X17 | B6 (L72) against C12 and C13 | B6: "Review lanes: Grok 4.7 Build Fast and Gemini 3.8 Flash everywhere." Review rosters are now eight and nine named lanes. | C12, C13 | No. |
| X18 | B46 (L129) against B69 (L152), and B53 (L136) | B46 (Sep 23): "one PostHog alert ... to Slack". B69 (Sep 24): "the PostHog alert from the assistant. DROPPED (owner: 'no need to bother about it')". B53 (Sep 22): assistant says "nothing now" for tests; B46 a day later proposes some. | B69 | B46 not marked. |
| X19 | B54 (L137) against B76 (L159) | B54: "OPEN: add ... a `billing` row". B76: "A payments bundle. LOCKED" (and B54 itself says the payments row replaced the billing idea). | B76 | B54 keeps the OPEN recommendation. |
| X20 | C7 (L186) against B61 (L144) | C7: "This supersedes his earlier X-only intent". B61 (Sep 24): "Login is email, Google and X". roadmap.md line 77 also says X, Google or email (owner, Sep 14). So the earlier intent was not X-only. | C7, but its premise is wrong | n/a |

Soft tensions (not strictly contradictory, but a reader will trip):

- T1. A21 (L32) "Qwen anywhere in onboarding. REJECTED" against A47 (L61) "The writer model ... Qwen 3.7 Flash". Different stages, but nothing says so.
- T2. B68 (L151) "Skill exposure and the bundle-check hook. REJECTED ... 'too much complication for no damn reason'" against C6 (L185) and C10 (L192), which add selectively exposed skills for reviewers.
- T3. A11 (L19) "Text fills its container", A12 (L20) "The logo links home" and B78 (L161) against C21 (L216): "earlier palette, font, theme and direction rulings no longer bind". Which of A11 and A12 survive is not stated. B78 survives: DESIGN.md and AGENTS.md still repeat it.
- T4. C7 (L186) "approved feature 151 must be amended before implementing it" against C17 (L205), which says 151 is built. C7 is not marked stale.
- T5. A17 (L28) "under 0.35 ... dropped" (ranking a source) and A44 (L58) "under 0.35 is off" (judging an article). Same number, two jobs.

All 20 hard contradictions leave the older entry without a SUPERSEDED mark. Eight of the twenty (X5, X6, X7, X10, X13, X15, X16, X17) are cases where a newer entry plainly answers or replaces an older one and nobody went back.

## 2. Duplicates across sections

Clusters of entries that repeat the same decision. The "keep" column is a suggestion for you to accept or reject, not an action taken.

| # | Rows | Same decision | Suggested keep |
|---|---|---|---|
| D1 | A10 (L18), B29 (L107) | Never send the same item or story twice | B29 |
| D2 | A5 (L13), A7 (L15) | Email Product Hunt at the first paying user | A5 |
| D3 | A39 (L53), A46 (L60) | 72-hour window, 0.75 join line, 0.75 adds line | A39 |
| D4 | A37 (L51), A43 (L57) | Card shape and pipeline | A43 |
| D5 | A19 (L30), A28 (L39) | No web search in onboarding | A28 |
| D6 | B9 (L78), B60 (L143) | Railway is gone | B60 |
| D7 | B32 (L110), B66 (L149) | Bot handle and domains stay | B32 |
| D8 | B44 (L127), B48 (L131) | The five issues (and B84 ended both) | B84 only |
| D9 | B10 (L79), B11 (L80), B87 (L171) | Polling cadence | B87 plus B10's reasons |
| D10 | B26 (L101), B87 (L171), B89 (L173), A6 (L14) | Spend caps and the Gateway budget | one rewritten entry |
| D11 | A34 (L45), A45 (L59), B87 (L171) | Profile trim and the brief on the person | B87 |
| D12 | B40 (L123), B52 (L135) | No browser-walking verify step | B40 |
| D13 | B34, B35, B74, B6, B36, B71, B83, C11, C12, C13 | The review and council roster, ten entries, seven dates | C12 and C13 only |
| D14 | B62 (L145), C1 to C3 (L177 to L179) | The legacy teardown (#131, drafting code, "clear the ground") | C3 or none |
| D15 | A25 (L36), B81 (L164) | Pictures reach the model; B81 belongs under Onboarding | merge |
| D16 | C14 (L198) and the AGENTS.md "Visual feedback" section | Same rule written twice | AGENTS.md |
| D17 | C19 (L208) and the first line of AGENTS.md | The 9,000 character ceiling | AGENTS.md |

Misfiled: B81 (L164) and B82 (L165) are onboarding rulings sitting in the Tooling section.

## 3. Entries that describe things no longer true (checked against the repo)

Verified by search or by reading the referenced file on 2026-10-01:

- A35 (L46) says the `WALKTHROUGH_STEPS` switch in `lib/onboarding/engine.ts` is set to 1 so "the page today runs only the X lookup". The switch is gone: a search of the whole repo finds it only in decisions.md and the state-history file. The entry's own "scaffolding the build removes" is now done.
- B12 (L81) cites `app/api/onboarding/route.ts` with an 800-second limit. `app/api/onboarding/` does not exist. The 800-second limit is now on `app/api/cron/digests`. `lib/onboarding/` holds five files (content, engine, prompts, run, types); there is no tools folder and no `checker.ts`, matching A29.
- A31 (L42), B81 (L164) and B82 (L165) point at `seed()` in `lib/onboarding/engine.ts`. There is no `seed()` there now; the profile read is `lookupProfile`, and the "Handle not found" text is `HANDLE_NOT_FOUND` in `lib/onboarding/types.ts`. The behavior matches; the pointers are stale.
- B70 (L153) and B85 (L168): worktrees. See X12.
- B86 (L169) says `scratch/` was deleted from the working tree. It exists again with about 16 folders. It is git-ignored, and decisions.md cites files inside it as evidence (B88, C15, C16, the October section), so a fresh clone cannot see that evidence.
- B39 and B40 (L122, L123) cite "state.md section 4" and "section 2". state.md was rewritten on Sep 30 with five different headings; the old text is in state-history-2026-09-30.md.
- B35, C11, C12 (rosters): the code in `~/.agents/skills/council/scripts/council.py` matches C12 for advice. Its critique default is Sol, Astra, Gemini Pro, Gemini Flash, Grok, Kimi, GLM, Opus, Sonnet, and carries a comment "Fable paused from critique defaults (owner, 2026-09-30)". That owner ruling is in the code only, not in decisions.md.
- The file header (L3) says "Updated September 28". The last entry is October 2. L5 lists four status words (LOCKED, REJECTED, LATER, OPEN) and says every line ends with who decided. The file actually uses about 20 status words, and many lines name nobody.
- A9, B24, B44, B48 describe the day-three stop and claiming rules; roadmap.md lines 129 to 133 and 144 still carry the same old text outside this file.

Checked and still true: B59 hook exists (`.claude/hooks/feature-flow.sh`); the council skill is at `~/.agents/skills/council`; C20 (only beta, main, ft/151 exist locally); the five commit hashes in C17 exist; archive tags in C1, C3, C21 and B86 exist; A1 and A15 notes that `TYPESAFE_KEY` and `BRIGHTDATA_API_KEY` are unused (nothing in tracked code reads them).

## 4. Implementation notes or logs, not decisions

About 45 of 171 rows are not a decision the owner made.

Records, test reports and measurements (16): A36 (cost measured), B17 (how Supabase is wired), B47 (smoke test of lanes), B67 (temporary links), B77 (account created), B79 (two QC findings parked for issues that no longer exist), B88 (live DM check), B89 (a correction), C1 (retired branch), C3 (clear the ground completion), C16 (lane checks, "OWNER-REPORTED"), C17 (status of 151), B31, B51, B57 (removal history).

One-time permissions and housekeeping (12): C4, C6, C15, C18, C19, C20, B63, B64, B65, B66, B72, B86.

Mechanics too detailed for a decision list (17): A24, A31, B10, B18 (a long August history), B27, B35, B38, B42, B71, B80, B87 (about two dozen separate rulings in one bullet), B12, C9, C10, C12, C13, A20 (three rewrites stacked in one entry).

## 5. Entries with no owner attribution that read like an agent wrote them from chat

44 rows, about a quarter of the file. Evidence for the pattern:

- Git: the whole ledger was created in one commit, a0da26e (Sep 23), written as a "compile" of git history and docs. 29 commits have touched the file; two are "feat:" code commits (f925014, 3cc4d5e). Every commit has "Farzan Mirza" as author and a Claude co-author line, so authorship cannot separate his words from an agent's.
- Instruction text: AGENTS.md line 13 tells agents to "append dated owner decisions". That is a standing license to write here without him saying "lock this in". The file header (L5) also lets an entry be "assistant (a design he has not confirmed)".
- Quoting risk: AGENTS.md also says to "Quote existing decisions.md rulings rather than re-arguing". An agent-written entry therefore gets quoted back to you as if it were your ruling.

5a. Written as the assistant's own (19): A24, A28, A34, A37, A49, B11, B12, B14, B15, B19, B20, B21, B39, B46, B53, B54, B72, C3, C17.

5b. Nobody named as deciding (18): A14, A18, A19, A22, A36, A45, B3, B5, B13, B17, B31, B47, B51, B52, B57, B67, B79, B89.

5c. Say "owner" with no quote, and the commit that stored them does not cite him (7): B27, C15, C16, C18, C19, C20, C26. Commits f1da394 (C15 to C18), 62c5d53 (C19) and 2170c23 (C20, C26) have subject lines only or cite the design rulings as a group.

Nine of these are assistant questions parked in the file as "OPEN" or "recommendation": A34, A45, A49, B11, B14, B20, B46, B53, B54. They are agent notes sitting among your rulings.

A further 52 rows say "owner" without a quote and lean on sources that cannot be checked from the file (the deleted Sep 19 spec, roadmap.md). Many of them are probably real; the file cannot prove it. Only 75 rows carry your own words.

## 6. What is missing: a clear list of what you TABLED, apart from what you LOCKED

The file has no tabled section. The word "tabled" appears in only two entries (B44 and B48). One entry is marked LATER (B30) and six say OPEN. Deferred items are scattered through the text, and several "OPEN" ones were answered later (A34, A45, B11) and never closed.

Everything the file itself shows as deferred, parked or undecided, grouped by who parked it:

Parked by you, "later" or "tabled" (11):
- Email (Resend) and Slack as cheaper channels (B30).
- Five items "LATER at his word" inside B87: a skipped item flipped back, re-reading edited articles, typed corrections, a beat without a handle, joining sign-in methods.
- The tests-and-alerts thread, which you "let go" but asked to keep (B46).
- GitHub and Product Hunt digests, issue 136 (L127, L131, L167), now clouded by C29.
- Ads (L127, and X Ads launch stays yours alone, B55).
- A fourth tier, waits for a first payer (B23).
- Creator alerts every 2 hours, "if asked" (B29).

Parked by an assistant, not by you (8): A34 profile trim (answered by B87), A45 what Jev is told (answered by B87), A49 four proposals (second judgment on a DM, daily item budget, demoting an off-beat source, a share link), B11 polling (answered by B87), B14 every monitor as an agent loop, B20 Stripe metered billing, B53 testing going forward, B54 extra skill bundle rows.

Waiting on a ruling from you (4): C22 pick one of Window, Newsroom or Deck; C28 the Product Hunt kind name; C29 the "all sources equal" change against today's separate digest; C25 the Window and Newsroom changes for reading without clicking.

Not authorized, so effectively blocked (3): quota-based gating, reset-credit use and timed model switching (C12); deleting main (C18); launching any X Ads campaign (B55).

Other things the file lacks:
- No marker for "owner confirmed this exact wording" versus "assistant wrote it from chat".
- No consistent "replaced by row N" field; supersession is buried in prose, and 20 of 20 hard contradictions above are unmarked on the older entry.
- No separate place for logs and status notes (about 45 rows).
- Tooling is in reverse date order in places (L115 above L117) while the rest is forward.
- A current-year header that matches reality (Oct 2, not Sep 28).

## Counts

- Entries: 171 (A 49, B 89, C 33).
- Hard contradictions: 20. Soft tensions: 5. Older entry left unmarked: 20 of 20.
- Duplicate clusters: 17. Misfiled entries: 2 (B81, B82).
- Stale or not-true-now items verified in the repo: 9 groups, listed in section 3.
- Not decisions (records, one-time permissions, over-detailed mechanics): about 45 rows.
- No owner attribution or agent-like: 44 rows (19 assistant, 18 nobody named, 7 owner-named but commits do not cite him).
- Tabled, parked or waiting items: 26 (11 yours, 8 assistant-parked, 4 waiting on you, 3 blocked), with no home in the file.
