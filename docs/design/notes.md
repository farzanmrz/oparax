# Oparax north-star design discovery notes

Design-only Stitch arc. The repository was consulted only for product function and behavior; its styling, layout, typography, color, spacing, and component forms are not design inputs.

## Operating record

- Project resource: `projects/4681781778244083030`
- Project title: `oparax`
- Project visibility: `PRIVATE` (verified from `create_project` and `get_project`)
- Project device type after the first generation: `DESKTOP`
- Project family: Web
- Required model for every generative Stitch call: `GEMINI_3_1_PRO`
- Model gate: confirmed from the callable MCP schemas before project creation. `generate_screen_from_text`, `edit_screens`, and `generate_variants` each explicitly accept `GEMINI_3_1_PRO`. The request model ID is the authoritative model selection; `agentType: PRO_AGENT` is compatible execution metadata, not evidence of a fallback.
- Browser use: allowed only to capture rendered local-component references and review output; it is not used to inspect credits.
- Credit balance: intentionally not inspected, requested, estimated, or inferred.
- Logo source: a placeholder orbit mark is acceptable during discovery; exact logo fidelity is not a gate.
- Local-component reference: `projects/4681781778244083030/screens/15716640429266592050`, captured from the real local Next.js app. It shows the installed shadcn/ui Radix Nova header, form fields, tracked-handle chips, and connected-X control.

## Taste-design standards extracted

Applied selectively under the brief’s stricter invariants:

- Dashboard typography challenger: Geist with Geist Mono. Sans-serif only; mono is reserved for timestamps, counts, limits, and other compact operational data.
- Aim for a daily-working-tool density with a modest asymmetric bias, not a centered marketing composition.
- Prefer one restrained accent family over competing accent colors; use neutral depth and functional status colors.
- Use cards only where containment conveys a real relationship. In dense repeated areas, dividers, alignment, and negative space should do more of the work.
- Avoid equal-card metric grids, generic dashboard chrome, oversized headings, filler, invented measurements, glows, pure black, neon, and decorative AI motifs.
- On narrow web frames, collapse to one column, prevent horizontal overflow, and keep controls comfortably tappable.
- Motion must remain restrained and functional. Taste-design’s perpetual animation, cinematic orchestration, hero treatment, and decorative defaults are excluded unless a later visual pick proves a narrow exception.

## Function inventory

### 1. Feed ready

#### Visible data

- The persistent authenticated site header identifies Oparax, the selected agent, and whether that agent is live or paused.
- The header exposes the Feed, Voice, and Setup sections. Feed may carry a count of drafts that still need review.
- The Feed reports the number of stories since the agent went live and the number of drafts ready to review.
- Each story is paired with its winning draft. Stories are ordered with work needing attention first, followed by recently posted work.
- Source provenance includes the source avatar, `@handle`, source platform mark, relative source timestamp, stored source text, and a link to the original X post when it remains available.
- A source post may include a compact strip for up to four media items. Video media is distinguishable from still imagery.
- Long source content can expand and collapse without losing the source/draft pairing.
- If multiple source posts were clustered into one story, a compact `+N` disclosure opens an explanation of the additional clustered sources.
- If the original source is deleted, protected, renamed, or otherwise unavailable, the stored source text remains visible and the provenance reports `No longer on X · archived`; the original-post link is omitted.
- Draft provenance includes the publishing `@handle`, publishing platform mark, relative drafted timestamp, draft text, and a weighted character count against the linked X account’s actual standard or premium limit.
- The Feed card does not directly expose model names, model reasoning, or cost.

#### Actions and interactions

