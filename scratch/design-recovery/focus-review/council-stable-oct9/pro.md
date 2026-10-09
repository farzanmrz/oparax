### 1. THE PATTERN, named
**Pattern: The Disjointed Fluff**
The owner repeatedly objects to designs that introduce arbitrary separations, floating disjointed elements, inconsistent spacing, and unnecessary visual complexity. He wants a cohesive, balanced, single-surface structure.

**Quotes:**
1. **Oct 2 (02:53 UTC):** "There's still no life on the pages, and it's still not what I was telling you was good about Supabase or Linear and all... It's horrible." (`owner-history.md`)
2. **Oct 3 (PAGE-NOTES):** "Whatever this weird bar is above the cards in the one design, I don't like that. I don't like the banner and how solid it comes... The sidebar looks damn weird, like it's not as clean as it was in deck."
3. **Oct 4 (17:05 UTC):** "Even what's written below there: 'clustered and direct preview data from public sources.' That line is not needed. That's just excess information... The fucking banner is not looking like a banner." (`PAGE-NOTES.md`)
4. **Oct 4 (21:15 UTC):** "Randomly cards are incorporated in feed. There is a sidebar and a pop-up, both in onboarding... Why are you making notifications and sources this separate shit? Why the fuck is sources one consistent card? This looks so fucking weird." (`PAGE-NOTES.md`)
5. **Oct 5 (05:43 UTC):** "The current central card looks awkward. The right side... looks awkward. The random dark mode toggle looks awkward. The '7 days left' design looks awkward... Their margins you need to reduce by half, but in onboarding you stretch it all the way up." (`owner-oct5-8.md`)

**What went wrong in how we worked:**
*   **Agreement ignored his earlier words:** For notifications, he stated on Oct 4: "Even X DM notifications, there won't be a toggle. There'll be a button because the plan is that this takes them to their X website...". Yet the `council-reject-oct8-r2/pro.md` agreement chose to include "Notifications (which includes digests and scheduling)", explicitly ignoring his rule.
*   **Build added objects he did not ask for:** The `council-rail-oct8/pro.md` agreement added a "hairline above every group after the first", adding an object he didn't want that he now sees as a "weird sort of fucking separation". The build also added Settings and Notifications to the rail *before* an agent is even built.
*   **Lane's spec overrode his stated preference:** In `council-rail-oct8/grok.md`, Grok's spec forced "Sign out as 12px --t3 text and no email" and forced a `--caution` (amber) meter color. This directly overrode his Oct 4 feedback that he wanted his username visible for a "balanced UI". Similarly, the lane's spec for the feed card forced an equal-row height and placed the "New" chip on its own line, overriding his preference for content-height cards and inline components.
*   **Build deviated:** The agreement in `council-reject-oct8-r2/pro.md` explicitly said to "remove the 150-row catalogue". The build completely ignored this and still renders the massive source table (`now9-onboarding-rest.png`). The `council-rail-oct8` agreement specified a clean "Menu at the bottom left" to restore the rail, but the build deviated by creating a "random floating toggle over the page cards".

### 2. The Fix
**(a) Menu control:** Move it off the page cards. It must be a fixed, inline open/close toggle anchored cleanly at the bottom left of the viewport.
**(b) Notifications:** Remove the digests and alert hour settings entirely. Replace with a single button to activate Twitter DMs that redirects the user to X.
**(c) The foot:** Restore the username/avatar at the top of the foot block, followed by a balanced bottom row containing the Theme toggle and Sign out button.
**(d) Free-week meter:** Restore his previously preferred hue (e.g., non-amber) and ensure the visual bar fills proportionally to 100% at 7 of 7 days.
**(e) Rail's sections:** Remove all hairline dividers. Place Twitter accounts, RSS feeds, and Websites directly under the Feed/Settings/Notifications navigation block.
**(f) Kind icons:** Standardize to a single set of icons (e.g., use the exact same X logo for Twitter across the sidebar, settings panel, and feed cards).
**(g) Onboarding before Build:** Delete the 150-row catalogue table completely. Show only the single card containing the handle, sentence, and "Build" button. The rail must only show the 7 setup steps (hide Feed/Settings/Notifications until the agent is built).
**(h) Feed card:** Move the "New" chip to sit inline to the right of the source name (or top right of the image). Allow the cards to dynamically size to their text content height instead of a forced row height.
**(i) "Fable":** He used dictation software. He asked "Why is there a label?" which transcribed as "Why is there Fable?".

### 3. End with `## I accept`

## I accept
(a) The Menu control is a fixed, non-floating toggle at the bottom left.
(b) Notifications page is only a Twitter DM activation button, with no digests or alerts.
(c) The foot holds the username above a balanced row with the Theme and Sign Out controls.
(d) The free-week meter uses his previous hue and visually fills to 100% at 7 of 7 days.
(e) Rail source groups sit directly under the nav block without hairline separations.
(f) One uniform set of kind icons is used everywhere.
(g) Onboarding shows only the Handle/Sentence card, and the rail shows only the 7 steps.
(h) Feed cards fit their content height, with the New chip inline or top right.
(i) "Fable" was a dictation error for "a label" ("Why is there a label?").