RESULT: FINDINGS

The card structure is close to the contract. The main problems are the repeated onboarding summary, unsupported progress displays, missing routes back to settings, and the rejected landing compositions.

I opened **all dark images 01–25**, plus **light 01, 09, 12, 16 and 18**. None were missing. Auth was excluded. Findings below are verified in screenshots or supplied source unless marked inference. Recommendations are design judgments, not owner decisions. No product, builds, tests, services or subagents were run.

Repeated components and text receive one grouped verdict below, applying everywhere they appear.

**Shared frame**

- **KEEP** the compact header, single home mark, theme control, “Log In”, “Sign Up”, “Log Out”, and footer labels “Privacy”, “Terms”, “Contact”. They match the frame contract.
- **CHANGE** signed-in home navigation to return to the agent/feed. The shared logo currently always targets the landing preview.
- **CHANGE** placeholder controls into navigable local preview states before claiming journey completion. Footer links target `#`; logout, retry, alert and several checkout controls have no action. This is verified scaffolding, not evidence of working product behavior.
- **CHANGE** blue’s structural use: remove accent emphasis from ordinary bullet dots, generic category icons and graduated pricing cells. Preserve it for actions, selection and actual status. This addresses overuse without changing the palette.

**Landing, 01**

- **CHANGE** headline to: “Oparax watches your beat across the web and X. New stories reach your feed instantly.” It preserves the owner’s wording decision while reducing the sentence’s competing clauses.
- **CHANGE** supporting paragraph to: “Write one sentence. Your agent chooses sites, RSS feeds and X accounts to watch continuously, then joins related reports into sourced stories.” This states selection and continuous monitoring directly.
- **KEEP** “Sign Up” and “Free for a week once your agent is ready.” Both accurately describe the next action.

**Hero replacement, one composition:** adapt React Bits Pro **hero-10’s layered-card structure** into one product scene. At the back, show a narrow strip labelled **“Chosen for your beat”**, containing the actual example’s selected sources. In front, show recognizable @nextjs post and Next.js article previews. They settle behind the shared Next.js story card, whose AI Elements Sources disclosure remains usable. Caption: **“Two reports. One story, with the evidence attached.”** Keep the existing recorded headline, facts and citations.

- **CUT** “Published”, “Checked and joined”, “In your feed”, publication timestamps, connecting wires and the “Your agent” node. They explain pipeline plumbing while the critical selection decision remains invisible.
- **CHANGE** GitHub’s placement to a separate compact strip, **“GitHub discovery, optional daily digest”**, pending the owner’s decision about story integration. Do not silently depict intended behavior as shipped.
- **CHANGE** preview identification: add the existing public-source preview note once beside this example. The current landing omits it.

**How It Works**

- **KEEP** the five-step order and section title. Replace the existing tiny bespoke vignettes with rough frames of the real screens now; finalize captures only after onboarding/feed corrections.
- **KEEP** “Write one sentence” / “Say what you follow, in your own words.” Show setup 02 with the sentence entered.
- **KEEP** “Your agent builds” and its explanation. Show the active scoring/selection screen, not another checklist. **CUT** the miniature “Reads… / Scores… / Chooses… / Writes…” repetition.
- **KEEP provisionally** “See what it chose” and its reason-per-source explanation. Show the corrected ready summary. This remains the host’s interpretation of the dictated instruction.
- **KEEP** “Read your feed”. **CHANGE** body to: “Sites and RSS feeds are checked every minute. X accounts are checked every minute on Wire and every five minutes on other plans.” Show the chosen populated feed arrangement. This gives the frequency once without obscuring plan differences.
- **KEEP** “Get the DM”, its cadence sentence, bot avatar and exact plain-text `packDm` content. Show the feed’s alert connection beside the DM example so receiving it has a visible prerequisite.

**Roadmap**

- **KEEP** “Roadmap”, all source names, authentic platform marks, source descriptions, GitHub/Product Hunt “Daily digest”, and existing destination names.
- **CUT** the central circle, “Your agent”, “Joins reports into stories”, and every per-row “Planned”.
- **CHANGE** to one continuous branching ribbon: source list on the left, destination list on the right, joined through a thin horizontal connection labelled **“Stories and daily digests”**. Use separate labelled branches for story sources and daily digests so GitHub/Product Hunt do not appear to become story cards. No central object or independent tile grid.
- **CHANGE** introduction to: “Where your agent reads, and where you receive updates.” Add one legend: **“Dashed connections are planned.”**
- **CHANGE** destinations by adding Instagram, Threads, LinkedIn and Snapchat with the planned treatment. Keep them among planned sources too. This directly implements the owner’s correction.

