# Oparax Design System

The look is stock shadcn/ui in the Mira style, dark by default with a light mode the person can switch to (owner, September 23; rebuilt on Mira September 24). This file is the whole contract; `app/globals.css` holds the tokens. Screens are designed by the owner in Claude Design, which holds a synced copy of this system (a Claude Code hook makes Claude re-sync it whenever this file, the theme or `design-system/` change; owner, September 24), and built from the export with shadcn components.

This file and the theme tokens in `app/globals.css` change only when the owner explicitly approves the change in the session he is working in ("this is good, change the design system"; owner, September 24). No stage, build, background Codex or Claude session or subagent edits them on its own, and adding a shadcn component never requires changing them. When an approved change lands, the design-sync hook (`.claude/hooks/design-sync.sh`) makes Claude re-sync Claude Design.

## How it fits together

Three layers. The theme (the named colors, the radius and the fonts in `app/globals.css`) is set once. The style (Mira) is the shape of each component, and each component's variants (default, secondary, outline, ghost, link, destructive) are wired to the theme's colors, so changing a color changes every component at once.

## The choices and why

The owner's preset code is `bzq0WEyKe` (Mira, Zinc, Blue, Cyan charts, lucide, IBM Plex Sans, Nunito Sans), picked on ui.shadcn.com/create. The final choices are below; the text font is Source Sans 3 rather than the code's IBM Plex Sans, so anyone re-applying the preset sets the fonts back afterwards. The repo is the source of truth, Claude Design is the copy.

| Choice | Value | Reason |
| --- | --- | --- |
| Style | Mira (`components.json` style `radix-mira`) | compact with rounded corners, which suits a dense feed of cards (`vercel:shadcn`) |
| Base color | Zinc | a cool neutral that reads cleanly in dark mode and passes AA contrast for text at every step (`accessibility`) |
| Primary | Blue, the old Oparax accent tuned for contrast: light `oklch(0.555 0.15 245)` (about #0077c2) with white text, about 4.8:1; dark `oklch(0.62 0.15 245)` (#168dd9) with near-black text, about 5.5:1 | the one accent, matching the logo, for actions and links, never a surface fill (`frontend-design`). The modes differ because #168dd9 with white text is only 3.6:1. `--ring` and `--sidebar-primary` match primary |
| Chart color | Cyan | the preset's value; there are no charts yet |
| Radius | default | Mira's rounded rectangles for cards, controls and chips; circles only for avatars and status dots |
| Icons | lucide | shadcn's default, so every added component arrives with matching icons; hugeicons is removed |
| Fonts | Nunito Sans for headings, Source Sans 3 for text, JetBrains Mono for handles, counts and times | the owner compared every registry font rendered on a page and locked these (September 24). All three are in shadcn's font registry, so Claude Design loads them without an upload. page titles at normal weight, section headings bold (see Type) |
| Mode | dark by default, light available | `next-themes` with the `dark` class; the toggle sits in the header |

## Components

- **Stock Mira, never hand-edited.** Screens compose the components in `components/ui/` with Tailwind classes; the files themselves stay as shadcn wrote them, so a reinstall never loses work.
- **Add and delete, nothing else.** A missing component is added with `pnpm dlx shadcn add <name>` and arrives in Mira, colored by the theme, so adding one never changes this file; one nothing uses is deleted. This file changes only when the look itself is deliberately changed.
- **Controls use Mira's defaults with no additions.** Buttons, inputs and textareas keep the resting look and focus ring shadcn generates (owner, September 24): no theme-wide shadow or focus override, and no one-off glow, outline or wash on a single screen. Every Sign up button is the same stock button.
- **Touch targets.** At least 44px below the `desk` breakpoint (700px) and 24px above. Mira's default controls are compact (28px), so screens enlarge them on phones.

## Page frame

- Every public page shares the header (logo mark and wordmark, theme toggle, sign-in actions) and the footer.
- The logo mark and wordmark at the top left are one link home on every page (owner, September 24): the landing page for a visitor, and the signed-in home once the product has one.
- The footer sits at the bottom of the screen on a short page and after the content on a long one. It carries no logo, no wordmark and no email address: only Privacy, Terms and Contact on one row, centered on the page.
- Text pages (privacy, terms, and any page that is mostly reading) use the same full-width frame as everything else: content starts at the left edge, lined up with the header logo, and fills the width.
- Contact opens a small dialog ("Contact Us", a message box, Send) that never shows an email. Sending is not wired yet (owner: a later step), so the confirmation says "Thanks for reaching out." and must not claim delivery until sending exists.

## Rules that stay

- **Semantic colors are states.** Green means live or done; amber means in progress or unconfirmed; red means failed or destructive; blue means action. Never decoration.
- **Depth.** Cards and panels use the `beautiful-shadows` medium value; controls keep Mira's default look with no added shadow; never two shadows on one element, never tinted.
- **Type** (owner, September 24, for every page on the site).
  - **Page titles** (the one heading at the top of a page, like "Privacy Policy"): Nunito Sans, normal weight, Title Case.
  - **Section headings** (like "Information We Collect", "Usage"): Nunito Sans, bold, Title Case, at most five words and as short as the meaning allows ("Usage", not "How we use it").
  - **Bullets**: every bullet starts with a capital letter and reads as a full sentence ending in a period. A bullet that leads with a label ("Account Details: ...") has the label in bold, Title Case, followed by a colon.
  - Buttons and body copy in sentence case; no all-caps labels, no eyebrow text, no helper subtitles under headers.
  - **Text fills its container** (owner, September 24): no artificial line-length cap anywhere. Text wraps at the edge of whatever holds it, the page frame or a card's padding, never at a fixed character width.
- **Accessibility.** AA contrast in both modes; Mira's default focus rings kept visible; every icon-only control has a label; touch targets as above.
- **Motion.** Only where it answers an action or shows a live step (the onboarding build); nothing animates that a person does a hundred times a day (`emil-design-eng`).
- **Logo.** `public/oparax-logo-dark.png` and `public/email-logo.png`; the mark in `components/logo.tsx`.
- **Layout.** Content at most 1356px wide with 16px side gutters at every width (owner, September 24: no wide margins). Responsive gates use `desk:`, never `md:`.
