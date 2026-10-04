RESULT: FINDINGS

The monitor page already loads real data: `readMonitor` and `readFeed` in `lib/monitor/read.ts`. A story is a `DisplayStory` (verified card plus `reports`). The One card takes the preview `FeedStory` (`scratch/design-recovery/site/next/data/feed.ts`: arrangement, card, items). Add a display-only adapter, `lib/monitor/present.ts`. Server pages stay server components and pass plain props. The One components are client components, so they cannot import `read.ts`. Copy the composition from `v2/one` plus `v2/deck/chrome.tsx` and `marks.tsx`. Leave `data.ts`, the arrival replay, and `useRun` behind. `renders/feed-open.png` is the feed: "Your Feed", Clustered/Direct at the right, one DM line, image cards, source row, facts with no publisher parentheses, one bubble bottom left. `renders/onboarding-done.png` is the onboarding layout. Its eight titles are the preview replay. The engine reports three steps (`lib/monitor/content.ts`, `report(1|2|3)` in `lib/onboarding/engine.ts`) and keeps the rest in `build_state`. For the owner, derive the rail from that saved state. Scores stay off the page.

(1) Mapping

- `app/page.tsx`. No One landing. The landing notes are empty and he has not picked one. `LandingPage` stays. It only picks up the new tokens.
- `app/login`, `app/signup`. The One card from `v2/one/login.tsx`. Email and password first. Signup swaps in confirm password. X and Google sit below, through `signInWithProvider`. `loginAction` and `signupAction` stay. The forgot link stays. The fan uses stories from `readFeed` when a public monitor has any. With none, the card stands alone.
- `app/forgot-password`, `app/auth/reset-password`. The same lifted card and tokens. The same forms and actions.
- `app/onboarding`. The One setup from `v2/one/setup.tsx`. The fields keep the current `SetupForm` submit. The right column is the recorded sample with one "Sample" line. The route stays `/onboarding`.
- `app/[handle]`. While `status` is `building` or `failed`, the owner sees `v2/one/onboarding.tsx`. The rail uses those eight titles. State comes from `build_step`, `build_log`, and an owner-only read of `build_state` (profile, posts, answer, searched, brief). Each line is the log message. The middle shows saved posts, then chosen sources by kind with `why`, opening the quoting post when that post is in the saved posts. The right side is profile and brief. No trial line and no score. On failure the same page shows the error mark and the existing retry POST to `/api/build/retry`. Every other status is the One feed. Clustered binds `feed.stories`. Direct binds `feed.articles`, one card each. The query stays `view=articles`. `toFeedStory` uses the card headline or `fallback_title`, the card facts or none, the card image or `story.image`, and items from `reports` (title, url, time, kind, publisher, author). The public select gains no item body. The DM line links to notifications. An empty feed says "No relevant news yet." For the owner, `frozen`, `lapsed`, and `exhausted` keep the current `StateBanner` copy and `PayButtons` under the title. The trial countdown stays off the feed.
- `app/[handle]/sources`. New page, `v2/one/sources.tsx`. X accounts come from `monitor_accounts`. Sites come from `sources.kind` (`rss`, `website`, and `github` or `github_repo` when a row has that kind). Add `kind` to that select. Empty groups are omitted. Unreadable and paused lines stay. Digests stay on settings.
- `app/[handle]/notifications`. New page, `v2/one/notifications.tsx`. The switch reads `bot_state`. Turning it on posts the existing `/api/activation` form. Paused and stopped keep the current bot copy.
- `app/[handle]/settings`. Skip until he asks. Tokens only.
- `app/[handle]/[story]`. Skip a reader. This route already renders the monitor and hoists that story, so it shows the same feed.
- `app/checkout/return`, `app/privacy`, `app/terms`. Tokens only. Checkout logic stays.
- `app/local-preview`. The same feed components, fed by `previewFeed`.
- Bubble, `v2/one/rail.tsx`. Feed `/{handle}`, Sources, Notifications, theme, `@handle`, Sign out.

(2) Theme

Put the `.palette-council` light and dark values from `scratch/design-recovery/site/app/(next)/palettes.css` onto `:root` and `.dark` in `app/globals.css`, including the shadcn variables (`--background`, `--foreground`, `--card`, `--primary`, `--destructive`, `--border`, `--ring`, `--radius` 10px, sidebar). That is the `DESIGN.md` theme. Add the names the One files read (`--page`, `--window`, `--rail`, `--t1` through `--t4`, `--line`, `--brand`, `--kind-post`, `--kind-article`, `--kind-github`, `--ok`, `--caution`, `--error`, the soft fills, `--stage-light`, `--stage-frame`, `--window-shadow`, `--card-shadow`, `--top-light`) and register the Tailwind ones in `@theme inline`. Leave the other palettes and `next.css` out. `components/ui` stays as shipped (button, input, field, switch, alert, dialog, sheet, tabs, collapsible, sonner). Lift, shadow, and Open Sans on the body come from the tokens. `--t4` is labels only.

(3) Order

1. Tokens and Open Sans. Verify the build, then the current login and a dev monitor.
2. Bubble on the monitor, with theme and sign out. Verify the menu, the theme, sign out, and that the feed data is unchanged.
3. Login and signup card on the existing actions. Verify a bad password, signup, X and Google, the forgot link, and the signed-in redirect.
4. Forgot and reset on the lifted card. Verify both actions complete.
5. Setup in the One layout, same submit. Verify a real handle and sentence still redirect to `/{handle}`, and the error codes still show.
6. Building and failed from `build_step`, the log, and owner-only `build_state`. Verify the live step matches the log, retry still posts, and the engine file is untouched.
7. Feed adapter and cards, both views, the empty line, and load more. Verify real headlines and images, direct matching articles, and the cursor.
8. Sources page. Verify the groups match that monitor, including a paused or unreadable row.
9. Notifications page and the feed DM line. Verify the switch matches `bot_state` and activation still posts.
10. Stop. Settings, the story reader, and a new landing wait until he asks.

(4) Must not touch

`lib/onboarding/engine.ts`, its prompts, and the `/api/build` and `/api/build/retry` contracts.
`lib/auth` actions, `proxy.ts` session refresh, the auth confirm route, and destination checks.
`app/api/stripe`, the checkout return session check, and the webhook.
`app/api/x/webhook` and the cron routes.
The public column lists in `read.ts`. `build_state` is an owner-only read. Payment ids, checkpoints, and item text stay off the public feed.