**Pricing**

- **KEEP** “Pick your pace”, its introduction, all three names/prices, 100/3,000/4,000 allowances, explanatory watched-post text, comparison row labels, “Unlimited”, “Included”, optional daily digests and accurate alert cadences.
- **CHANGE** trial text to: “Your free week starts when your agent is ready: 7 days, 300 watched X posts, no card. Choose a plan when it ends.”
- **CUT** three identical “Start your free week” buttons. Replace with one **“Sign Up”** beneath the comparison. All three currently perform the same action and imply a plan choice that is not happening.
- **CHANGE** comparison markup to a semantic table while retaining its composition; row-to-plan relationships should survive assistive reading.

**Setup, 02–04**

- **KEEP** the single form, “Set Up Your Agent”, “X account”, locked handle, verified-account explanation, sentence label, placeholder, counter and “Build my agent”. A textarea fits this task; chat controls would imply another interaction.
- **CHANGE** typed-account help to: “Use the X account whose public posts describe your interests. This does not connect alerts or verify ownership. You’ll connect alerts from that account after setup.” The current paragraph introduces bot procedure too early.
- **KEEP** the typed not-found error and spelling recovery instruction. Keep verified-handle recovery copy and “Sign out and continue with X” where applicable.
- **CHANGE** “Scores sites, feeds and X accounts against your sentence” to “Checks which sites, feeds and X accounts fit your sentence.” **KEEP** the other three next-step lines, section label and free-week sentence.
- **KEEP** waitlist status and “Join the waiting list”. **CHANGE** submission to display “Saving…” followed by “You are on the waiting list.” Preserve the supplied failure messages. Currently submission only prevents navigation.
- **CHANGE** blank submission to show “Write a sentence about what you want to follow.” The preview currently permits navigation without the required sentence.

**Building, 05–10**

- **KEEP** the five differentiated component bodies, handle/beat context, stage titles and running/done/stopped labels. They address the owner’s request for visible judgment and selection.
- **CHANGE** completed stages to compact, reopenable summaries, leaving the active stage expanded. Move completion and **“Open your feed”** beside the heading. The current fully expanded result buries the next action.
- **CHANGE** preview identification to **“Illustrative onboarding data, not a live run.”** The supplied profile, posts, scores and reasons are invented fixtures despite resembling the owner’s account.

Stage dispositions:

1. **KEEP** profile skeleton, initial avatar, name, handle and bio as fixture content. They establish which account was found.
2. **KEEP** post rows, dates, pinned/quote/thread labels, quoted text and “7 more posts read”, subject to approved data access. **CHANGE** exclusion wording to “Reposts and replies to other people are excluded.” Thread continuations are handled separately.
3. **CHANGE** running text to **“Checking which sources fit your sentence.”** **CUT** continuously increasing counts and the three filling batch bars: [score-stage.tsx](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/next/building/score-stage.tsx:61) derives them from elapsed animation time, not observed results.
4. **KEEP** the two Queue groups, source/account names, descriptions and individual reasons. **CHANGE** the rule sentence to **“Chosen from the sources that fit your sentence, with a reason for each.”** “At least 5” is a model request, not a guaranteed output.
5. **KEEP** Plan, “Your brief”, summary, “Interests”, “Languages” and their fixture values after completion. **CHANGE** its running body to **“Writing your brief…”** until output exists. Selection and brief come from one structured answer; the UI must not imply independently observed completion events.

For scoring results, **KEEP behind “How sources were assessed”** the ranked rows, all names/focus lines, quoted-account badges, scores, threshold and expansion control, conditional on approval. **CHANGE** “35 kept of 153” to **“35 candidates shortlisted from 153”**, and “Show 26 more kept” to **“Show 26 more shortlisted candidates”**. Shortlisting is distinct from the final 17 picks.

- **KEEP** completion/free-week wording, but display readiness only after persistence succeeds.
- **KEEP** failed-step explanation, completed profile and “Try again”. **CHANGE** later “Queued” labels to **“Not started”** after failure. Provide the exhausted-retry state with **“Preparation could not finish. Your free week has not started. Contact Oparax for help.”**
- **CHANGE** error styling to the locked family while preserving explicit text and icons; the brief’s later no-red input outranks inherited destructive styling.

**Ready, 11**

