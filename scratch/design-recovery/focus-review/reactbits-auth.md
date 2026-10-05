# React Bits Pro auth blocks, layout survey

Fetched 20 of 20 (auth-1 to auth-6, authentication-1 to authentication-14). Raw JSON is in `scratch/design-recovery/focus-review/reactbits-auth/<slug>.json`. Nothing was added to the site. No license key appears in any file.

Read from the actual source, not only the registry descriptions (the registry text for auth-2 and auth-3 is inaccurate: auth-2 is a split with a photo panel, auth-3 is a card over a photo with copy beside it).

## Two families, and what they mean for our dark fixed theme

- **auth-1..6** (older family): full-viewport pages (`min-h-screen`), colors hardcoded as Tailwind `neutral-*` with `dark:` variants. Dependency `motion` (+ `lucide-react`). No CSS variables. Retheming means editing class strings or swapping neutral for our tokens.
- **authentication-1..14** (App UI family): not full-page. Root is `relative flex h-full min-h-[560-800px] w-full`, so it needs a parent with a height (a page wrapper or a framed panel). Colors are `neutral-*` with `dark:` variants, but accents, radii and focus ring read from CSS variables with fallbacks: `--rb-accent`, `--rb-accent-fg`, `--rb-r-xs/sm/md/lg/2xl`. Registry dependency `@reactbits-pro/app-ui-theme` (defines those variables; installing it would add a registry item to the site, so for a council pick we can instead define the five variables ourselves). Dependency `lucide-react` only, no motion library, animation is a few inline `@keyframes` (fade, step-in) with `motion-reduce` guards.
- **Dark theme note for both:** the site's `@custom-variant dark` (in `app/catalog-foundation.css`) turns `dark:` on unless `html[data-theme="light"]`, so every block already renders in its dark styling by default. "Easy" below means how little we must edit to get our own palette, not whether dark works.

## Entries

### auth-1
- Layout: split screen, 50/50, form LEFT (logo, "Welcome back", email, password with reveal, Sign in, "Back to home" pinned at bottom), visual RIGHT (hidden below `lg`).
- Visual side: a canvas "Flicker" particle grid (dots flickering at spacing 30) behind a horizontally scrolling MARQUEE of six testimonial cards (320px wide, 280px tall, quote plus avatar, name, role), edge fades 128px on both sides, pauses on hover. A single row of story cards, scrolling sideways.
- Social buttons: none. Email and password only.
- Animation: motion entrance stagger on the form; 80s marquee loop; canvas flicker (2D canvas, requestAnimationFrame).
- Dependencies: motion, lucide-react, next-themes, clsx, tailwind-merge; ships one extra file `components/react-bits/flicker.tsx` (needs `@/lib/utils` `cn`). Needs a CSS `animate-marquee` keyframe/utility that the site does not define (the registry JSON carries no CSS). Uses `useTheme()` from next-themes to pick Flicker colors; next-themes is not installed in the site.
- Dark fixed theme: moderate. Replace `useTheme()` with a constant, hardcode the dark Flicker colors, add the marquee keyframe, then the neutral classes are easy to remap. Light-mode branch can be deleted.

### auth-2
- Layout: split 50/50, visual LEFT (hidden below `lg`), form RIGHT, centered `max-w-md`.
- Visual side: rounded inset panel with an Unsplash photo background (scaled 1.2, bottom aligned), logo plus "Brand" top, headline "Your personal cloud & AI" bottom. Brand text is dark (written for a light photo).
- Social buttons: Apple and Google full-width stacked, "or" divider, then email and password with reveal, Sign in.
- Animation: motion fade and rise stagger, panel scale-in.
- Dependencies: motion, lucide-react. Remote Unsplash image URL.
- Dark fixed theme: easy for the form; the photo panel needs a replaced image and light text.

