RESULT: FINDINGS

1. **Port the composition onto existing product behavior.**

The checkout is on `beta`. Reusing product readers and actions is smaller and safer than importing the lab’s simulation or rewriting the engine. Keep `main`, the landing, and the brief’s protected files untouched.

The six pictures establish the target: shared header, level card rows, login fan, consolidated settings, two columns before building, and a third column once the profile exists.

| Lab file | Product destination and real data |
|---|---|
| `shell.tsx` | New `components/one/shell.tsx`, using the existing Stage, theme persistence and sign-out hook. Replace Bubble on signed-in pages. Email comes from authenticated user data; plan from `monitorState`, usage from monitor fields. Before a monitor exists, show no invented trial countdown. |
| `one.css`, `palettes.css` | Keep existing tokens in `app/globals.css`; add the approved column/layout utilities there. Header and content share the width rule. Remove lab switchers and their clearance padding. |
| `onboarding.tsx`, seven-phase `steps.ts` | Rest composition in `app/onboarding/page.tsx` and `setup-form.tsx`; run composition in `components/monitor/onboarding.tsx`, selected by `app/[handle]/page.tsx`. Feed navigation points to `/onboarding` before creation, then `/${handle}`. Keep a usable account/settings state before creation. |
| `next/data/*` | Replace rest data with `docs/source-table-seed.json`; run data with an expanded, owner-only `lib/onboarding/read.ts`. Sample runs belong only in local-preview fixtures. |
| `feed.tsx`, `card.tsx` | Update `components/monitor/one-feed.tsx` and `one-card.tsx`, retaining `readFeed` and `lib/monitor/present.ts` adapters. Replace `toColumns` masonry with chronological, stretched grid rows. Keep every fact visible. |
| Sources overlay | Adapt `components/monitor/one-sources.tsx` using `readSources`. Filtering must respect pagination; never copy the lab’s fallback that shows all stories when a filter finds none. |
| `settings.tsx` | Recompose `app/[handle]/settings/page.tsx` and existing settings controls. Bind X rows to `monitor_accounts`, RSS/websites to `monitor_sources` joined with `sources`, GitHub to `followed_repos`, identity to the monitor profile, and DMs to `bot_state`. |
| `login.tsx` | Put `components/auth/one-card.tsx` inside the Deck fan composition for login/signup. Preserve existing form actions, provider buttons, return paths and recovery flows. Fan content is an example, never the visitor’s feed. |

Redirect owner Sources and Notifications URLs to Settings sections. Preserve visitors’ public source access, either through their existing page or the feed overlay. Do not redirect visitors into private settings.

The visual anchors are [rest](/Users/farzanm4/Desktop/repos/oparax/img/p16-rest.png), [run](/Users/farzanm4/Desktop/repos/oparax/img/p16-run-step-5.png), [feed](/Users/farzanm4/Desktop/repos/oparax/img/p16-feed.png), [settings](/Users/farzanm4/Desktop/repos/oparax/img/p16-settings.png), [login](/Users/farzanm4/Desktop/repos/oparax/img/p16-login.png), and [menu](/Users/farzanm4/Desktop/repos/oparax/img/p16-menu.png).

2. **Seven visible phases are possible; item-by-item streaming is not.**

Keep the engine’s three step numbers. Derive seven presentation phases from saved checkpoints and reports:

| Phase | Honest display moment |
|---|---|
| Find profile | Start from the lookup report; reveal identity when the profile checkpoint exists. Completion requires `profileComplete`. |
| Read posts | Show reading activity. Posts appear at the saved posts checkpoint; partial timeline pages require explicit provisional treatment. |
| Gather candidates | Show the actual table plus eligible quoted accounts after collection. Preserve the engine’s exclusions and deduplication. |
| Jev scores | While awaiting the single request, show “Checking N candidates” with indeterminate activity. At the scores checkpoint, reveal verdict lines and bands together. |
| Choose sources and brief | Show activity until the structured answer arrives. Brief and choices appear whole; a first answer may be revised after search. |
| Search X | Show only when the search report exists. Distinguish skipped, failed and completed search; do not assume every skip means enough accounts fitted. |
| Save | Show saving before persistence; show saved only after successful `complete_build`. |

The existing [reader](/Users/farzanm4/Desktop/repos/oparax/lib/onboarding/read.ts) exposes neither candidates nor bands. Extend its owner-scoped projection, retaining raw scores server-side.

It also currently displays raw answer recommendations. Chosen pills must apply the engine’s eligibility, deduplication and limit rules so they match what is actually saved.

**No report-only change can produce genuine per-candidate or per-token streaming.** The smallest honest addition is reports around gathering, batch completion, final selection and saving, while retaining three-second refreshes. Verdicts and pills appear at their actual batch boundaries. Avoid hundreds of sequential report writes: each currently renews the lease and rewrites the accumulated log.

Never fake checked counts, elapsed percentages, typing, active checking from a merely pending queue, or successful saves. Pause/Replay belongs to a clearly labelled replay, not control of the live engine.

Removable pills are another gap: current mutations are paid-only, and X accounts support watching rather than add/remove. Keep those rules visible; enabling trial/build-time removal requires an explicit product decision and persistent server behavior.

3. **One Opus builder, in this order.**

- **Shell, authentication and fixtures.** Extend development-only `/local-preview` for rest, run checkpoints, failure, completion, settings and menu. Owner verifies login/signup, confirmation, provider return, recovery, theme and actual sign-out on localhost.
- **Rest and real run.** Add the seven-phase projection and checkpoint-bound content. Owner enters his sentence, builds once, refreshes during the run, and reaches the saved result. Use fixtures for failure/search cases.
- **Ready feed.** Port level rows and source overlay while preserving pagination, Direct/Clustered and public access. Owner opens his feed; fixtures cover long facts, missing images and empty states.
- **Settings consolidation and redirects.** Preserve billing, alert cadence and digest controls. Owner checks saved sources, plan, DM activation state and old URLs.

Each increment requires builder build/typecheck evidence and the named owner walk. Check keyboard focus, narrow layouts, both themes and reduced motion.

Wrong ordering causes three failures: a polished simulation over missing data, trial controls rejected by existing permissions, and redirects that strand visitors or remove working settings.

4. **Freeze the lab after the port.**

Keep pass 16 as the visual reference. Apply subsequent owner notes directly to product components with real data; exercise rare states through development fixtures. Maintaining two evolving implementations would recreate today’s drift.

This review used file and image inspection only. No builds, tests, product execution or writes were performed.