- Navigate to the original source post or source account when those links are available.
- Expand or collapse long source content.
- Inspect the count of other source posts clustered into the story.
- Edit an unposted or ambiguous draft. Saving non-empty text creates a new version; blank text produces an inline error. A confirmed-posted draft cannot be edited and explains why through a tooltip.
- Open draft history. History loads on demand, shows newest-first versions, identifies the current version, records applied corrections, and includes the Slack/email correction thread. Loading, not-found, and error states are explicit.
- Open `Why this draft` council provenance with one click. It loads on demand and may show candidate outputs, the selected winner, judge rationale, available reasoning, model/call costs, and an original council behind a revision. Loading, not-found, and error states are explicit. These details stay behind this disclosure.
- Post an X draft. The first action changes inline into an explicit confirmation: `Post this draft to X? It publishes now.` Confirm publishes immediately; Cancel restores the idle action.
- If X is not linked, the publishing action is replaced by a visually distinct `Connect X` OAuth control.

#### Publishing states

- Idle: weighted character count plus `Post`.
- Confirmation: weighted character count remains visible; `Post to X` and `Cancel` appear inline.
- Pending: `Posting…`; confirm and cancel are disabled.
- Client-invalid: publishing confirmation is disabled when the weighted length exceeds the account’s limit.
- Error: the server error appears inline and the reporter can retry or cancel.
- Confirmed success: the card reports `Posted to X` and exposes `View post`; the completed story/draft pair is visually de-emphasized.
- Ambiguous result: the card honestly says Oparax could not confirm whether the post reached X, tells the reporter to check the account, and allows editing to mint a fresh version for a safe resend. It does not show a deterministically dead Post control.

#### Drafting and empty states

- Fresh source with no winning draft yet: `Drafting in your voice — a few models are writing…` with a compact active signal. The Feed refreshes automatically.
- Source still without a draft after the legitimate drafting window: `Nothing drafted from this post — there wasn't enough to write from.`
- Ready agent with no stories: `Nothing on the wire yet`; it explains that future source stories and winning drafts will appear together, newest first.
- Route loading: story/draft-pair-shaped placeholders preserve the list anatomy while data resolves.
- Agent/feed load failure: a direct error is surfaced instead of fabricated content.

### 2. Feed pre-ready during voice extraction

#### Visible data and purpose

- This is the same Feed route and the same authenticated header, agent picker, live/paused state, Feed/Voice/Setup navigation, and account control—not a setup wizard or separate app mode.
- The screen sets an honest expectation: `Learning your voice takes about 5–6 minutes.`
- It also says: `You can leave and come back — this keeps running in the background.`
- The main content is one progress sequence with four semantic steps: `Reading recent posts`, `Working out your beat`, `Learning how you write`, and `Saving your voice rules`.
- Each step has one semantic icon. The step label itself is the evidence expander; there is no separate right-side chevron and no nested evidence rail.
- Active evidence can include real progress notes and a live partial reasoning trace. Counts and metadata belong in parentheses on the same line as the label when present.

#### Step states

- Pending: neutral semantic icon and future-tense label.
- Active: semantic working icon; the label shimmers; evidence expands/collapses through the label itself.
- Complete: green tick and past-tense label: `Read recent posts`, `Worked out your beat`, `Learned how you write`, `Saved your voice rules`.
- Failed: clear failure icon and the reporter-facing reason attached to the exact failed step. No fabricated percentage is shown.
- Completion: the Feed can resolve into its honest ready-but-empty state until real stories arrive.
- Failure recovery: the agent still exists; the reporter can continue and retry extraction from Voice.

#### Explicit absences

- No fake feed cards, filler columns, skeleton story grid, fabricated percentage, generic full-page spinner, model leaderboard, or decorative AI imagery.

### 3. Create agent

#### Visible data and fields

- Shared authenticated header with Oparax identity, agent switcher, and account menu.
- One-line page title: `Create agent`; no kicker and no redundant subtitle.
- Optional agent name with an example placeholder such as `Barça watch`.
- Required beat with an example describing both inclusion and exclusion boundaries.
- Tracked X accounts as a multi-entry combobox/chip field. It accepts handles with or without `@`, accepts several comma/space/newline-separated handles at once, deduplicates them, supports individual removal, and shows current count against the cap.
- Websites use the same structural field treatment as the active source field, but are greyed, disabled, and marked `Coming soon`.
- Voice identity is not a freeform reporter field. It comes from the linked X account.
- Owner-only testing fields are excluded from the north-star design.

