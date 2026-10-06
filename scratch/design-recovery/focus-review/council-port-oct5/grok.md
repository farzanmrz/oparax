RESULT: FINDINGS

Pass 16 sits on the routes the product already has. The header replaces the bubble. `/onboarding` and a building `/[handle]` become the rest and the run. A ready `/[handle]` becomes the deck. Settings takes sources and X DMs. Login and signup keep their actions and gain the fan. The landing stays. The seven phases are a reading of three engine steps plus the checkpoints. Jev and the brief each arrive whole, so the centre jumps on the 3 second refresh. Freeze the lab.

1. Mapping

`v2/one/shell.tsx` replaces `components/monitor/bubble.tsx` and the settings site header on the owner's signed-in pages. It shows Feed, Settings, the session email, the plan from `monitorState` (days left, pool used of pool limit), the theme switch, and sign out. Feed goes to `/onboarding` until a monitor exists, then `/[handle]`. Settings is hidden until then. A visitor keeps the public header. The column margin is `clamp(48px, (viewport - 1400px) / 4, 290px)`. The corner switcher (Window, Newsroom, Deck, One) is lab chrome and stays in the lab.

`v2/one/onboarding.tsx` is the rest and the run. `app/onboarding` and `setup-form.tsx` still post to the engine. Around the form: the seven phase lines, and the centre table from `docs/source-table-seed.json`. No right column. The existing redirect opens `app/[handle]/page.tsx`, which shows the run while building or failed (`readBuildLog`, `readOnboarding`, refresh every 3 seconds) and the deck once ready.

`v2/one/feed.tsx` replaces the ready branch of `components/monitor/one-feed.tsx`. Cards come from `readFeed` through `toFeedStory`. Clustered and Direct stay. The sources button lists `monitor_sources`, `monitor_accounts`, and `followed_repos`. Add and remove stay on settings. The product has no "checking N items" count, so that line is absent.

`v2/one/settings.tsx` replaces `app/[handle]/settings/page.tsx`. X rows come from `monitor_accounts`, RSS and websites from `monitor_sources`, GitHub from `followed_repos`, through the existing add and remove actions. The account block is the profile, the plan, X DMs (`bot_state`, the existing post to `/api/activation`), and sign out. Billing, cadence, and the digest switches stay under the plan. The Stripe route stays as it is. `sources/page.tsx` and `notifications/page.tsx` redirect here from those pages, not from `proxy.ts`.

`v2/one/login.tsx` wraps `components/auth/one-card.tsx` on `app/login` and `app/signup`. Same `loginAction`, `signupAction`, and `signInWithProvider`. Forgot password stays. The fan is the lab's fixed sample deck, because a logged-out page has no monitor. `app/page.tsx` and the confirm route stay.

`v2/one/card.tsx` is the shared story card. `next/building/steps.ts` supplies the seven titles and the one-line descriptions. Its timers, Pause, and Replay stay in the lab. `next/data/*` stays in the lab and the dev fixture. The palette is already in `app/globals.css`.

2. The run

A phase moves when a checkpoint or a log line says so. The page polls every 3 seconds. `jev()` and the model call each return one object, so a `report()` cannot reveal rows one by one. New reports only mark a phase. Phase completion follows the checkpoint, so an older log still reads.

Profile. The log says `Looking up @handle on X`. The first checkpoint has name, handle, bio, and image. The right column opens then: avatar, name, handle, About equal to the X bio. The next checkpoint adds the pinned post. Add `report(1, "Found {name} on X")`.

Posts. Each timeline page is already checkpointed. The read ignores `timeline`, so posts appear together at the end. Show `timeline.posts` until the final list is saved. Add `report(2, "Read N newest posts")`.

Gather. The candidate list is not stored. The seed table is already on screen. Quoted accounts can be marked once posts exist. Just before scoring, add `report(3, "Gathered T from the source list, Q accounts you quoted")`.

Jev. One request, most of the roughly 20 seconds. During it the only new fact is `Jev is scoring M candidate sources`. Scores land as one checkpoint, and all three bands appear on the next refresh. Strong is 0.75 and up, possible is 0.35 and up, and the rest are set aside. The read returns names only. Add one report with those three counts and no probability.

Choose. One call, not streamed. The line `Choosing recommendations and writing the brief` is followed by one checkpoint: sites, accounts, and brief together. Show a pill only if the save would keep it: a real table row, a score at or above possible, at most 10 sites, and an account Jev passed. The read today skips that score check, so a pill can appear that the save drops. The x on a run pill does nothing. Removal is the settings action after the save.

Search. This runs only when the first answer has fewer than five accounts and the terms are usable. Then `Searching X for accounts: …`, the result, the search scores, and a second answer, each whole. If it does not run, one report, and the words have to match the reason. `Enough accounts already fit` only when five already passed.

Save. No new engine report. `complete_build` flips the status. The phase ends when the page leaves building.

The page must never show a filling checked-i-of-N bar, verdicts dripping during the Jev call, a probability, the lab's 153 or its sample people, posts, or brief, Pause or Replay, a right column before the profile checkpoint, search marked skipped early, unfiltered pills, a brief before the answer exists, "Checking 1 item", a trial bar before the trial starts, or a DM state other than `bot_state`.

3. Order

He has no monitor, and a build retries once. The new run page has to be up before he presses Build.

1. Extend `app/local-preview` (development only, banner kept): rest, a run frozen on a fixture checkpoint, deck, settings. He opens the URLs. No signup.
2. The header on the signed-in pages. He logs in, opens the menu, switches theme, and signs out. `/` is still the old landing.
3. Rest and run, including the new reports. He signs up, submits his handle and sentence once, and watches: profile, posts, a still scoring line, bands in one jump, pills and brief in one jump, then the deck.
4. The ready deck. Clustered and Direct. An empty feed stays empty. Signed out, there is no account menu.
5. Settings, then the two redirects. He adds a source, removes one, reads the plan, and uses X DMs. Both old URLs land on settings.

Wrong order: Build before step 3 spends the run on the old page. Redirects before step 5 drop add, remove, and DMs. Sample cards on the real `/[handle]` make Olmo look like his feed.

4. The lab

`scratch/design-recovery/site` is frozen as the pass 16 picture. It is not kept in step with beta. The next note is made on the product, and he judges the localhost page with his own data.