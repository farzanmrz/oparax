# Open items and owner decisions after the accepted round (October 2, 2026)

Owner's message of October 2 (after the council's skill advice). Nothing here is applied to the renders yet: the owner said "Don't make any changes just as of yet."

## Decided by the owner
1. Naming: a "report" is one input from one unique source (owner: "Let's just call it one report: one input from a unique source"). Kinds: X items are tweets (his word; X itself says "posts"), websites and RSS feed items are articles, GitHub items are repositories, Product Hunt items to be named. Cards name the kind ("2 articles", "1 tweet, 1 article"); "reports" is the collective word between us and on the site where needed. Never show "2 Articles" and "2 reports" together (the Window render does; redundant).
2. Status tiles (question 5): accepted as the council framed it ("Number 3 is good").
3. Sources are equal inputs: X accounts, RSS feeds, websites, GitHub, Product Hunt (recorded earlier).
4. Window sidebar: remove the repeated "Feed" label on every source ("feed, feed, feed... That's useless"); add a small display toggle for X accounts, "Show name" or "Show handle"; make "3 more" read as a control (for example underlined) and make section headers more prominent, with icons like Feed and Digests have.
5. He likes the Supabase-style header (account switcher, breadcrumb) even if unneeded now. Light mode darkening the Oparax logo: "I guess that's fine."
6. Faint text (council issue 6): he cannot see a problem on his screen. Host to explain; treat as an accessibility fix, not a look change.
7. Council lanes for design work from now on: Astra, Grok, Kimi, plus agy (Gemini), Muse Spark and GLM.

## Open, needs discussion with the owner A. Reading without clicking (owner's major point): in Window and Newsroom the user must click to see each story; the product's promise is that the feed shows multiple stories, clustered or direct, without clicking. Deck already does. Changing Window and Newsroom to show several open stories at once changes their layout; only then can he judge whether the "how busy is my beat" chart still has a place (question 3 waits on this). B. Reports beside a story (question 1): he leans yes, with care about demonstration versus reality: real article text is long. Host to explain what a report row really shows (title, publisher, time, the short verbatim quote behind a fact, link out), and that full article text is never shown on the card. C. The skill: does step 1 pull his words with a script every time; does the board of outdated renders become a problem as criteria evolve; do the acceptance criteria adapt beyond this design; should the skill tell an agent to trigger council lanes (council is owner-invoked, and lanes also read the skill). D. How much the council contributed to the accepted result. E. Feature flow: it already has many design skills; possible conflicts with the new skill. F. AGENTS.md and references may leak outdated, conflicting or lost design guidance. Owner ordered a separate Sonnet workflow audit (read-only).

## Next, after the owner answers
1. Skill test: one Opus agent and one Sonnet agent, isolated, no conversation context, each generates an Oparax landing page with the skill, in separate folders (the owner wants to see whether the skill alone produces the same reaction). Prompt and inputs to be agreed with him first.
2. Then revise the three renders: naming, equal sources, sidebar fixes, Deck image balance, Newsroom headline truncation, Window hidden overflow, Deck count unit, openable "more facts", contrast of the dimmest tier, and the reading-without-clicking change (A).

## Owner, October 2 (later): direction for the skill, not yet applied
- Reading without clicking is imperative for the feed.
- Broaden references beyond Linear and Supabase so the skill learns a philosophy, not one site's style: Vercel, AI-based editorial sites, X and Facebook feeds (his accounts), Ramp (marketing site; no account), Stripe dashboard (his account, in-app browser). Concern stated: a narrow board biases toward one product style.
- The skill must hold the feel he loves even when his later words deviate: interpret new words through the captured philosophy rather than letting each new comment reset it. "The criteria don't have to adapt if we figure out what it is that produces the philosophy of design."
- Default design council (his list): GPT-6.1 Sol, Grok 4.7 fast, Gemini 3.1 Pro, Muse Spark, GLM, Kimi; effort high or medium. Council stays his call or this default.
- Landing test postponed until the site list, examples and skill structure are settled with him.
- He asked for answers before anything starts.

