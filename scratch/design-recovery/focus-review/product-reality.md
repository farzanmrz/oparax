# Product and business reality (Sonnet reader, October 1, 2026)

F = verified from files, git or GitHub. I = reader's inference.

## Built and verified
- F: Feature 149 built the monitoring product, squashed into beta (`ec162ba`, issue #149 closed): onboarding by X handle and one-sentence beat with source recommendations; monitoring of sites, RSS and watched X accounts; grouping into stories; per-handle feed; one X DM per story from @oparax_ai; three Stripe tiers; free week; contact and waitlist; optional GitHub and Product Hunt digests.
- F: Feature 151 (issue #151, open) makes entry signup-first (X, Google, email); reached step 31 of 31 (`9b04ace`) plus four integration fixes.
- F: Verification is AI review rounds only (QC rounds 1 to 6 on #149, round 2 on #151). state.md: "no clean post-fix QC result or owner acceptance" for 151. The 149 history records the owner calling localhost pages "horrible" on Sep 28 and no completed owner walk.
- F: Only live proof: one real bot DM to the owner on Sep 28. Receiving DMs via the X webhook was never registered. Stripe sandbox only. Live X sign-in, email and alert delivery "confirmed only by your walk" (#151). Contact delivery unproven.
- F: Database today: 0 monitors, 0 items, 0 stories; 150 configured sources. The full pipeline has never produced output for a person.

## Deployment and ship path
- F: Production (main, oparax.ai) is a placeholder homepage plus /privacy and /terms (docs/setup.md), last promoted Sep 24.
- F: PR #150 (beta to main, the 149 product) open since Sep 28, approved, mergeable, green, unmerged.
- F: ft/151 is 50 commits ahead of beta. Before ship: clean QC pass on the exact commit, owner acceptance after a localhost walk, the design implementation (gated by the owner's own ruling "implementation after owner design acceptance"), then ship, then mentor-reviewed promote PR.
- F: Go-live chores: live Stripe keys, webhook and portal; X webhook registration and bot activation; AI Gateway budget ($5 a day proposed); X credits ($119.20 on Sep 28); CRON_SECRET, SMTP, OWNER_EMAILS in Vercel.

## Business
- Target user: people who follow a beat and publish about it; AI and tech content creators first, reporters second.
- Value proposition (owner, Sep 16): "What about the wide internet that you don't see on X? Oparax brings it to you."
- Pricing (owner, Sep 28): Hobby $5 (100 posts, daily), Creator $30 (3,000), Wire $99 (4,000, 15-minute digest), 7-day free week with 300 posts and no card. Margins about 50%, 37%, 30% to 52%. X post reads $0.005 each are the main cost. Onboarding about $0.278 per person (measured on one person twice).
- Discovery: 178 reporters contacted, 89 reachable, 5 chatted, all 5 get news by text or call before X. 23 creators, 11 chatted, 2 demos, 0 activated. These tested the older drafting product, not monitoring.
- Users: no payers, no waitlist, no testers, no reaction to monitoring output. One real user, Reshad (owner's cousin, discounted). First cohort: five people the owner knows. Launch plan: X ads only "when a stranger can complete the walk"; nothing launched.

## Open rulings
- Design mid-sequence (Open Sans and navy/blue locked; owner design acceptance pending; runtime still Hanken Grotesk).
- Fit-check input for Jev; how a card changes when an item joins; whether a skipped item can be flipped back; whether Farzan and Kush are paying or test seats; ads handle; AI Gateway budget; profile pull trim; handle versus checkout-email linking; testing policy (OPEN).

## Biggest gaps (reader's assessment, I unless marked)
1. Nothing has run end to end or been walked as a user (F); the risk is whether a real handle yields a good feed, a correct DM and a working payment.
2. Feed never populated with real output (F); /local-preview uses fake data.
3. No demand evidence for this product (F).
4. No distribution: no list, waitlist or ads (F).
5. Everything waits on unmerged work (F); the design gate is the owner's own ruling.
6. Unproven live integrations (F).
7. Process weight: many review rounds while the first real user path was never tried (I).
