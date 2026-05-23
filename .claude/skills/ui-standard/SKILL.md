---
name: ui-standard
description: Work-in-progress Oparax UI standardization guidance (theme tokens, shadcn primitives, auth/button/form/card conventions). Do not invoke unless the user explicitly names this skill; the shared design system is still being established and auto-invocation is disabled by project policy.
---

# Oparax UI Standard

Keep visual decisions in shared theme tokens, global utility classes, or shadcn primitives. Use local page classes only when a pattern is genuinely unique.

> **Status: work in progress.** Apply this skill only on explicit user request while the design system is still being established.

## When to Use

Only after the user explicitly names this skill (it never triggers on its own while WIP). Once invoked, it covers:

- Building or restyling Oparax web UI.
- Moving one-off visual styling into shared tokens, global classes, or primitives.
- Fixing reusable interaction states such as hover, focus, disabled, and pending/loading.
- Checking whether a touched page or component follows the current shared system.

## When NOT to Use

- During manual authoring of this skill itself, unless explicitly requested.
- For backend-only, database-only, prompt-only, or test-only changes.
- To justify broad redesigns beyond the current visual problem.
- To record one-page implementation details, copy text, provider lists, or experimental tweaks as permanent standards.

## Prime Directive

Update the shared system first. If a visual issue appears on one page but the same pattern exists elsewhere, change the relevant token, global class, or primitive so other pages inherit it.

## Theme Tokens

- Use `bg-background` for app page backgrounds.
- Use `bg-card` and `text-card-foreground` for contained surfaces.
- Use `text-heading` when major headings need separation from labels and body text.
- Use `bg-primary text-primary-foreground` for primary buttons. The current primary button style is neutral near-white on dark UI.
- Use `text-link`, `text-link-hover`, and `text-link-active` for URLs. Link color must not depend on `--primary`.
- Use `border-border`, `border-input`, and `ring-ring` for borders, inputs, and focus states.
- Do not add hard-coded teal/green/white values when a semantic token exists.

## Typography

- Default UI text is `text-base leading-6`.
- Form labels use the shared label primitive: `text-base font-[525] text-foreground/82`.
- Labels should be stronger than helper text but visually below headings; avoid `font-semibold` for normal form labels.
- Auth headings use the shared `auth-heading` class and `text-heading`.
- Helper/legal text should remain subordinate to labels and actions.
- Avoid tiny text unless the component is genuinely metadata, compact chrome, or a badge.

## Links

- Default app URLs are medium-weight tokenized links with no underline by default.
- Use hover color changes and optional hover decoration; avoid permanent heavy underlines in normal UI.
- Auth links use `auth-link`.
- Quiet field-level actions, such as password recovery, use `auth-field-link` and should not compete with field labels.
- Remove local `text-teal-*`, `text-primary`, and hard-coded link-color classes when the global link style applies.

## Buttons

- Use `components/ui/button.tsx` for app buttons.
- Buttons are content-sized by default; do not stretch width unless the layout explicitly requires it.
- Primary buttons inherit neutral `bg-primary text-primary-foreground`.
- Buttons must use pointer cursor on hover and not-allowed cursor when disabled.
- Button hover should be visible on the neutral primary surface; active state may use a subtle pressed effect.
- Use the shared `pending` prop for async button progress. The loader belongs to the right of the button content.
- Use `SubmitButton` for server-action forms so pending state is automatic.
- Do not add local CTA classes when the shared `Button` default covers the case.

## Inputs And Forms

- Use shared `Input`, `Textarea`, `Select`, `HandleInput`, and field primitives for form controls.
- Keep control height, padding, border, hover, and focus behavior in the shared primitive unless a new component type requires a new primitive.
- Inputs use dark translucent surfaces, `border-2`, hover border/background polish, and `focus-visible` ring/border.
- Do not make login-only input height or padding tweaks; change the shared primitive.
- Put form rhythm in shared field/auth classes, not page-local margins.

## Auth UI

- Auth pages use a single-column card system and the shared `auth-*` classes.
- Keep auth card/container layout decisions in `app/globals.css`, not individual auth forms.
- Use shared auth classes for headings, helper text, links, submit buttons, SSO button sizing, legal text, and field spacing.
- SSO buttons should inherit the shared button surface unless a deliberate provider-specific style is established.
- Do not add split image panels, inner card gaps, or local auth link/button styling unless explicitly requested.

## Cards And Surfaces

- Let `Card` own border, background, radius, and shadow.
- Do not create nested cards or extra card-like wrapper surfaces for ordinary sections.
- Remove local card styling that fights the shared `Card` primitive.
- For areas not yet standardized, prefer shared primitives and tokens, but do not invent durable rules without a real standardization decision.

## Implementation Workflow

- Inspect the relevant shared primitive or global class before editing page-local UI.
- Make the smallest shared change that solves the visual issue.
- Remove local overrides that fight the new shared default.
- Document only reusable standards here. Do not document page copy, one-off content decisions, or transient experiments.
- Run `git diff --check` and `pnpm lint` after edits.
- For visual validation, use the already-running app at `http://localhost:3000` when browser testing is explicitly allowed; do not start `pnpm dev` or run a build just for UI inspection.

## Do Not

- Do not introduce decorative gradients, radial backgrounds, or image panels unless explicitly requested.
- Do not use arbitrary local colors when a semantic token exists.
- Do not place pending loaders to the left of button content.
- Do not make buttons much wider than their content by default.
- Do not solve shared UI problems with login-only or dashboard-only styling.
- Do not record one-time content decisions as UI standards.