### auth-3
- Layout: full-bleed background photo (Unsplash, 20% black scrim); white rounded-2xl login CARD on the LEFT, headline plus tagline ("React Bits Pro") on the RIGHT over the photo (hidden below `lg`). Container `max-w-[1400px]`.
- Visual side: just the photo and two lines of white text. No cards.
- Social buttons: Google, Apple, GitHub stacked, "View more" link, "Create an account", "Can't sign in? Get help". Email-first ("Continue").
- Animation: card slides in from left, text from right.
- Dependencies: motion only.
- Dark fixed theme: easy (card has `dark:bg-neutral-900`), but depends on a photo we would have to replace.

### auth-4
- Layout: framed split inside a section with page padding; form LEFT, showcase aside RIGHT with a left border, `bg-neutral-50` (hidden below `lg`).
- Visual side: concentric rings (four circles up to 520px), a slowly rotating dashed ring (90s), a center logo tile, four floating "trust chips" (Device trusted, SSO enforced, SOC 2 Type II, and one more) bobbing up and down, and below it a single large customer quote with avatar, name and role. One quote, not a stack.
- Social buttons: Google and GitHub side by side (two columns), divider, email, password with reveal, Sign in with arrow motion.
- Animation: motion stagger, continuous rotation and chip float; honors reduced motion.
- Dependencies: motion, lucide-react.
- Dark fixed theme: easy; the whole showcase is borders and neutral fills, no photo.

### auth-5
- Layout: centered card, `max-w-[400px]`, rounded-3xl, `min-h-[480px]`, top aligned in the viewport.
- Visual side: none.
- Social buttons: Continue with Google and Continue with GitHub below an "or" divider. Primary flow is a magic link ("Send magic link").
- Animation: AnimatePresence swap between the form and a "Check your inbox" state with a 30 second resend cooldown.
- Dependencies: motion, lucide-react.
- Dark fixed theme: easy.

### auth-6
- Layout: minimal centered column, `max-w-sm`, no card chrome. Six-digit code entry in two groups of three with a dash between, paste support, auto-advance, resend countdown.
- Visual side: none. Social buttons: none. Not a login entry point, a second step.
- Animation: motion stagger on load.
- Dependencies: motion, lucide-react.
- Dark fixed theme: easy.

### authentication-1
- Layout: centered sign-in column inside a padded panel (logo, "Sign in", "Continue to the Northwind workspace", email, password with reveal, keep me signed in, Sign in).
- Visual side: none. Social buttons: three-up row (Google, Apple, GitHub) under a divider.
- Animation: loading spinner on submit only.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easiest of the plain cards; accent and radii come from `--rb-*` variables.

### authentication-2
- Layout: provider-first centered column (max 420px) under a slim top header (logo left, "Create account" button right).
- Visual side: none. Social buttons: Google, GitHub, Apple, each full width and stacked, then an email field that swaps to a company-domain field when SSO is chosen.
- Animation: minimal.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy.

### authentication-3
- Layout: split. Form LEFT (flex-1, "Sign in", email, password with reveal, three-up Google, Apple, GitHub, "Create an account"). Aside RIGHT, 44% wide, `bg-neutral-50`, left border, hidden below `lg`.
- Visual side: ROTATING customer quote (several quotes, fade in), author avatar initials, name and role, a framed three-cell stat strip, dot pager and previous and next arrow buttons. A stack of stories you page through, one at a time.
- Animation: 240ms fade on quote change; manual carousel, no autoplay marquee.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy; no images, all neutral fills and borders.

### authentication-4
- Layout: centered card, two-step flow. Step 1 email ("Sign in to Northwind", Continue, a "sign in with email link" alternative), step 2 recalls the matched account and asks for a password; slides in from the right between steps. Footer note about new devices needing a one-time code.
- Visual side: none. Social buttons: none.
- Animation: 200ms step-in.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy.

### authentication-5
- Layout: centered magic-link flow: delivery summary ("Check your email"-style state with open-mail and resend-with-countdown actions), and a "Sign in with a link" form state. Link back to the usual sign in.
- Visual side: none. Social buttons: none.
- Animation: 200ms fade between states.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy.

