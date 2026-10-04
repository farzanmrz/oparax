RESULT: FINDINGS

[Pass 5 onboarding](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/v2/one/onboarding-p5-done.png) removed the profile and posts that gave [pass 3](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/v2/one/onboarding-done-p3.png) variety. Restore those objects within the locked three-column composition. Current source already removes Show more and the One dock; the supplied screenshots predate those changes. `council-feel-oct3/kimi.md` is absent.

**(a) Sidebar**

- Keep the 240px lifted column, 10px internal padding, existing theme and complete collapse.
- Deck’s `SourceList` supplies 32px source rows, 18px marks, 13px names, 10px icon-to-name gaps and 6px below group labels.
- Oparax row: 36px high, then **24px clear space** before Sources. Pass 5 effectively adds only 4px before the heading.
- Sources: 20px line box, 13px semibold; **16px clear space** below, then the 32px All sources row.
- After All sources: **24px clear space**, then the first group label. Deck currently combines 4px container spacing with 12px group spacing.
- Group labels: 16px line box, existing 10.5px mono; 6px before their rows; **20px between groups**.
- Show every source, as [Deck does](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/v2/one/deck-feed-now.png). No cap or replacement disclosure. Scroll the source region independently.
- Keep names, logos and one right-aligned 24px count column. Group and source counts share its right edge.
- Footer stays pinned: 16px clearance from scrolling content, 1px divider, 8px padding, then three identical 36px rows: Notifications, handle, Sign out. Remove days-left text.

**(b) Onboarding**

Use 264px timeline / flexible middle / 320px brief, with 20px gaps. Middle: profile and pin side by side, three post cards beneath, then source sections. Source tiles: 56px minimum height, 24px marks, 8px gaps, `repeat(auto-fit,minmax(180px,1fr))`. Natural height and scrolling preserve complete text.

The table’s status text is each timeline step’s sole supporting line, running → finished. Keep all eight titles visible; amber active mark becomes green on completion, skipped stays grey. Top title remains “Building your agent” until completion. Earlier completed objects remain unless explicitly replaced below.

| Step | Status text | Middle, running → after | Right | Timeline |
|---|---|---|---|---|
| 1. Find your X profile | “Finding your profile” → “Found Farzan Mirza on X” | Lookup card with handle → full profile, bio, initial fallback and pinned post with date. | Reserved space, no placeholder prose. | Active → complete. |
| 2. Read your newest posts | “Reading your newest posts” → “Read 10 newest posts” | Three stored cards arrive: original, quote with inset quotation, two-part thread. Preserve their full text; no seven-missing-posts tile. | Unchanged. | Active → complete. |
| 3. Gather candidates | “Gathering candidates” → “Candidates gathered” | One compact row: “150 listed sources · 3 quoted accounts”, with Next.js, Guillermo Rauch and Lee Robinson marks. No metric tiles. | Unchanged. | Active → complete. |
| 4. Jev checks relevance | “Checking relevance” → “Relevance checked” | Passing candidates arrive in X accounts, RSS feeds and Websites sections. Show all 35 passing candidates by completion; no scores, bands or dimmed “possible” class. | Unchanged. | Active → complete. |
| 5. Choose sources | “Choosing your sources” → “Sources chosen” | Those sections resolve into 7 accounts, 9 feeds and Cursor. Remove unchosen candidates; retain selected cards in fixture order. Card disclosure reveals its stored reason, without “Why” labels. | Unchanged. | Active → complete. |
| 6. Search X for more accounts | “Skipped: enough accounts already fit” | No additional object or invented search activity; everything holds. | Unchanged. | Skipped. |
| 7. Write your brief | “Writing your brief” → “Brief written” | Profile, pin, posts and chosen sections stay. | Existing lifted brief fills with summary; interests and language appear when complete. | Active → complete. |
| 8. Save your agent | “Saving your agent” → “Agent saved” | Everything stays, including expanded reasons. On successful save, top becomes “Your agent is ready” with Open your feed. | Completed brief stays. | Complete; search remains skipped. |

**(c) Feed verdict**

[Closed pass 5](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/v2/one/feed-p5-closed.png) is visually done apart from the already-specified dock removal.  
Keep its 150px top images, neutral imageless cards, complete facts, source names and current top-row arrangement.

**(d) Builder list**

Paths below are relative to `scratch/design-recovery/site/`.

1. `v2/one/rail.tsx`, `Rail` and `SourceList`: apply the exact spacing above.
2. `rail.tsx`, `GroupBlock`: retain uncapped lists and aligned counts; correct stale capped-list comments.
3. `rail.tsx`, footer: prevent shrinking, retain independent source scrolling, remove trial text.
4. `v2/one/onboarding.tsx`, middle: restore profile, pin and three stored posts using `next/data/onboarding.ts`.
5. `onboarding.tsx`, candidate sections: separate relevance results from final selection; preserve source identity across that transition.
6. `onboarding.tsx`, timeline: use concise local status copy; preserve shared step timing and algorithm.
7. `onboarding.tsx`, `BriefPane`: remove waiting prose; retain the right-hand position and existing streaming treatment.
8. `onboarding.tsx`, arrivals: retain existing 300ms fade/6px movement and reduced-motion handling; no automatic scrolling.
9. `v2/shared/style-switcher.tsx`, `StyleSwitcher`: retain the existing One exclusion.
10. Review handoff: screenshots at `?at=1` through `?at=8` and `?at=done`, plus feed open/closed, both themes. No new renders or execution occurred in this read-only lane.