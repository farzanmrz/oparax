RESULT: FINDINGS

Port One’s presentation onto existing product handlers. This is smaller than replacing either app wholesale. [feed-closed.png](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/renders/feed-closed.png) preserves Deck’s imagery and depth while making every fact readable. Sources and Notifications screenshots contain obsolete sidebars; use the brief’s single bottom-left bubble.

(1) Mapping

- `/`: retain `components/landing` content, pricing, entrance logic and working links. Replace the hero’s machine illustration with One’s card fan using the existing historical example. This is less work than importing the complete Deck, Window or Newsroom landing.
- `/login`: port `one/login.tsx` into `components/auth`, retaining `loginAction`, validated `next`, errors and provider actions. Email/password first, neutral X/Google below; signup swaps within the card. Keep existing email-link access secondary.
- `/signup`: render the same card initially in signup mode, using `signupAction` and `confirm-password`. Preserve session-based navigation and the pending-confirmation fallback; source inspection cannot establish live Auth configuration.
- `/forgot-password`: Deck auth shell around the existing recovery form.
- `/auth/reset-password`: same shell; preserve hidden recovery fields, submission-only token consumption and successful sign-out.
- `/onboarding`: `one/setup.tsx` supplies the form composition; existing `SetupForm` retains identity validation, build admission, waitlist and errors. After successful `/api/build`, refresh this route. Replace its existing-monitor redirect with One onboarding, retaining ready content until “Open your feed.” Add server-only `lib/onboarding/read.ts`: prove ownership, validate `build_state` with `BuildStateSchema`, return only display fields. Bind posts, pinned post, source reasons, quoted-post matches and brief to checkpoints and committed selections. Drive progress from actual stages/checkpoints; source selection and brief generation happen together. Preserve polling, failure and bounded retry.
- `/{handle}`: port `one/feed.tsx` and `one/card.tsx` into `components/monitor`. Add `toOneStory` and `toOneItem` in `lib/monitor/presentation.ts`, adapting `DisplayStory`/`DisplayItem` from `lib/monitor/read.ts`; do not manufacture preview `ItemView.text`. Preserve nullable cards, fallback titles, images, publishers, evidence and timestamps. Clustered maps to `view=stories`, Direct to `view=articles`; retain cursor pagination. Show all facts, linked sources above them, three columns, no peek or article-count pill. Keep digests distinct. Owner builds resume onboarding; public builds retain limited status. Empty feeds, processing failures and expired/exhausted plans use lifted Deck surfaces with existing `StateBanner`/payment actions.
- `/{handle}/sources`, new: One grouped lists from monitor sources/accounts; add `sources.kind` to the read projection. Use owned `followed_repos` where applicable. Show unreadable/paused states and distinguish watched accounts from recommendations. Omit unsupported per-source totals.
- `/{handle}/notifications`, new: ownership-gated One surface bound to persisted `bot_state`. The switch must initiate the existing activation flow and remain unconfirmed until refreshed state changes. Explain existing STOP/RESUME commands; there is no web toggle mutation to bind.
- `/{handle}/settings`: retain existing controls, ownership and paid-state restrictions in themed surfaces. Full redesign can wait; link the bubble’s account row here.
- `/{handle}/{story}`: preserve UUID validation, selected-story lookup and `storyFound` handling. Its existing delegation to `MonitorPage` inherits One cards; bespoke detail design can wait.
- `/checkout/return`: Deck shell only; preserve ownership/session binding and paid, pending, unpaid and unavailable states.
- `/privacy`, `/terms`: retain `LegalPage` content and links; inherit typography/tokens.
- `/local-preview` and its story route: reuse converted display components with existing labelled fixtures and development-only guard.

(2) Theme move

Copy only `.palette-council` light/dark tokens into `app/globals.css` root/theme scopes, including existing shadcn semantic mappings.  
Retain Tailwind imports, semantic utilities and `desk:`; add One text, surface and depth utilities, with tokens available to portals.  
Load committed Open Sans plus its license through `app/layout.tsx`; retain `next-themes`, mono labels and approved radii.  
Keep `components/ui` primitives unchanged; compose their classes and reuse existing logo, theme and sign-out behavior.

(3) Ordered steps

Every step requires `pnpm build`, `pnpm exec tsc --noEmit`, and its named journey before the corresponding main push.

1. Theme and shared Deck surfaces. Verify auth, legal pages and portal menus in both themes.
2. Unified auth card. Walk password, signup, Google/X, recovery and preserved return destinations.
3. Feed adapters/cards. Verify real populated, empty, imageless and expired feeds, pagination and story links.
4. Sources, Notifications and bubble together. Extend `safeAuthDestination` for both routes; verify owner/public separation, keyboard navigation, theme, sign-out and activation handoff.
5. Setup and onboarding checkpoint projection. Walk real build, reload, retry, completion remaining in place, then feed.
6. Minimal landing polish and checkout shell. Verify entrance states, legal/contact links and existing checkout outcomes.
7. Compare desktop dark/light renders with One references, including narrow windows. Settings/detail redesigns remain optional.

(4) Must-not-touch

Preserve auth callbacks, session security, recovery semantics and return-path validation.  
Preserve onboarding engine, prompts, thresholds, leases, admission and completion transaction.  
Preserve Stripe handlers, webhook authority, prices, entitlements and billing bindings.  
Preserve X identity verification, activation, commands, delivery scheduling and deduplication.  
No preview timers, fabricated data or whole checkpoints enter product props. Review performed read-only; no runtime verification was run.