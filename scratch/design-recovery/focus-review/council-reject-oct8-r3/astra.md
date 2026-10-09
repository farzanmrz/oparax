**Not ready to show as finished.** The feed is substantially better than `now-feed.png`: varied card heights, images, status tiles and integrated digests replace the six equal boxes. Before Build, the early run and Settings still have the composition problems the brief warned about.

I opened all 18 pictures. This is a screenshot and source review, not an interaction sign-off.

**Per-page judgment**

| Page | Beside the accepted Deck? |
|---|---|
| Before Build, `new-rest.png` | **No.** The seven-step rail dominates a detached form. This is the “small form stranded on an empty page” near miss, despite the form’s actual width. |
| Profile, `new-run-profile.png` | **No.** Two tall side objects surround a shallow central status strip and a void. “Choosing sources” also contradicts the active step, reading posts. |
| Scoring, `new-run-scoring.png` | **No.** The profile and posts have substance, but the actual work is reduced to a count and tiny activity bar beneath the same inaccurate heading. |
| Choosing, `new-run-jev.png` | **No.** The colored pills improve the former flat bands, but football publishers marked Strong match for an agent-review brief make the central object visibly incoherent. |
| Saving, `new-run-chosen.png` | **No.** The page says the sources have been chosen, yet the candidate catalogue still leads and the chosen answer is below it. |
| Done, `new-run-done.png` | **Yes, compositionally.** The chosen sources, distinct brief and immediate Open your feed action form a clear result. The skipped search still needs a readable outcome. |
| Failed, `new-failed.png` | **Yes, compositionally.** The central error and retry lead while completed work remains visible. The unrelated Strong matches still undermine the example. |
| Feed dark, `new-feed.png` | **No, but close.** It has the Deck’s variety and lift, but story-level kind information is missing and recognizable images illustrate unrelated claims. |
| Feed collapsed, `new-feed-closed.png` | **No, but closest.** The wider cards breathe well and collapsing genuinely removes the aside. The same content and metadata defects remain. |
| Feed 2560, `new-feed-2560.png` | **No, for those same defects.** Four columns are reasonable; empty ground after a short feed does not justify stretching cards or inventing content. |
| Feed light, `new-feed-light.png` | **No.** White surfaces, borders and shadows work, but the white fade visibly washes out the article pictures. |
| Settings dark, `new-settings.png` | **No.** The source aside and centered account column look like separate layouts, divided by roughly 292px of unused ground. |
| Settings light, `new-settings-light.png` | **No.** The light treatment succeeds, but it makes the same disconnected composition particularly obvious. |

**Required fixes, smallest first**

1. **Phase text in the title band and step rail.** In `new-run-profile.png`, name the current activity, reading posts; in `new-run-scoring.png`, name scoring. In `new-run-chosen.png` and `new-run-done.png`, replace the skipped search’s conditional instruction with its recorded outcome. A dashed circle alone does not explain whether the search was skipped or remains unfinished.

2. **The image surface at the top of light feed cards.** Remove the white wash over the picture in [new-feed-light.png](/Users/farzanm4/Desktop/repos/oparax/img/new-feed-light.png). The overlay in [card.tsx](/Users/farzanm4/Desktop/repos/oparax/components/one/card.tsx:61) uses the white window color in light mode. Preserve the original image colors and separate it from the white card with the existing edge.

3. **Kind metadata inside each feed card.** Restore compact blue Post and teal Article chips, with counts derived from the actual reports, beside the card’s existing metadata. All four feed renders lose information and meaningful color that `accepted-deck-dark.png` carries on each story; the aggregate tile cannot identify an individual card’s contents.

4. **The Settings composition inside the page column.** Center the source aside and account objects **together**, with the normal gutter between them. Keep the person, plan and Notifications as separate objects and retain their readable width. In [new-settings.png](/Users/farzanm4/Desktop/repos/oparax/img/new-settings.png) and its light counterpart, independently centering the 520px column creates the moat. Enlarging Notifications to fill it would produce another problem.