### authentication-6
- Layout: centered two-factor screen: six-box code with paste, auto-verify, resend timer, switch to recovery code mode, "Verify another device" and "Continue" success state.
- Visual side: none. Social buttons: none.
- Animation: 200ms fade; spinner.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy.

### authentication-7
- Layout: centered sign-up card ("Create your account", "Free for 14 days"), segmented password strength meter and a live two-column requirement checklist.
- Visual side: none. Social buttons: none visible in the form column (email and password sign-up).
- Animation: minimal.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy.

### authentication-8
- Layout: split, form LEFT ("Sign in with your company account", work email), aside RIGHT 42% (hidden below `lg`).
- Visual side: a live detection panel that shows "Matched organization" or "No match yet", with directory size, identity provider, session length and enforced rules as the email domain is typed. Functional, not decorative.
- Social buttons: none (the Continue button reads "Continue with <provider>" once matched).
- Animation: minimal.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy.

### authentication-9
- Layout: centered passkey screen: pick a passkey from a list, Continue with <device>, waiting, signed-in and failure states, with fallbacks to password or email link.
- Visual side: none. Social buttons: none.
- Animation: 200ms fade.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy.

### authentication-10
- Layout: centered account chooser: remembered profiles with session status, "Sign in with a different email or provider", "Sign out of all accounts".
- Visual side: none. Social buttons: none.
- Animation: minimal.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy.

### authentication-11
- Layout: centered workspace picker with search, invitations, empty state and scroll fades over the list; "Create a workspace" action; sign out in the corner.
- Visual side: none. Social buttons: none.
- Animation: scroll edge fades only.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy (fades use `from-white dark:from-neutral-950`, must match our background).

### authentication-12
- Layout: split. Form LEFT (invitation accept: "Continue with Google", email, password), aside RIGHT 42% (hidden below `lg`).
- Visual side: "What you are joining" panel with workspace name, member avatar stack and a list of shared projects.
- Social buttons: Continue with Google.
- Animation: 200ms fade.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy.

### authentication-13
- Layout: centered password reset with match validation, requirement checklist, and a "Sign out of my other devices" checkbox with the list of device sessions affected.
- Visual side: none. Social buttons: none.
- Animation: 200ms fade.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy.

### authentication-14
- Layout: centered sign-in approval challenge: request details (location, device), Approve or Block, recent activity.
- Visual side: none. Social buttons: none.
- Animation: 200ms fade.
- Dependencies: lucide-react; app-ui-theme.
- Dark fixed theme: easy.

## Ranking

### Best for "a login form that sits with a stack of story cards beside it"
1. **auth-1** is the literal match: form left, a scrolling marquee of six cards (quote, avatar, name, role) right, over a flicker particle field, edge fades. Cost: remove next-themes use, add an `animate-marquee` keyframe, port the canvas Flicker component, no social buttons included. Cards are testimonial-shaped, so the story copy would replace quotes.
2. **authentication-3** is the clean, controlled version: form left, a rotating one-at-a-time story with author, stat strip and pager right, no images, no motion library, and it drops into a dark fixed theme with five CSS variables. It shows one card at a time rather than a stack.
3. **auth-4** has a lighter story panel: orbital rings with floating chips plus one large quote under it, and Google plus GitHub buttons side by side. More ornament, less of a card stack.

(Close fourth: authentication-12 and authentication-8, whose right panels are data cards rather than stories.)

### Best plain centered cards
1. **authentication-1**: centered, password plus three-up Google, Apple, GitHub row, variable-driven theming.
2. **auth-5**: centered rounded card, magic link with an inbox-sent swap state, Google and GitHub fallback.
3. **authentication-2**: provider-first centered column, with a company-domain SSO swap and a slim header.

(auth-6 and authentication-4 to 14 are centered too, but they are secondary steps such as codes, passkeys, pickers and resets, not a first login screen.)