## Owner, October 2 (later still): philosophy corrections and orders
- Principle 5 (reading first) applies to every page, not only the feed: content visible without clicking and without scrolling. Balanced by subtraction: "the trick isn't adding stuff, it's taking away" (Facebook, X). Density that adds needless complexity is wrong.
- Principle 6 needs a routing rule: when he signals dislike of the theme or accent, the skill must say explicitly that this means entering a separate THEME or COLOR EXPLORATION MODE, and ask. That mode keeps the philosophy and must never produce the gray-on-gray or black-on-black variants he hated. Once the theme is fixed, no exploration happens by default. Light mode belongs to both the main skill and that mode.
- Editorial and AI sites: he asked the host to recommend (not serif newspapers).
- Logged-in captures via Claude in Chrome: X, Facebook, Stripe sandbox (UI only; account limited). Capture many different surfaces (feed, profile, explore, spaces, marketplace, groups) to see how different complex information is standardized.
- Default council confirmed: Sol replaces Astra; council tabled until the skill test shows agents can produce the work alone. GLM and Gemini have specific models.
- Faint text: before darkening, investigate whether darker text would clash with other elements.
- Ordered: remove ALL design theming guidance from the repository and commit. Host prepared a removal plan for his yes first (audit/REMOVAL-PLAN.md), because AGENTS.md requires an echo and yes for rule changes and product code must not break.
- Asked why the TypeScript LSP was replaced by a build hook.

## Tabled ideas (owner, October 2), to remind him later
- A public news portal as a separate new site (prompted by Particle News's idea, not its UI, which he called horrible).
- Going to enterprises with market intelligence (prompted by Feedly's Market Intelligence tier), at a much lower price than enterprise tools.
- Google News feeds as a source: checked October 2, the feed works without a key, but its copyright line says it is "made available solely for the purpose of rendering Google News results within a personal feed reader for personal, non-commercial use. Any other use of the feed is expressly prohibited." So not usable in a paid product as is.

## Owner, October 2: board coverage
- The logged-in captures were too shallow: the host captured only the surfaces he named (feed, profile, marketplace, groups) instead of exploring each product fully. He wants each product explored across all its surfaces.
- Perplexity Discover: "extremely close" to the functionality presentation he wants (cards that expand into the full story, topics). Headless capture failed; capture via Chrome.
- Editorial captures are still partly serif and not comprehensive enough.
- Owner rule (October 2): references come ONLY from platforms he names. "Don't introduce editorial examples for stuff I haven't mentioned. That's very dangerous. That's how you leak in information which is not coming from me." Host-added Particle, Readwise, Ground News moved to board-v2/_archive-not-owner-named/. Named so far: Linear, Supabase, Vercel, Ramp, Stripe, X, Facebook, Perplexity Discover, Feedly.
- Feedly checked in his Chrome: Market Intelligence Standard $1,600/month and Advanced $2,400/month, billed annually (feedly.com/market-intelligence/pricing). The news reader page says "Add your Google News feeds. Already following Google Keywords? No problem. Add them to Feedly" (the user adds them).
- Google News: owner's point that Oparax is also a personal feed reader stands partly; host was too absolute. Recorded as an open legal question, not a ruling.
- Owner rulings, October 2: Google News feeds may be recommended by the agent and added with the user's approval ("Oparax can recommend that, and the user can authenticate that"). Rewriting articles into credited cards is fine ("we're still crediting the original writer, and we're giving rewritten terminology... You're being extra careful for no damn reason"). Host's legal caution withdrawn as his call.
- Owner approved the repo removal plan, including his uncommitted AGENTS.md scratch line, commit and push to GitHub; then /council advises whether anything remains for the removal.
- Owner, October 2: retire all generic design skills ("anything design-related, you can get rid of it"). Host archived (moved, not deleted) to ~/.agents/skills-archive/2026-10-02-design/: frontend-design, design-review, web-design-guidelines, emil-design-eng, beautiful-shadows, react-bits-developer-tool (plus Claude's separate copies of frontend-design and web-design-guidelines); links removed from ~/.claude/skills and ~/.codex/skills; council manifest 28 to 22 skills, lanes refreshed. Kept as tooling pending his word: react-bits-pro, shadcn, ai-elements, accessibility. reference-led-design coexistence section updated.
- Owner: feature flow for any change of look renders and judges with screenshots like a human ("it's your call... the less I have to see, the better"); host's call yes. Feature 151 outdated design contracts: "remove it". One Opus editor applying both (archives .feature originals first). decisions.md review file sent: audit/DECISIONS-REVIEW.md (171 entries, 20 contradictions, 26 tabled items with no home).
