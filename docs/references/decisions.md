# Rejected and reversed decisions

What the owner rejected or reversed, and why. Never edit, add to or remove from this file: bring any proposed change to the owner, and change it only after he explicitly authorizes that exact edit in chat. A reversal restructures the entry it reverses.

## Product

- **Drafting, voice guides and posting to X.** Dropped September 14: "we are intentionally planning on switching oparax to a monitoring-only product". Nobody had reacted to monitoring output or paid, so the product narrowed to watching, judging and alerting.
- **No account to start** (September 19: a handle and one sentence build a page, an unclaimed monitor stops at day three, payment is asked by DM on day seven; September 28: nobody claims a page and paying through Stripe checkout is the sign-up). Reversed October 2: "Sign-up first wins." A person signs up first, then onboards, then sees the feed.
- **Special seats for the test people** (September 19: they get links and the owner builds their monitors). Reversed September 28: the owner and Kush start from the blank landing page like strangers; no special seats.
- **More than one agent per account, teams, crawling the web, news APIs, further discovery experiments.** Rejected September 19; not in the plan. Chat-first agent creation was rejected July 22 for a plain form with a live preview (no reason recorded).

## Money

- **A $29 price.** Rejected September 19: "Drop that price of $29. We have not decided on any." Replaced September 28 by the three tiers.
- **The $200 build budget** (September 28, first a day, then a total). Rejected October 2: "No need for the $200 build budget. I don't even know where the fuck that's coming from." The code still enforces a build budget (for example `config.build_budget_usd` and `admit_build`); removing it is product work.
- **Auto top-up of X credits.** Rejected September 28: "I'm not switching on auto top-up at all."
- **Stripe through the Vercel marketplace.** Dropped September 24: the owner opened a direct Stripe account.

## Onboarding

- **Grok-based onboarding and the Luna tool-loop agent** (Grok 4.7 reading the person and filling gaps, September 18 to 21; then a nine-tool agent with link reading, source checking and a row writer). Replaced September 27 by three fixed steps: "I've overcomplicated for no damn reason ... Any and all tools that come after this or that were causing the complications, get rid of them"; "get rid of the website also".
- **A step-by-step rebuild of onboarding from scratch.** Rejected September 27: rebuilding is "just not prudent"; the code was cleaned instead.
- **Web search in onboarding.** Rejected September 14 (Grok's search cost three to five times Perplexity's for no better picks) and dropped September 27 under his "get rid of anything in onboarding causing us issues": code could not enforce its search cap.
- **X search as a default step.** Rejected September 18: about 23 cents a build. One conditional X search remains, and handles come only from real data because the model invents handles with full confidence.
- **Jev as a tool the model calls, and removing Jev.** Rejected September 18: each tool round trip makes the model re-read its whole context, where the cost was, so Jev runs in code. Removing Jev was reversed twice: September 17 to 18 (reason not recorded) and in the September 27 cut ("Introduce Jev again for the table scoring").
- **Qwen anywhere in onboarding.** Rejected September 19: six of eight rows it wrote carried an invented or wrong detail, and a wrong fact in the shared table misleads every reader. (Qwen 3.7 Flash writes feed cards; that is a different stage.)
- **No handle lookup against X and no image reading at onboarding** (September 19). Both reversed September 27: a missing handle is "a form validation error: handle not found", and "if images or freeze frames for GIFs or videos are not being fed to the model, then this is useless".
- **Reading linked PDFs** (September 26: up to 10 pages). Rejected September 27: "We introduced it for no damn reason, causing complications".
- **Giving the model the person's X location.** Dropped September 27: a profile location misleads (Reshad's is set to Dubai while his beat is Barcelona).
- **Quoted or mentioned accounts qualifying as sources by that alone.** Rejected September 27: "just being quoted or mentioned doesn't automatically qualify it for being recommended as a source".
- **Bright Data's X dataset.** Rejected July 25 and September 17: X served it a sign-up wall and it returned zero posts, it fetches by handle only, and its license bars competing products.

## Feed and sources

