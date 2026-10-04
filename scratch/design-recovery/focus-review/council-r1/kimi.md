RESULT: FINDINGS

Images actually opened: all 25 dark renders (01 to 25), plus light 01, 09, 12, 16, 18. Not opened: the remaining light variants and 26-signup-stock (out of scope). Source read: all of `site/next/` and the `(next)` routes, NOTES.md, LOCKED-PLAN.md, build-brief.md, product-data.md, components.md, taste files. "Verified" below means seen in an image or source; anything else is marked inference.

## Landing (01, verified dark and light)

Header and nav (How It Works, Roadmap, Pricing, Log In, Sign Up, theme): KEEP. Matches the fixed frame: compact, edge-to-edge rule, Title Case, logo plus wordmark as one link home.

Hero headline "Oparax watches the web and X around your beat, and brings each new story to your feed instantly.": KEEP. Descriptive, and "instantly" is the owner's decided wording; not reopening.

Hero sub: CHANGE. It executes the owner's "decides what to watch" example with only configured sources (verified: @OpenAI, OpenAI feed, TechCrunch AI feed all exist in the fixture), but "not just the obvious account" restates what the example already shows, and the owner hates redundant copy (S21). Replacement: "Write one sentence about what you follow. Your agent decides what to watch: follow OpenAI and it also reads OpenAI's news feed and TechCrunch's AI coverage. Reports about the same event become one story, with the quote behind every line."

Sign Up plus "Free for a week once your agent is ready.": KEEP. Real product copy.

Hero flow (the "Publish section", owner-rejected). Broken decisions I see, beyond the host's reading:
1. The column labels "Published" / "Checked and joined" / "In your feed" name pipeline stages. "Checked and joined" describes the engine, not a user outcome, so the demo reads as an architecture diagram.
2. UTC timestamps on every input card ("Oct 21, 5:00 PM UTC") make the inputs read as log lines, against the owner's standing realism bar ("as close as a tweet would look in real life").
3. The full five-fact story card at hero size is a second headline; the h1 and the card fight.
4. The "Your agent" chip plus three bezier connectors put plumbing at the visual center; the story, which is the value, sits at the right edge.

ONE replacement composition: keep the owner's M31/M32 layout (sources left, agent center, story right) and the arrival choreography, but strip the diagram chrome. Left: the same three real reports as quiet realistic rows (post looks like a post, article like an article, release like a release), dates as "Oct 21", no timestamps, no column label. Center: no node box; each arriving row gets a small StatusMark flip with the micro-label "judged against your sentence" appearing once, under the first row. Right and dominant: the story card in compact form (headline, first two facts with citations, "Used N sources"), gaining a source mark as each report joins, as now. One caption under the whole composition: "Three reports, one story. Every line quotes its source." Justification: contract hero inputs (X post, article, GitHub per owner intent), realism quotes, and judging question 1 (nothing it does not).