#### OAuth states

- Not connected: a visually distinct `Connect X` control includes the X mark and gates creation.
- Clicking Connect X preserves agent name, beat, tracked handles, and the in-progress handle input across the full-page OAuth round trip.
- Connected: the OAuth button transforms into an affirmative connected `@handle` chip; it does not remain a disabled button.

#### Validation and submission states

- `Create agent` is disabled until the beat is non-empty, X is connected, and no submission is already pending.
- Primary action is full-width at the bottom on centered and phone-width layouts.
- Pending submission identifies that creation is in progress and prevents a duplicate submission.
- Server or validation failure appears inline without clearing entered values.
- Field explanations live in click-to-open tooltips. Placeholders are examples only and disappear on input. No permanent helper text sits beneath fields or buttons.

#### Success and extraction states

- After creation, the title changes to `Agent created`.
- The submitted form becomes a frozen summary rather than disappearing, so the reporter can verify the name, beat, tracked sources, and connected publishing identity.
- Voice extraction begins alongside that summary on wide screens and after it on narrow screens.
- The progress system includes the same four reporter-facing voice steps as the Feed pre-ready screen, with pending, active, completed, and failed behavior. Implementation-only preflight checks do not need to become north-star product steps.
- The reporter can leave safely while extraction continues in the background.
- On a failed extraction, the agent remains usable and the reporter can continue to the agent and retry later from Voice.

### 4. Shared desktop and phone-width header

#### Shared semantics

- Oparax identity.
- Agent picker displaying the current agent’s human label and live/paused state.
- Agent picker lists all owned agents and provides `New agent`; it also works with no agents.
- Current-agent navigation: Feed, Voice, Setup. Feed may carry a compact count of items needing review.
- Account control opens the user identity, Settings, and Sign out.
- Sign out has a pending state and recovers if the network request fails.
- Agent pause/resume is confirmed before changing monitoring state and reports pending/error states.
- Agent deletion requires explicit destructive confirmation, reports pending/error states, and permanently removes the agent and its drafts on success.

#### Desktop

- Oparax orbit mark plus plain-text `Oparax` wordmark.
- Agent picker in the header, with live/paused status.
- Feed, Voice, Setup remain directly visible.
- Pause/resume and delete remain available for the current agent.
- Account control remains at the right.

#### Narrow phone-width web

- Real Oparax orbit mark only; no wordmark and no divider after the mark.
- Agent picker remains in the header.
- Pause/resume and delete move inside the agent picker.
- Account control remains at the right.
- Feed, Voice, and Setup remain visibly accessible as mobile-web section tabs; they are not hidden behind a generic app hamburger.
- Header and tabs must not introduce horizontal overflow, and touch targets remain comfortable.

## Stitch call log

1. `create_project`
   - Target: new project titled `oparax`
   - Result: `projects/4681781778244083030`
   - Returned metadata: `visibility: PRIVATE`, `projectType: PROJECT_DESIGN`, `origin: STITCH`
   - Model ID: not applicable; this call is not generative.
2. `list_design_systems`
   - Target: `projects/4681781778244083030`
   - Result before generation: no design system.
   - Model ID: not applicable; retrieval call.
