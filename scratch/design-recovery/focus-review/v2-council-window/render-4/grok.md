RESULT: FINDINGS

I opened the four frames. In `feed-dark-01.png` the Alerts tile has only the new line under the button, and the chart's first two day slots are empty before the teal bars rise to Oct 1. In `ready-light-01.png` a hairline sits between the product paragraph and that same line, and the `vercel/next.js` row shows a blue switch.

I accept the added line in this form. The product sentence stays where it was on Ready, and a separate line under it, and under the Feed button, reads: Preview: opens X's composer with "Start alerts" typed. Choose @oparax_ai as the recipient. That is the disclosure I wanted on the screen, with the product sentence kept.

**Feed.** ACCEPT, beside `accepted-window-dark.png` and `accepted-window-light.png`. Facts are on the card. The preview line is the only alert copy, in `text-t3`, under the existing button, in dark and light. The chart is still "Published this week", with no total beside Clustered 6.

**Landing.** ACCEPT. Nothing in this exchange touches it. The hero, the five source bands, the recorded reasons, and the plan tiles stand as in exchange 3.

**Sign up.** ACCEPT. The form remains the task, with Olmo and Mistral readable beside it.

**Setup.** ACCEPT. The right column still leads with the labelled MAI example, then the profile and posts.

**Building.** ACCEPT. Judging stays only while step 3 runs. After it, the chosen sources, their reasons, and the posts remain.

**Ready.** ACCEPT, beside `accepted-newsroom-light.png`. The product sentence from `next/copy.ts` stays first. The preview line follows, under a rule, in the same `t3` tier, in dark and light. Open your feed stays the primary action. Light mode is white panels on a pale page.

The strongest case against this is reading order. The first sentence still says the composer opens a message to @oparax_ai. This preview link does not set a recipient. A person who stops after that sentence sends "Start alerts" to nobody. The second line corrects it, and the rule makes the correction its own object, but it does not remove the first claim.

Highest risk: that skipped correction, so the confirmation the product sentence describes never happens. I would leave both lines as rendered. Replacing the product sentence would hide the real product behavior this preview is showing.

Verified: the four frames, `AlertsPreviewNote` in `chrome.tsx` (the exact sentence, `text-t3`, not `t4`), its placement in `feed.tsx` and `ready.tsx`, and the href `https://x.com/messages/compose?text=Start%20alerts` with no recipient. Inference: the other four screens are unchanged because this diff only adds that note. Unknown: a live click, and whether a person reads the second line before sending.