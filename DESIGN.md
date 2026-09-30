# Oparax Design System

## Current baseline

Owner, September 29, 2026: "Change the design.md because, even though what we have currently in the four directions is not what I want, I'd rather be using this as a base level on the currently set-up actual pages also." This adopts the shared visual foundation of the current previews as the starting point for the product. It does not approve any preview page or every component in it.

The owner's later clarification that day is equally important: specific comments about the integrations block and other compositions are "areas of exploration and things I'm not happy with, not as things to fix in my design system or rules that have emerged." Keep those comments in the visual brief. Do not promote them into permanent rules here.

This file is the shared design contract. `app/globals.css` supplies the implemented tokens, and `app/layout.tsx` loads the implemented fonts. **Implementation status, September 29:** this contract has been updated; those runtime files still contain the earlier Zinc palette and three-font setup. The shared theme migration and Claude Design upload have not been performed by this documentation update. Existing pages are not claimed to match the new baseline yet.

The repo is the source of truth. Claude Design can hold a copy. Synchronization is manual when requested; the automatic design-sync reminder hook was removed at the owner's instruction on September 29. Claim a sync complete only after an actual upload is verified.

Future baseline changes require the owner's explicit instruction. Installing a library, adding a shadcn component, or liking one part of a preview does not authorize replacing the baseline.

## Shared foundation

These are deliberately a small foundation, not a specification for every screen. The values below are extracted from the current previews as the implementation reference for the owner's baseline instruction, not claims that he individually selected every hex value or weight.

| Area | Starting point | Intent |
| --- | --- | --- |
| Components | Existing shadcn Mira primitives remain the accessible foundation. | Compose and adapt suitable blocks without rebuilding basic controls or reinitializing the project. |
| Theme | Dark by default, with an equally considered light mode and a visible toggle. | Both modes should feel coherent, with clearly separated surfaces and readable controls. |
| Palette | Cool blue-gray surfaces and a blue action accent, as in the current previews. | Preserve the color relationships the owner liked instead of inventing a palette per page. |
| Typography | Hanken Grotesk for general headings and body text, as used in the previews. Regular body text, restrained medium/semibold emphasis. | Keep the readable feel without excessive bolding. Do not impose a separate monospace identity on handles, times, or numbers. Actual code can use monospace. |
| Shape and depth | Moderately rounded corners, with borders, surface differences, and restrained shadows where useful. | Make layers distinct in both themes without putting every item into an oversized card. Exact radii and shadows remain component choices within this foundation. |
| Marks and icons | Real integration marks with provenance; Lucide for generic actions and categories. | Preserve recognizable brand colors where the brand permits them. Use a neutral contrasting Oparax SVG mark and wordmark. |

### Palette reference

Source: the shared `.r3` theme inherited by previews 17 to 20 in `scratch/landing-directions/directions/round-three.css.txt`. Scratch previews are references, not production dependencies. Preserve these values here when those previews are eventually retired.

| Role | Light | Dark |
| --- | --- | --- |
| Page background | `#f6f8fc` | `#090f1d` |
| Card or panel | `#ffffff` | `#141e31` |
| Secondary surface | `#eaf0fa` | `#19253c` |
| Main text | `#132139` | `#f0f4ff` |
| Secondary text | `#526079` | `#a8b6ce` |
| Border | `#d3ddec` | `#2a3952` |
| Blue accent | `#245dec` | `#6b94ff` |
| Blue-tinted surface | `#e7eeff` | `#203664` |

Map these roles to the existing semantic tokens rather than scattering raw colors through pages. Button text, focus indicators, disabled states, error colors, and chart colors need their own appropriate contrast and meaning; this table does not approve every possible pairing. Check actual foreground/background pairs before treating the theme as implemented.

The old preset `bzq0WEyKe` and the Nunito Sans / Source Sans 3 / JetBrains Mono combination describe the previous implementation. They are not the current target or proof that the owner chose each of those fonts. Do not reapply that preset over this baseline.

## Components

