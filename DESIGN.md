# Oparax Design System

The look is stock shadcn/ui, applied from a preset, dark by default with a light mode the person can switch to (owner, September 23, replacing the custom dark system that described the retired drafting product). This file is the whole contract; `app/globals.css` holds the tokens the preset wrote. Screens are designed by the owner in Claude Design, which holds a synced copy of this system (`/design-sync` after any change here), and built from the export with shadcn blocks and ai-elements.

## The preset and why each choice

Preset code `bzonVbKXA` (resolved from this project with `npx shadcn@latest preset resolve`; the owner's original pick was `bzq0WEyKe`, with the fonts locked on September 24). Applied with `npx shadcn@latest apply <code> --only theme,font`; the components themselves were not re-installed in the Mira style yet (the repo's hugeicons imports would break), which is the one remaining step if Mira's component shapes are wanted. Re-apply and re-sync when the look changes; the repo is the source of truth, Claude Design is the copy.

| Choice | Value | Reason (from the design skills) |
| --- | --- | --- |
| Style | Mira | compact with rounded corners, which suits a dense feed of cards (`vercel:shadcn`) |
| Base color | Zinc | a cool neutral that reads cleanly in dark mode and passes AA contrast for text at every step of the scale (`accessibility`) |
| Theme color | Blue | the one accent; matches the logo; used for actions and links, never as a surface fill (`frontend-design`: spend boldness in one place) |
| Chart color | Cyan | the preset's value; there are no charts yet |
| Radius | default | Mira's rounded rectangles for cards, controls and chips; circles only for avatars and status dots |
| Icons | hugeicons | kept from before; the preset's lucide value is not applied (`components.json` stays `hugeicons`) |
| Fonts | Nunito Sans for headings, Source Sans 3 for text, JetBrains Mono for handles, counts and times | the owner compared every registry font rendered on a page and locked this pair (September 24). All three are in shadcn's own font registry, so the preset carries them and Claude Design loads them without an upload. Headings at normal weight unless a screen decides otherwise; no bold by default |
| Mode | dark by default, light available | `next-themes` with the `dark` class; the toggle sits in the header |

## Rules that stay

- **Semantic colors are states.** Green means live or done; amber means in progress or unconfirmed; red means failed or destructive; blue means action. Never decoration.
- **Depth.** Cards and panels use the `beautiful-shadows` medium value; controls and chips the small value; never two shadows on one element, never tinted.
- **Type.** Sentence case for buttons and copy; Title Case for page headers; no all-caps labels, no eyebrow text, no helper subtitles under headers. Body under 80 characters a line.
- **Accessibility.** AA contrast in both modes; visible focus rings; every icon-only control has a label; touch targets at least 44px below the `desk` breakpoint (700px) and 24px above.
- **Motion.** Only where it answers an action or shows a live step (the onboarding build); nothing animates that a person does a hundred times a day (`emil-design-eng`).
- **Logo.** `public/oparax-logo-dark.png` and `public/email-logo.png`; the mark in `components/logo.tsx`.
- **Layout.** Content at most 1356px wide with 16px side gutters at every width (owner, September 24: no wide margins). Responsive gates use `desk:`, never `md:`.

## Legacy

The `:root` block in `app/globals.css` still carries the retired drafting screens' tokens (`--page-bg`, `--card-grad-*`, `--draft-*`, the `--text-*` set). They leave with those screens and are not used by anything new.
