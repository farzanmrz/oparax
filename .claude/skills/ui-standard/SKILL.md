---
name: ui-standard
description: Use when building, restyling, or standardizing any Oparax web UI — auth pages, login/signup forms, cards, buttons, dashboards, or shared components. Enforces the shared design system by reusing the semantic theme tokens and auth/* classes in app/globals.css and the shadcn primitives in components/ui/ instead of adding one-off per-page styling. Triggers on requests like "make this page match our UI", "standardize this component", "fix the card styling", or "build a new page consistent with the rest of the site".
---

This skill keeps Oparax UI consistent by making pages inherit shared components, semantic theme tokens, and global classes instead of adding one-off visual styling inside individual pages or forms.

# Prime Directive

Use the existing shared UI system first. Any visual styling change should become shared/global for the relevant component or pattern, and local page/component overrides should be removed so pages inherit the shared default.

# Global Rules

- Use the `bg-background` utility (backed by the `--background` token in `app/globals.css`) for page backgrounds.
- Use semantic tokens and shared classes from `app/globals.css`.
- Remove local page/component visual styling that duplicates or fights shared defaults.
- If shared styling does not exist for the UI pattern being changed, create or update the shared component/global class first, then update the page to inherit it.
- Do not add page-specific visual styling when a shared component or global class exists.
- Do not add decorative page backgrounds or radial gradients by default.
- Do not fix a shared component by styling one page only.
- Do not leave local overrides in place after a shared default exists.

# Component Rules

Only apply the rules for components involved in the current task. Component filenames in parentheses are under `components/ui/` unless the rule names another source.

## Card (`card.tsx`)

- Let `Card` own its border, radius, background, and shadow behavior.
- Remove local card styling that fights the shared Card default.
- Keep card styling global unless the user explicitly asks for a page-specific exception.
- Do not add local `border-*`, `rounded-*`, `shadow-*`, or `bg-*` classes just to change one card.
- Do not wrap cards in extra visual containers to create a second card-like surface.

## Auth Form (`app/globals.css`)

- Use `auth-page`, `auth-container`, `auth-form-stack`, `auth-card`, `auth-card-content`, and `auth-form-panel`.
- Use `auth-heading`, `auth-inline-action`, `auth-legal`, `auth-link`, `auth-submit-button`, and `auth-sso-button`.
- Keep the form background the same as the card background.
- Put form spacing in the shared auth classes, not in one page.
- Remove local auth form styling that duplicates or fights the shared auth classes.
- Do not add a separate inner form background that differs from the card.
- Do not create card-to-form visual gaps.
- Do not add local auth link or button style constants when global auth classes exist.
- Do not add auth image panels unless explicitly requested.
