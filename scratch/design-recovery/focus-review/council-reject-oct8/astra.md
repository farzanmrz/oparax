1. **One can be saved, but its composition needs substantial correction.**

   I inspected all 15 pictures. The accepted feeds make different things visibly different: stories, sources, evidence, activity and allowance. The current pages retain the colors and borders but flatten those distinctions.

   | Page | What is missing | What should stay |
   |---|---|---|
   | [Before Build](/Users/farzanm4/Desktop/repos/oparax/img/now-rest.png) | The form competes with the heading while an enormous catalogue owns the page. Unlike [Deck](/Users/farzanm4/Desktop/repos/oparax/img/accepted-deck-dark.png), there is no clear primary object. Twitter rows push every other source kind below the screen. | The recognizable source marks, separate source kinds and visible steps. |
   | [Chosen](/Users/farzanm4/Desktop/repos/oparax/img/now-run-chosen.png) and [Ready](/Users/farzanm4/Desktop/repos/oparax/img/now-run-done.png) | Both foreground the candidate pool. The actual selection sits farther down. [Window](/Users/farzanm4/Desktop/repos/oparax/img/accepted-window-dark.png) gives its main result enough space and emphasis to read immediately. Here the result loses to its preparation. | Steps left, source work centre, one coherent profile and brief right. The real checkpoint model. |
   | [Feed](/Users/farzanm4/Desktop/repos/oparax/img/now-feed.png) | Six equally tall boxes make a one-line item occupy the same visual weight as a substantial story. No visible source context, useful activity overview or imagery interrupts the repetition. The digest below looks disconnected. | Every fact is visible, citations are collected above the story, and imageless cards use the same neutral surface. |
   | [Settings](/Users/farzanm4/Desktop/repos/oparax/img/now-settings.png) | One broad directory and one tall administrative block. Notifications are buried below account, billing and scheduling. [Newsroom](/Users/farzanm4/Desktop/repos/oparax/img/accepted-newsroom-dark.png) separates these kinds of information into compact, readable objects. | Names beside addresses, actual logos, errors beside affected sources, and sources plus notifications on one page. |

   This was not simply a bad port. The frozen [One feed](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/one/feed.tsx) already prescribed equal-height rows; the [product preserves them](/Users/farzanm4/Desktop/repos/oparax/components/monitor/one-feed.tsx:85). Also, the [preview fixture](/Users/farzanm4/Desktop/repos/oparax/lib/local-preview/fixture.ts:89) deliberately supplies no story images. The product card still supports them. The missing pictures therefore exaggerate the loss, while the layout weakness is real.

2. **His requests, in order of weight.**

   **First, recover the feel he recognized:** “Complexity is still represented in a consistent design system, and it still looks good.” Also: “you removed a bunch of other cards, so this page is lifeless. I didn't want that.” Subtraction must remove repetition without making everything the same. [Original history](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/history/owner-history.md).

   **Second, apply today’s explicit arrangement:** “I’ve decided that I want a sidebar like the one I like from Deck.” And the setup belongs in “the central area where the actual content starts appearing.” These supersede the bubble menu and pass-16 setup row. The sidebar’s earlier problems still matter: distinct section headings, aligned counts, clear separation around “Show more,” and fully closed means closed, without a reduced strip of company icons.

   **Third, keep reading and understanding immediate:** “reading without clicking” is “imperative”; “The right side is for the user's own stuff, and the left side is for my timeline.” Building must become ready in place. Optional source explanations can expand; the actual chosen sources and story facts must already be visible.

   **Fourth, preserve subsequent corrections.** The later complaint that thumbnails lost their attraction refines the earlier request for smaller pictures. Keep integrated images without letting them displace the facts. The later praise of the free-week and this-week cards reopens those specific useful objects, not every original dashboard tile. Keep today’s Twitter wording, X mark, layout C, multicolor Google G and Login/Continue distinction. [Later history](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/history/owner-oct5-8.md).

   The fixed theme and [Width rule](/Users/farzanm4/Desktop/repos/oparax/DESIGN.md:52) stand. His overall rejection does not authorize changing either.

