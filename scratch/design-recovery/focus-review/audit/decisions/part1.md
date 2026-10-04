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