- **GitHub and Product Hunt as a separate daily digest** (September 19 and 28). Reversed October 2: "on GitHub and Product Hunt, they are sources like any other." Today's code still has the separate digest (issue 136).
- **Cards written from a feed's title and summary only.** Rejected September 19: "Why the fuck would cards be written from feed's title and summary?" The full article is fetched.
- **Cutting article text** (6,000 characters to the models, 20,000 kept). Rejected September 26: no cut anywhere.
- **Translating items before Jev.** Rejected September 19: 23 of 23 Catalan and Spanish items were judged as well in their own language.
- **A 0.75 line for Jev's checks.** Rejected for the support and headline checks September 21 ("apply ur 0.5 for jev"; 0.75 rejected 40 to 55 percent of correct paraphrases) and for article fit September 28 (0.75 skipped a third of one person's relevant articles).
- **A second model as fact checker.** Rejected September 28: "Jev can be a pretty good check".
- **Single-source cards first, grouping later** (September 22). Reversed September 28: grouping is in this build ("that stays. Obviously, that's a part of this").
- **Re-alerting when a story's card changes, and instant alerts.** Rejected September 28: one DM per story, ever, with a link to the story on the page.
- **An "honest identity" user agent for fetches.** Rejected September 19: it was the assistant's rule, not his; fetches use the browser identity.

## Models and services

- **Claude Sonnet for onboarding.** Rejected September 17 to 18 for Grok, whose built-in X search read the person (Grok was in turn replaced by GPT-6 Luna fast, September 27).
- **eve as the framework.** Rejected July 13: it could not deploy at all, or streamed unusably slowly (vercel/eve#693).
- **Clerk for sign-in.** Rejected September 22: "obviously it makes sense to just stick with Supabase".
- **Railway.** Removed September 12 and again September 24: "Railway is out of our stack... get rid of all the code related to it and all skills".
- **Sentry (August 18) and vitest unit tests (May 21).** Removed; no reason recorded. PostHog replaced Sentry.

## Tooling and process

- **Agents adding to this file, and a tabled-items list in it.** Reversed October 2: "AGENTS.md telling agents to append dated decisions is absolutely wrong"; "I decide what goes in decisions.md. It's not additive"; "my tabled items, no... I don't need that table over there."
- **Worktrees and parallel builds** (allowed September 28). Reversed October 2: "Worktree is not allowed, parallel is not allowed."
- **Five issues built in order** (September 23 and 24). Replaced September 28 by one feature: "I am done planning ... literally every single thing".
- **Deleting legacy code slice by slice** (the assistant's recommendation). Overruled September 24: clear the ground first so no session is biased by old code.
- **Keeping the labs in the working tree** (September 27: "leave them as they are"). Reversed September 28: archived to a tag and deleted.
- **A browser-walking verify step.** Removed August 8 to 10 and rejected again September 23: "Okay, no browser walking step". Screenshots came before load, it was blind to runtime errors, ports clashed and handoffs between pages were missed.
- **Skill exposure and a bundle-check hook.** Rejected September 24: "screw the skill setup... too much complication for no damn reason".
- **A live-facts snapshot in the lane brief, and the assistant's PostHog alert.** Dropped September 24: "no need to bother about it".
- **Disabling or pruning what external CLIs already have** (safe mode, catalog pruning). Rejected September 29: "do not disable anything they currently have active. Just add the new stuff."
- **cstack and pstack.** Rejected as installs September 23 (the assistant's call, he did not object): a rival flow and a repeat of the retired verify step.
- **Review lanes dropped.** The Terra lane, September 24: "just get rid of the old Terra lane completely from every lane". Cursor best-of-n, September 24: it picks one winner where a review wants every lane's findings. The Opus lane as a Claude subagent, September 29: CLI reviewers run the same review from Claude Code and Codex.
- **September 29 same-day reversals.** Pinned Claude versions ("For Claude, it makes sense to use the aliases for Claude, plain and simple"); Sol as the advice default and QC without Astra ("Keep Astra as the default in the default console, as well as in feature and amend critique"; "in the QC critique, add Astra also"); one Astra detailed draft, corrected to Fable and Astra each drafting and reconciling.

## Design

- **The old look: the navy/blue palette, "not green, red", the old fonts (Nunito Sans, Source Sans 3, JetBrains Mono, then Open Sans) and the Claude Design path with stock Mira.** Reversed by the October design restart: all of it was removed, and color is allowed where it carries meaning ("Color for functional stuff is fine"; green, amber and red for healthy, warning and failure).
- **The generic design skills** (frontend-design, design-review, web-design-guidelines, emil-design-eng, beautiful-shadows, react-bits-developer-tool; earlier framer-motion-animator and ui-ux-pro-max). Retired October 2: "Everywhere, anything design-related, you can get rid of it".
- **Text plan approval before any render for a change of look.** Reversed October 2: directions are rendered and judged first ("the less I have to see, the better").
- **Not recommending Google News feeds** (the host's legal caution). Overruled October 2: "Oparax can recommend that, and the user can authenticate that".