3. **My proposal for the next council round.**

   **Shell and sidebar.** Keep one aligned header and a separate page-title line. Restore Deck’s source-list treatment as the shared left sidebar, visible on arrival. Use [Deck’s SourceList and Row](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/deck/feed.tsx:218), with stronger group headings, real marks and properly separated expansion links. Feed and Settings navigation live there; do not repeat them in the header. Keep one brand and one account control.

   During onboarding, the left column contains navigation followed by the existing step list. It replaces the source-list content, avoiding four competing columns. On Settings, its section links jump to the visible settings sections. Everything stays inside the existing width boundary. The nearest failure is the rejected blocky sidebar with indistinguishable headings and rows.

   **Before Build.** Put the handle, beat and Build button inside one lifted central form, below the page heading. Keep the steps beside it. Remove the giant starter catalogue from this initial state. The form explains the task through its field labels; one short line can explain that the initial selection can be extended with sources afterward. Do not imply the catalogue defines the product’s coverage.

   Use the existing form controls with [the main-surface lift](/Users/farzanm4/Desktop/repos/oparax/components/one/stage.tsx), retaining actual validation and errors. No empty profile placeholder. This must avoid both the current squeezed toolbar and the near miss of a small form stranded in a huge empty page.

   **Run and ready.** The form’s central surface becomes the working surface in place. Preserve the profile, bio and posts as they arrive. Label the submitted sentence separately from the generated brief.

   While scoring, retain available gathered-source information under the active status instead of clearing the centre. AI Elements `Shimmer` and the existing activity indicator can signal waiting, but text must remain readable throughout. Animate checkpoint arrivals only.

   When selection arrives, make **chosen sources the first central object**, grouped as Twitter accounts, RSS feeds and websites. Show their actual names and addresses; reasons expand underneath. Keep completed candidate bands below, available for inspection. At ready, the chosen set, written brief and Open your feed action are immediately visible. On failure, put the failure and retry in that same central surface, retaining completed information. [Current ordering](/Users/farzanm4/Desktop/repos/oparax/components/one/run.tsx:174).

   The nearest failure is an attractive process log whose final answer remains below the fold. The fixture’s football matches are staged scores, not evidence of what the real model selected.

   **Feed.** Restore Deck’s content-sized card composition beside the sidebar. Remove forced card stretching. Use integrated publisher images when supplied, with compact imageless cards alongside them. Preserve all facts and the source row above them. Do not restore the rejected backing-card peeks or “more facts.”

   Above the stories, place the two useful objects he specifically missed: **this week’s activity** and **the actual plan/allowance**. Use Deck’s `Tile`, `WeekBars` and `Segments` devices. Activity must come from a complete, defined reporting period, not the current paginated results; allowance comes from the monitor. A trial meter appears only after the trial starts. Give the digest a finished neutral card with its repository, summary and date.

   The nearest near miss is “same shell, different centre”: adding a sidebar while leaving six uniform boxes untouched. [Deck composition](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/deck/feed.tsx).

   **Settings.** Keep the source directory as the main surface. Make its kind headings and actions clear, with source errors remaining beside the affected row. Separate the right side into a compact account/plan object and a Notifications object whose Twitter connection state and message button are visible immediately. Scheduling and digest controls belong inside Notifications, rather than separating it from its action.

   Use the existing settings rows, Deck’s allowance treatment and Newsroom’s compact status-object hierarchy. Source add/remove must follow the sign-up-only ruling. The current [paid-only flag](/Users/farzanm4/Desktop/repos/oparax/app/[handle]/settings/settings-view.tsx:81) is an implementation discrepancy; changing its explanatory sentence alone would not fix it. The nearest failure is rearranging the same long disabled form into more boxes.

   **Login.** Keep [the current composition](/Users/farzanm4/Desktop/repos/oparax/img/now-login.png). It retains [Deck’s fan](/Users/farzanm4/Desktop/repos/oparax/img/accepted-deck-login.png), separates it from the form, and incorporates today’s button corrections. No further structural redesign is warranted. Avoid the rejected circle and Center Flow experiments.

   Across these changes, use existing theme surfaces and shadows. Light mode needs the same object hierarchy, with white surfaces and visible borders. Richness must survive an entirely imageless feed too.

4. **The biggest improvement, and the repeat failure.**

   **Biggest improvement:** restore the Deck composition around the content: a useful visible sidebar beside cards whose size and imagery reflect their actual stories. That would change the feed’s first impression immediately.

   **What would restart the loop:** declaring success because every requested element exists, without comparing the resulting pages against the accepted pictures. A sidebar, a form card and a green status label can all be present while the page remains lifeless.

   This is my independent proposal for the second round, not a claim of council agreement.