How It Works (judging step list, copy, and which real screen each step shows, per the owner's order rule):
- The five steps and their order: KEEP (owner's list; correctly no Sign Up step).
- Step texts 1, 2, 4, 5: KEEP. Step 4's "checked as often as every minute" is the owner-decided frequency placement and is accurately hedged; step 5's cadence (daily, 15 minutes on Wire) is true to product-data.
- Step 3 "See what it chose" with "Every site, feed and X account comes with the reason it fits you.": KEEP as wording; it is the host's unconfirmed interpretation (flag 3 below).
- Which real screen each step should capture: 1 = setup (sentence field with counter); 2 = building mid-run frozen at stage 3 (score rows and the keep line, the legible judgment moment); 3 = the ready panel's two pick lists with whys; 4 = the populated feed, Clustered; 5 = the DM bubble as rendered. The current vignettes (verified) repeat the hero's card and DM; acceptable as rough frames this round per the owner.

Roadmap (owner corrections applied as verdicts):
- Per-row "Planned" labels: CUT. The dashed rows, dashed connectors and muted names already carry it; the intro line "Solid lines work today; the rest is planned." is the one legend line the owner allows.
- Destinations: CHANGE. Add Instagram, Threads, LinkedIn and Snapchat as planned destinations (owner, October 1: they are DM surfaces; they also stay planned sources). Current destinations (verified: X DM today; Email, SMS, WhatsApp, Messenger planned) miss them.
- The big circle: rejected by the owner, and verified dominating the section (144px glowing disc, the largest element below the hero). ONE replacement composition, still not a grid: keep the two row columns and the curved connectors exactly as they are, and replace the disc with the same small 68px "Your agent" chip used in the hero, centered on the connector midpoint, no glow ring, no radial gradient. Justification: the owner loved a central hub (M71) but rejected this circle; the small chip keeps the hub, makes hero and roadmap consistent, and lets the lines, which are the actual content (today versus planned), carry the section.
- GitHub and Product Hunt rows labeled "Daily digest": KEEP. Accurate to today's code.

Pricing (verified against `lib/landing/content.ts` rows): KEEP the section whole. "Pick your pace", the intro, the free-week header cell, the watched-posts row with its true note ("Sites and feeds never count."), the five comparison rows, the blue-only heat ramp, no featured tier, and "Start your free week" all match real copy and the contract. The Wire cadence cell is much longer than its siblings; structure stage, ignore.

## Setup (02, 03, 04; verified)

The card, locked-handle row with real help line, beat field with live counter, "Build my agent": KEEP, all verbatim product copy. Typed-handle variant and the not-found error ("We could not find @farzanmrzz on X. Check the spelling and try again.") with destructive border: KEEP; a true error, so destructive is permitted and restrained. Waitlist status box and "Join the waiting list": KEEP; "What happens next" correctly disappears. "What happens next" section (four steps in the building screen's order, ending with the real free-week sentence): KEEP. It is preview copy, but it is exactly the locked plan's named rejection example ("the setup screen does not say what happens next"). The plain Textarea instead of a chat composer: KEEP the decision; one form with one submit is not a conversation, and a composer would imply a reply.

## Building (05 to 10; verified dark 05-10, light 09)

Header ("Building Your Agent", "For @farzanmrz, following", the beat, "N of 5 done" with bar): KEEP. Stage titles: KEEP. The split of product step 3 into "Scoring sources against your sentence", "Choosing sites, feeds and X accounts", "Writing your brief" is the owner's core request (judgment and selection per stage) and drops the model names the raw log exposes today. State labels Queued / Running / Done / Stopped: KEEP, noting "Stopped" for the failed step is a deliberate deviation from the product (which shows pending); it makes the failure point visible, and I support it.

Stage 1, profile result (avatar initial, name, handle, bio): KEEP; persisted public data. Stage 2, posts read with the true rule "Replies and reposts are not read.": composition KEEP; content gated on flag 1. Stage 3, scoring: composition KEEP. The keep line with "Kept at 0.35 and above", blue versus muted rows, the per-row bar with the 0.35 tick, "Quoted in your posts" chips, and the 60/60/33 batch segments are all true to the engine; content gated on flag 1. Stage 4, the two Queue sections with per-pick whys and the honest rule line: KEEP; persisted public data. Stage 5, Plan with shimmer settling into summary, Interests, Languages, and `topic_terms` hidden: KEEP; correct call, topic terms mean nothing to the reader.

Done row ("Your agent is ready. Your free week has started: 7 days and 300 watched X posts." plus Open your feed): KEEP; the free week truly starts at `complete_build`. Failed state (real copy, owner-only Try again, earlier stages done): KEEP.

One CHANGE: in the done state, collapse stages 1 and 2 by default, leaving 3, 4, 5 open. Verified: the settled page shows all five bodies expanded and is very long. The picks and the brief are the durable judgment; the profile and post rows are evidence that mattered while running. This is a default-open change only, everything stays one click away.

## Ready (11, verified)

The decision to make the ready summary the first-visit state of the feed rather than its own screen: KEEP. The building screen already showed every choice live, the feed is truly empty right after build (product-data 10.6a), and a separate screen adds a click and repeats the build, which the owner rejects. Content (brief summary, 10 sites with why, 7 accounts with why, alerts card, free-week card, real empty state below): KEEP. All persisted public data; scores correctly left out. "This is what it chose for your sentence. You can change any of it in Settings.": KEEP; the Settings sources and accounts tabs exist.

## Feed, both arrangements (12 to 20; verified dark, light 12, 16, 18)

Identical in both, so one verdict set: "Your Feed" title with the view hints ("Reports about the same event, joined into one story." / "Each post or article on its own."): KEEP; plain and true. Preview note once above the cards: KEEP; the contract's "marked as preview once". Story card (plain title, bullet facts, parenthesized publisher citations opening the quiet Used N sources area with per-fact quote highlighting, no image, no time, Direct versus Clustered only through the sources line): KEEP, per the owner's S23 card spec almost verbatim. Story-from-DM (first, highlighted, sources open by default): KEEP; matches the product's scroll-to behavior, and a DM arrival wants the evidence. Checking ("2 items being checked." plus the true judging line): KEEP. Empty ("No relevant news yet." plus what happens next, no timing claim): KEEP. Alerts card (verbatim bot-button copy, all four states, Check connection always): KEEP. Free-week card (real lines, meter at 0 of 300): KEEP.

Shell-specific CHANGE: the sidebar group label "Your Feed" duplicates the main column's h1 "Your Feed" (verified in 12). Rename it to the product's real label, "News Views" (`lib/monitor/content.ts`), Title Case. One repetition the owner would catch. Shell gap: no Log Out anywhere in the shell (the page header has it); add it to the sidebar footer account block or note it as deferred.

## Plan states and checkout (21 to 25; verified)

Free week ended: KEEP. Real frozen copy, the three real plan cards inside the banner, stories readable below, alerts hidden (matches the product). Note for the owner: the product renders frozen as destructive; the render deliberately uses the blue accent ("an ended trial is not an error"). I support the blue choice, but it is a visible change to current product behavior, so it needs his yes. Exhausted: KEEP; real copy, calm banner, no plan cards, all true. Checkout return, all four states: KEEP; real status lines and the two real actions, Check again correctly absent only for unavailable.

## The 5 most important changes, ranked

1. Replace the hero flow with the composition above. Owner-rejected; the broken decisions are the pipeline column labels, the log-style UTC timestamps, the full-size card competing with the h1, and plumbing at the center.
2. Roadmap: shrink the center disc to the hero's small chip, cut the per-row "Planned" labels, add the four missing planned DM destinations. All three are direct owner instructions from October 1.
3. Get the owner's approval for the building screen's judgment data (flag 1). Without it, stages 2 and 3 collapse back into log strings and the screen loses exactly what he asked for.
4. Collapse building stages 1 and 2 on completion so the run ends on the picks and the brief, not a wall of expanded evidence.
5. Fix the shell's duplicated "Your Feed" label and add the missing real feed state "Could not process N items." (product-data section 5) so the feed covers the full status set.

## Verdicts on the known flags

1. Showing posts read, scores and rejected rows: right for the user, recommend the owner approve the owner-only read path and per-stage events. His stated requirement is to see "where judgment is happening, where selection is happening, for each and every individual stage"; stages 2 and 3 are where judgment is most legible, and the data already exists in `build_state`. The fallback (profile, picks, brief only) would make the key screen a three-step spinner with results.
2. GitHub joining a story in the hero: keep it in the render. It is the owner's stated product intent, and the hero is the right place to show intent; the flag stands and he decides issue 136 before the hero is built. Do not ship it while the product runs a separate digest.
3. How It Works step 3: "See what it chose" is a fair reading of the dictated "Press the onboarding flow"; the whys it shows are the substance either way. Keep the wording, confirm with him; if he meant the interactive replay, step 3's capture becomes the building screen, which my capture mapping already covers.
4. Bank of England examples: keep. Locked preview content; the owner's own run replaces them before acceptance. Their off-beat nature is invisible in Direct view anyway, since the two cards about one event quietly demonstrate why clustering exists.
5. Ready as first-visit state, no images or times on the card, publisher-name citations: agree with all three. Repetition is the owner's standing complaint; the card spec says "nothing else"; publisher names are the real per-fact link labels the product already has.

## Missing from the journey (questions 2 and 3)

Sign-up to first story walks cleanly: signup, setup, building, ready, feed, story from DM. Gaps, all verified against product-data: the feed's failed-processing line "Could not process N items." has no rendered state; the activation error "X connection could not start. Try again." is not rendered; Load more and the Skipped list are absent. Load more is fine to defer at this stage. Skipped is a real decision for the owner: it is the one place the feed shows what was judged out, which fits his judgment-transparency theme, but it also adds a element the card spec does not ask for. My lean: include it as the quiet collapsed list it already is in the product.

## Which feed arrangement serves the user better

The page arrangement. Reasoning: every other screen in the journey (setup, building, ready, plans, checkout) uses the header frame, so the page keeps one navigation system where the shell introduces a second for a single screen; the switch beside "Your Feed" is the owner's own September 30 placement and sits next to the thing it controls; the sidebar's unique content is two view links, Settings and the account, which spends 240px on very little and already produced one duplication; and the wider column lets the news hold the eye, a visual-stage criterion. The shell's real advantage is room to grow (Digests, Alerts as destinations) and the "app" feel the owner liked in annotation #2, though he himself flagged that as possibly subconscious. Recommendation: page; the owner chooses once.

## Blue as structural signal (palette not reopened)

Verified non-action uses of blue: the accent-wash backgrounds on the done row, frozen banner, exhausted banner and waitlist status; the avatar gradients in the sidebar and stage 1; the roadmap's solid connectors; the hero pulses and node border; the story highlight ring. The washes are the main overuse: they make every state banner read as the same info panel and compete with the one primary action on each screen. Reserve the accent wash for the single primary moment (the done row) and render state banners neutral with a blue border or icon only. That is usage tuning within the fixed palette, not a palette change.

Unknowns preserved: whether the owner confirms How It Works step 3's interpretation, whether he approves the build-judgment read path and the frozen banner's move away from destructive, and whether the hero's GitHub join survives his issue 136 decision.