5. **The Before Build pair and early-run arrangement.** In [new-rest.png](/Users/farzanm4/Desktop/repos/oparax/img/new-rest.png), center the seven-step aside and form as one composition, with a normal gutter. Keep all seven step names visible, but shorten their explanatory copy so the rail supports the form instead of towering over it. Apply that compact rail to profile and scoring; keep their work card adjacent to the profile object. Do not manufacture activity or enlarge empty panels to occupy the remaining ground.

6. **Chosen sources at the top of the saving card.** In [new-run-chosen.png](/Users/farzanm4/Desktop/repos/oparax/img/new-run-chosen.png), promote the chosen set as soon as that checkpoint exists, while saving continues. Put candidate bands below it; keep Open your feed unavailable until saving actually completes. The answer should not disappear beneath the work that produced it.

7. **Coherent content inside the preview objects.** Replace the mismatched feed examples with saved, coherent report content whose image, publisher, headline and facts belong together. `Olmo-core 3` illustrates agent-review claims, and Microsoft/Vercel imagery illustrates a story credited to Anthropic. [fixture.ts](/Users/farzanm4/Desktop/repos/oparax/lib/local-preview/fixture.ts:13) confirms invented stories are credited to real sources and decorated with borrowed pictures. Likewise, use coherent saved scoring results for `new-run-jev.png`, `new-run-chosen.png` and `new-failed.png`; the football Strong matches cannot demonstrate this person’s beat. Keep the preview disclosure.

8. **Digest contents inside the feed grid.** Preserve every returned, enabled digest item as readable content, allowing the card to grow or continue as additional content-sized cards. The [current selector](/Users/farzanm4/Desktop/repos/oparax/components/monitor/one-feed.tsx:150) takes one item per kind, silently discarding the rest from this view. The two-item preview hides that loss. Also give the shared heading a neutral treatment rather than identifying the entire mixed card with GitHub’s logo.

9. **Entitlements on the Settings controls.** Retain the authorized sign-up-gated source editing, but remove the additional entitlement changes introduced solely by this design conversion. Preserve the prior rules for the other controls pending an explicit product decision. This concerns alert hour, digest settings, Watch, no-filter and repository behavior, not their visual placement.

**The three additional decisions**

- **(a) Reject as a bundled expansion.** Source editing authorization does not establish authorization for every adjacent setting. Watch and no-filter can change what is processed; notification and digest controls change delivered behavior. Their time or cost effect was not established by the visual agreement. Fix 9 keeps that decision separate.
- **(b) Reject as implemented.** One compact digest object is acceptable. Showing only the newest item of each kind silently removes other reading material. Fix 8 preserves the object without that loss.
- **(c) Accept.** Stopped truthfully distinguishes an inactive monitor from a live monitor with failed items. Keep the actual reason and existing recovery action visible in the relevant plan/banner state. This label does not authorize any new stopping rule.

The fixed theme should stay. These changes concern composition, truthful content and understandable state, not a new palette or more decoration.

## I accept

- **Before Build:** SHIP AFTER **5**.
- **Run, profile:** SHIP AFTER **1, 5**.
- **Run, scoring:** SHIP AFTER **1, 5**.
- **Run, choosing:** SHIP AFTER **7**.
- **Run, saving:** SHIP AFTER **1, 6, 7**.
- **Run, done:** SHIP AFTER **1**.
- **Failed:** SHIP AFTER **7**.
- **Feed, dark:** SHIP AFTER **3, 7, 8**.
- **Feed, collapsed:** SHIP AFTER **3, 7, 8**.
- **Feed, 2560:** SHIP AFTER **3, 7, 8**.
- **Feed, light:** SHIP AFTER **2, 3, 7, 8**.
- **Settings, dark:** SHIP AFTER **4, 9**.
- **Settings, light:** SHIP AFTER **4, 9**.