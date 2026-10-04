RESULT: FINDINGS

(1) Sidebar, feed-open.png: yes, four levels read now: the Oparax mark with collapse control, section headers in small caps with right-aligned counts (Sources 9, X accounts 5, RSS feeds 3, Websites 1), source rows with favicon and count, and the pinned account block (Notifications with X DMs, username, Sign Out). Beside deck-feed.png it is the same object: same type, same row anatomy, name/handle switch gone, no Show more bleeding, counts aligned. The tall gap above Notifications matches the deck's pinned bottom, so it reads as intentional.

(2) Feed closed: not done. The collapsed rail still carries a stack of per-source favicons. His verbatim: "Just when the sidebar is closed, it's closed... There's no reduced sidebar... there shouldn't be logos for all the fricking companies." The Supabase example he gave collapses to a few generic icons, not every company logo. The cards reflowing wider is right; the rail is not.

(3) Onboarding, step by step. The composition is right beside window-building.png: checklist left, accounts middle, brief side block right, exactly his "left timeline, middle accounts, brief in a side block." Step 1 makes sense (profile being found, brief ghosted) but the placeholder is very faint in dark. Step 2 is strong: profile card with avatar, bio, stats lands. Step 3 is strong: real posts with pins. Step 4 is weak: the middle column already shows the final source list with final counts, stealing step 5. Step 5 is weak: the checklist advances but nothing visibly changes. Step 6 is the weakest: "2 websites skipped" with no status anywhere, a dead beat. Step 7 is the best moment: the brief writes itself. Step 8 is fine. The done shot holds as one composition, but Websites (1) falls below the fold at 900px, and he said "Everything can appear consistently on the same page." Life is real throughout: profile, posts, favicons, brief; no fluff lines (no replay, no trial text, no user ID, no "click any source").

(4) What he would notice first and dislike: the closed rail full of company logos, since he already ranted about exactly this. Second, the done page cutting off Websites. Third, two consecutive beats (5, 6) where the page barely moves, after he asked for screenshots "of each and every process."

VERDICT: One more pass.

Fixes:
1. `site/v2/one/rail.tsx`, collapsed rail: remove the per-source favicon stack; keep mark, expand, Clustered/Direct, bell, avatar.
2. `site/v2/one/onboarding.tsx`, done state: tighten middle-column rows and section gaps so Websites (1) sits above the fold at 900px.
3. `onboarding.tsx`, step 4: show candidates without final counts or rows; reveal the 5 selected rows at step 5.
4. `onboarding.tsx`, step 6: add a visible Websites row marked skipped, or merge the beat into step 5.
5. `onboarding.tsx`, step 1: raise the loading placeholder one luminance step in dark.

Show him first: feed-open.png, onboarding-step-3.png, onboarding-step-7.png, onboarding-done.png.