- **Stock Mira, never hand-edited.** Screens compose the components in `components/ui/` with Tailwind classes; the files themselves stay as shadcn wrote them, so a reinstall never loses work.
- **Add and delete, nothing else.** A missing component is added with `pnpm dlx shadcn add <name>` and arrives in Mira, colored by the theme, so adding one never changes this file; one nothing uses is deleted. This file changes only when the look itself is deliberately changed.
- **Consistent controls.** Keep the existing accessible primitive behavior. Shared control treatments belong in shared variants and tokens, so equivalent actions look and behave consistently. A marketing illustration does not establish a new default for all product controls.
- **Touch targets.** At least 44px below the `desk` breakpoint (700px) and 24px above. Mira's default controls are compact (28px), so screens enlarge them on phones.

## Page frame

- Every public page shares the header (logo mark and wordmark, theme toggle, sign-in actions) and the footer.
- The logo mark and wordmark at the top left are one link home on every page (owner, September 24): the landing page for a visitor, and the signed-in home once the product has one.
- The footer sits at the bottom of the screen on a short page and after the content on a long one. It carries no logo, no wordmark and no email address: only Privacy, Terms and Contact on one row, aligned to the right on desktop (owner, September 29). Header and footer divider lines run edge to edge; their content follows the page frame.
- Text pages (privacy, terms, and any page that is mostly reading) use the same full-width frame as everything else: content starts at the left edge, lined up with the header logo, and fills the width.
- Contact uses the existing product behavior. This design contract does not determine whether delivery is implemented; the current code and acceptance walkthrough establish that.

## Rules that stay

- **Semantic colors are states.** Green, amber, and red communicate meaningful states. The blue accent supports actions and selected emphasis. Authentic platform marks retain their brand colors, which do not represent product status.
- **Depth.** Use surface contrast, borders, and restrained shadows to distinguish layers. Judge light and dark modes separately. Do not add a shadow to every nested element by default.
- **Type and copy.** General text uses the shared font. Use a clear hierarchy and restrained emphasis. Short navigation labels are Title Case and normally one or two words (owner, September 29). Headline wording, sizes, and precise weights remain design choices, not a mandated landing-page template. Preserve plain product language and helpful labels; omit decorative labels and repeated explanations that add no information.
- **Accessibility.** AA text contrast in both modes, visible keyboard focus, labels for icon-only controls, appropriate touch targets, and useful empty, loading, error, and disabled states. A preview's appearance is not evidence that all states have been checked.
- **Motion.** Motion can explain work, show a state change, or support a marketing atmosphere. It must not obstruct reading or slow frequent product actions. Respect reduced motion and avoid hiding essential meaning behind an animation. No particular background, animation component, or timing is a global default yet.
- **Logo.** Use the actual Oparax mark and wordmark. A contrasting monochrome SVG can adapt between themes. Do not invent a new logo or force a blue backing tile into every illustration.
- **Layout.** Content is 90% of the screen width and stops growing at 1800px, with side gutters never under 16px; backgrounds run edge to edge; buttons and inputs keep their fixed minimum sizes and heights follow content (owner, September 28: percentages over a fixed cap, the median rule the council proposed; replaces the September 24 1356px cap). Responsive gates use `desk:`, never `md:`.

## Component exploration and open decisions

Use the official `shadcn` skill for APIs and composition, not an additional overlapping `vercel:shadcn` default. Catalogs such as Studio, React Bits, and other owner-selected sources supply candidates, not automatic design decisions. Skills advise within this contract and the owner's current brief.

Before custom work, inspect suitable existing components and compare a small number in the actual composition. Record what is imported, adapted, custom, or reference-only, plus access and license constraints. Researching a catalog does not mean its components were used. Do not install a component merely to increase library usage.

The following remain open: integrations-block layout, the source/engine/story demonstration, incoming-card size and motion, background selection, feed-card composition, story-page layout, and exact page copy. The owner's specific feedback about these belongs in the next visual brief. It must not be converted into a rule for every product page.

A shared visual baseline and functional acceptance are different. Existing feed and story code can be walked for behavior while their presentation is refined. Neither a completed build nor this document counts as owner acceptance of those screens. This update introduces no new mandatory step into the feature flow and performs no branch merge or remote design sync.
