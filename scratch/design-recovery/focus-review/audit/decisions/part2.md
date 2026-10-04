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
