# Round 1 reconciliation: agreed change list (host, October 1)

Lanes: Astra (gpt-6-astra), Grok (grok-4.7-build-fast), Kimi (kimi-k3-high). All three opened every dark image 01 to 25 and light 01, 09, 12, 16, 18. Sources: `astra.md`, `grok.md`, `kimi.md` in this folder. Rule: adopt where two or more lanes agree or one lane cites contract or product truth no lane contradicts; the rest go to round 2 or to the owner.

## Adopted (apply now)

### Landing
1. Hero flow: CUT the column labels ("Published", "Checked and joined", "In your feed"), clock timestamps, the "Your agent" node and the connecting wires (all three lanes; owner rejected). REPLACE with one product scene: the story card is dominant and compact (headline, the facts, citations, "Used N sources"); the real reports (the @nextjs post looking like a post, the Next.js blog article looking like an article, the GitHub release looking like a release) are realistic small previews that arrive one after another and tuck into the card, each adding its mark to "Used N sources". Dates as "Oct 21" only. One caption under it: "Three reports, one story. Every line quotes its source." Motion settles within 5 seconds. (Kimi's layout stripped of chrome plus Grok's "the card gains sources"; Astra's layered cards point the same way.)
2. Hero subcopy: "Write one sentence about what you follow. Your agent decides what to watch: follow OpenAI and it also reads OpenAI's news feed and TechCrunch's AI coverage. Reports about the same event become one story, with the quote behind every line." (Kimi; Astra also cut the redundant clause.) Headline unchanged (owner decision; Grok and Kimi keep).
3. Hero preview note: add the public-source preview note once, small, beside the hero example (Astra).
4. Roadmap: CUT the big circle, "Your agent", "Joins reports into stories" and every per-row "Planned" (all three; owner). Middle becomes one small compact story card (headline plus "Used N sources"), no glow, sized like a source row, so the composition reads sources, the story, destinations (Grok; Kimi and Astra both agree on something small or thin in the middle). Intro: "Where your agent reads, and where you get your stories." One legend line: "Solid lines work today. Dashed lines are planned." Add Instagram, Threads, LinkedIn and Snapchat as planned destinations; they stay planned sources too (owner, all three). Keep "Daily digest" on GitHub and Product Hunt (all three).
5. Pricing: CUT the three identical "Start your free week" buttons; one "Sign Up" under the table (Astra, Grok). Remove the blue heat ramp on the watched-posts row (all three name it as blue used for quantity); keep the row emphasized by type weight only. Wire alert cell reads "Every 15 minutes when there is news" (already).
6. How It Works: no redesign (owner order rule). Keep steps and copy. Step 3 body: "The sites, feeds and X accounts it chose, each with the reason." (Grok). Frames stay rough; record the agreed capture targets in NOTES: 1 setup sentence field; 2 building frozen at stage 3; 3 the ready picks with whys; 4 populated feed, Clustered; 5 the DM.

### Setup
7. "What happens next" lists the five building stages in order: "Looks up your X account", "Reads your newest posts", "Checks which sites, feeds and X accounts fit your sentence", "Chooses what to watch, with a reason for each", "Writes your brief." Keep the free-week sentence (Grok; Astra's wording for line 3).
8. Typed-handle help: "Use the X account whose public posts describe your interests. You will connect alerts from that account after setup." (Astra: bot procedure too early.) Mark as preview copy in NOTES since it differs from product copy.
9. Blank submit shows "Write a sentence about what you want to follow." (Astra.)

### Building
10. Mark the fixture once at the top: "Recorded example, not a live build." (Astra, Grok.)
11. When done: stages 1 and 2 collapse to their one-line summaries (reopenable); 3, 4, 5 stay open; the done row with "Open your feed" also appears beside the heading so the next action is not buried (Kimi, Astra).
12. Stage 2 rule: "Reposts and replies to other people are not read." (Astra: accurate to `exclude: replies,retweets` plus thread folding.)
13. Stage 3 running: no ticking "Scored N of 153" counter derived from animation time; show the three real batches (60, 60, 33) each flipping to done as a unit, label "Checking which sources fit your sentence" (Astra on truthfulness; Grok and Kimi keep the batches; this keeps both). Done copy: "35 shortlisted from 153", "Show 26 more shortlisted", keep line "Shortlisted at 0.35 and above", "115 more scored under 0.35" (Astra: shortlisting is not the final pick).
14. Stage 4 rule line: "Chosen from the shortlist: up to 10 sites and feeds, and the X accounts that fit, each with the reason." ("At least 5" is a prompt aim, not a guarantee; Astra, Grok.)
15. Failed: steps after the failure read "Not started" instead of "Queued" (Astra).

### Ready (first feed visit)
16. Collapse the two open lists into one compact summary: the brief stays visible; "10 sites and feeds" and "7 X accounts" become closed disclosures holding every name and why (Astra, Grok). The empty feed and its line then sit near the top.
17. Line: "This is what it chose for your sentence. You can see it any time in Settings." (Astra: editing is paid-only today, so "change any of it" overpromises.)

### Feed
18. Direct and Clustered hold the SAME reports, arranged two ways (Grok; Astra on source count not equalling mode). Clustered: the Next.js 15 story (X post plus blog) and the Bank of England story (X post plus CNBC article, facts and spans only from the verified quotes already in `pro-exploration/examples-verified.json`). Direct: four single-source items: the @nextjs post, the Next.js blog post, the @bankofengland post, the CNBC article (existing Direct cards for the two BoE items; new single-source cards for the two Next.js items using only their own verified spans). Update `next/data/feed.ts` accordingly (host authorizes this data change; keep every fact quote-verified).
19. Checking state keeps the stories underneath "2 items being checked." and adds the product's real line "Could not process 1 item." as a separate state `?state=failed-items` (Astra, Kimi).
20. Simple page header for signed-in pages gets "Settings" beside Log Out (all three). Shell: sidebar group label "Views" instead of a second "Your Feed"; add Log Out to the account block (Grok, Kimi, Astra).
21. Alerts card when active adds the plan cadence line: "Daily alerts in your free week." (fixture state; Astra). Add `?alerts=error` rendering the real "X connection could not start. Try again." (Kimi).
22. Free-week card: add the real pool-paused line state `?pool=out`: "Your free week's watched X posts are used up. Sites and feeds keep running." (Grok, Astra).

### Plan states
23. Free week ended plan cards: Wire detail "4,000 watched X posts a month, alerts every 15 minutes when there is news." (Astra.)

### Blue as structural signal (usage only, palette unchanged; all three)
24. Blue only for primary actions, the selected view, links, the kept/not-kept score state and the one done moment. Neutral for: bullet dots, generic category icons, avatar gradients, roadmap and hero connector strokes (use the border or muted foreground color; planned stays dashed), state banners (frozen, exhausted, waitlist: neutral surface with a small blue icon or border), the story highlight ring (neutral stronger border). Error states use the product's restrained destructive only for true errors (not-found handle, failed build, could not process).

## Not adopted, carried to round 2
- A. GitHub in the hero story: Astra and Grok say keep it out of the card until the owner accepts the product change; Kimi says keep it as his stated intent. LOCKED-PLAN says follow his intent and flag it, he decides when the hero is built. Host keeps it in the render with the flag; round 2 asks lanes to accept or object.
- B. Roadmap middle: small story card (adopted, Grok) versus a small "Your agent" chip (Kimi) versus a thin labelled ribbon (Astra). Round 2 judges the re-render.
- C. Named rejected rows in stage 3: Grok closes them by default; Kimi and the owner's ask favor the visible boundary. Host keeps them visible.
- D. Checkout copy ("Your Oparax Agent" and "Open your agent"): Astra changes, Grok and Kimi keep real product copy. Host keeps product copy.

## For the owner (not the council's to decide)
- Feed arrangement: all three lanes prefer the simple page (switch beside "Your Feed", Settings in the header). The owner chooses once.
- Build judgment data read path (flag 1): all three say showing posts, scores and the shortlist is right for the owner during the build but needs his yes for a new owner-only read path.
- GitHub joining stories (issue 136), How It Works step 3 meaning, base color (navy versus near-black, at the visual stage).