3. `generate_screen_from_text`
   - Target: Feed ready, desktop WEB
   - Exact model ID passed: `GEMINI_3_1_PRO`
   - Device type passed: `DESKTOP`
   - Session: `13032680402082366924`
   - Returned product screen: `projects/4681781778244083030/screens/f0ab1c21989546aeb6c19dc4d2ac1694`
   - Returned title: `Oparax Feed - Newsroom Instrument`
   - Returned size: 2560 × 2048, `DESKTOP`
   - Returned agent metadata: `agentType: PRO_AGENT`, `status: COMPLETE`, `generatedBy: figaro_agent`; no fallback was indicated.
   - Returned design system: `assets/5c24f1904a3e4413a5ff1940d49d8ebb`, with Hanken Grotesk baseline and JetBrains Mono metadata labels.
   - MCP screenshot: https://lh3.googleusercontent.com/aida/AP1WRLtk0ys3oF_1ZcqQSZLveRs4Nv9kHxjYykLoMrZdojypWLxdjm0-uVCMv3etaaNsUTNe6Xlx6YvuQxxcrENoVVPzYfTKFCpFyaZ8AVU_J2Y8-2WGCgHI8CjfLUH2ZssfFE_5obbxdvp0aFL3ni-1t9qx8ugLxd0nphhCHTrtHIQlSgxulipumLNYV6qjqvNRe108VG4H1WKHate9ZsgH2lCEqgd0YUgUhusf18xOOqji4dUjryxcWRWPdRQ
4. `list_screens`
   - Target: `projects/4681781778244083030`
   - Result: one Feed design screen and one separately persisted image screen titled `Oparax Orbit Mark`.
   - Model ID: not applicable; retrieval call.
5. `get_screen`
   - Target: Feed ready screen `f0ab1c21989546aeb6c19dc4d2ac1694`
   - Result: confirmed the screen resource, title, screenshot resource, desktop device type, and dimensions.
   - Model ID: not applicable; retrieval call.
6. `get_project`
   - Target: `projects/4681781778244083030`
   - Result: confirmed private visibility, desktop device type, generated design system, Feed screen instance, and the separately persisted logo image screen instance.
   - Model ID: not applicable; retrieval call.
7. Local component reference upload
   - Target: `projects/4681781778244083030`
   - Source: rendered local Oparax page using the repository's installed shadcn/ui and bespoke components.
   - Result: `projects/4681781778244083030/screens/15716640429266592050`
   - Model ID: not applicable; reference upload.
8. `edit_screens`
   - Target: Feed-ready baseline `f0ab1c21989546aeb6c19dc4d2ac1694`
   - Exact model ID passed: `GEMINI_3_1_PRO`
   - Session: `16606698162728250446`
   - Result: repaired canonical Feed screen `31d490ea4eb54339a4117a897905ba51`, using the local component reference and showing only the ready/unposted state.
   - Returned metadata: `agentType: PRO_AGENT`, `status: COMPLETE`.
9. `edit_screens`
   - Target: repaired Feed-ready screen `31d490ea4eb54339a4117a897905ba51`
   - Exact model ID passed: `GEMINI_3_1_PRO`
   - Session: `10564683653965500803`
   - Result: source cards now share the same bordered, equal-height card anatomy as their paired draft cards.

## Owner picks

None yet.

## Merge instructions

None yet.

## Parked ideas

None yet.

## Observations

- The existing product’s strongest functional contract is the source/draft pair: a reporter must be able to see what happened, what Oparax proposes, why it proposes it, and what publishing will do without losing context.
- The pre-ready Feed and post-create progress are the same underlying voice-learning event viewed at different moments. Their state vocabulary should be identical even if their surrounding layout differs.
- The first generation produced a promising flat, divider-led “newsroom instrument” design system and correctly selected Hanken Grotesk as the initial baseline without a separate theme call.

## Arc status

Resumed after correcting two false gates: the explicit `GEMINI_3_1_PRO` request is sufficient model selection even when response metadata reports the broader `PRO_AGENT` execution type, and reference frames are allowed to coexist with the three product screens. The first Feed-ready component-fidelity repair is awaiting owner review. Credit information remains owner-reported at the end of the arc.

## Rejected taste-design ideas

Pending visual rounds.
