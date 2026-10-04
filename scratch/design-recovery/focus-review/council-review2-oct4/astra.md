RESULT: FINDINGS
VERDICT: One more pass

Feed passes visually. `feed-open.png` now has four distinct levels: Oparax, Sources, All sources, and source groups. Beside `deck-feed.png`, it reads as the same lifted sidebar. Counts align and account actions are separated. `feed-closed.png` is done: integrated pictures, readable facts, consistent imageless cards, no backing plates.

Onboarding has recovered Window’s profile, pin, posts and brief, but its earliest screenshot still resembles the empty near misses. Step 1 is weakest. Steps 2 and 3 make sense, although the blank brief competes with useful content. Step 4 announces results prematurely. Step 5 brings back life through source logos, but its totals precede the visible arrivals. Step 6 looks stalled without a current status. Steps 7 and 8 clearly communicate writing and saving. Done preserves the composition, but Websites is entirely outside the picture.

Fixes, all in [onboarding.tsx](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/v2/one/onboarding.tsx):

1. `ProfileRunning`: place the loading silhouette inside the eventual lifted profile surface, make it legible using existing tokens, and show the submitted handle. Step 1 must visibly identify what is being found.
2. `BriefPane`: reserve its position without drawing an empty titled card through steps 1–6. Reveal the surface when the brief begins arriving.
3. `SourceCard` and source sections: compact tile height and vertical gaps enough to expose Websites in the 900px completion view. Preserve readable names, logos, profile, pin and post excerpts.
4. `CandidatesLine` and section counts: retain gathered candidates while relevance checking runs; reveal kept totals only after completion. During source arrival, show arrived counts rather than final totals.
5. `runningLine.search`: show “Search skipped: enough accounts already fit.” Step 6 needs an intelligible status without suggesting a search ran.
6. `CandidatesLine`: remove the repeated kept/set-aside sentence after source selection; the completed timeline already records that result.

First four pictures, after fixes: `feed-open.png`, `feed-closed.png`, `onboarding-step-2.png`, `onboarding-done.png`.