- **KEEP** ready as the first feed visit, the brief, chosen-source explanations, alert connection and trial allowance.
- **CHANGE** the expanded 17-item directory into a compact summary with disclosures **“10 sites and feeds”**, **“7 X accounts”**, and **“View your brief”**. Preserve every name/reason inside them. The current screen repeats the completed build before revealing the empty feed.
- **CHANGE** the promise in [ready-panel.tsx](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/next/feed/ready-panel.tsx:28) to: **“Your agent is watching these sources. View them in Settings. Editing becomes available with an active subscription.”**
- **CHANGE** the missing Settings destination and allow arriving stories to replace emptiness. The preview currently forces the ready route to remain empty.

**Feed, 12–20, both arrangements**

- **KEEP** “Your Feed”, Direct/Clustered controls, both explanatory lines, and the public-source preview note once.
- **KEEP** all three locked story titles, every fact, parenthesized publisher citation, original-source label/link and supporting quotation. Keep identical cards across arrangements.
- **KEEP** the controlled Sources disclosure and selected-fact highlighting. Source code supports these behaviors; interaction was not tested.
- **CHANGE** the interpretation of source count: it indicates evidence quantity, not feed mode. A Clustered story can still contain one source. Keep the quiet source count and rely on the selected view for mode.
- **KEEP** story 16 first, highlighted, with sources open. It gives DM arrivals immediate context.
- **KEEP** empty 14/20’s heading and explanatory sentence.
- **CHANGE** checking 15 to retain existing stories underneath **“2 items being checked.”** Replace the second line with **“New items are checked for relevance before appearing here.”** Current [FeedList](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/next/feed/parts.tsx:123) replaces the entire list.
- **KEEP** shell navigation, Settings and account identity without filler. **CHANGE** Settings into a destination and add account logout access.
- **CHANGE** the simple-page header to include **“Settings”**; its absence makes the comparison functionally unequal.
- **KEEP** trial-day, price and usage text/meter, populated from real state. Zero usage is valid for the fixture, not a permanent feed value.
- **KEEP** “Alerts on X”, “Get alerts on X”, activation explanation, “Check connection”, and active/paused/stopped instructions. Present activation as two ordered actions: send the prepared message, then check connection. Keep “The bot will not reply.”
- **CHANGE** active alerts to include the actual plan cadence. Connection status alone does not explain when messages arrive.

**Free week ended, 21; exhausted, 22**

- **KEEP** both status explanations, readable stories and absence of alerts. Keep plans only in the ended state; do not introduce early upgrade.
- **KEEP** plan names, prices, allowances, unlimited-sites line and purchase labels.
- **CHANGE** Wire detail to: **“4,000 watched X posts a month, alerts every 15 minutes when there is news.”** Current wording implies unconditional delivery.
- **CHANGE** exhausted-state detail to distinguish budget exhaustion from the watched-X-post pool reaching zero. Product truth says the latter can leave sites/feeds running.

**Checkout, 23–25; unavailable in source**

- **CHANGE** “Your Oparax Agent” to **“Checkout Status”**, and “Open your agent” to **“Open your feed”**.
- **KEEP** all four supplied status sentences and state icons.
- **CUT** “Check again” after confirmation. **KEEP** it for pending/unpaid; keep it absent when unavailable.
- **CHANGE** pending contact text into an actionable **“Contact Oparax”** link. Return confirmed users to their paid state, not the preview’s default free week.

**Five changes, ranked**

1. Make build progress truthful and clearly identify illustrative onboarding data.
2. Put completion and first stories ahead of repeated expanded selections.
3. Restore Settings access, truthful editing eligibility and recoverable journey states.
4. Replace the rejected hero with the single layered product scene.
5. Replace the roadmap circle, correct destinations and separate digest behavior.

**Known flags**

1. Rich judgments: worthwhile as optional owner detail, not the default wall of output. New owner-only access requires explicit approval; until then use readable profile, picks, brief and available log summaries.
2. GitHub joining stories: unapproved product intent. Keep separate digest treatment pending the owner’s decision.
3. “See what it chose”: sensible provisional interpretation, not confirmed wording.
4. Bank of England: keep locked preview content; it proves no personal relevance.
5. Ready-in-feed, omitted images/times and publisher citations: keep. Fix ready density and the erroneous source-count/mode equivalence.

**Missing and unresolved**

Missing evidence includes waitlist success, retry exhaustion, optional account-search progress, failed-feed processing, checking alongside existing stories, activation errors, and paid checkout return. Paused/stopped alerts and unavailable checkout exist in source but lack supplied captures.

**I favor the simple page**, with Settings restored: it places the two reading modes beside their content and spends less space on navigation. The shell’s persistent account context is useful, but two views alone provide a weak reason for its full-height sidebar. This is an inference about usability; the owner chooses.

The required real owner run, useful relevance, first story and actual DM delivery remain unverified. Static renders cannot establish those acceptance conditions.