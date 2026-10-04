RESULT: FINDINGS

The host’s list matches the latest notes. One correction: earlier rounds did not fully agree on columns or login dimming. The choices below settle those points for this lane’s spec. The latest rejection of the peek supersedes every earlier recommendation to retain it.

1. Sidebar: keep the overlay. Closed means one labelled menu button, no icon strip. This follows “it doesn’t adjust the page” and frees reading width. Expanded, retain colourful source logos, Deck typography, collapsible kind groups, X-only Name/Handle, and plain nonzero counts. GitHub groups repositories under interests. Account actions reflect authentication state. Use this navigation on setup and onboarding too.

2. Tools and alerts: keep Clustered / Direct and Get alerts on X. Remove search, filter controls, sorting controls and viewing preferences: “Why does it matter? I don’t even have the first user.” Newest first is automatic. Alerts go to the connected account’s X DMs. After confirmed connection, the same position reads “Alerts on X” and opens connection details. Opening the composer alone never establishes connection. Preview states simulate this without sending messages.

3. Cards: three columns at 1440, five at 2560, natural heights, newest-first row order. No height estimation, stretching or content truncation. “The text content is the focus”: sources and timestamp first, headline beside an optional 96×64 thumbnail, then every fact. No image placeholder, hero image, article-count pill, parenthetical citations or backing plates.

4. Source inspection: retain the temporary right reader because he wants the source synthesis “while the clustered news is showing.” Reserve 440px and reflow the remaining grid, keeping the originating cluster visible. Clicking its source row reveals members; selecting one shows its existing Direct synthesis, original link and supporting quotations. No replacement of clustered facts.

5. Onboarding: one stable source grid transitions from building to ready. “The sources themselves should show first.” Keep a quiet running status, chosen sources appearing when selected, kind switching and reasons on demand. Remove step lists, counters, bands, meters and automatic scrolling. Completion changes status and reveals feed/alerts actions plus plain trial text.

6. Login: dedicated Deck page, no dimming. “The feed cards and the login card are kind of blending” calls for stronger spatial separation: form forward with existing window shadow, story fan offset behind and beside it. Email/password lead; signup adds confirmation in place; neutral X and Google follow.

THE BUILD SPEC

Create `site/v2/one/{login,setup,onboarding,feed,landing}.tsx`, with page entries at `site/app/(v2)/v2/one/<page>/page.tsx`. All navigation targets `/v2/one/...`. Preserve the three existing directions.

Use `.palette-council` and existing theme imports. Set consistent 26px desktop outer gutters, half Deck’s rendered 52px at 1440; remove the 1400px page cap. Keep forms and text at readable widths inside that canvas. No phone composition.

Reuse `deck/chrome.tsx`’s `Stage`, `lift`, `liftStyle`, `ViewSwitch`, `PrimaryLink` and `Quote`; `deck/marks.tsx`’s `SourceMark`, `ItemMark`, `GroupGlyph` and `GroupLabel`. Adapt private functions into the new files rather than changing old screens. Replace `Facts`, `StoryStack`, `Header` and the inert `AlertsButton` within the new composition.

Top-to-bottom page contents:

- Login: compact navigation; 420px lifted form using `shared/auth-form.tsx::AuthForm` with the new base; adjacent Deck story fan adapted from `DeckLogin`; one preview note. Blue primary submit, neutral providers. Remove repeated authentication buttons outside the form.
- Setup: navigation and title; Deck handle/interests form beside its source-and-story example; existing `OtherExample` beneath the form. Adapt `setup.tsx::DeckSetup`, `Example`, `OtherExample`; submit to onboarding. Preserve typed and X-provided handle states.
- Onboarding: navigation; compact title/status and interest sentence; All/X/RSS/Websites switch; selected-source grid; completion actions and trial text; compact first-story previews. Adapt `building.tsx::ChosenCard` and `ready.tsx::Group`, with reasons collapsed. Reuse `next/building/steps.ts::useRun` and `isDone`, without `useFollow`. Failure retains results and offers working local retry.
- Feed: navigation button and tool row; one quiet checking line when applicable; card grid; contextual source reader. Adapt `feed.tsx::SourceList` and `stack.tsx::StoryCard`. Preserve source selection and clear-selection behavior.
- Landing: compact visitor navigation; existing Deck headline/CTA beside a readable story and `DmCard`; source groups; sample stories; sentence-to-selected-sources example; existing `Plans`; signup CTA and footer. Adapt `DeckLanding`, `SourceCard`, `GitHubCard`, `AgentStrip`, `Plans`. Replace peeking stacks and inline citations; signup links open the unified login card.

Use `deck/data.ts::stories`, `sources`, `itemsFrom`, `newest`, `status`; onboarding’s `chosenAccounts`, `chosenSites`, `brief`; landing’s `heroStory` and `packDm`. Include Olmo, Vercel, Latent Space/Simon Willison, and imageless Next.js. GitHub’s fixture is feed-only, not an onboarding selection. Invent no sources, counts or reasons.

Builder screenshots: 1440×900 and 2560×1440, both themes, every page. Include login/signup; setup error; onboarding running/ready/failure/reason-open; feed Clustered/Direct, sidebar open/closed, source reader and alerts states. Capture landing below the fold too.

Review checklist:

- Match [accepted Deck](/Users/farzanm4/.agents/skills/reference-led-design/examples/accepted/accepted-deck-dark.png) depth, colour and finish.
- Avoid the [flat landing](/Users/farzanm4/.agents/skills/reference-led-design/examples/near-misses/landing-flat-hero-dark.png) near miss.
- Sidebar never moves cards.
- Every fact is immediately readable.
- Thumbnails remain subordinate.
- Source reader preserves the visible cluster.
- Onboarding keeps its structure through completion.
- Keyboard focus, Escape and focus return work.
- Light-mode contrast and logos remain clear.
- Old routes remain unchanged.