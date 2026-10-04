RESULT: FINDINGS.

My position: show a persistent, chronological account of what happened, with the evidence beside each step. Keep each style’s composition. The strongest argument against this is length, especially when candidates dominate. Resolve that through compact rows and scrolling, while keeping posts, judgments and chosen-source reasons readable without clicking.

The verified sequence in [engine.ts](/Users/farzanm4/Desktop/repos/oparax/lib/onboarding/engine.ts:427) is:

First, “Find your X profile.” Show the returned name, handle, bio and pinned post when available. Explanation: “Your profile helps us understand your interests within your beat.” Code: `lookupProfile`, lines 782–839.

Second, “Get your recent posts.” Show the retrieved text, dates, quotes, thread parts and available media. Explanation: “We use up to ten recent posts from the last 90 days, counting a thread once.” Code: `readPosts`, lines 341–390, and thread folding, lines 147–225. Do not imply ten always exist.

Third, “Gather candidate sources.” Show source-list entries separately from accounts discovered through quoted posts, including their descriptions or bios and quoted evidence. Explanation: “We consider our source list and accounts you quote; being quoted does not automatically qualify them.” Code: lines 448–480. This loads source descriptions, not posts from every listed source.

Fourth, “Jev checks relevance.” Show candidate identity, evidence and judgment band. Explanation: “Jev checks whether each source regularly covers your beat; your activity supplies context.” Code: `ROW_Q`, lines 314–334, and scoring/filtering, lines 481–502. Sponsored activity is excluded from Jev’s context.

Fifth, “Choose sources and write your brief.” Show returned picks with their `why` sentences, plus summary, interests and languages. Explanation: “We choose complementary sources from those Jev passed and summarize your focus.” Code: lines 504–560 and [prompts.ts](/Users/farzanm4/Desktop/repos/oparax/lib/onboarding/prompts.ts:30). These outputs come from one call, not successive choosing and writing operations.

Sixth, conditionally, “Search X for more accounts.” Show the actual search terms, returned authors, bios and posts. Explanation: “Too few recommended accounts passed, so we searched X once for additional candidates.” Code: lines 580–594 and `searchAccounts`, lines 395–424. This requires valid model-supplied terms; it is not guaranteed whenever accounts are scarce.

Seventh, “Jev checks the new accounts.” Show the new authors’ evidence and bands. Explanation: “New accounts must pass the same relevance check.” Code: lines 594–624. Previously scored authors retain their judgments.

Eighth, “Finish your recommendations.” After search, show the second answer; otherwise retain the first. Explanation: “Only eligible sources remain in your recommendations.” Code: lines 625–660. Then “Save your agent,” with completion confirmed by [run.ts:152](/Users/farzanm4/Desktop/repos/oparax/lib/onboarding/run.ts:152), before declaring readiness.

Jev returns probabilities, not written explanations. Use “Strong match” at ≥0.75, “Possible match” at ≥0.35, and “Not shortlisted” below that. Keep selection separate: a strong candidate can remain unchosen. Label descriptions as evidence and model-written `why` as recommendation reasons. Hide raw prompts, payloads, provider names, batch sizes, decimal confidence displays and fabricated timings. The code permits up to ten sites/feeds **plus** accounts; five accounts is a target, not an enforced minimum.

The [fixture](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/next/data/onboarding.ts:1) explicitly declares illustrative posts, bio, scores and reasons. Reuse its profile, pin, three complete posts, 35 shortlisted candidates, 12 excluded examples, ten selected sites/feeds, seven accounts and brief. Label this “Illustrative replay.” Seven post bodies and search-branch evidence are missing; do not invent them or call this a verified real run.

For Window, make the full screen the window: compact step rail, wide chronological evidence area, brief alongside. Preserve completed scoring evidence, currently removed by [building.tsx:99](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/window/building.tsx:99).

For Newsroom, use one full-width shadcn Table with step sections and columns for evidence, judgment and selection. Put profile/posts above and brief below. Remove the sidebars and clipped thread text.

For Deck, retain summary tiles, then ordered, open evidence stacks. Each source card displays its band and reason. Decorative backing plates must conceal no unique content. Preserve the depth of the [accepted Deck](/Users/farzanm4/.agents/skills/reference-led-design/examples/accepted/accepted-deck-dark.png).

Build one shared typed step model and three renderers. Reuse StatusMark, Shimmer, open Task sections, Plan, Badge and Avatar. Avoid raw Reasoning/Tool dumps. Preserve DESIGN.md tokens.

Highest risks are invented progress and misleading attribution. First fix the shared sequence: current `build_step=3` cannot distinguish its operations. Live states need explicit events; timers serve replay only. Retain waiting/running/done labels, failures and conditional skips. Future verification should cover both themes, narrow layouts, reduced motion, keyboard access and persistent evidence. This review verified files and supplied images only; live behavior remains unverified.